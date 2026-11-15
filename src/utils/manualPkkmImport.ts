import * as XLSX from 'xlsx';
import { DOCUMENT_TEMPLATES, MASTER_INDICATORS_V26 } from '../data/masterInstrumentV26';
import {
  EvaluatorProfile,
  InstitutionProfile,
  PrincipalProfile,
} from '../types/ppkm';
import { DocumentTemplateDef, MasterIndicatorDef } from '../types/saas';

export interface ParsedManualPkkmImport {
  fileName: string;
  fileType: 'excel' | 'pdf';
  detectedSheets: string[];
  numPages?: number;
  institutionPatch: Partial<InstitutionProfile>;
  principalPatch: Partial<PrincipalProfile>;
  evaluatorsPatch: Partial<EvaluatorProfile>;
  yayasanName?: string;
  p1Scores: Record<string, number>;
  p2Scores: Record<string, number>;
  componentTargetsP1: Partial<Record<'K1' | 'K2' | 'K3' | 'K4', number>>;
  componentTargetsP2: Partial<Record<'K1' | 'K2' | 'K3' | 'K4', number>>;
  overallTargetP1?: number;
  overallTargetP2?: number;
  matchedTemplateIds: string[];
  warnings: string[];
  extractedTextSnippet?: string;
}

const CHECKMARK_TOKENS = new Set(['✓', '✔', 'v', 'x', 'ya', 'ok', '1', 'true', 'ada', 'lengkap', 'terkumpul']);
const POSITIVE_STATUS_REGEX = /\b(lengkap|ada|terkumpul|sudah|ok|ya|sesuai|valid|approved)\b|[✓✔☑]/i;
const NEGATIVE_STATUS_REGEX = /\b(tidak ada|belum|kosong|kurang|none|-)\b/i;

export function getComponentCodesForTemplate(tpl: DocumentTemplateDef): Array<'K1' | 'K2' | 'K3' | 'K4'> {
  const parts = tpl.relatedKomponen.split(/[/,; ]+/).filter(Boolean);
  const codes = new Set<'K1' | 'K2' | 'K3' | 'K4'>();
  for (const part of parts) {
    const first = part.trim()[0];
    if (first === '1') codes.add('K1');
    if (first === '2') codes.add('K2');
    if (first === '3') codes.add('K3');
    if (first === '4') codes.add('K4');
  }
  if (codes.size === 0) codes.add('K2');
  return Array.from(codes);
}

function normalizeIndicatorId(raw: string): string | null {
  const match = raw.trim().match(/\b([1-4]\.\d{1,2}\.\d{1,2})\b/);
  return match ? match[1] : null;
}

function isCheckCell(raw: unknown): boolean {
  if (raw === null || raw === undefined) return false;
  if (typeof raw === 'number') return raw === 1;
  if (typeof raw === 'boolean') return raw;
  const s = String(raw).trim().toLowerCase();
  if (!s) return false;
  if (CHECKMARK_TOKENS.has(s)) return true;
  return s.includes('✓') || s.includes('✔');
}

function parseScoreInt(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const num = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.').trim());
  if (!Number.isFinite(num)) return null;
  const rounded = Math.round(num);
  if (rounded >= 1 && rounded <= 4 && Math.abs(num - rounded) < 0.05) {
    return rounded;
  }
  return null;
}

function parsePctValue(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  let num: number;
  if (typeof raw === 'number') {
    num = raw > 0 && raw <= 1 ? raw * 100 : raw;
  } else {
    const cleaned = String(raw)
      .replace(/%/g, '')
      .replace(/,/g, '.')
      .replace(/[^\d.]/g, '');
    if (!cleaned) return null;
    num = Number(cleaned);
  }
  if (!Number.isFinite(num)) return null;
  if (num >= 20 && num <= 100) {
    return Math.round(num * 100) / 100;
  }
  return null;
}

function cleanFieldValue(val: string): string {
  return val
    .replace(/^[:=\-.\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchChecklistTemplatesFromRows(rows: string[][]): string[] {
  const matched = new Set<string>();
  const rowTexts = rows.map((r) => r.map((c) => String(c || '').trim()).filter(Boolean).join(' '));

  for (const line of rowTexts) {
    if (!line || line.length < 4) continue;
    const lower = line.toLowerCase();
    for (const tpl of DOCUMENT_TEMPLATES) {
      const titleLower = tpl.title.toLowerCase();
      const keywords = titleLower
        .replace(/[()/,.-]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !['yang', 'dan', 'atau', 'untuk', 'dengan', 'kepala'].includes(w));

      const exactMatch = lower.includes(titleLower);
      const hits = keywords.filter((kw) => lower.includes(kw)).length;
      const keywordMatch = keywords.length >= 2 && hits >= Math.min(3, keywords.length);

      if (exactMatch || keywordMatch) {
        if (!NEGATIVE_STATUS_REGEX.test(lower) || POSITIVE_STATUS_REGEX.test(lower)) {
          matched.add(tpl.templateId);
        }
      }
    }
  }

  return Array.from(matched);
}

function extractMetadataFromKeyValuePairs(
  pairs: Array<{ label: string; value: string }>,
  institutionPatch: Partial<InstitutionProfile>,
  principalPatch: Partial<PrincipalProfile>,
  evaluatorsPatch: Partial<EvaluatorProfile>
): { yayasanName?: string } {
  let yayasanName: string | undefined;
  let penilaiSection: 0 | 1 | 2 = 0;

  for (const { label, value } of pairs) {
    const l = label.toLowerCase().trim();
    const v = cleanFieldValue(value);
    if (!l) continue;

    if (l.includes('penilai 1') || l.includes('pengawas 1') || l.includes('penilai i')) {
      penilaiSection = 1;
    } else if (l.includes('penilai 2') || l.includes('pengawas 2') || l.includes('penilai ii')) {
      penilaiSection = 2;
    }

    if (!v || v === '-' || v.length > 220) continue;

    if ((l.includes('nama madrasah') || l.includes('nama ra') || l.includes('nama lembaga') || l.includes('satuan pendidikan')) && !institutionPatch.namaLembaga) {
      institutionPatch.namaLembaga = v;
    } else if (l.includes('yayasan') && !yayasanName) {
      yayasanName = v;
    } else if (l === 'nsm' || l.startsWith('nsm') || l.includes('nomor statistik')) {
      const m = v.match(/\d{8,14}/);
      if (m && !institutionPatch.nsm) institutionPatch.nsm = m[0];
    } else if (l === 'npsn' || l.startsWith('npsn')) {
      const m = v.match(/\d{6,10}/);
      if (m && !institutionPatch.npsn) {
        institutionPatch.npsn = m[0];
        institutionPatch.npsm = m[0];
      }
    } else if ((l.includes('alamat') && !l.includes('email')) && !institutionPatch.alamat) {
      institutionPatch.alamat = v;
    } else if (l.includes('kecamatan') && !institutionPatch.kecamatan) {
      institutionPatch.kecamatan = v;
    } else if ((l.includes('kabupaten') || l.includes('kota')) && !institutionPatch.kotaKab) {
      institutionPatch.kotaKab = v;
    } else if (l.includes('provinsi') && !institutionPatch.provinsi) {
      institutionPatch.provinsi = v;
    } else if (l.includes('tahun pelajaran') && !institutionPatch.tahunPelajaran) {
      institutionPatch.tahunPelajaran = v;
    } else if (l.includes('periode penilaian') && !institutionPatch.periodePenilaian) {
      institutionPatch.periodePenilaian = v;
    } else if ((l.includes('nama kepala') || l.includes('kepala madrasah') || l.includes('kepala ra')) && !principalPatch.namaLengkap) {
      principalPatch.namaLengkap = v;
    } else if (l.includes('nuptk') && !principalPatch.nuptk) {
      principalPatch.nuptk = v;
    } else if (l.includes('npk') && !principalPatch.npk) {
      principalPatch.npk = v;
    } else if (l.includes('tempat') && l.includes('lahir') && !principalPatch.tempatTanggalLahir) {
      principalPatch.tempatTanggalLahir = v;
    } else if (l.includes('pendidikan terakhir') && !principalPatch.pendidikanTerakhir) {
      principalPatch.pendidikanTerakhir = v;
    } else if (l.includes('tmt') && !principalPatch.tmtJabatan) {
      principalPatch.tmtJabatan = v;
    } else if (l.includes('pangkat') || l.includes('golongan')) {
      if (penilaiSection === 1 && !evaluatorsPatch.pengawas1PangkatGol) {
        evaluatorsPatch.pengawas1PangkatGol = v;
      } else if (penilaiSection === 2 && !evaluatorsPatch.pengawas2PangkatGol) {
        evaluatorsPatch.pengawas2PangkatGol = v;
      } else if (penilaiSection === 0 && !principalPatch.pangkatGol) {
        principalPatch.pangkatGol = v;
      }
    } else if (l === 'nip' || l.startsWith('nip ')) {
      if (penilaiSection === 1 && !evaluatorsPatch.pengawas1Nip) {
        evaluatorsPatch.pengawas1Nip = v;
      } else if (penilaiSection === 2 && !evaluatorsPatch.pengawas2Nip) {
        evaluatorsPatch.pengawas2Nip = v;
      } else if (penilaiSection === 0 && !principalPatch.nip) {
        principalPatch.nip = v;
      }
    } else if (l.includes('nama penilai 1') || l.includes('penilai 1') || l.includes('pengawas 1')) {
      if (!evaluatorsPatch.pengawas1Nama && v.length > 2) evaluatorsPatch.pengawas1Nama = v;
    } else if (l.includes('nama penilai 2') || l.includes('penilai 2') || l.includes('pengawas 2')) {
      if (!evaluatorsPatch.pengawas2Nama && v.length > 2) evaluatorsPatch.pengawas2Nama = v;
    } else if (l.includes('tempat penilaian') && !evaluatorsPatch.tempatPenilaian) {
      evaluatorsPatch.tempatPenilaian = v;
    } else if (l.includes('tanggal penilaian') && !evaluatorsPatch.tanggalPenilaian) {
      evaluatorsPatch.tanggalPenilaian = v;
    }
  }

  return { yayasanName };
}

function detectComponentCodeFromLabel(text: string): 'K1' | 'K2' | 'K3' | 'K4' | null {
  const lower = text.toLowerCase();
  if (lower.includes('usaha pengembangan') || /\b(k1|komponen\s*1|komponen\s*a)\b/i.test(lower)) return 'K1';
  if (lower.includes('tugas manajerial') || /\b(k2|komponen\s*2|komponen\s*b)\b/i.test(lower)) return 'K2';
  if (lower.includes('kewirausahaan') || /\b(k3|komponen\s*3|komponen\s*c)\b/i.test(lower)) return 'K3';
  if (lower.includes('supervisi') || /\b(k4|komponen\s*4|komponen\s*d)\b/i.test(lower)) return 'K4';
  return null;
}

export function parseManualExcelWorkbook(
  buffer: ArrayBuffer,
  fileName: string,
  indicators: MasterIndicatorDef[] = MASTER_INDICATORS_V26
): ParsedManualPkkmImport {
  const wb = XLSX.read(buffer, { type: 'array', cellFormula: true, cellNF: true });
  const validIds = new Set(indicators.map((i) => i.id));
  const warnings: string[] = [];

  if (wb.vbaraw || fileName.toLowerCase().endsWith('.xlsm')) {
    warnings.push(
      'File .xlsm terdeteksi; macro VBA tidak dijalankan otomatis sehingga skor & identitas yang diekstrak dari cell Excel perlu diverifikasi sebelum disimpan.'
    );
  }

  const institutionPatch: Partial<InstitutionProfile> = {};
  const principalPatch: Partial<PrincipalProfile> = {};
  const evaluatorsPatch: Partial<EvaluatorProfile> = {};
  let yayasanName: string | undefined;

  const p1Scores: Record<string, number> = {};
  const p2Scores: Record<string, number> = {};
  const componentTargetsP1: Partial<Record<'K1' | 'K2' | 'K3' | 'K4', number>> = {};
  const componentTargetsP2: Partial<Record<'K1' | 'K2' | 'K3' | 'K4', number>> = {};
  let overallTargetP1: number | undefined;
  let overallTargetP2: number | undefined;

  const allRowsForChecklist: string[][] = [];
  const kvPairs: Array<{ label: string; value: string }> = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][];
    if (!rows || rows.length === 0) continue;

    allRowsForChecklist.push(...rows);
    const lowerSheet = sheetName.toLowerCase();

    // Collect key-value metadata candidates
    if (
      lowerSheet.includes('cover') ||
      lowerSheet.includes('identitas') ||
      lowerSheet.includes('kamad') ||
      lowerSheet.includes('penilai') ||
      lowerSheet.includes('data') ||
      lowerSheet.includes('rekap')
    ) {
      for (const row of rows.slice(0, 120)) {
        const nonEmpty = row.map((c) => String(c ?? '').trim()).filter(Boolean);
        if (nonEmpty.length >= 2) {
          kvPairs.push({ label: nonEmpty[0], value: nonEmpty[1] });
          if (nonEmpty.length >= 3 && nonEmpty[1] === ':') {
            kvPairs.push({ label: nonEmpty[0], value: nonEmpty[2] });
          }
        } else if (nonEmpty.length === 1 && nonEmpty[0].includes(':')) {
          const idx = nonEmpty[0].indexOf(':');
          kvPairs.push({
            label: nonEmpty[0].slice(0, idx),
            value: nonEmpty[0].slice(idx + 1),
          });
        }
      }
    }

    // Determine whether this sheet targets Penilai 1, Penilai 2, or both
    const sheetIsP2 =
      lowerSheet.includes('penilai2') ||
      lowerSheet.includes('penilai 2') ||
      lowerSheet.includes('p2') ||
      lowerSheet.includes('penilai ii');
    const sheetIsP1 =
      !sheetIsP2 &&
      (lowerSheet.includes('penilai1') ||
        lowerSheet.includes('penilai 1') ||
        lowerSheet.includes('p1') ||
        lowerSheet.includes('penilai i') ||
        lowerSheet.includes('instrumen'));

    // Scan header row for explicit score columns: direct P1/P2 OR checkmark 1|2|3|4 columns
    let colCheck1 = -1;
    let colCheck2 = -1;
    let colCheck3 = -1;
    let colCheck4 = -1;
    let colDirectP1 = -1;
    let colDirectP2 = -1;
    let colDirectSingle = -1;
    let colReP1 = -1;
    let colReP2 = -1;

    for (let r = 0; r < Math.min(rows.length, 30); r++) {
      const rowStr = rows[r].map((c) => String(c ?? '').trim().toLowerCase());
      for (let c = 0; c < rowStr.length; c++) {
        const cell = rowStr[c];
        if (cell === '1' && rowStr[c + 1] === '2' && rowStr[c + 2] === '3' && rowStr[c + 3] === '4') {
          colCheck1 = c;
          colCheck2 = c + 1;
          colCheck3 = c + 2;
          colCheck4 = c + 3;
        }
        if ((cell === 'p1' || cell.includes('penilai 1') || cell.includes('skor p1')) && colDirectP1 === -1) {
          colDirectP1 = c;
        }
        if ((cell === 'p2' || cell.includes('penilai 2') || cell.includes('skor p2')) && colDirectP2 === -1) {
          colDirectP2 = c;
        }
        if ((cell === 'skor' || cell === 'nilai') && colDirectSingle === -1) {
          colDirectSingle = c;
        }
        if (cell.includes('penilai 1') || cell === 'p1' || cell.includes('hasil p1')) {
          colReP1 = c;
        }
        if (cell.includes('penilai 2') || cell === 'p2' || cell.includes('hasil p2')) {
          colReP2 = c;
        }
      }
    }

    // Scan indicator rows & component summary rows
    for (const row of rows) {
      if (!row || row.length === 0) continue;
      const joined = row.map((c) => String(c ?? '').trim()).join(' ');
      if (!joined) continue;

      let foundId: string | null = null;
      for (let c = 0; c < Math.min(row.length, 5); c++) {
        const norm = normalizeIndicatorId(String(row[c] ?? ''));
        if (norm && validIds.has(norm)) {
          foundId = norm;
          break;
        }
      }

      if (foundId) {
        // Priority 1: Dual P1 & P2 columns on the same sheet
        if (colDirectP1 >= 0 && colDirectP2 >= 0) {
          const s1 = parseScoreInt(row[colDirectP1]);
          const s2 = parseScoreInt(row[colDirectP2]);
          if (s1 !== null) p1Scores[foundId] = s1;
          if (s2 !== null) p2Scores[foundId] = s2;
          continue;
        }

        // Priority 2: 4-column checkmark grid 1|2|3|4
        let checkedVal: number | null = null;
        if (colCheck1 >= 0) {
          if (isCheckCell(row[colCheck4])) checkedVal = 4;
          else if (isCheckCell(row[colCheck3])) checkedVal = 3;
          else if (isCheckCell(row[colCheck2])) checkedVal = 2;
          else if (isCheckCell(row[colCheck1])) checkedVal = 1;
        }

        // Priority 3: Single score column or trailing 1..4 integer cell
        if (checkedVal === null && colDirectSingle >= 0) {
          checkedVal = parseScoreInt(row[colDirectSingle]);
        }
        if (checkedVal === null) {
          for (let c = row.length - 1; c >= 1; c--) {
            const parsed = parseScoreInt(row[c]);
            if (parsed !== null) {
              checkedVal = parsed;
              break;
            }
          }
        }

        if (checkedVal !== null) {
          if (sheetIsP2) {
            p2Scores[foundId] = checkedVal;
          } else if (sheetIsP1 || !p1Scores[foundId]) {
            p1Scores[foundId] = checkedVal;
          }
        }
        continue;
      }

      // Summary / Rekap row detection (Komponen K1..K4 or Nilai Kinerja)
      const compCode = detectComponentCodeFromLabel(joined);
      if (compCode) {
        const pctVals: number[] = [];
        if (colReP1 >= 0 && colReP2 >= 0) {
          const v1 = parsePctValue(row[colReP1]);
          const v2 = parsePctValue(row[colReP2]);
          if (v1 !== null && !componentTargetsP1[compCode]) componentTargetsP1[compCode] = v1;
          if (v2 !== null && !componentTargetsP2[compCode]) componentTargetsP2[compCode] = v2;
        } else {
          for (let c = 1; c < row.length; c++) {
            const pct = parsePctValue(row[c]);
            if (pct !== null) pctVals.push(pct);
          }
          if (pctVals.length >= 2) {
            if (!componentTargetsP1[compCode]) componentTargetsP1[compCode] = pctVals[0];
            if (!componentTargetsP2[compCode]) componentTargetsP2[compCode] = pctVals[1];
          } else if (pctVals.length === 1) {
            if (sheetIsP2 && !componentTargetsP2[compCode]) componentTargetsP2[compCode] = pctVals[0];
            else if (!sheetIsP2 && !componentTargetsP1[compCode]) componentTargetsP1[compCode] = pctVals[0];
          }
        }
      } else if (
        joined.toLowerCase().includes('nilai kinerja') ||
        joined.toLowerCase().includes('nilai akhir') ||
        joined.toLowerCase().includes('rata-rata akhir')
      ) {
        const pctVals: number[] = [];
        for (let c = 1; c < row.length; c++) {
          const pct = parsePctValue(row[c]);
          if (pct !== null) pctVals.push(pct);
        }
        if (pctVals.length >= 2) {
          overallTargetP1 = overallTargetP1 ?? pctVals[0];
          overallTargetP2 = overallTargetP2 ?? pctVals[1];
        } else if (pctVals.length === 1) {
          if (sheetIsP2) overallTargetP2 = overallTargetP2 ?? pctVals[0];
          else overallTargetP1 = overallTargetP1 ?? pctVals[0];
        }
      }
    }
  }

  const metaRes = extractMetadataFromKeyValuePairs(
    kvPairs,
    institutionPatch,
    principalPatch,
    evaluatorsPatch
  );
  yayasanName = metaRes.yayasanName;

  const matchedTemplateIds = matchChecklistTemplatesFromRows(allRowsForChecklist);

  const p1Count = Object.keys(p1Scores).length;
  const p2Count = Object.keys(p2Scores).length;
  if (p1Count === 0 && p2Count === 0 && Object.keys(componentTargetsP1).length === 0 && overallTargetP1 === undefined) {
    warnings.push(
      'Tidak ditemukan baris skor 1–4 atau rekap nilai otomatis pada sheet Excel. Periksa apakah format kolom kode indikator (1.1.1 s/d 4.3.4) tersedia atau isi nilai langsung pada tabel Rekap.'
    );
  } else if (p1Count > 0 && p1Count < indicators.length) {
    warnings.push(
      `Hanya ${p1Count}/${indicators.length} butir Penilai 1 terbaca dari file Excel; sisanya dapat dilengkapi otomatis dari nilai target.`
    );
  }

  return {
    fileName,
    fileType: 'excel',
    detectedSheets: wb.SheetNames,
    institutionPatch,
    principalPatch,
    evaluatorsPatch,
    yayasanName,
    p1Scores,
    p2Scores,
    componentTargetsP1,
    componentTargetsP2,
    overallTargetP1,
    overallTargetP2,
    matchedTemplateIds,
    warnings,
  };
}

export function parseExtractedPdfText(
  text: string,
  fileName: string,
  indicators: MasterIndicatorDef[] = MASTER_INDICATORS_V26,
  numPages?: number
): ParsedManualPkkmImport {
  const warnings: string[] = [];
  const institutionPatch: Partial<InstitutionProfile> = {};
  const principalPatch: Partial<PrincipalProfile> = {};
  const evaluatorsPatch: Partial<EvaluatorProfile> = {};
  const p1Scores: Record<string, number> = {};
  const p2Scores: Record<string, number> = {};
  const componentTargetsP1: Partial<Record<'K1' | 'K2' | 'K3' | 'K4', number>> = {};
  const componentTargetsP2: Partial<Record<'K1' | 'K2' | 'K3' | 'K4', number>> = {};
  let overallTargetP1: number | undefined;
  let overallTargetP2: number | undefined;

  const cleanText = text.replace(/\r/g, '\n');
  const lines = cleanText
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (cleanText.length < 40) {
    warnings.push(
      'Teks PDF sangat sedikit atau merupakan PDF hasil scan gambar (tanpa OCR). Silakan ketik langsung target nilai P1 & P2 di tabel Rekap atau gunakan file Excel.'
    );
  }

  const kvPairs: Array<{ label: string; value: string }> = [];
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 1 && colonIdx < 48) {
      kvPairs.push({
        label: line.slice(0, colonIdx),
        value: line.slice(colonIdx + 1),
      });
    }
  }
  const metaRes = extractMetadataFromKeyValuePairs(
    kvPairs,
    institutionPatch,
    principalPatch,
    evaluatorsPatch
  );

  // Extract indicator-level scores from lines matching "1.1.1 ... 4" or "1.1.1 ... P1: 4 P2: 3"
  const validIds = new Set(indicators.map((i) => i.id));
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const idMatch = line.match(/\b([1-4]\.\d{1,2}\.\d{1,2})\b/);
    if (idMatch && validIds.has(idMatch[1])) {
      const indId = idMatch[1];
      const afterId = line.slice((idMatch.index || 0) + indId.length);
      const explicitDual = afterId.match(/p1\s*[:=]?\s*([1-4]).*?p2\s*[:=]?\s*([1-4])/i);
      if (explicitDual) {
        p1Scores[indId] = Number(explicitDual[1]);
        p2Scores[indId] = Number(explicitDual[2]);
        continue;
      }
      const trailingNums = afterId.match(/(?:^|\s)([1-4])(?:\s+([1-4]))?\s*$/);
      if (trailingNums) {
        p1Scores[indId] = Number(trailingNums[1]);
        if (trailingNums[2]) p2Scores[indId] = Number(trailingNums[2]);
      }
      continue;
    }

    // Component percentage extraction
    const compCode = detectComponentCodeFromLabel(line);
    if (compCode) {
      const pctMatches = Array.from(line.matchAll(/(\d{2,3}(?:[.,]\d{1,2})?)\s*%?/g))
        .map((m) => parsePctValue(m[1]))
        .filter((v): v is number => v !== null);
      if (pctMatches.length >= 2) {
        if (!componentTargetsP1[compCode]) componentTargetsP1[compCode] = pctMatches[0];
        if (!componentTargetsP2[compCode]) componentTargetsP2[compCode] = pctMatches[1];
      } else if (pctMatches.length === 1) {
        if (!componentTargetsP1[compCode]) componentTargetsP1[compCode] = pctMatches[0];
      }
    } else if (/nilai kinerja|nilai akhir/i.test(line)) {
      const pctMatches = Array.from(line.matchAll(/(\d{2,3}(?:[.,]\d{1,2})?)\s*%?/g))
        .map((m) => parsePctValue(m[1]))
        .filter((v): v is number => v !== null);
      if (pctMatches.length >= 2) {
        overallTargetP1 = overallTargetP1 ?? pctMatches[0];
        overallTargetP2 = overallTargetP2 ?? pctMatches[1];
      } else if (pctMatches.length === 1) {
        overallTargetP1 = overallTargetP1 ?? pctMatches[0];
      }
    }
  }

  const matchedTemplateIds = matchChecklistTemplatesFromRows(lines.map((l) => [l]));

  warnings.push(
    'Hasil impor PDF bersifat pembacaan teks otomatis — periksa kembali angka P1/P2 dan ceklis berkas sebelum menekan Terapkan.'
  );

  return {
    fileName,
    fileType: 'pdf',
    detectedSheets: [],
    numPages,
    institutionPatch,
    principalPatch,
    evaluatorsPatch,
    yayasanName: metaRes.yayasanName,
    p1Scores,
    p2Scores,
    componentTargetsP1,
    componentTargetsP2,
    overallTargetP1,
    overallTargetP2,
    matchedTemplateIds,
    warnings,
    extractedTextSnippet: cleanText.slice(0, 600),
  };
}

export async function uploadAndParseManualFile(
  file: File,
  idToken: string | null,
  indicators: MasterIndicatorDef[] = MASTER_INDICATORS_V26
): Promise<ParsedManualPkkmImport> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.pdf')) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
    };
    if (idToken) {
      headers.Authorization = `Bearer ${idToken}`;
    }
    const resp = await fetch('/api/import/parse-pdf', {
      method: 'POST',
      headers,
      body: file,
    });
    const payload = (await resp.json().catch(() => ({}))) as {
      text?: string;
      numPages?: number;
      error?: string;
    };
    if (!resp.ok) {
      throw new Error(payload.error || 'Gagal membaca isi PDF di server.');
    }
    return parseExtractedPdfText(payload.text || '', file.name, indicators, payload.numPages);
  }

  if (
    lower.endsWith('.xlsm') ||
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xls') ||
    lower.endsWith('.csv')
  ) {
    const buffer = await file.arrayBuffer();
    return parseManualExcelWorkbook(buffer, file.name, indicators);
  }

  throw new Error('Format file tidak didukung. Unggah file Excel (.xlsm, .xlsx, .xls, .csv) atau PDF (.pdf).');
}
