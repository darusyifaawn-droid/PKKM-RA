import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, BorderStyle } from 'docx';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { PpkmData } from '../types/ppkm';
import { MASTER_INDICATORS_V26 } from '../data/masterInstrumentV26';
import {
  AssessorScoreRecord,
  EvidenceFileRecord,
  GeneratedDocRecord,
  MasterIndicatorDef,
  RecommendationItemRecord,
} from '../types/saas';
import { computeDualAssessorRekap } from './pkkmScoring';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generate a formatted A4 Word (.docx) document for any generated document or administrative draft.
 */
export async function buildDocxBlob(
  docData: {
    title: string;
    docNumber?: string;
    category: string;
    status: string;
    bodyContent: string;
  },
  ppkmData: PpkmData
): Promise<Blob> {
  const { institution, principal, evaluators, adminDocs } = ppkmData;
  const lines = docData.bodyContent.split('\n');

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: adminDocs?.namaYayasan || 'YAYASAN PENYELENGGARA RA', bold: true, size: 22 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: institution.namaLembaga, bold: true, size: 28 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: {
        bottom: { color: '000000', space: 4, style: BorderStyle.DOUBLE, size: 12 },
      },
      children: [
        new TextRun({
          text: `NSM: ${institution.nsm} | NPSN: ${institution.npsn || institution.npsm} | ${institution.alamat}, Kec. ${institution.kecamatan}, ${institution.kotaKab}`,
          size: 18,
        }),
      ],
    }),
    new Paragraph({ text: '' }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({ text: docData.title.toUpperCase(), bold: true, size: 24 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Nomor: ${docData.docNumber || '[NOMOR DOKUMEN MENYUSUL]'}   |   Status: ${docData.status}`,
          italics: docData.status === 'DRAFT',
          size: 20,
        }),
      ],
    }),
    new Paragraph({ text: '' }),
    ...lines.map(
      (line) =>
        new Paragraph({
          spacing: { after: 100, line: 276 },
          children: [new TextRun({ text: line, size: 22 })],
        })
    ),
    new Paragraph({ text: '' }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: `${evaluators.tempatPenilaian || '-'}, ${evaluators.tanggalPenilaian || '-'}`,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: 'Kepala Raudhatul Athfal,', size: 22 })],
    }),
    new Paragraph({ text: '' }),
    new Paragraph({ text: '' }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: principal.namaLengkap, bold: true, underline: {}, size: 22 }),
      ],
    }),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 twips
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1417 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export async function downloadDocumentAsDocx(
  docData: {
    title: string;
    docNumber?: string;
    category: string;
    status: string;
    bodyContent: string;
  },
  ppkmData: PpkmData
) {
  const blob = await buildDocxBlob(docData, ppkmData);
  const safeName = docData.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  triggerDownload(blob, `${safeName}.docx`);
}

/**
 * Build real multi-sheet XLSX workbook matching PKKM_v.26 untuk RA sheets + Format 9 & 10.
 */
export function buildPkkmWorkbookBuffer(
  ppkmData: PpkmData,
  p1Scores: Record<string, AssessorScoreRecord>,
  p2Scores: Record<string, AssessorScoreRecord>,
  yearLabel = '2026',
  indicators: MasterIndicatorDef[] = MASTER_INDICATORS_V26,
  evidenceFiles: EvidenceFileRecord[] = [],
  recommendations: RecommendationItemRecord[] = []
): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const rekap = computeDualAssessorRekap(p1Scores, p2Scores, indicators);

  // Sheet 1: Identitas
  const identitasRows = [
    ['IDENTITAS RAUDHATUL ATHFAL & KEPALA RA', ''],
    ['Nama Lembaga', ppkmData.institution.namaLembaga],
    ['NSM / NPSN', `${ppkmData.institution.nsm} / ${ppkmData.institution.npsn || ppkmData.institution.npsm}`],
    ['Alamat', `${ppkmData.institution.alamat}, Kec. ${ppkmData.institution.kecamatan}, ${ppkmData.institution.kotaKab}`],
    ['Periode Penilaian', yearLabel],
    ['Nama Kepala RA', ppkmData.principal.namaLengkap],
    ['NUPTK / NPK', `${ppkmData.principal.nuptk} / ${ppkmData.principal.npk}`],
    ['Penilai 1', `${ppkmData.evaluators.pengawas1Nama} (NIP. ${ppkmData.evaluators.pengawas1Nip})`],
    ['Penilai 2', `${ppkmData.evaluators.pengawas2Nama} (NIP. ${ppkmData.evaluators.pengawas2Nip})`],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(identitasRows), 'Identitas');

  // Sheet 2: NilaiPenilai1
  const p1Rows = [
    ['No', 'Komponen', 'Subkomponen', 'Indikator Kinerja', 'Data Yang Diharapkan', 'Skor P1 (1-4)', 'Catatan Penilai 1'],
    ...indicators.map((ind) => [
      ind.id,
      ind.komponenNama,
      `${ind.subKomponenKode} ${ind.subKomponenNama}`,
      ind.indikatorNama,
      ind.dataDiharapkan,
      p1Scores[ind.id]?.score ?? 0,
      p1Scores[ind.id]?.note ?? '',
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(p1Rows), 'NilaiPenilai1');

  // Sheet 3: NilaiPenilai2
  const p2Rows = [
    ['No', 'Komponen', 'Subkomponen', 'Indikator Kinerja', 'Data Yang Diharapkan', 'Skor P2 (1-4)', 'Catatan Penilai 2'],
    ...indicators.map((ind) => [
      ind.id,
      ind.komponenNama,
      `${ind.subKomponenKode} ${ind.subKomponenNama}`,
      ind.indikatorNama,
      ind.dataDiharapkan,
      p2Scores[ind.id]?.score ?? 0,
      p2Scores[ind.id]?.note ?? '',
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(p2Rows), 'NilaiPenilai2');

  // Sheet 4: Rekap Nilai (Strict Dual Assessor Gate)
  const rekapRows = [
    ['REKAPITULASI HASIL PENILAIAN KINERJA TAHUNAN KEPALA RA', '', '', '', '', ''],
    ['Lembaga', ppkmData.institution.namaLembaga, 'Periode', yearLabel, 'Status Final', rekap.isBothComplete ? 'FINAL' : 'BELUM FINAL'],
    ['No', 'Tugas Utama', 'Skor Penilai 1', 'Skor Penilai 2', 'Rata-rata Skor', 'Capaian (%)'],
    ...rekap.rataRataKomponen.map((c) => [
      c.komponenNomor,
      c.komponenNama,
      c.p1Skor,
      c.p2Skor,
      Number(c.rataSkor.toFixed(2)),
      Number(c.rataNilai100.toFixed(2)),
    ]),
    ['', `Jumlah Skor (Maks ${rekap.penilai1.maxSkorTotal})`, rekap.penilai1.jumlahSkor, rekap.penilai2.jumlahSkor, Number(rekap.jumlahSkorRataRata.toFixed(2)), ''],
    [
      '',
      'Nilai Kinerja (0-100)',
      rekap.penilai1.isComplete ? Number(rekap.penilai1.nilaiKinerja.toFixed(2)) : 'Belum Lengkap',
      rekap.penilai2.isComplete ? Number(rekap.penilai2.nilaiKinerja.toFixed(2)) : 'Belum Lengkap',
      rekap.isBothComplete && rekap.finalNilaiKinerjaTahunan !== null ? Number(rekap.finalNilaiKinerjaTahunan.toFixed(2)) : 'BELUM FINAL',
      '',
    ],
    [
      '',
      'Predikat Penilaian Kinerja Tahunan',
      rekap.isBothComplete && rekap.finalPredikat ? rekap.finalPredikat : 'BELUM FINAL (Lengkapi 100% P1 & P2)',
      '',
      '',
      '',
    ],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rekapRows), 'Rekap Nilai');

  // Sheet 5: Rekap Bukti Fisik (Format 9)
  const buktiRows = [
    ['No', 'Indikator Utama', 'Indikator Tertaut', 'Nama Berkas', 'Keterangan', 'Status Verifikasi', 'Catatan Penilai'],
    ...evidenceFiles.map((ev, idx) => [
      idx + 1,
      ev.indicatorId,
      (ev.linkedIndicatorIds && ev.linkedIndicatorIds.length > 0 ? ev.linkedIndicatorIds : [ev.indicatorId]).join(', '),
      ev.fileName,
      ev.description,
      ev.verificationStatus,
      ev.verificationNote || '',
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(buktiRows), 'Rekap Bukti Fisik');

  // Sheet 6: Rekomendasi RTL (Format 10)
  const rtlRows = [
    ['No', 'Sumber', 'Komponen', 'Temuan', 'Rekomendasi', 'Rencana Tindak Lanjut', 'Penanggung Jawab', 'Target Waktu', 'Status'],
    ...recommendations.map((rec, idx) => [
      idx + 1,
      rec.sourceRole,
      rec.komponenNama,
      rec.temuan,
      rec.rekomendasi,
      rec.rencanaTindakLanjut,
      rec.penanggungJawab,
      rec.targetWaktu,
      rec.status,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rtlRows), 'Rekomendasi RTL');

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

export function downloadPkkmAsXlsx(
  ppkmData: PpkmData,
  p1Scores: Record<string, AssessorScoreRecord>,
  p2Scores: Record<string, AssessorScoreRecord>,
  yearLabel = '2026',
  indicators: MasterIndicatorDef[] = MASTER_INDICATORS_V26,
  evidenceFiles: EvidenceFileRecord[] = [],
  recommendations: RecommendationItemRecord[] = []
) {
  const buffer = buildPkkmWorkbookBuffer(ppkmData, p1Scores, p2Scores, yearLabel, indicators, evidenceFiles, recommendations);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const slug = ppkmData.institution.namaLembaga.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  triggerDownload(blob, `rekap_pkkm_${slug}_${yearLabel}.xlsx`);
}

/**
 * Export complete institution PKKM bundle (XLSX Rekap + DOCX generated docs + JSON data) as a single .zip archive.
 */
export async function downloadPkkmAsZip(
  ppkmData: PpkmData,
  p1Scores: Record<string, AssessorScoreRecord>,
  p2Scores: Record<string, AssessorScoreRecord>,
  generatedDocs: GeneratedDocRecord[],
  yearLabel = '2026',
  indicators: MasterIndicatorDef[] = MASTER_INDICATORS_V26,
  evidenceFiles: EvidenceFileRecord[] = [],
  recommendations: RecommendationItemRecord[] = []
) {
  const zip = new JSZip();
  const xlsxBuffer = buildPkkmWorkbookBuffer(ppkmData, p1Scores, p2Scores, yearLabel, indicators, evidenceFiles, recommendations);
  const slug = ppkmData.institution.namaLembaga.toLowerCase().replace(/[^a-z0-9]+/g, '_');

  zip.file(`Rekap_Nilai_PKKM_${slug}_${yearLabel}.xlsx`, xlsxBuffer);
  zip.file(
    `Backup_Data_${slug}_${yearLabel}.json`,
    JSON.stringify({ ppkmData, p1Scores, p2Scores, evidenceFiles, recommendations, generatedDocs }, null, 2)
  );

  const docsFolder = zip.folder('Dokumen_Administrasi_DOCX');
  if (docsFolder) {
    for (const d of generatedDocs) {
      const docxBlob = await buildDocxBlob(d, ppkmData);
      const docFile = d.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      docsFolder.file(`${docFile}.docx`, docxBlob);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(zipBlob, `Bundel_PKKM_${slug}_${yearLabel}.zip`);
}
