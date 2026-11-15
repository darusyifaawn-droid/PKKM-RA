import { MASTER_COMPONENTS } from '../data/masterInstrumentV26';
import { MasterIndicatorDef } from '../types/saas';

export interface CsvImportParseResult {
  indicators: MasterIndicatorDef[];
  anomalies: string[];
  totalRowsScanned: number;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    const next = normalized[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell.trim());
        cell = '';
      } else if (ch === '\n') {
        row.push(cell.trim());
        if (row.some((c) => c.length > 0)) {
          rows.push(row);
        }
        row = [];
        cell = '';
      } else {
        cell += ch;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((c) => c.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
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

export function parseInstrumentCsv(csvText: string): CsvImportParseResult {
  const rows = parseCsvRows(csvText);
  const anomalies: string[] = [];
  const indicators: MasterIndicatorDef[] = [];
  const seenIds = new Set<string>();

  if (rows.length < 2) {
    return {
      indicators: [],
      anomalies: ['File CSV kosong atau tidak memiliki baris header dan data.'],
      totalRowsScanned: rows.length,
    };
  }

  // Locate header row (handles Excel CSV exports that start with title lines)
  let headerIdx = 0;
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const joined = rows[r].join(' ').toLowerCase();
    if (
      (joined.includes('indikator') || joined.includes('id') || joined.includes('kode')) &&
      (joined.includes('data') || joined.includes('bukti') || joined.includes('komponen') || joined.includes('uraian'))
    ) {
      headerIdx = r;
      break;
    }
  }

  const headers = rows[headerIdx].map((h) => h.toLowerCase().trim());
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
    anomalies.push('Kolom "indikator" / "indikatorNama" tidak ditemukan pada header CSV.');
    return { indicators: [], anomalies, totalRowsScanned: rows.length };
  }

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const cols = rows[r];
    const indikatorNama = (cols[colIndNama] || '').trim();
    if (!indikatorNama) continue;

    let id = colId >= 0 ? (cols[colId] || '').trim() : '';
    if (!id) {
      id = `custom.${r - headerIdx}`;
      anomalies.push(`Baris ${r + 1}: Kode/ID indikator kosong, diberi ID sementara "${id}".`);
    }

    if (seenIds.has(id)) {
      anomalies.push(`Baris ${r + 1}: Duplikasi ID indikator "${id}" dilewati.`);
      continue;
    }
    seenIds.add(id);

    const rawComp = colKomponen >= 0 ? cols[colKomponen] || '' : '';
    const comp = resolveComponent(rawComp, id);
    if (!rawComp && comp.inferred) {
      anomalies.push(`Indikator ${id}: Komponen kosong, otomatis dipetakan ke ${comp.code}.`);
    }

    const subKode =
      colSubKode >= 0 && cols[colSubKode]
        ? cols[colSubKode].trim()
        : id.split('.').slice(0, 2).join('.') || `${comp.nomor}.1`;
    const subNama =
      colSubNama >= 0 && cols[colSubNama]
        ? cols[colSubNama].trim()
        : `Subkomponen ${subKode}`;
    const indNomor =
      colIndNomor >= 0 && cols[colIndNomor]
        ? cols[colIndNomor].trim()
        : `${id.split('.').pop() || r}.)`;
    const dataDiharapkan =
      colDataDiharapkan >= 0 && cols[colDataDiharapkan]
        ? cols[colDataDiharapkan].trim()
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
