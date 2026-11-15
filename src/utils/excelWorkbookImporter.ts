import * as XLSX from 'xlsx';
import { MASTER_COMPONENTS } from '../data/masterInstrumentV26';
import { ExcelSettingSummary, MasterIndicatorDef } from '../types/saas';
import { parseInstrumentCsv } from './csvInstrumentImporter';

export interface InstrumentFileParseResult {
  indicators: MasterIndicatorDef[];
  anomalies: string[];
  totalRowsScanned: number;
  settingSummary?: ExcelSettingSummary;
}

function resolveComponent(rawComp: string, id: string): {
  code: 'K1' | 'K2' | 'K3' | 'K4';
  nomor: number;
  nama: string;
  inferred: boolean;
} {
  const upper = rawComp.trim().toUpperCase();
  const byCode = MASTER_COMPONENTS.find((c) => c.code === upper || String(c.nomor) === upper);
  if (byCode) {
    return { code: byCode.code, nomor: byCode.nomor, nama: byCode.nama, inferred: false };
  }
  const byName = MASTER_COMPONENTS.find((c) =>
    upper.includes(c.nama.toUpperCase().slice(0, 12))
  );
  if (byName) {
    return { code: byName.code, nomor: byName.nomor, nama: byName.nama, inferred: false };
  }
  const prefix = id.split('.')[0];
  const nomor = Number(prefix);
  const byPrefix = MASTER_COMPONENTS.find((c) => c.nomor === nomor);
  if (byPrefix) {
    return { code: byPrefix.code, nomor: byPrefix.nomor, nama: byPrefix.nama, inferred: true };
  }
  return { ...MASTER_COMPONENTS[0], code: 'K1', nomor: 1, nama: MASTER_COMPONENTS[0].nama, inferred: true };
}

function extractSettingSheetSummary(workbook: XLSX.WorkBook, indicatorSheetUsed: string): {
  summary: ExcelSettingSummary;
  anomalies: string[];
} {
  const detectedSheets = workbook.SheetNames;
  const anomalies: string[] = [];
  const settingEntries: { key: string; value: string; formula?: string }[] = [];
  const rekapFormulas: { cell: string; label: string; formula: string }[] = [];

  const settingSheetName = detectedSheets.find(
    (s) => s.toLowerCase().trim() === 'setting' || s.toLowerCase().includes('setting')
  );

  if (!settingSheetName) {
    anomalies.push(
      'Sheet "Setting" tidak ditemukan dalam workbook; bobot & rentang predikat tetap wajib diverifikasi manual.'
    );
  } else {
    const ws = workbook.Sheets[settingSheetName];
    const range = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : null;
    if (range) {
      for (let r = range.s.r; r <= Math.min(range.e.r, 120); r++) {
        const rowCells: { col: number; val: string; formula?: string }[] = [];
        for (let c = range.s.c; c <= Math.min(range.e.c, 12); c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = ws[addr];
          if (cell && (cell.v !== undefined || cell.f)) {
            rowCells.push({
              col: c,
              val: cell.w || (cell.v !== undefined ? String(cell.v) : ''),
              formula: cell.f,
            });
          }
        }
        if (rowCells.length >= 1) {
          const key = rowCells[0].val.trim();
          const val = rowCells
            .slice(1)
            .map((x) => x.val.trim())
            .filter(Boolean)
            .join(' | ');
          const formula = rowCells.find((x) => x.formula)?.formula;
          if (key || formula) {
            settingEntries.push({
              key: key || `Baris ${r + 1}`,
              value: val || '-',
              formula,
            });
          }
        }
      }
    }
    if (settingEntries.length === 0) {
      anomalies.push('Sheet "Setting" terdeteksi kosong atau terproteksi; verifikasi manual diperlukan.');
    }
  }

  const rekapSheetName = detectedSheets.find(
    (s) => s.toLowerCase().includes('rekap')
  );
  if (rekapSheetName) {
    const ws = workbook.Sheets[rekapSheetName];
    const range = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : null;
    if (range) {
      for (let r = range.s.r; r <= Math.min(range.e.r, 60); r++) {
        let rowLabel = '';
        for (let c = range.s.c; c <= Math.min(range.e.c, 15); c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = ws[addr];
          if (!cell) continue;
          if (!rowLabel && typeof cell.v === 'string' && cell.v.trim().length > 2) {
            rowLabel = cell.v.trim();
          }
          if (cell.f) {
            rekapFormulas.push({
              cell: addr,
              label: rowLabel || addr,
              formula: `=${cell.f}`,
            });
          }
        }
      }
    }
  }

  if (workbook.vbaraw) {
    anomalies.push(
      'File mengandung macro VBA (.xlsm). Macro tidak dieksekusi di browser; periksa formula & bobot pada ringkasan sheet Setting sebelum aktivasi.'
    );
  }

  return {
    summary: {
      detectedSheets,
      indicatorSheetUsed,
      settingEntries: settingEntries.slice(0, 60),
      rekapFormulas: rekapFormulas.slice(0, 40),
      requiresManualVerification: true,
    },
    anomalies,
  };
}

function parseRowsAsIndicators(rows: string[][]): {
  indicators: MasterIndicatorDef[];
  anomalies: string[];
  totalRowsScanned: number;
} {
  const anomalies: string[] = [];
  const indicators: MasterIndicatorDef[] = [];
  const seenIds = new Set<string>();

  if (rows.length < 2) {
    return {
      indicators: [],
      anomalies: ['Sheet tidak memiliki baris header dan data indikator.'],
      totalRowsScanned: rows.length,
    };
  }

  let headerIdx = -1;
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const joined = rows[r].map((c) => String(c || '').toLowerCase()).join(' ');
    if (
      (joined.includes('indikator') || joined.includes('uraian') || joined.includes('id')) &&
      (joined.includes('bukti') || joined.includes('data') || joined.includes('komponen') || joined.includes('skor'))
    ) {
      headerIdx = r;
      break;
    }
  }

  if (headerIdx === -1) {
    headerIdx = 0;
  }

  const headers = rows[headerIdx].map((h) => String(h || '').toLowerCase().trim());
  const findCol = (patterns: string[]) =>
    headers.findIndex((h) => patterns.some((p) => h === p || h.includes(p)));

  const colId = findCol(['id', 'kode indikator', 'kode']);
  const colKomponen = findCol(['komponencode', 'komponen', 'tugas utama']);
  const colSubKode = findCol(['subkomponenkode', 'sub kode', 'sub']);
  const colSubNama = findCol(['subkomponennama', 'sub komponen', 'unsur tugas']);
  const colIndNomor = findCol(['indikatornomor', 'no.']);
  const colIndNama = findCol(['indikatornama', 'indikator kerja', 'indikator', 'uraian']);
  const colDataDiharapkan = findCol(['datadiharapkan', 'data yang diharapkan', 'data']);
  const colBuktiWajib = findCol(['buktiwajib', 'bukti hasil', 'bukti fisik', 'bukti']);
  const colBobot = findCol(['bobot']);

  if (colIndNama === -1) {
    return {
      indicators: [],
      anomalies: ['Kolom nama indikator tidak ditemukan pada sheet ini.'],
      totalRowsScanned: rows.length,
    };
  }

  let activeCompCode = '';
  let activeSubKode = '';
  let activeSubNama = '';

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const cols = rows[r].map((c) => String(c || '').trim());
    if (colKomponen >= 0 && cols[colKomponen]) activeCompCode = cols[colKomponen];
    if (colSubKode >= 0 && cols[colSubKode]) activeSubKode = cols[colSubKode];
    if (colSubNama >= 0 && cols[colSubNama]) activeSubNama = cols[colSubNama];

    const indikatorNama = (cols[colIndNama] || '').trim();
    if (!indikatorNama || indikatorNama.length < 4) continue;

    // Skip summary rows at bottom of Excel sheets
    const lowerInd = indikatorNama.toLowerCase();
    if (
      lowerInd.startsWith('jumlah skor') ||
      lowerInd.startsWith('skor maksimal') ||
      lowerInd.startsWith('nilai kinerja')
    ) {
      continue;
    }

    let id = colId >= 0 ? cols[colId] : '';
    if (!id && colIndNomor >= 0 && cols[colIndNomor] && activeSubKode) {
      const cleanNo = cols[colIndNomor].replace(/[^0-9]/g, '');
      if (cleanNo) id = `${activeSubKode}.${cleanNo}`;
    }
    if (!id) {
      id = `xl.${r - headerIdx}`;
      anomalies.push(`Baris ${r + 1}: Kode/ID indikator kosong, diberi ID sementara "${id}".`);
    }

    if (seenIds.has(id)) {
      anomalies.push(`Baris ${r + 1}: Duplikasi ID indikator "${id}" dilewati.`);
      continue;
    }
    seenIds.add(id);

    const comp = resolveComponent(activeCompCode, id);
    if (!activeCompCode && comp.inferred) {
      anomalies.push(`Indikator ${id}: Komponen kosong, otomatis dipetakan ke ${comp.code}.`);
    }

    const subKode = activeSubKode || id.split('.').slice(0, 2).join('.') || `${comp.nomor}.1`;
    const subNama = activeSubNama || `Subkomponen ${subKode}`;
    const indNomor =
      colIndNomor >= 0 && cols[colIndNomor]
        ? cols[colIndNomor]
        : `${id.split('.').pop() || r}.)`;
    const dataDiharapkan =
      colDataDiharapkan >= 0 && cols[colDataDiharapkan]
        ? cols[colDataDiharapkan]
        : 'Dokumen & bukti fisik sesuai instrumen';
    const rawBukti = colBuktiWajib >= 0 ? cols[colBuktiWajib] || '' : '';
    const buktiWajib = rawBukti
      .split(/[;|•\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (buktiWajib.length === 0) {
      anomalies.push(`Indikator ${id}: Daftar bukti wajib kosong (perlu verifikasi manual).`);
    }

    let bobot = 1;
    if (colBobot >= 0 && cols[colBobot]) {
      const parsedBobot = Number(cols[colBobot]);
      if (Number.isNaN(parsedBobot) || parsedBobot <= 0) {
        anomalies.push(`Indikator ${id}: Nilai bobot "${cols[colBobot]}" tidak valid, diset default 1.`);
      } else {
        bobot = parsedBobot;
      }
    }

    indicators.push({
      id,
      komponenCode: comp.code,
      komponenNomor: comp.nomor,
      komponenNama: comp.nama,
      subKomponenKode: subKode,
      subKomponenNama: subNama,
      indikatorNomor: indNomor,
      indikatorNama,
      dataDiharapkan,
      buktiWajib: buktiWajib.length ? buktiWajib : ['Dokumen pendukung fisik/digital'],
      bobot,
    });
  }

  if (indicators.length !== 96) {
    anomalies.push(
      `Jumlah indikator terdeteksi adalah ${indicators.length} butir (standar PKKM_v.26 untuk RA berjumlah 96 butir). Periksa kembali sebelum aktivasi.`
    );
  }

  return {
    indicators,
    anomalies,
    totalRowsScanned: rows.length - headerIdx - 1,
  };
}

export function parseInstrumentExcelWorkbook(buffer: ArrayBuffer): InstrumentFileParseResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellFormula: true });
  const preferredOrder = [
    ...workbook.SheetNames.filter((s) => s.toLowerCase().includes('nilaipenilai1')),
    ...workbook.SheetNames.filter((s) => s.toLowerCase().includes('nilai penilai 1')),
    ...workbook.SheetNames.filter((s) => s.toLowerCase().includes('instrumen')),
    ...workbook.SheetNames.filter((s) => s.toLowerCase().includes('hasil penilai 1')),
    ...workbook.SheetNames,
  ];
  const uniqueCandidates = Array.from(new Set(preferredOrder));

  let bestResult: {
    sheetName: string;
    indicators: MasterIndicatorDef[];
    anomalies: string[];
    totalRowsScanned: number;
  } | null = null;

  for (const sheetName of uniqueCandidates) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;
    const rawRows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' });
    if (!rawRows.length) continue;
    const parsed = parseRowsAsIndicators(rawRows);
    if (!bestResult || parsed.indicators.length > bestResult.indicators.length) {
      bestResult = {
        sheetName,
        ...parsed,
      };
    }
    if (parsed.indicators.length === 96) {
      break;
    }
  }

  if (!bestResult || bestResult.indicators.length === 0) {
    return {
      indicators: [],
      anomalies: [
        `Tidak ditemukan tabel indikator yang valid pada sheet workbook (${workbook.SheetNames.join(', ')}).`,
      ],
      totalRowsScanned: 0,
    };
  }

  const settingInspection = extractSettingSheetSummary(workbook, bestResult.sheetName);

  return {
    indicators: bestResult.indicators,
    anomalies: [...settingInspection.anomalies, ...bestResult.anomalies],
    totalRowsScanned: bestResult.totalRowsScanned,
    settingSummary: settingInspection.summary,
  };
}

export async function parseInstrumentUploadFile(file: File): Promise<InstrumentFileParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'csv') {
    const text = await file.text();
    const res = parseInstrumentCsv(text);
    return {
      ...res,
      settingSummary: {
        detectedSheets: ['CSV'],
        indicatorSheetUsed: file.name,
        settingEntries: [],
        rekapFormulas: [],
        requiresManualVerification: true,
      },
    };
  }
  if (ext === 'xlsm' || ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer();
    return parseInstrumentExcelWorkbook(buffer);
  }
  throw new Error('Format file instrumen tidak didukung. Gunakan .xlsm, .xlsx, .xls, atau .csv.');
}
