import React, { useEffect, useState } from 'react';
import { PpkmData, PhotoEvidenceItem } from '../../types/ppkm';
import { EMPTY_ADMIN_DOCS } from '../../data/cleanPpkmFactory';
import { DOCUMENT_TEMPLATES, MASTER_INDICATORS_V26 } from '../../data/masterInstrumentV26';
import {
  AssessorScoreRecord,
  EvidenceFileRecord,
  EvidenceVerificationStatus,
  GeneratedDocRecord,
  IndicatorResponseRecord,
  MasterIndicatorDef,
  RecommendationItemRecord,
} from '../../types/saas';
import { computeDualAssessorRekap, getPredikatKemenag } from '../../utils/pkkmScoring';
import { isEvidenceLinkedToIndicator } from '../../utils/autoPopulatePkkm';
import { Printer, ArrowLeft, AlertTriangle } from 'lucide-react';

export type PrintTabKey =
  | 'bundel_lengkap'
  | 'paket_excel_lengkap'
  | 'format1_cover_excel'
  | 'format2_identitas'
  | 'format3_kelengkapan'
  | 'format4_instrumen_96'
  | 'format4_p1_detail'
  | 'format4_p2_detail'
  | 'format5_hasil_p1'
  | 'format6_hasil_p2'
  | 'format7_rekap_nilai'
  | 'format8_rekap_grafik'
  | 'format9_bukti_fisik'
  | 'format10_rtl'
  | 'cover_pengesahan'
  | 'surat_pernyataan'
  | 'surat_tugas'
  | 'sk_pembagian_tugas'
  | 'berita_acara'
  | 'isi_laporan'
  | 'rekap_instrumen'
  | 'dokumen_otomatis'
  | 'lampiran';

export type ChapterSubFilter =
  | 'all_chapters'
  | 'pengantar_isi'
  | 'bab1'
  | 'bab2'
  | 'bab3'
  | 'bab4'
  | 'bab5'
  | 'bab6'
  | 'bab7';

interface PrintViewProps {
  data: PpkmData;
  onBackToEdit: () => void;
  p1Scores?: Record<string, AssessorScoreRecord>;
  p2Scores?: Record<string, AssessorScoreRecord>;
  p1Note?: string;
  p2Note?: string;
  generatedDocs?: GeneratedDocRecord[];
  responses?: Record<string, IndicatorResponseRecord>;
  evidenceFiles?: EvidenceFileRecord[];
  recommendations?: RecommendationItemRecord[];
  indicators?: MasterIndicatorDef[];
  periodLabel?: string;
  initialTab?: PrintTabKey;
  autoPrintOnMount?: boolean;
  onAutoPrintConsumed?: () => void;
}

const PRINT_TABS: { key: PrintTabKey; label: string }[] = [
  { key: 'paket_excel_lengkap', label: 'Paket Resmi 53 Halaman (Lampiran PDF)' },
  { key: 'bundel_lengkap', label: 'Bundel Lengkap A4' },
  { key: 'format1_cover_excel', label: 'Format 1: Cover Bingkai Hijau' },
  { key: 'format2_identitas', label: 'Format 2: Identitas & Penilai' },
  { key: 'format5_hasil_p1', label: 'Format 5: Hasil Penilai 1' },
  { key: 'format6_hasil_p2', label: 'Format 6: Hasil Penilai 2' },
  { key: 'format4_p1_detail', label: 'Instrumen 96 Butir (Penilai 1)' },
  { key: 'format4_p2_detail', label: 'Instrumen 96 Butir (Penilai 2)' },
  { key: 'format7_rekap_nilai', label: 'Format 7: Rekap Akhir (Hal. 53)' },
  { key: 'format3_kelengkapan', label: 'Format 3: Kelengkapan' },
  { key: 'format4_instrumen_96', label: 'Format 4: Matriks Gabungan (Landscape)' },
  { key: 'format8_rekap_grafik', label: 'Format 8: Rekap & Grafik' },
  { key: 'format9_bukti_fisik', label: 'Format 9: Rekap Bukti Fisik' },
  { key: 'format10_rtl', label: 'Format 10: Rekomendasi & RTL' },
  { key: 'cover_pengesahan', label: 'Cover & Pengesahan' },
  { key: 'surat_pernyataan', label: 'Surat Pernyataan' },
  { key: 'surat_tugas', label: 'Surat Tugas' },
  { key: 'sk_pembagian_tugas', label: 'SK Pembagian Tugas' },
  { key: 'berita_acara', label: 'Berita Acara' },
  { key: 'isi_laporan', label: 'Bab I–VII Laporan' },
  { key: 'rekap_instrumen', label: 'Ringkasan Matriks 96' },
  { key: 'dokumen_otomatis', label: '27 Dokumen Administrasi' },
  { key: 'lampiran', label: 'Lampiran & Foto' },
];

const VERIF_LABEL: Record<EvidenceVerificationStatus, string> = {
  not_uploaded: 'Belum Diunggah',
  uploaded: 'Sudah Diunggah',
  pending: 'Menunggu Verifikasi',
  needs_revision: 'Perlu Revisi',
  verified: 'Terverifikasi',
};

function formatCommaNum(num: number, decimals: number = 2): string {
  return num.toFixed(decimals).replace('.', ',');
}

function extractYearFromPeriod(label?: string): string {
  const match = (label || '').match(/20\d{2}/);
  return match ? match[0] : '2026';
}

export const PrintView: React.FC<PrintViewProps> = ({
  data,
  onBackToEdit,
  p1Scores = {},
  p2Scores = {},
  p1Note = '',
  p2Note = '',
  generatedDocs = [],
  responses = {},
  evidenceFiles = [],
  recommendations = [],
  indicators = MASTER_INDICATORS_V26,
  periodLabel,
  initialTab,
  autoPrintOnMount = false,
  onAutoPrintConsumed,
}) => {
  const [activePrintTab, setActivePrintTab] = useState<PrintTabKey>(
    initialTab || 'paket_excel_lengkap'
  );
  const [chapterSubFilter, setChapterSubFilter] = useState<ChapterSubFilter>('all_chapters');
  const [photoLayout, setPhotoLayout] = useState<'2_per_page' | '4_per_page'>('2_per_page');
  const [includeDocsInBundle, setIncludeDocsInBundle] = useState(true);

  useEffect(() => {
    if (initialTab) {
      setActivePrintTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (!autoPrintOnMount) return;
    const timer = window.setTimeout(() => {
      window.print();
      onAutoPrintConsumed?.();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [autoPrintOnMount, onAutoPrintConsumed]);

  const handlePrint = () => {
    window.print();
  };

  const activeInds = indicators.length > 0 ? indicators : MASTER_INDICATORS_V26;
  const rekapV26 = computeDualAssessorRekap(p1Scores, p2Scores, activeInds);

  const {
    institution,
    principal,
    evaluators,
    ptkList,
    students,
    buildings,
    inventory,
    programGoals,
    photoEvidences,
  } = data;

  const adminDocs = {
    ...EMPTY_ADMIN_DOCS,
    ...(data.adminDocs || {}),
  };

  const assessmentYear = extractYearFromPeriod(periodLabel || institution.periodePenilaian);

  const totalL = students.reduce((acc, curr) => acc + (Number(curr.lakiLaki) || 0), 0);
  const totalP = students.reduce((acc, curr) => acc + (Number(curr.perempuan) || 0), 0);
  const totalStudents = totalL + totalP;

  const chunkSize = photoLayout === '2_per_page' ? 2 : 4;
  const photoChunks: PhotoEvidenceItem[][] = [];
  for (let i = 0; i < photoEvidences.length; i += chunkSize) {
    photoChunks.push(photoEvidences.slice(i, i + chunkSize));
  }

  const currentDateStr = evaluators.tanggalPenilaian || '-';
  const logoKemenag =
    institution.logoKemenagUrl || '/src/assets/images/kemenag_logo_seal_1792239796040.jpg';
  const logoLembaga = institution.logoUrl || logoKemenag;

  const EXCEL_PACKAGE_SECTIONS: PrintTabKey[] = [
    'format1_cover_excel',
    'format2_identitas',
    'format5_hasil_p1',
    'format6_hasil_p2',
    'format4_p1_detail',
    'format4_p2_detail',
    'format7_rekap_nilai',
  ];

  const showSection = (tabKey: PrintTabKey) => {
    if (activePrintTab === 'bundel_lengkap') {
      return (
        tabKey !== 'format4_p1_detail' &&
        tabKey !== 'format4_p2_detail' &&
        tabKey !== 'paket_excel_lengkap'
      );
    }
    if (activePrintTab === 'paket_excel_lengkap') {
      return EXCEL_PACKAGE_SECTIONS.includes(tabKey);
    }
    return activePrintTab === tabKey;
  };

  const showChapter = (chapter: Exclude<ChapterSubFilter, 'all_chapters'>) =>
    activePrintTab === 'bundel_lengkap' ||
    (activePrintTab === 'isi_laporan' &&
      (chapterSubFilter === 'all_chapters' || chapterSubFilter === chapter));

  const checklist12 = [
    {
      no: 1,
      sektor: 'Profil & Identitas Lembaga RA',
      ok: Boolean(institution.namaLembaga && institution.nsm && (institution.npsn || institution.npsm) && institution.alamat),
      ket: institution.namaLembaga ? `NSM ${institution.nsm || '-'}` : 'Belum diisi',
    },
    {
      no: 2,
      sektor: 'Identitas Kepala RA',
      ok: Boolean(principal.namaLengkap && (principal.nuptk || principal.nip || principal.npk)),
      ket: principal.namaLengkap || 'Belum diisi',
    },
    {
      no: 3,
      sektor: 'Data Penilai 1 & Penilai 2',
      ok: Boolean(evaluators.pengawas1Nama && evaluators.pengawas2Nama),
      ket: evaluators.pengawas1Nama ? `P1: ${evaluators.pengawas1Nama}` : 'Belum diisi',
    },
    {
      no: 4,
      sektor: 'Data Guru & Tendik (PTK)',
      ok: ptkList.length > 0,
      ket: `${ptkList.length} PTK`,
    },
    {
      no: 5,
      sektor: 'Data Peserta Didik & Rombel',
      ok: students.length > 0,
      ket: `${totalStudents} santri`,
    },
    {
      no: 6,
      sektor: 'Sarana, Prasarana & Inventaris APE',
      ok: buildings.length > 0 || inventory.length > 0,
      ket: `${buildings.length} ruang · ${inventory.length} aset`,
    },
    {
      no: 7,
      sektor: 'Visi, Misi & Program Kerja RA',
      ok: Boolean(programGoals.visi && programGoals.misi.length > 0),
      ket: programGoals.visi ? `${programGoals.misi.length} misi` : 'Belum diisi',
    },
    {
      no: 8,
      sektor: 'Naskah Dinas (IJOP, Pernyataan, ST, SK, BA)',
      ok: Boolean(adminDocs.suratPernyataanNomor && adminDocs.suratTugasNomor && adminDocs.skPanitiaNomor && adminDocs.beritaAcaraNomor),
      ket: adminDocs.skPanitiaNomor || 'Belum lengkap',
    },
    {
      no: 9,
      sektor: 'Administrasi Otomatis (27 Dokumen)',
      ok: generatedDocs.length >= 20,
      ket: `${generatedDocs.length} dokumen`,
    },
    {
      no: 10,
      sektor: `Kesiapan Indikator (${activeInds.length} Butir)`,
      ok: activeInds.filter((i) => responses[i.id]?.completionStatus === 'complete').length === activeInds.length,
      ket: `${activeInds.filter((i) => responses[i.id]?.completionStatus === 'complete').length}/${activeInds.length} siap`,
    },
    {
      no: 11,
      sektor: 'Arsip Bukti Fisik Portofolio',
      ok: evidenceFiles.length > 0,
      ket: `${evidenceFiles.length} berkas`,
    },
    {
      no: 12,
      sektor: 'Penilaian Independen P1 & P2',
      ok: rekapV26.isBothComplete,
      ket: `P1 ${rekapV26.penilai1.scoredIndicators}/${rekapV26.penilai1.totalIndicators} · P2 ${rekapV26.penilai2.scoredIndicators}/${rekapV26.penilai2.totalIndicators}`,
    },
  ];

  // Reusable Official Kop Surat Component
  const KopSuratDinas: React.FC<{ variant?: 'kemenag' | 'yayasan' }> = ({ variant = 'yayasan' }) => (
    <div className="flex items-center justify-between gap-3 pb-2.5 mb-4 border-b-4 border-double border-black">
      <div className="w-16 h-16 shrink-0 flex items-center justify-center">
        <img src={logoKemenag} alt="Logo Kemenag RI" className="max-h-full max-w-full object-contain" />
      </div>
      <div className="text-center flex-1 leading-tight">
        <p className="text-[10px] font-bold uppercase tracking-wider text-black">
          KEMENTERIAN AGAMA REPUBLIK INDONESIA
        </p>
        <p className="text-[10px] font-bold uppercase text-black">
          KANTOR KEMENTERIAN AGAMA {(institution.kotaKab || '-').toUpperCase()}
        </p>
        {variant === 'yayasan' && adminDocs.namaYayasan && (
          <p className="text-[10px] font-bold uppercase text-black mt-0.5">
            {adminDocs.namaYayasan}
          </p>
        )}
        <h2 className="text-sm font-black uppercase text-black tracking-wide mt-0.5">
          {institution.namaLembaga || '-'}
        </h2>
        <p className="text-[9px] text-black mt-0.5">
          NSM: {institution.nsm || '-'} · NPSN: {institution.npsn || institution.npsm || '-'} · No. IJOP: {adminDocs.izinOperasionalNomor || '-'}
        </p>
        <p className="text-[8.5px] text-black">
          Alamat: {institution.alamat || '-'}, Kec. {institution.kecamatan || '-'}, {institution.kotaKab || '-'}, {institution.provinsi || '-'}
        </p>
        <p className="text-[8.5px] text-black font-mono">
          Telp: {institution.telepon || '-'} · Email: {institution.email || '-'}
        </p>
      </div>
      <div className="w-16 h-16 shrink-0 flex items-center justify-center">
        <img src={logoLembaga} alt="Logo Lembaga" className="max-h-full max-w-full object-contain" />
      </div>
    </div>
  );

  const getSkRoleForPtk = (tugas: string, index: number) => {
    const lower = tugas.toLowerCase();
    if (lower.includes('kepala')) return 'Penanggung Jawab & Ketua Tim PKKRA';
    if (lower.includes('kurikulum')) return 'Koordinator Komponen A & Kurikulum (KOM)';
    if (lower.includes('bendahara')) return 'Sekretaris & Koordinator Keuangan BOP (B-04)';
    if (index === 2) return 'Koordinator Komponen Pembelajaran, APE & Supervisi';
    return 'Anggota & Pengumpul Bukti Fisik Portofolio';
  };

  const renderAssessorResultSheet = (role: 'PENILAI_1' | 'PENILAI_2') => {
    const isP1 = role === 'PENILAI_1';
    const summary = isP1 ? rekapV26.penilai1 : rekapV26.penilai2;
    const noteText = isP1 ? p1Note : p2Note;
    const assessorName = isP1 ? evaluators.pengawas1Nama : evaluators.pengawas2Nama;
    const assessorNip = isP1 ? evaluators.pengawas1Nip : evaluators.pengawas2Nip;
    const assessorPangkat = isP1 ? evaluators.pengawas1PangkatGol : evaluators.pengawas2PangkatGol;
    const assessorJabatan = isP1
      ? evaluators.pengawas1Jabatan || 'Pengawas Ahli Madya'
      : evaluators.pengawas2Jabatan || 'Pengawas Ahli Madya';
    const assessorUnit = isP1 ? evaluators.pengawas1UnitKerja : evaluators.pengawas2UnitKerja;
    const nuptkNrgStr = [principal.nuptk, principal.nrg].filter((v) => v && v !== '-').join(' / ') || principal.nuptk || '-';
    const roundedNilai = Math.round(summary.nilaiKinerja);

    return (
      <div className="a4-sheet bg-white p-7 md:p-9 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-5 text-[11px] text-black">
        <div className="text-center space-y-0.5 pb-2 border-b-2 border-[#008000]">
          <h2 className="text-[13px] font-black uppercase tracking-wide text-black">
            HASIL PENILAIAN KINERJA TAHUNAN KEPALA RA TAHUN {assessmentYear}
          </h2>
          <p className="text-xs font-bold uppercase text-black">
            ( PENILAI {isP1 ? '1' : '2'} )
          </p>
        </div>

        {!summary.isComplete && summary.incompleteWarning && (
          <div className="border border-amber-400 bg-amber-50 p-2.5 text-[10.5px] text-amber-950 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
            <div>
              <strong className="block">{summary.incompleteWarning}</strong>
              <span>
                Terisi: {summary.scoredIndicators} / {summary.totalIndicators} indikator. Hasil resmi menunggu 100% butir dinilai.
              </span>
            </div>
          </div>
        )}

        {/* 2-Column Identity Info Box matching PDF Pages 4 & 5 */}
        <div className="grid grid-cols-2 gap-4 text-[10px]">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="py-0.5 w-32 align-top">Nama Kepala RA</td>
                <td className="py-0.5 w-3 align-top">:</td>
                <td className="py-0.5 font-bold">{principal.namaLengkap || '-'}</td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">NIP</td>
                <td className="py-0.5 align-top">:</td>
                <td className="py-0.5 font-mono">{principal.nip || '-'}</td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">Pangkat / Gol. Ruang</td>
                <td className="py-0.5 align-top">:</td>
                <td className="py-0.5">{principal.pangkatGol || '-'}</td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">NUPTK/PegID / NRG</td>
                <td className="py-0.5 align-top">:</td>
                <td className="py-0.5 font-mono">{nuptkNrgStr}</td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">Jabatan</td>
                <td className="py-0.5 align-top">:</td>
                <td className="py-0.5">{principal.jabatan || 'Kepala Raudhatul Athfal'}</td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">Unit Kerja</td>
                <td className="py-0.5 align-top">:</td>
                <td className="py-0.5">{principal.unitKerja || '-'}</td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">Tempat Tugas</td>
                <td className="py-0.5 align-top">:</td>
                <td className="py-0.5 font-semibold">{institution.namaLembaga || '-'}</td>
              </tr>
            </tbody>
          </table>

          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="py-0.5 w-32 align-top">Periode Penilaian</td>
                <td className="py-0.5 w-3 align-top">:</td>
                <td className="py-0.5 font-semibold">{institution.periodePenilaian || periodLabel || '-'}</td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">Nama Penilai {isP1 ? '1' : '2'}</td>
                <td className="py-0.5 align-top">:</td>
                <td className="py-0.5 font-bold">{assessorName || '-'}</td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">NIP</td>
                <td className="py-0.5 align-top">:</td>
                <td className="py-0.5 font-mono">{assessorNip || '-'}</td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">Pangkat / Gol. Ruang</td>
                <td className="py-0.5 align-top">:</td>
                <td className="py-0.5">{assessorPangkat || '-'}</td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">Jabatan</td>
                <td className="py-0.5 align-top">:</td>
                <td className="py-0.5">{assessorJabatan}</td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">Unit Kerja</td>
                <td className="py-0.5 align-top">:</td>
                <td className="py-0.5">{assessorUnit || '-'}</td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">Nomor SK Tugas</td>
                <td className="py-0.5 align-top">:</td>
                <td className="py-0.5 font-mono">{evaluators.skPenugasanNomor || adminDocs.suratTugasNomor || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Main 4-Component Table matching PDF Pages 4 & 5 */}
        <table className="w-full text-[11px] border border-black border-collapse tabular-nums">
          <thead>
            <tr className="bg-[#e8f5e9] font-bold border-b border-black">
              <th className="p-2 text-center border-r border-black w-12">No</th>
              <th className="p-2 text-center border-r border-black">Komponen</th>
              <th className="p-2 text-center w-28">Skor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black">
            {summary.components.map((c) => (
              <tr key={c.komponenCode}>
                <td className="p-2 text-center border-r border-black font-mono">{c.komponenNomor}</td>
                <td className="p-2 border-r border-black font-semibold">{c.komponenNama}</td>
                <td className="p-2 text-center font-mono font-bold text-xs">{c.rawScore}</td>
              </tr>
            ))}
            <tr className="font-bold bg-slate-50">
              <td colSpan={2} className="p-2 text-center border-r border-black">
                Jumlah Skor
              </td>
              <td className="p-2 text-center font-mono text-xs">{summary.jumlahSkor}</td>
            </tr>
            <tr className="font-black bg-[#e8f5e9]">
              <td colSpan={2} className="p-2 text-center border-r border-black">
                Nilai Kinerja
              </td>
              <td className="p-2 text-center font-mono text-sm">
                {summary.isComplete ? roundedNilai : '-'}
                {summary.isComplete && (
                  <span className="block text-[9px] font-normal text-slate-700">
                    ({formatCommaNum(summary.nilaiKinerja, 2)})
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Red Rekomendasi box matching attached PDF */}
        <div className="border border-black p-3 bg-rose-50/70 min-h-[76px] space-y-1">
          <p className="font-bold text-[11px] text-rose-700">Rekomendasi:</p>
          <p className="text-[10.5px] text-black whitespace-pre-line">
            {noteText || 'Pertahankan capaian komponen yang sudah baik dan tingkatkan dokumentasi bukti fisik supervisi serta administrasi akademik.'}
          </p>
        </div>

        {/* Dual Signatures matching attached PDF */}
        <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[10.5px] avoid-break">
          <div>
            <p className="font-normal">Kepala {institution.namaLembaga || '-'},</p>
            <div className="h-16" />
            <p className="font-bold underline">{principal.namaLengkap || '-'}</p>
            <p className="font-mono text-[9.5px]">
              NIP. {principal.nip || '-'}
            </p>
          </div>
          <div>
            <p>{evaluators.tempatPenilaian || 'Cirebon'}, {currentDateStr}</p>
            <p className="font-normal">Penilai {isP1 ? '1' : '2'},</p>
            <div className="h-16" />
            <p className="font-bold underline">{assessorName || '-'}</p>
            <p className="font-mono text-[9.5px]">NIP. {assessorNip || '-'}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderCombinedIdentityPage6 = () => (
    <div className="a4-sheet bg-white p-7 md:p-8 border-[4px] border-[#008000] shadow-md mx-auto mb-8 max-w-[210mm] space-y-4 text-[10.5px] text-black">
      <div className="text-center border-b-2 border-[#008000] pb-2">
        <h2 className="text-xs font-black uppercase tracking-wide text-black">
          IDENTITAS PENILAI DAN KEPALA RAUDHATUL ATHFAL YANG DINILAI
        </h2>
      </div>

      <div className="space-y-3">
        <div>
          <p className="font-bold bg-[#e8f5e9] border border-[#008000] px-2 py-1 uppercase text-[10px]">
            A. Identitas Penilai
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <p className="font-bold underline mb-1">a. Penilai 1</p>
              <table className="w-full text-[10px] border-collapse">
                <tbody>
                  <tr><td className="py-0.5 w-32">Nama</td><td className="w-3">:</td><td className="font-bold">{evaluators.pengawas1Nama || '-'}</td></tr>
                  <tr><td className="py-0.5">NIP</td><td>:</td><td className="font-mono">{evaluators.pengawas1Nip || '-'}</td></tr>
                  <tr><td className="py-0.5">Pangkat/Golongan Ruang</td><td>:</td><td>{evaluators.pengawas1PangkatGol || '-'}</td></tr>
                  <tr><td className="py-0.5">Jabatan</td><td>:</td><td>{evaluators.pengawas1Jabatan || '-'}</td></tr>
                  <tr><td className="py-0.5">Unit Kerja</td><td>:</td><td>{evaluators.pengawas1UnitKerja || '-'}</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <p className="font-bold underline mb-1">b. Penilai 2</p>
              <table className="w-full text-[10px] border-collapse">
                <tbody>
                  <tr><td className="py-0.5 w-32">Nama</td><td className="w-3">:</td><td className="font-bold">{evaluators.pengawas2Nama || '-'}</td></tr>
                  <tr><td className="py-0.5">NIP</td><td>:</td><td className="font-mono">{evaluators.pengawas2Nip || '-'}</td></tr>
                  <tr><td className="py-0.5">Pangkat/Golongan Ruang</td><td>:</td><td>{evaluators.pengawas2PangkatGol || '-'}</td></tr>
                  <tr><td className="py-0.5">Jabatan</td><td>:</td><td>{evaluators.pengawas2Jabatan || '-'}</td></tr>
                  <tr><td className="py-0.5">Unit Kerja</td><td>:</td><td>{evaluators.pengawas2UnitKerja || '-'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="pt-2">
            <p className="font-bold underline mb-1">c. SK Penugasan</p>
            <table className="w-full text-[10px] border-collapse">
              <tbody>
                <tr><td className="py-0.5 w-44">Nomor</td><td className="w-3">:</td><td className="font-mono font-semibold">{evaluators.skPenugasanNomor || adminDocs.suratTugasNomor || '-'}</td></tr>
                <tr><td className="py-0.5">Tanggal Surat Tugas</td><td>:</td><td>{evaluators.skPenugasanTanggal || '-'}</td></tr>
                <tr><td className="py-0.5">Berlaku s/d</td><td>:</td><td>{evaluators.skPenugasanBerlakuSampai || '-'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <p className="font-bold bg-[#e8f5e9] border border-[#008000] px-2 py-1 uppercase text-[10px]">
            B. Identitas Kepala Raudhatul Athfal Yang Dinilai
          </p>
          <table className="w-full text-[10px] border-collapse mt-1.5">
            <tbody>
              <tr><td className="py-0.5 w-52">a. Nama</td><td className="w-3">:</td><td className="font-bold">{principal.namaLengkap || '-'}</td></tr>
              <tr><td className="py-0.5">b. NIP</td><td>:</td><td className="font-mono">{principal.nip || '-'}</td></tr>
              <tr><td className="py-0.5">c. Pangkat / Golongan Ruang</td><td>:</td><td>{principal.pangkatGol || '-'}</td></tr>
              <tr><td className="py-0.5">d. NUPTK / PegID / NRG</td><td>:</td><td className="font-mono">{[principal.nuptk, principal.nrg].filter((v) => v && v !== '-').join(' / ') || principal.nuptk || '-'}</td></tr>
              <tr><td className="py-0.5">e. Tempat Tanggal Lahir</td><td>:</td><td>{principal.tempatTanggalLahir || '-'}</td></tr>
              <tr><td className="py-0.5">f. Jenis Kelamin</td><td>:</td><td>{principal.jenisKelamin || '-'}</td></tr>
              <tr><td className="py-0.5">g. Pendidikan Terakhir / Spesialisasi</td><td>:</td><td>{principal.pendidikanTerakhir || '-'}</td></tr>
              <tr><td className="py-0.5">h. Jabatan</td><td>:</td><td>{principal.jabatan || 'Kepala Raudhatul Athfal'}</td></tr>
              <tr><td className="py-0.5">i. Tempat Tugas / Satuan RA</td><td>:</td><td className="font-bold">{institution.namaLembaga || '-'} · {institution.alamat || '-'}, Ds. {institution.desaKelurahan || '-'}, Kec. {institution.kecamatan || '-'}, {institution.kotaKab || '-'}</td></tr>
              <tr><td className="py-0.5">j. Unit Kerja</td><td>:</td><td>{principal.unitKerja || '-'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#e8f5e9] border border-[#008000] px-3 py-2 font-bold text-center text-[10.5px]">
        Periode Penilaian : {institution.periodePenilaian || periodLabel || '-'}
      </div>
    </div>
  );

  const renderAssessorDetailInstrument96 = (role: 'PENILAI_1' | 'PENILAI_2') => {
    const isP1 = role === 'PENILAI_1';
    const scoreMap = isP1 ? p1Scores : p2Scores;
    const summary = isP1 ? rekapV26.penilai1 : rekapV26.penilai2;
    const assessorName = isP1 ? evaluators.pengawas1Nama : evaluators.pengawas2Nama;
    const assessorNip = isP1 ? evaluators.pengawas1Nip : evaluators.pengawas2Nip;
    const assessorJabatan = isP1
      ? evaluators.pengawas1Jabatan || 'Pengawas Ahli Madya'
      : evaluators.pengawas2Jabatan || 'Pengawas Ahli Madya';

    const compBuckets = [1, 2, 3, 4].map((num) => {
      const items = activeInds.filter((ind) => ind.komponenNomor === num);
      const compSummary = summary.components.find((c) => c.komponenNomor === num);
      return {
        nomor: num,
        nama: items[0]?.komponenNama || compSummary?.komponenNama || `KOMPONEN ${num}`,
        items,
        compSummary,
      };
    });

    return (
      <div className="a4-sheet bg-white p-5 md:p-6 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-3 text-black">
        <div className="text-center border-b-2 border-black pb-1.5">
          <p className="text-[11px] font-black uppercase tracking-wide">
            INSTRUMEN PENILAIAN KINERJA KEPALA RAUDHATUL ATHFAL
          </p>
          <p className="text-[10.5px] font-bold">
            (Penilai {isP1 ? '1' : '2'})
          </p>
        </div>

        <table className="w-full text-[9.5px] border-none">
          <tbody>
            <tr>
              <td colSpan={3} className="font-bold pt-0.5">A. Kepala RA Yang Dinilai</td>
            </tr>
            <tr>
              <td className="pl-4 w-36">Nama / NIP</td>
              <td className="w-3">:</td>
              <td className="font-bold">
                {principal.namaLengkap || '-'} / NIP. {principal.nip || '-'}
              </td>
            </tr>
            <tr>
              <td className="pl-4">Tempat Tugas</td>
              <td>:</td>
              <td>
                {institution.namaLembaga || '-'}, {institution.alamat || '-'}, Kec. {institution.kecamatan || '-'}, {institution.kotaKab || '-'}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="font-bold pt-1.5">B. Penilai {isP1 ? '1' : '2'}</td>
            </tr>
            <tr>
              <td className="pl-4">Nama / NIP</td>
              <td>:</td>
              <td className="font-bold">
                {assessorName || '-'} / NIP. {assessorNip || '-'}
              </td>
            </tr>
            <tr>
              <td className="pl-4">Jabatan</td>
              <td>:</td>
              <td>{assessorJabatan}</td>
            </tr>
            <tr>
              <td className="font-bold pt-1.5">C. Periode Penilaian</td>
              <td className="pt-1.5">:</td>
              <td className="pt-1.5 font-semibold">{periodLabel || institution.periodePenilaian || '-'}</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full text-[8px] border border-black border-collapse tabular-nums">
          <thead>
            <tr className="bg-slate-100 font-bold border-b border-black text-center">
              <th rowSpan={2} className="p-1 border-r border-black w-9 align-middle">No.</th>
              <th rowSpan={2} className="p-1 border-r border-black w-28 align-middle">
                Tugas Utama / Unsur Tugas Utama
              </th>
              <th rowSpan={2} className="p-1 border-r border-black align-middle">Indikator Kinerja</th>
              <th rowSpan={2} className="p-1 border-r border-black w-32 align-middle">
                Data Yang Diharapkan
              </th>
              <th rowSpan={2} className="p-1 border-r border-black w-36 align-middle">
                Bukti Hasil Kinerja
              </th>
              <th colSpan={4} className="p-1 border-b border-black">
                Hasil Kinerja*
              </th>
            </tr>
            <tr className="bg-slate-100 font-bold border-b border-black text-center">
              <th className="p-0.5 border-r border-black w-5">1</th>
              <th className="p-0.5 border-r border-black w-5">2</th>
              <th className="p-0.5 border-r border-black w-5">3</th>
              <th className="p-0.5 w-5">4</th>
            </tr>
          </thead>
          <tbody>
            {compBuckets.map((bucket) => {
              let lastSubCode = '';
              return (
                <React.Fragment key={bucket.nomor}>
                  <tr className="bg-slate-200 font-black border-y border-black">
                    <td colSpan={9} className="p-1.5 uppercase tracking-wide">
                      {bucket.nomor}. {bucket.nama}
                    </td>
                  </tr>
                  {bucket.items.map((ind) => {
                    const isNewSub = ind.subKomponenKode !== lastSubCode;
                    lastSubCode = ind.subKomponenKode;
                    const scored = scoreMap[ind.id]?.score;
                    return (
                      <tr key={ind.id} className="border-b border-slate-400 align-top">
                        <td className="p-1 text-center font-mono font-bold border-r border-black">
                          {isNewSub ? ind.subKomponenKode : ''}
                        </td>
                        <td className="p-1 border-r border-black font-semibold">
                          {isNewSub ? ind.subKomponenNama : ''}
                        </td>
                        <td className="p-1 border-r border-black leading-snug">
                          <span className="font-semibold mr-1">{ind.indikatorNomor}</span>
                          {ind.indikatorNama}
                        </td>
                        <td className="p-1 border-r border-black leading-snug text-slate-800">
                          {ind.dataDiharapkan}
                        </td>
                        <td className="p-1 border-r border-black leading-snug">
                          <ul className="list-disc pl-3 space-y-0.5">
                            {ind.buktiWajib.map((b, idx) => (
                              <li key={idx}>{b}</li>
                            ))}
                          </ul>
                        </td>
                        {[1, 2, 3, 4].map((col) => (
                          <td
                            key={col}
                            className={`p-1 text-center font-black align-middle ${
                              col < 4 ? 'border-r border-black' : ''
                            } ${scored === col ? 'bg-emerald-50 text-black' : ''}`}
                          >
                            {scored === col ? 'V' : ''}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {bucket.compSummary && (
                    <tr className="bg-slate-50 font-bold border-b border-black">
                      <td colSpan={5} className="p-1 text-right border-r border-black">
                        Sub-Jumlah Komponen {bucket.nomor} ({bucket.compSummary.scoredCount}/
                        {bucket.compSummary.indicatorCount} butir)
                      </td>
                      <td colSpan={4} className="p-1 text-center font-mono">
                        {bucket.compSummary.rawScore} / {bucket.compSummary.maxScore}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            <tr className="bg-[#e8f5e9] font-black border-t-2 border-black">
              <td colSpan={5} className="p-1.5 text-right border-r border-black uppercase">
                Jumlah Skor Total Penilai {isP1 ? '1' : '2'} (Maks. {summary.maxSkorTotal}) · Nilai Kinerja
              </td>
              <td colSpan={4} className="p-1.5 text-center font-mono">
                {summary.jumlahSkor} ({Math.round(summary.nilaiKinerja)})
              </td>
            </tr>
          </tbody>
        </table>

        <div className="pt-3 grid grid-cols-2 gap-8 text-center text-[10px] avoid-break">
          <div>
            <p>Kepala RA Yang Dinilai,</p>
            <div className="h-12" />
            <p className="font-bold underline">{principal.namaLengkap || '-'}</p>
            <p className="font-mono text-[9px]">
              NIP/NUPTK. {principal.nip && principal.nip !== '-' ? principal.nip : principal.nuptk || '-'}
            </p>
          </div>
          <div>
            <p>{evaluators.tempatPenilaian || '-'}, {currentDateStr}</p>
            <p>Penilai {isP1 ? '1' : '2'},</p>
            <div className="h-12" />
            <p className="font-bold underline">{assessorName || '-'}</p>
            <p className="font-mono text-[9px]">NIP. {assessorNip || '-'}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 font-sans">
      {/* ============================================================== */}
      {/* TOOLBAR AKSES CEPAT & MENU TAB CETAK (NO-PRINT)                */}
      {/* ============================================================== */}
      <div className="no-print sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-slate-300 shadow-sm pt-3 pb-2.5 px-4 sm:px-6 mb-6">
        <div className="max-w-6xl mx-auto space-y-2.5">
          {/* Top Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={onBackToEdit}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300 whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
                <span>Kembali</span>
              </button>

              <div className="text-xs text-slate-600 hidden md:block">
                Pratinjau Cetak Resmi A4 · <strong className="text-slate-900">{institution.namaLembaga}</strong>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
              {activePrintTab === 'bundel_lengkap' && generatedDocs.length > 0 && (
                <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 cursor-pointer whitespace-nowrap shrink-0">
                  <input
                    type="checkbox"
                    checked={includeDocsInBundle}
                    onChange={(e) => setIncludeDocsInBundle(e.target.checked)}
                    className="rounded accent-emerald-700"
                  />
                  <span>Sertakan {generatedDocs.length} Dokumen Otomatis</span>
                </label>
              )}

              {(activePrintTab === 'bundel_lengkap' || activePrintTab === 'lampiran') && (
                <div className="flex items-center gap-1 text-xs border border-slate-300 rounded-md p-0.5 bg-slate-50">
                  <button
                    onClick={() => setPhotoLayout('2_per_page')}
                    className={`px-2.5 py-1 rounded-xs text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      photoLayout === '2_per_page' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    2 Foto/Hal
                  </button>
                  <button
                    onClick={() => setPhotoLayout('4_per_page')}
                    className={`px-2.5 py-1 rounded-xs text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      photoLayout === '4_per_page' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    4 Foto/Hal
                  </button>
                </div>
              )}

              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Save PDF A4</span>
              </button>
            </div>
          </div>

          {/* Interactive Print Tab Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-200 pt-2">
            {PRINT_TABS.map((tab) => {
              const isActive = activePrintTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActivePrintTab(tab.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
                    isActive
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Secondary Chapter Filter when Bab I-VII Laporan tab is active */}
          {activePrintTab === 'isi_laporan' && (
            <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 overflow-x-auto">
              <span className="font-semibold text-slate-700 whitespace-nowrap shrink-0">Filter Bab:</span>
              {(
                [
                  { id: 'all_chapters', name: 'Semua Bab I–VII' },
                  { id: 'pengantar_isi', name: 'Pengantar & Daftar Isi' },
                  { id: 'bab1', name: 'Bab I' },
                  { id: 'bab2', name: 'Bab II' },
                  { id: 'bab3', name: 'Bab III' },
                  { id: 'bab4', name: 'Bab IV' },
                  { id: 'bab5', name: 'Bab V' },
                  { id: 'bab6', name: 'Bab VI' },
                  { id: 'bab7', name: 'Bab VII' },
                ] as { id: ChapterSubFilter; name: string }[]
              ).map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setChapterSubFilter(ch.id)}
                  className={`px-2.5 py-1 rounded-xs text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    chapterSubFilter === ch.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {ch.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PAPER CONTAINER A4 */}
      <div className="print-page-wrapper max-w-[210mm] mx-auto text-black font-sans">
        {/* ============================================================== */}
        {/* 1. COVER / SAMPUL RESMI LAPORAN PKKRA                          */}
        {/* ============================================================== */}
        {showSection('cover_pengesahan') && (
          <div className="cover-sheet a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] flex flex-col justify-between text-center relative">
            <div className="border-4 border-double border-emerald-950 p-6 h-full flex flex-col justify-between text-center bg-white">
              <div className="text-right border-b border-slate-300 pb-1.5">
                <p className="text-[9px] font-bold uppercase text-slate-700 font-mono tracking-wider">
                  {institution.namaLembaga} | DOKUMEN PORTOFOLIO &amp; EVALUASI DIRI KEPALA RA
                </p>
                <p className="text-[8px] text-emerald-900 font-semibold">
                  {periodLabel || 'PKKRA'} · NSM: {institution.nsm || '-'} · NPSN: {institution.npsn || institution.npsm || '-'}
                </p>
              </div>

              <div className="space-y-2 py-3">
                <p className="text-xs font-bold tracking-widest text-slate-900 uppercase">
                  KEMENTERIAN AGAMA REPUBLIK INDONESIA
                </p>
                <p className="text-xs font-bold tracking-wider text-slate-800 uppercase">
                  KANTOR KEMENTERIAN AGAMA {(institution.kotaKab || '-').toUpperCase()}
                </p>

                <div className="py-3 flex justify-center gap-4 items-center">
                  <div className="w-22 h-22 p-1 border border-slate-200 rounded-sm bg-white flex items-center justify-center">
                    <img src={logoKemenag} alt="Logo Kemenag RI" className="max-h-full max-w-full object-contain" />
                  </div>
                  {logoLembaga !== logoKemenag && (
                    <div className="w-22 h-22 p-1 border border-slate-200 rounded-sm bg-white flex items-center justify-center">
                      <img src={logoLembaga} alt="Logo Lembaga" className="max-h-full max-w-full object-contain" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h1 className="text-base sm:text-lg font-black uppercase tracking-wide text-emerald-950 leading-tight">
                    LAPORAN PENILAIAN KINERJA KEPALA RAUDHATUL ATHFAL (PKKRA)
                  </h1>
                  <h2 className="text-sm font-extrabold text-amber-900 uppercase">
                    {institution.periodePenilaian || periodLabel || '-'}
                  </h2>
                  <p className="text-xs font-bold text-slate-700 uppercase">
                    TAHUN PELAJARAN {institution.tahunPelajaran || '-'}
                  </p>
                  <h3 className="text-base font-black text-slate-900 uppercase pt-1">
                    {institution.namaLembaga}
                  </h3>
                  <p className="text-xs font-semibold text-emerald-800 italic">
                    {institution.accreditationDetail?.peringkat || institution.akreditasi || '-'}
                  </p>
                </div>
              </div>

              {(institution.fotoMadrasahUrl || principal.fotoUrl) && (
                <div className="my-2 flex items-center justify-center gap-4">
                  {institution.fotoMadrasahUrl && (
                    <div className="w-44 h-28 border border-slate-400 overflow-hidden bg-slate-50 p-0.5 shadow-xs flex items-center justify-center">
                      <img src={institution.fotoMadrasahUrl} alt="Gedung Lembaga" className="max-h-full max-w-full object-contain" />
                    </div>
                  )}
                  {principal.fotoUrl && (
                    <div className="w-24 h-28 border border-slate-400 overflow-hidden bg-slate-50 p-0.5 shadow-xs flex items-center justify-center">
                      <img src={principal.fotoUrl} alt={principal.namaLengkap} className="max-h-full max-w-full object-contain" />
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1 py-2 border-t border-b border-slate-300">
                <p className="text-[10px] font-bold text-slate-600 uppercase">Disusun oleh:</p>
                <p className="text-xs font-extrabold text-slate-950 uppercase">
                  {principal.namaLengkap || '-'} ({principal.jabatan || 'Kepala RA'} {institution.namaLembaga})
                </p>
                <p className="text-[10px] text-slate-700 max-w-lg mx-auto leading-tight">
                  {institution.alamat || '-'}, Kec. {institution.kecamatan || '-'}, {institution.kotaKab || '-'}, {institution.provinsi || '-'}
                </p>
              </div>

              <div className="pt-2 text-xs font-extrabold text-slate-900 uppercase tracking-widest">
                {(institution.kotaKab || 'INDONESIA').toUpperCase()} · TAHUN {new Date().getFullYear()}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* HALAMAN 1: COVER BINGKAI HIJAU (LAMPIRAN PDF HAL. 1)           */}
        {/* ============================================================== */}
        {showSection('format1_cover_excel') && (
          <div className="cover-sheet a4-sheet bg-white p-5 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm]">
            <div className="border-[6px] border-[#008000] p-8 h-full min-h-[258mm] flex flex-col justify-between text-center bg-white">
              <div className="space-y-2 pt-2">
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-wide text-black leading-snug">
                  PENILAIAN KINERJA
                  <br />
                  KEPALA RAUDHATUL ATHFAL (PKKRA)
                </h1>
                <p className="text-sm font-bold text-black pt-1">
                  Periode : {institution.periodePenilaian || periodLabel || '-'}
                </p>
              </div>

              <div className="py-4 flex justify-center">
                <img src={logoKemenag} alt="Logo Kemenag RI" className="w-32 h-32 object-contain" />
              </div>

              <div className="mx-auto w-full max-w-[460px] text-left text-xs text-black">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr>
                      <td className="py-1.5 w-44 align-top font-semibold">Nama</td>
                      <td className="py-1.5 w-4 align-top">:</td>
                      <td className="py-1.5 font-bold uppercase">{principal.namaLengkap || '-'}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 align-top font-semibold">N I P</td>
                      <td className="py-1.5 align-top">:</td>
                      <td className="py-1.5 font-mono">{principal.nip || '-'}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 align-top font-semibold">Pangkat / Gol. Ruang</td>
                      <td className="py-1.5 align-top">:</td>
                      <td className="py-1.5">{principal.pangkatGol || '-'}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 align-top font-semibold">NUPTK / PegID / NRG</td>
                      <td className="py-1.5 align-top">:</td>
                      <td className="py-1.5 font-mono">
                        {[principal.nuptk, principal.nrg].filter((v) => v && v !== '-').join(' / ') || principal.nuptk || '-'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 align-top font-semibold">Jabatan</td>
                      <td className="py-1.5 align-top">:</td>
                      <td className="py-1.5">{principal.jabatan || 'Kepala Raudhatul Athfal'}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 align-top font-semibold">Tempat Tugas</td>
                      <td className="py-1.5 align-top">:</td>
                      <td className="py-1.5">
                        <strong className="block font-bold">{institution.namaLembaga || '-'}</strong>
                        <span className="block">
                          {institution.alamat || '-'} Ds. {institution.desaKelurahan || '-'} Kec. {institution.kecamatan || '-'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 align-top font-semibold">Unit Kerja</td>
                      <td className="py-1.5 align-top">:</td>
                      <td className="py-1.5 font-semibold">{principal.unitKerja || `Kementerian Agama ${institution.kotaKab || ''}`}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="pt-4 pb-2 space-y-0.5 text-center text-black border-t border-slate-200">
                <p className="text-xs font-black uppercase tracking-wider">
                  KEMENTERIAN AGAMA REPUBLIK INDONESIA
                </p>
                <p className="text-xs font-black uppercase tracking-wider">
                  KANTOR {(institution.kotaKab || 'KABUPATEN CIREBON').toUpperCase()}
                </p>
                <p className="text-[10px] text-slate-800 pt-0.5">
                  Jalan Sunan Drajat No. 5 Komplek Perkantoran Sumber Cirebon – 45611
                </p>
                <p className="text-[10px] text-slate-800 font-mono">
                  e-mail : cirebon@kemenag.go.id , website : cirebon.kemenag.go.id
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* HALAMAN 2 & 3: IDENTITAS KEPALA RA (19 BARIS) & DATA PENILAI   */}
        {/* ============================================================== */}
        {showSection('format2_identitas') && (
          <>
            {/* Halaman 2: IDENTITAS KEPALA RAUDHATUL ATHFAL YANG DINILAI */}
            <div className="a4-sheet bg-white p-7 md:p-9 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-4 text-xs text-black">
              <div className="text-center border-b-2 border-[#008000] pb-2">
                <h2 className="text-sm font-black uppercase tracking-wide text-black">
                  IDENTITAS KEPALA RAUDHATUL ATHFAL YANG DINILAI
                </h2>
              </div>

              <table className="w-full text-[11px] border border-black border-collapse">
                <tbody className="divide-y divide-slate-400">
                  <tr>
                    <td className="p-2 w-8 text-center font-mono border-r border-slate-400">1</td>
                    <td className="p-2 w-60 font-semibold bg-[#f4faf4] border-r border-slate-400">Nama Kepala RA</td>
                    <td className="p-2 font-bold">{principal.namaLengkap || '-'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-mono border-r border-slate-400">2</td>
                    <td className="p-2 font-semibold bg-[#f4faf4] border-r border-slate-400">NIP / No. Seri Karpeg</td>
                    <td className="p-2 font-mono">{principal.nip || '-'} / {principal.noSeriKarpeg || '-'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-mono border-r border-slate-400">3</td>
                    <td className="p-2 font-semibold bg-[#f4faf4] border-r border-slate-400">Tempat / Tanggal Lahir</td>
                    <td className="p-2">{principal.tempatTanggalLahir || '-'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-mono border-r border-slate-400">4</td>
                    <td className="p-2 font-semibold bg-[#f4faf4] border-r border-slate-400">Pangkat / Golongan Ruang</td>
                    <td className="p-2">{principal.pangkatGol || '-'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-mono border-r border-slate-400">5</td>
                    <td className="p-2 font-semibold bg-[#f4faf4] border-r border-slate-400">TMT Sebagai Kepala RA</td>
                    <td className="p-2">{principal.tmtJabatan || '-'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-mono border-r border-slate-400">6</td>
                    <td className="p-2 font-semibold bg-[#f4faf4] border-r border-slate-400">Masa Kerja Sebagai Kepala RA</td>
                    <td className="p-2">{principal.masaKerjaTahun || '0'} Tahun {principal.masaKerjaBulan || '0'} Bulan</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-mono border-r border-slate-400">7</td>
                    <td className="p-2 font-semibold bg-[#f4faf4] border-r border-slate-400">NUPTK / PegID / NRG</td>
                    <td className="p-2 font-mono">{principal.nuptk || '-'} / {principal.nrg || '-'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-mono border-r border-slate-400">8</td>
                    <td className="p-2 font-semibold bg-[#f4faf4] border-r border-slate-400">Jenis Kelamin</td>
                    <td className="p-2">{principal.jenisKelamin || '-'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-mono border-r border-slate-400">9</td>
                    <td className="p-2 font-semibold bg-[#f4faf4] border-r border-slate-400">Pendidikan Terakhir / Spesialisasi</td>
                    <td className="p-2">{principal.pendidikanTerakhir || '-'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-mono border-r border-slate-400">10</td>
                    <td className="p-2 font-semibold bg-[#f4faf4] border-r border-slate-400">Program Keahlian / Jabatan</td>
                    <td className="p-2">{principal.programKeahlian || principal.jabatan || '-'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-mono border-r border-slate-400">11</td>
                    <td className="p-2 font-semibold bg-[#f4faf4] border-r border-slate-400">Nama Raudhatul Athfal (RA)</td>
                    <td className="p-2 font-bold">{institution.namaLembaga || '-'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-mono border-r border-slate-400">12</td>
                    <td className="p-2 font-semibold bg-[#f4faf4] border-r border-slate-400">Alamat Lengkap RA</td>
                    <td className="p-2">{institution.alamat || '-'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-mono border-r border-slate-400">13</td>
                    <td className="p-2 font-semibold bg-[#f4faf4] border-r border-slate-400">Telp / Fax</td>
                    <td className="p-2 font-mono">{institution.telpFax || institution.telepon || '-'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-mono border-r border-slate-400">14</td>
                    <td className="p-2 font-semibold bg-[#f4faf4] border-r border-slate-400">Desa / Kelurahan</td>
                    <td className="p-2">{institution.desaKelurahan || '-'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-mono border-r border-slate-400">15</td>
                    <td className="p-2 font-semibold bg-[#f4faf4] border-r border-slate-400">Kecamatan</td>
                    <td className="p-2">{institution.kecamatan || '-'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-mono border-r border-slate-400">16</td>
                    <td className="p-2 font-semibold bg-[#f4faf4] border-r border-slate-400">Kabupaten / Kota</td>
                    <td className="p-2">{institution.kotaKab || '-'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-mono border-r border-slate-400">17</td>
                    <td className="p-2 font-semibold bg-[#f4faf4] border-r border-slate-400">Provinsi</td>
                    <td className="p-2">{institution.provinsi || '-'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-mono border-r border-slate-400">18</td>
                    <td className="p-2 font-semibold bg-[#f4faf4] border-r border-slate-400">Unit Kerja</td>
                    <td className="p-2">{principal.unitKerja || '-'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-mono border-r border-slate-400">19</td>
                    <td className="p-2 font-semibold bg-[#f4faf4] border-r border-slate-400">Periode Penilaian</td>
                    <td className="p-2 font-semibold">{institution.periodePenilaian || periodLabel || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Halaman 3: DATA PENILAI */}
            <div className="a4-sheet bg-white p-7 md:p-9 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-5 text-xs text-black">
              <div className="text-center border-b-2 border-[#008000] pb-2">
                <h2 className="text-sm font-black uppercase tracking-wide text-black">
                  DATA PENILAI
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-bold uppercase text-xs bg-[#e8f5e9] border border-black px-2.5 py-1.5">
                    A. Penilai 1
                  </h3>
                  <table className="w-full text-[11px] border border-t-0 border-black border-collapse">
                    <tbody className="divide-y divide-slate-400">
                      <tr><td className="p-2 w-56 font-semibold bg-slate-50 border-r border-slate-400">1. Nama</td><td className="p-2 font-bold">{evaluators.pengawas1Nama || '-'}</td></tr>
                      <tr><td className="p-2 font-semibold bg-slate-50 border-r border-slate-400">2. NIP</td><td className="p-2 font-mono">{evaluators.pengawas1Nip || '-'}</td></tr>
                      <tr><td className="p-2 font-semibold bg-slate-50 border-r border-slate-400">3. Pangkat / Golongan / Ruang</td><td className="p-2">{evaluators.pengawas1PangkatGol || '-'}</td></tr>
                      <tr><td className="p-2 font-semibold bg-slate-50 border-r border-slate-400">4. Jabatan</td><td className="p-2">{evaluators.pengawas1Jabatan || '-'}</td></tr>
                      <tr><td className="p-2 font-semibold bg-slate-50 border-r border-slate-400">5. Unit Kerja</td><td className="p-2">{evaluators.pengawas1UnitKerja || '-'}</td></tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="font-bold uppercase text-xs bg-[#e8f5e9] border border-black px-2.5 py-1.5">
                    B. Penilai 2
                  </h3>
                  <table className="w-full text-[11px] border border-t-0 border-black border-collapse">
                    <tbody className="divide-y divide-slate-400">
                      <tr><td className="p-2 w-56 font-semibold bg-slate-50 border-r border-slate-400">1. Nama</td><td className="p-2 font-bold">{evaluators.pengawas2Nama || '-'}</td></tr>
                      <tr><td className="p-2 font-semibold bg-slate-50 border-r border-slate-400">2. NIP</td><td className="p-2 font-mono">{evaluators.pengawas2Nip || '-'}</td></tr>
                      <tr><td className="p-2 font-semibold bg-slate-50 border-r border-slate-400">3. Pangkat / Golongan / Ruang</td><td className="p-2">{evaluators.pengawas2PangkatGol || '-'}</td></tr>
                      <tr><td className="p-2 font-semibold bg-slate-50 border-r border-slate-400">4. Jabatan</td><td className="p-2">{evaluators.pengawas2Jabatan || '-'}</td></tr>
                      <tr><td className="p-2 font-semibold bg-slate-50 border-r border-slate-400">5. Unit Kerja</td><td className="p-2">{evaluators.pengawas2UnitKerja || '-'}</td></tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="font-bold uppercase text-xs bg-[#e8f5e9] border border-black px-2.5 py-1.5">
                    C. SK Penugasan &amp; Waktu Penilaian
                  </h3>
                  <table className="w-full text-[11px] border border-t-0 border-black border-collapse">
                    <tbody className="divide-y divide-slate-400">
                      <tr><td className="p-2 w-56 font-semibold bg-slate-50 border-r border-slate-400">1. Nomor SK Penugasan</td><td className="p-2 font-mono font-bold">{evaluators.skPenugasanNomor || adminDocs.suratTugasNomor || '-'}</td></tr>
                      <tr><td className="p-2 font-semibold bg-slate-50 border-r border-slate-400">2. Tanggal Surat Tugas</td><td className="p-2">{evaluators.skPenugasanTanggal || '-'}</td></tr>
                      <tr><td className="p-2 font-semibold bg-slate-50 border-r border-slate-400">3. Berlaku Sampai Dengan</td><td className="p-2">{evaluators.skPenugasanBerlakuSampai || '-'}</td></tr>
                      <tr><td className="p-2 font-semibold bg-slate-50 border-r border-slate-400">4. Tempat Penilaian</td><td className="p-2">{evaluators.tempatPenilaian || '-'}</td></tr>
                      <tr><td className="p-2 font-semibold bg-slate-50 border-r border-slate-400">5. Tanggal Penilaian</td><td className="p-2 font-semibold">{evaluators.tanggalPenilaian || '-'}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* HALAMAN 4 & 5: HASIL PENILAIAN PENILAI 1 & PENILAI 2           */}
        {/* ============================================================== */}
        {showSection('format5_hasil_p1') && renderAssessorResultSheet('PENILAI_1')}
        {showSection('format6_hasil_p2') && renderAssessorResultSheet('PENILAI_2')}

        {/* ============================================================== */}
        {/* HALAMAN 6: IDENTITAS GABUNGAN PENILAI & KEPALA RA              */}
        {/* ============================================================== */}
        {(activePrintTab === 'paket_excel_lengkap' || activePrintTab === 'format2_identitas') &&
          renderCombinedIdentityPage6()}

        {/* ============================================================== */}
        {/* HALAMAN 7–29 & 30–52: INSTRUMEN 96 BUTIR PENILAI 1 & 2 (TANDA V) */}
        {/* ============================================================== */}
        {showSection('format4_p1_detail') && renderAssessorDetailInstrument96('PENILAI_1')}
        {showSection('format4_p2_detail') && renderAssessorDetailInstrument96('PENILAI_2')}

        {/* ============================================================== */}
        {/* FORMAT 3: PEMERIKSAAN KELENGKAPAN DATA (12 SEKTOR)             */}
        {/* ============================================================== */}
        {showSection('format3_kelengkapan') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-4 text-xs text-black">
            <KopSuratDinas variant="kemenag" />

            <div className="text-center">
              <p className="text-[10px] font-bold uppercase text-emerald-900">FORMAT 3 · DAFTAR PERIKSA KELENGKAPAN BERKAS</p>
              <h2 className="text-sm font-black uppercase underline underline-offset-4">
                PEMERIKSAAN KELENGKAPAN DATA &amp; PORTOFOLIO PKKRA
              </h2>
              <p className="text-[10.5px] font-semibold text-slate-700">
                {institution.namaLembaga} · {periodLabel || institution.periodePenilaian}
              </p>
            </div>

            <table className="w-full text-[10.5px] border border-slate-400 border-collapse tabular-nums">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-400">
                  <th className="p-1.5 text-center border-r border-slate-400 w-10">No</th>
                  <th className="p-1.5 text-left border-r border-slate-400">Sektor Data &amp; Dokumen PKKM</th>
                  <th className="p-1.5 text-left border-r border-slate-400 w-44">Ringkasan Data</th>
                  <th className="p-1.5 text-center w-28">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {checklist12.map((row) => (
                  <tr key={row.no}>
                    <td className="p-1.5 text-center border-r border-slate-300 font-mono">{row.no}</td>
                    <td className="p-1.5 border-r border-slate-300 font-semibold">{row.sektor}</td>
                    <td className="p-1.5 border-r border-slate-300 font-mono text-[10px]">{row.ket}</td>
                    <td className={`p-1.5 text-center font-bold ${row.ok ? 'text-emerald-900' : 'text-amber-800'}`}>
                      {row.ok ? 'LENGKAP' : 'BELUM LENGKAP'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border border-slate-300 p-3 bg-slate-50 text-[11px] flex justify-between items-center">
              <span>Total Sektor Siap:</span>
              <strong className="font-mono">
                {checklist12.filter((c) => c.ok).length} / {checklist12.length} Sektor Lengkap
              </strong>
            </div>

            <div className="pt-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase text-black">
                  Daftar Ceklis 27 Berkas Administrasi Wajib Dikumpulkan
                </h3>
                <span className="font-mono text-[10px] font-bold text-emerald-900">
                  {generatedDocs.filter((d) => d.status === 'APPROVED').length} / {DOCUMENT_TEMPLATES.length} Terkumpul
                </span>
              </div>
              <table className="w-full text-[9.5px] border border-slate-400 border-collapse tabular-nums">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-400">
                    <th className="p-1 w-7 text-center border-r border-slate-400">No</th>
                    <th className="p-1 text-left border-r border-slate-400">Nama Berkas / Dokumen PKKRA</th>
                    <th className="p-1 w-24 text-center border-r border-slate-400">Komponen</th>
                    <th className="p-1 w-24 text-center">Status Ceklis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {DOCUMENT_TEMPLATES.map((tpl, idx) => {
                    const matched = generatedDocs.find((d) => d.templateId === tpl.templateId);
                    const isCollected = matched?.status === 'APPROVED';
                    return (
                      <tr key={tpl.templateId}>
                        <td className="p-1 text-center font-mono border-r border-slate-300">{idx + 1}</td>
                        <td className="p-1 border-r border-slate-300 font-medium">{tpl.title}</td>
                        <td className="p-1 text-center font-mono border-r border-slate-300">{tpl.relatedKomponen}</td>
                        <td className={`p-1 text-center font-bold ${isCollected ? 'text-emerald-900' : 'text-amber-800'}`}>
                          {isCollected ? '[✓] TERKUMPUL' : '[ ] DRAFT'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. LEMBAR PENGESAHAN RESMI KEMENAG                             */}
        {/* ============================================================== */}
        {showSection('cover_pengesahan') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-4">
            <KopSuratDinas variant="kemenag" />

            <div className="text-center my-2">
              <h3 className="text-sm font-black uppercase underline underline-offset-4 text-black tracking-wide">
                LEMBAR PENGESAHAN LAPORAN PKKRA / PKKM
              </h3>
              <p className="text-[11px] font-semibold text-black mt-0.5 uppercase">
                TAHUN PELAJARAN {institution.tahunPelajaran || '-'}
              </p>
            </div>

            <p className="text-xs text-black text-justify leading-relaxed">
              Setelah dilakukan pemeriksaan kelengkapan administrasi, verifikasi bukti fisik portofolio Komponen 1–4, serta klarifikasi lapangan oleh Tim Penilai Pengawas Pembina Kantor Kementerian Agama {institution.kotaKab || '-'}, maka Laporan Penilaian Kinerja Kepala Raudhatul Athfal (PKKRA) dari satuan pendidikan:
            </p>

            <table className="w-full text-xs border border-slate-400 border-collapse">
              <tbody className="divide-y divide-slate-300">
                <tr>
                  <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300 w-48">Nama Satuan Pendidikan</td>
                  <td className="p-1.5 font-bold text-black">{institution.namaLembaga}</td>
                </tr>
                <tr>
                  <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">Penyelenggara / Yayasan</td>
                  <td className="p-1.5 font-semibold text-black">{adminDocs.namaYayasan || '-'}</td>
                </tr>
                <tr>
                  <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">NSM / NPSN</td>
                  <td className="p-1.5 font-mono">{institution.nsm || '-'} / {institution.npsn || institution.npsm || '-'}</td>
                </tr>
                <tr>
                  <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">SK Izin Operasional (IJOP)</td>
                  <td className="p-1.5 font-mono">{adminDocs.izinOperasionalNomor || '-'}</td>
                </tr>
                <tr>
                  <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">Status Akreditasi BAN-PDM</td>
                  <td className="p-1.5 font-semibold">{institution.accreditationDetail?.peringkat || institution.akreditasi || '-'} (SK: {institution.accreditationDetail?.nomorSk || '-'})</td>
                </tr>
                <tr>
                  <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">Alamat Lembaga</td>
                  <td className="p-1.5">{institution.alamat || '-'}, Kec. {institution.kecamatan || '-'}, {institution.kotaKab || '-'}, {institution.provinsi || '-'}</td>
                </tr>
                <tr>
                  <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">Nama Kepala RA</td>
                  <td className="p-1.5 font-bold text-emerald-950">{principal.namaLengkap || '-'}</td>
                </tr>
                <tr>
                  <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">NIP / NUPTK / NPK</td>
                  <td className="p-1.5 font-mono">{principal.nip || '-'} / {principal.nuptk || '-'} / {principal.npk || '-'}</td>
                </tr>
                <tr>
                  <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">Periode Penilaian</td>
                  <td className="p-1.5 font-medium">{institution.periodePenilaian || periodLabel || '-'}</td>
                </tr>
              </tbody>
            </table>

            <p className="text-xs text-black text-justify leading-relaxed">
              Dinyatakan telah memenuhi syarat kelengkapan berkas dan <strong>disahkan</strong> sebagai dokumen pertanggungjawaban kinerja kepala satuan pendidikan untuk periode penilaian Tahun {new Date().getFullYear()}.
            </p>

            <div className="border border-slate-400 p-2.5 bg-white text-[10.5px] avoid-break">
              <p className="font-bold uppercase text-black mb-1 border-b border-slate-300 pb-0.5">
                LEMBAR VERIFIKASI TIM PENILAI PENGAWAS PEMBINA:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>1. Kesesuaian Instrumen PKKM v.26: <strong>[{rekapV26.isBothComplete ? 'Lengkap 100%' : 'Dalam Proses'}]</strong></div>
                <div>2. Kelengkapan Bukti Autentik: <strong>[{evidenceFiles.length} Berkas Terunggah]</strong></div>
              </div>
            </div>

            <div className="pt-2 text-xs text-black avoid-break">
              <div className="text-right mb-3">
                <p>{evaluators.tempatPenilaian || '-'}, {currentDateStr}</p>
              </div>

              <div className="grid grid-cols-2 gap-6 text-center mb-5">
                <div>
                  <p className="font-semibold">Pengawas Pembina / Penilai 1,</p>
                  <div className="h-14" />
                  <p className="font-bold underline">{evaluators.pengawas1Nama || '-'}</p>
                  <p className="font-mono text-[10px]">NIP. {evaluators.pengawas1Nip || '-'}</p>
                </div>
                <div>
                  <p className="font-semibold">Kepala {institution.namaLembaga},</p>
                  <div className="h-14" />
                  <p className="font-bold underline">{principal.namaLengkap || '-'}</p>
                  <p className="font-mono text-[10px]">NIP/NUPTK. {principal.nip && principal.nip !== '-' ? principal.nip : principal.nuptk || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 text-center border-t border-slate-300 pt-3">
                <div>
                  <p className="font-semibold">Mengetahui,</p>
                  <p className="font-semibold">Ketua Komite / Penyelenggara RA,</p>
                  <div className="h-14" />
                  <p className="font-bold underline">{evaluators.komiteNama || '-'}</p>
                </div>
                <div>
                  <p className="font-semibold">Mengesahkan,</p>
                  <p className="font-semibold">Kepala Seksi Pendidikan Madrasah,</p>
                  <div className="h-14" />
                  <p className="font-bold underline">{evaluators.kasiPenmadNama || '-'}</p>
                  <p className="font-mono text-[10px]">NIP. {evaluators.kasiPenmadNip || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. SURAT PERNYATAAN KEABSAHAN DATA & DOKUMEN KEPALA RA         */}
        {/* ============================================================== */}
        {showSection('surat_pernyataan') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] flex flex-col justify-between text-xs text-black">
            <div className="space-y-4">
              <KopSuratDinas variant="yayasan" />

              <div className="text-center my-4">
                <h2 className="text-sm font-black uppercase underline underline-offset-4 tracking-wide">
                  SURAT PERNYATAAN KEABSAHAN DATA DAN DOKUMEN
                </h2>
                <p className="text-xs font-mono font-semibold mt-1">
                  Nomor: {adminDocs.suratPernyataanNomor || '-'}
                </p>
              </div>

              <p className="leading-relaxed">Yang bertanda tangan di bawah ini:</p>

              <table className="w-full text-xs border-none ml-2">
                <tbody>
                  <tr>
                    <td className="py-1 w-48 font-semibold">Nama Lengkap</td>
                    <td className="py-1 font-bold">: {principal.namaLengkap || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">NIP / NUPTK / NPK</td>
                    <td className="py-1 font-mono">: {principal.nip || '-'} / {principal.nuptk || '-'} / {principal.npk || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">Jabatan</td>
                    <td className="py-1">: {principal.jabatan || 'Kepala RA'} {institution.namaLembaga}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">Satuan Pendidikan</td>
                    <td className="py-1 font-bold">: {institution.namaLembaga}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">NSM / NPSN</td>
                    <td className="py-1 font-mono">: {institution.nsm || '-'} / {institution.npsn || institution.npsm || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold align-top">Alamat Madrasah</td>
                    <td className="py-1">: {institution.alamat || '-'}, Kec. {institution.kecamatan || '-'}, {institution.kotaKab || '-'}, {institution.provinsi || '-'}</td>
                  </tr>
                </tbody>
              </table>

              <p className="text-justify leading-relaxed pt-2">
                Dengan ini menyatakan dengan sesungguhnya bahwa seluruh data, informasi, laporan evaluasi diri, serta dokumen bukti fisik pendukung dalam berkas <strong>Laporan Penilaian Kinerja Kepala Raudhatul Athfal (PKKRA) {institution.periodePenilaian || periodLabel || '-'}</strong> Tahun Pelajaran {institution.tahunPelajaran || '-'} adalah <strong>benar, autentik, dan sesuai dengan kondisi riil</strong> yang dilaksanakan di {institution.namaLembaga}.
              </p>

              <div className="space-y-1.5 pl-2">
                <p className="font-semibold">Secara khusus kami menjamin keabsahan atas:</p>
                <ol className="list-decimal pl-5 space-y-1.5 text-justify leading-relaxed">
                  <li>Data pendidik dan tenaga kependidikan ({ptkList.length} PTK), data peserta didik ({totalStudents} santri), serta sinkronisasi EMIS 4.0 dan Simpatika Kementerian Agama RI.</li>
                  <li>Dokumen perencanaan (RKJM, RKT, KOM, Kalender Pendidikan), administrasi keuangan Dana BOP RA, serta daftar inventaris sarana prasarana dan Alat Permainan Edukatif (APE).</li>
                  <li>Instrumen, catatan observasi, dan tindak lanjut pelaksanaan supervisi akademik kepada seluruh pendidik serta dokumentasi foto kegiatan yang dilampirkan tanpa rekayasa.</li>
                </ol>
              </div>

              <p className="text-justify leading-relaxed pt-1">
                Apabila di kemudian hari ditemukan ketidaksesuaian atau dokumen yang tidak dapat dipertanggungjawabkan secara sah, saya bersedia menerima sanksi dan pembinaan sesuai ketentuan peraturan perundang-undangan yang berlaku di lingkungan Kementerian Agama Republik Indonesia.
              </p>

              <p className="text-justify leading-relaxed">
                Demikian surat pernyataan ini dibuat dengan penuh kesadaran dan tanggung jawab untuk dipergunakan sebagaimana mestinya dalam proses Penilaian Kinerja Kepala RA (PKKRA).
              </p>
            </div>

            <div className="pt-8 avoid-break">
              <div className="grid grid-cols-2 gap-8 text-center">
                <div className="pt-4">
                  <p className="font-semibold">Mengetahui,</p>
                  <p className="font-semibold">Ketua Komite / Yayasan Penyelenggara,</p>
                  <div className="h-20" />
                  <p className="font-bold underline">{evaluators.komiteNama || '-'}</p>
                  <p className="text-[10px] text-slate-700">{adminDocs.namaYayasan || '-'}</p>
                </div>

                <div>
                  <p>{evaluators.tempatPenilaian || '-'}, {adminDocs.suratPernyataanTanggal || '-'}</p>
                  <p className="font-semibold mt-1">Yang Membuat Pernyataan,</p>
                  <p className="font-semibold">Kepala {institution.namaLembaga}</p>
                  <div className="h-20 flex items-center justify-center">
                    <div className="border border-dashed border-slate-500 px-3 py-1.5 text-[9px] text-slate-600 font-mono">
                      Materai Rp 10.000
                    </div>
                  </div>
                  <p className="font-bold underline">{principal.namaLengkap || '-'}</p>
                  <p className="font-mono text-[10px]">NIP/NPK. {principal.nip && principal.nip !== '-' ? principal.nip : principal.npk || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 4. SURAT TUGAS TIM PENILAI / PELAKSANA PKKRA                   */}
        {/* ============================================================== */}
        {showSection('surat_tugas') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] flex flex-col justify-between text-xs text-black">
            <div className="space-y-4">
              <KopSuratDinas variant="kemenag" />

              <div className="text-center my-3">
                <h2 className="text-sm font-black uppercase underline underline-offset-4 tracking-widest">
                  SURAT TUGAS
                </h2>
                <p className="text-xs font-mono font-semibold mt-1">
                  Nomor: {adminDocs.suratTugasNomor || '-'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-3 font-bold">Menimbang</div>
                  <div className="col-span-9 text-justify">
                    : Bahwa dalam rangka menjamin kelancaran, objektivitas, dan akuntabilitas pelaksanaan Penilaian Kinerja Kepala Raudhatul Athfal (PKKRA) Tahun Pelajaran {institution.tahunPelajaran || '-'} di {institution.namaLembaga}, dipandang perlu menerbitkan Surat Tugas bagi Tim Penilai dan Tim Pelaksana Administrasi.
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-3 font-bold">Dasar</div>
                  <div className="col-span-9 text-justify">
                    <ol className="list-decimal pl-4 space-y-0.5">
                      <li>PMA Nomor 58 Tahun 2017 jo PMA Nomor 24 Tahun 2018 tentang Kepala Madrasah.</li>
                      <li>Keputusan Dirjen Pendis Nomor 1111 Tahun 2019 tentang Juknis Penilaian Kinerja Kepala Madrasah.</li>
                      <li>Program Kerja Pengawas Madrasah/RA Kantor Kementerian Agama {institution.kotaKab || '-'}.</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="text-center py-2">
                <p className="font-black uppercase tracking-widest text-xs">MEMBERI TUGAS</p>
              </div>

              <div>
                <p className="font-bold mb-1.5">Kepada:</p>
                <table className="w-full text-[11px] border border-slate-500 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-500 font-bold uppercase text-center">
                      <th className="p-1.5 w-8 border-r border-slate-500">No</th>
                      <th className="p-1.5 text-left border-r border-slate-500">Nama Lengkap &amp; Gelar</th>
                      <th className="p-1.5 text-left border-r border-slate-500">NIP / Identitas</th>
                      <th className="p-1.5 text-left">Jabatan / Peran Tugas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-400">
                    <tr>
                      <td className="p-1.5 text-center font-mono border-r border-slate-400">1</td>
                      <td className="p-1.5 font-bold border-r border-slate-400">{evaluators.pengawas1Nama || '-'}</td>
                      <td className="p-1.5 font-mono border-r border-slate-400">{evaluators.pengawas1Nip || '-'}</td>
                      <td className="p-1.5">{evaluators.pengawas1Jabatan || 'Pengawas Madrasah'} (Ketua Tim Penilai)</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 text-center font-mono border-r border-slate-400">2</td>
                      <td className="p-1.5 font-bold border-r border-slate-400">{evaluators.pengawas2Nama || '-'}</td>
                      <td className="p-1.5 font-mono border-r border-slate-400">{evaluators.pengawas2Nip || '-'}</td>
                      <td className="p-1.5">{evaluators.pengawas2Jabatan || 'Pengawas Madrasah/RA'} (Anggota Tim Penilai)</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 text-center font-mono border-r border-slate-400">3</td>
                      <td className="p-1.5 font-bold border-r border-slate-400">{principal.namaLengkap || '-'}</td>
                      <td className="p-1.5 font-mono border-r border-slate-400">{principal.nip && principal.nip !== '-' ? principal.nip : principal.npk || '-'}</td>
                      <td className="p-1.5">Kepala {institution.namaLembaga} (Kepala RA Yang Dinilai)</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 text-center font-mono border-r border-slate-400">4</td>
                      <td className="p-1.5 font-bold border-r border-slate-400">{evaluators.komiteNama || '-'}</td>
                      <td className="p-1.5 font-mono border-r border-slate-400">-</td>
                      <td className="p-1.5">Ketua Komite / Unsur Masyarakat Mitra Penilaian</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-12 gap-2 pt-2">
                <div className="col-span-3 font-bold">Untuk</div>
                <div className="col-span-9 text-justify space-y-1">
                  <p>
                    : Melaksanakan kegiatan Penilaian Kinerja Kepala Raudhatul Athfal (PKKRA) di <strong>{institution.namaLembaga}</strong>, meliputi verifikasi berkas administrasi, observasi sarana prasarana/APE, supervisi bukti fisik instrumen, dan penyusunan berita acara hasil penilaian pada:
                  </p>
                  <div className="pl-2 space-y-0.5 font-medium">
                    <p>Hari / Tanggal : {adminDocs.beritaAcaraHari || '-'}, {adminDocs.beritaAcaraTanggal || '-'}</p>
                    <p>Waktu : {adminDocs.beritaAcaraWaktu || '-'}</p>
                    <p>Tempat : {adminDocs.beritaAcaraTempat || institution.namaLembaga}</p>
                  </div>
                </div>
              </div>

              <p className="text-justify leading-relaxed pt-1">
                Demikian Surat Tugas ini diterbitkan untuk dilaksanakan dengan penuh rasa tanggung jawab, dan setelah selesai melaksanakan tugas agar menyampaikan laporan hasil pelaksanaan kepada pejabat berwenang.
              </p>
            </div>

            <div className="pt-8 avoid-break">
              <div className="flex justify-end">
                <div className="w-72 text-center">
                  <p>Ditetapkan di : {evaluators.tempatPenilaian || '-'}</p>
                  <p className="mb-1">Pada Tanggal : {adminDocs.suratTugasTanggal || '-'}</p>
                  <p className="font-bold">{adminDocs.suratTugasPemberi || 'Kantor Kementerian Agama'}</p>
                  <p className="text-[10px] text-slate-600">(a.n. Kepala Seksi Pendidikan Madrasah)</p>
                  <div className="h-16" />
                  <p className="font-bold underline">{evaluators.kasiPenmadNama || '-'}</p>
                  <p className="font-mono text-[10px]">NIP. {evaluators.kasiPenmadNip || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 5. SK PEMBAGIAN TUGAS TIM PELAKSANA / PANITIA PKKRA + LAMPIRAN */}
        {/* ============================================================== */}
        {showSection('sk_pembagian_tugas') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-3 text-[11px] text-black">
            <KopSuratDinas variant="yayasan" />

            <div className="text-center space-y-0.5">
              <p className="font-bold uppercase text-xs">KEPUTUSAN KEPALA {institution.namaLembaga}</p>
              <p className="font-mono font-semibold text-xs">NOMOR: {adminDocs.skPanitiaNomor || '-'}</p>
              <p className="font-bold uppercase text-xs pt-1">TENTANG</p>
              <p className="font-black uppercase text-xs max-w-lg mx-auto">
                PEMBENTUKAN TIM PELAKSANA DAN PEMBAGIAN TUGAS PENYUSUNAN PORTOFOLIO PKKRA TAHUN PELAJARAN {institution.tahunPelajaran || '-'}
              </p>
            </div>

            <div className="space-y-1.5 text-justify text-[10.5px] leading-snug pt-1">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-3 font-bold">Menimbang</div>
                <div className="col-span-9">
                  : Bahwa untuk kelancaran penyiapan bukti fisik administrasi, portofolio komponen penilaian, serta dokumentasi Penilaian Kinerja Kepala RA (PKKRA), perlu menetapkan pembagian tugas Pendidik dan Tenaga Kependidikan di {institution.namaLembaga}.
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-3 font-bold">Mengingat</div>
                <div className="col-span-9">
                  <ol className="list-decimal pl-4 space-y-0.5">
                    <li>Undang-Undang RI Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.</li>
                    <li>PMA Nomor 58 Tahun 2017 jo PMA Nomor 24 Tahun 2018 tentang Kepala Madrasah.</li>
                    <li>Keputusan Dirjen Pendis Nomor 1111 Tahun 2019 tentang Juknis PKKM/PKKRA.</li>
                  </ol>
                </div>
              </div>
              <div className="text-center font-black uppercase tracking-widest py-1">MEMUTUSKAN</div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-3 font-bold">Menetapkan</div>
                <div className="col-span-9 space-y-0.5">
                  <p><strong>KESATU:</strong> Menetapkan nama-nama Pendidik dan Tenaga Kependidikan sebagaimana tercantum pada lampiran keputusan ini sebagai Tim Pelaksana dan Penanggung Jawab Komponen Bukti Fisik PKKRA.</p>
                  <p><strong>KEDUA:</strong> Keputusan ini berlaku sejak tanggal ditetapkan dan apabila terdapat kekeliruan akan diperbaiki sebagaimana mestinya.</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="font-bold uppercase text-[10.5px] mb-1 border-b border-slate-300 pb-0.5">
                LAMPIRAN: DAFTAR PEMBAGIAN TUGAS TIM PELAKSANA PKKRA ({ptkList.length} PERSONIL)
              </h4>
              <table className="w-full text-[9.5px] border border-slate-500 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-500 font-bold uppercase text-center">
                    <th className="p-1 w-6 border-r border-slate-500">No</th>
                    <th className="p-1 text-left border-r border-slate-500">Nama PTK / NIP</th>
                    <th className="p-1 text-center border-r border-slate-500">Status / Ijazah</th>
                    <th className="p-1 text-left border-r border-slate-500">Tugas Pokok KBM</th>
                    <th className="p-1 text-left">Tugas Tim Portofolio PKKRA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-400">
                  {ptkList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-2 text-center text-slate-500 italic">
                        Belum ada data PTK diinput pada menu Data Guru &amp; Tendik.
                      </td>
                    </tr>
                  ) : (
                    ptkList.map((ptk, idx) => (
                      <tr key={ptk.id}>
                        <td className="p-1 text-center font-mono tabular-nums border-r border-slate-400">{idx + 1}</td>
                        <td className="p-1 border-r border-slate-400">
                          <strong className="block">{ptk.nama}</strong>
                          <span className="font-mono text-[8.5px] text-slate-700">NIP. {ptk.nip}</span>
                        </td>
                        <td className="p-1 text-center border-r border-slate-400">
                          {ptk.statusPegawai} · {ptk.pendidikanTerakhir}
                        </td>
                        <td className="p-1 border-r border-slate-400">{ptk.tugas}</td>
                        <td className="p-1 font-medium text-emerald-950">{getSkRoleForPtk(ptk.tugas, idx)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-3 flex justify-end avoid-break">
              <div className="w-64 text-center text-xs">
                <p>Ditetapkan di : {evaluators.tempatPenilaian || '-'}</p>
                <p>Pada Tanggal : {adminDocs.skPanitiaTanggal || '-'}</p>
                <p className="font-bold mt-1">Kepala {institution.namaLembaga},</p>
                <div className="h-14" />
                <p className="font-bold underline">{principal.namaLengkap || '-'}</p>
                <p className="font-mono text-[10px]">NIP/NPK. {principal.nip && principal.nip !== '-' ? principal.nip : principal.npk || '-'}</p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 6. BERITA ACARA PELAKSANAAN & VERIFIKASI PENILAIAN PKKRA       */}
        {/* ============================================================== */}
        {showSection('berita_acara') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] flex flex-col justify-between text-xs text-black">
            <div className="space-y-3.5">
              <KopSuratDinas variant="kemenag" />

              <div className="text-center my-2">
                <h2 className="text-sm font-black uppercase underline underline-offset-4 tracking-wide">
                  BERITA ACARA PELAKSANAAN PENILAIAN KINERJA KEPALA RA (PKKRA)
                </h2>
                <p className="text-xs font-mono font-semibold mt-0.5">
                  Nomor: {adminDocs.beritaAcaraNomor || '-'}
                </p>
              </div>

              <p className="text-justify leading-relaxed">
                Pada hari ini <strong>{adminDocs.beritaAcaraHari || '-'}</strong>, tanggal <strong>{adminDocs.beritaAcaraTanggal || '-'}</strong>, pukul <strong>{adminDocs.beritaAcaraWaktu || '-'}</strong>, bertempat di <strong>{adminDocs.beritaAcaraTempat || institution.namaLembaga}</strong>, telah dilaksanakan Penilaian Kinerja Kepala Raudhatul Athfal (PKKRA) Tahun Pelajaran {institution.tahunPelajaran || '-'} terhadap:
              </p>

              <table className="w-full text-xs border border-slate-400 border-collapse">
                <tbody className="divide-y divide-slate-300">
                  <tr>
                    <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300 w-48">Nama Kepala RA</td>
                    <td className="p-1.5 font-bold">{principal.namaLengkap || '-'}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">NIP / NUPTK / NPK</td>
                    <td className="p-1.5 font-mono">{principal.nip || '-'} / {principal.nuptk || '-'} / {principal.npk || '-'}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">Satuan Pendidikan</td>
                    <td className="p-1.5 font-bold">{institution.namaLembaga} (NSM: {institution.nsm || '-'} · NPSN: {institution.npsn || institution.npsm || '-'})</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">Jumlah PTK / Peserta Didik</td>
                    <td className="p-1.5">{ptkList.length} Pendidik/Staf · {totalStudents} Peserta Didik Aktif</td>
                  </tr>
                </tbody>
              </table>

              <div className="space-y-1">
                <p className="font-bold">Rangkaian Kegiatan &amp; Hasil Verifikasi:</p>
                <ol className="list-decimal pl-5 space-y-1 text-justify">
                  <li>Pembukaan, doa bersama, dan penyampaian sambutan selamat datang oleh Kepala {institution.namaLembaga}.</li>
                  <li>Pemaparan Presentasi Kinerja (Slide PPT) mencakup Profil Lembaga, Kondisi Santri/PTK, Sarpras APE, dan Capaian Komponen 1–4.</li>
                  <li>Pemeriksaan bukti fisik administrasi (Naskah Dinas, Kurikulum KOM, Kaldik, Keuangan BOP, Inventaris APE, Buku Supervisi Guru, &amp; Portofolio Foto).</li>
                  <li>Klarifikasi, umpan balik pembinaan oleh Pengawas Pembina, dan penandatanganan Berita Acara.</li>
                </ol>
              </div>

              <div className="border border-slate-400 p-2.5 bg-slate-50/70 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-300 pb-1">
                  <span className="font-bold uppercase">Rekapitulasi Skor Evaluasi Kinerja:</span>
                  <span className="font-mono font-black text-emerald-950">
                    {rekapV26.isBothComplete && rekapV26.finalNilaiKinerjaTahunan !== null
                      ? `Nilai Akhir: ${rekapV26.finalNilaiKinerjaTahunan.toFixed(2)} (${rekapV26.finalPredikat})`
                      : `Nilai Akhir: BELUM FINAL (P1 ${rekapV26.penilai1.scoredIndicators}/${rekapV26.penilai1.totalIndicators} · P2 ${rekapV26.penilai2.scoredIndicators}/${rekapV26.penilai2.totalIndicators})`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-800 italic">
                  <strong>Catatan Tim Penilai:</strong> {adminDocs.beritaAcaraCatatan || rekapV26.incompleteWarning || '-'}
                </p>
              </div>

              <p className="text-justify leading-relaxed">
                Demikian Berita Acara pelaksanaan PKKRA ini dibuat dengan sebenarnya dalam rangkap secukupnya untuk dipergunakan sebagai bahan laporan resmi kepada Kantor Kementerian Agama {institution.kotaKab || '-'}.
              </p>
            </div>

            <div className="pt-4 avoid-break">
              <div className="grid grid-cols-2 gap-6 text-center mb-4">
                <div>
                  <p className="font-semibold">Kepala RA Yang Dinilai,</p>
                  <div className="h-14" />
                  <p className="font-bold underline">{principal.namaLengkap || '-'}</p>
                  <p className="font-mono text-[10px]">NIP/NPK. {principal.nip && principal.nip !== '-' ? principal.nip : principal.npk || '-'}</p>
                </div>
                <div>
                  <p className="font-semibold">Pengawas Pembina / Penilai 1,</p>
                  <div className="h-14" />
                  <p className="font-bold underline">{evaluators.pengawas1Nama || '-'}</p>
                  <p className="font-mono text-[10px]">NIP. {evaluators.pengawas1Nip || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 text-center border-t border-slate-300 pt-3">
                <div>
                  <p className="font-semibold">Pengawas Penilai 2,</p>
                  <div className="h-12" />
                  <p className="font-bold underline">{evaluators.pengawas2Nama || '-'}</p>
                  <p className="font-mono text-[10px]">NIP. {evaluators.pengawas2Nip || '-'}</p>
                </div>
                <div>
                  <p className="font-semibold">Saksi / Ketua Komite RA,</p>
                  <div className="h-12" />
                  <p className="font-bold underline">{evaluators.komiteNama || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 7. KATA PENGANTAR, PETUNJUK PENGGUNAAN & DAFTAR ISI            */}
        {/* ============================================================== */}
        {showChapter('pengantar_isi') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-4">
            <div>
              <div className="text-center border-b border-slate-300 pb-1 mb-2">
                <h3 className="text-xs font-bold uppercase text-slate-900">KATA PENGANTAR</h3>
              </div>

              <div className="text-center text-sm font-bold py-1 text-slate-900">
                بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
              </div>

              <p className="text-[11px] text-slate-800 leading-relaxed text-justify mb-2">
                Alhamdulillahirabbil&apos;alamin, puji syukur ke hadirat Allah Subhanahu wa Ta&apos;ala atas rahmat dan karunia-Nya sehingga Laporan Evaluasi Diri dan Penilaian Kinerja Kepala Raudhatul Athfal (PKKRA) {institution.periodePenilaian || periodLabel || '-'} {institution.namaLembaga} ini dapat diselesaikan dengan baik.
              </p>

              <p className="text-[11px] text-slate-800 leading-relaxed text-justify mb-2">
                Laporan ini disusun sebagai bentuk pertanggungjawaban Kepala RA dalam melaksanakan tugas kepemimpinan, pengelolaan satuan pendidikan, penguatan Kurikulum PIAUD, pembinaan pendidik, serta pengembangan Alat Permainan Edukatif (APE) dan sarana prasarana.
              </p>

              <p className="text-[11px] text-slate-800 leading-relaxed text-justify">
                Kami mengucapkan terima kasih yang sebesar-besarnya kepada {adminDocs.namaYayasan || 'Yayasan Penyelenggara'}, Kantor Kementerian Agama {institution.kotaKab || '-'}, Pengawas Pembina RA, Komite Madrasah, serta seluruh dewan guru atas kerja sama dan dukungannya.
              </p>

              <div className="text-right text-xs pt-2">
                <p>{evaluators.tempatPenilaian || '-'}, {currentDateStr}</p>
                <p className="font-bold text-slate-900">Kepala {institution.namaLembaga},</p>
                <p className="font-bold underline text-emerald-950 mt-6">{principal.namaLengkap || '-'}</p>
              </div>
            </div>

            <div className="border border-slate-300 p-3 bg-slate-50 text-[10.5px] space-y-1">
              <h4 className="font-bold text-slate-900 uppercase border-b border-slate-200 pb-0.5">
                PETUNJUK PENGGUNAAN DOKUMEN LAPORAN
              </h4>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-800">
                <li>Dokumen ini merupakan berkas resmi portofolio dan evaluasi diri Kepala {institution.namaLembaga}.</li>
                <li>Seluruh nomor indikator dan bukti fisik disesuaikan dengan instrumen resmi PKKM_v.26 Kemenag ({activeInds.length} indikator).</li>
                <li>Dilengkapi berkas naskah dinas lengkap serta Format 1–10 Kemenag dalam satu bundel A4 siap cetak.</li>
              </ul>
            </div>

            <div className="border border-slate-300 p-3 bg-white space-y-1 text-xs">
              <h4 className="font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 text-center">
                DAFTAR ISI BUNDEL LENGKAP LAPORAN PKKRA
              </h4>
              <div className="space-y-1 font-mono text-[10.5px]">
                <div className="flex justify-between"><span>Halaman Sampul &amp; Cover Resmi</span><span>Bagian Awal</span></div>
                <div className="flex justify-between"><span>Format 1–3: Cover, Identitas &amp; Pemeriksaan Kelengkapan</span><span>Format Excel</span></div>
                <div className="flex justify-between"><span>Lembar Pengesahan Resmi Kemenag &amp; Verifikasi Pengawas</span><span>Naskah Dinas</span></div>
                <div className="flex justify-between"><span>Surat Pernyataan Keabsahan Data ({adminDocs.suratPernyataanNomor || '-'})</span><span>Naskah Dinas</span></div>
                <div className="flex justify-between"><span>Surat Tugas Tim Penilai ({adminDocs.suratTugasNomor || '-'})</span><span>Naskah Dinas</span></div>
                <div className="flex justify-between"><span>SK Pembagian Tugas PTK ({adminDocs.skPanitiaNomor || '-'})</span><span>Naskah Dinas</span></div>
                <div className="flex justify-between"><span>Berita Acara Pelaksanaan PKKRA ({adminDocs.beritaAcaraNomor || '-'})</span><span>Naskah Dinas</span></div>
                <div className="flex justify-between font-bold text-emerald-950"><span>BAB I – VII LAPORAN EVALUASI DIRI KEPALA RA</span><span>Bab I–VII</span></div>
                <div className="flex justify-between"><span>Format 5 &amp; 6: Hasil Penilaian Independen Penilai 1 &amp; 2</span><span>Hasil Penilai</span></div>
                <div className="flex justify-between"><span>Format 7 &amp; 8: Rekap Nilai Tahunan &amp; Grafik Perbandingan</span><span>Rekapitulasi</span></div>
                <div className="flex justify-between"><span>Format 9 &amp; 10: Rekap Bukti Fisik &amp; Rekomendasi RTL</span><span>Bukti &amp; RTL</span></div>
                <div className="flex justify-between"><span>Format 4: Matriks Instrumen 96 Indikator (Landscape)</span><span>Instrumen 96</span></div>
                <div className="flex justify-between"><span>Lampiran Foto Bukti Fisik &amp; Dokumen Administrasi Otomatis</span><span>Lampiran</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 8–14. BAB I - VII                                              */}
        {/* ============================================================== */}
        {showChapter('bab1') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-4 text-xs leading-relaxed">
            <div className="border-b-2 border-emerald-950 pb-1 mb-2">
              <h2 className="text-sm font-extrabold uppercase text-emerald-950 tracking-wide">BAB I PENDAHULUAN</h2>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 uppercase mb-1">A. Latar Belakang</h3>
              <p className="text-justify mb-2">
                Kepala Raudhatul Athfal memiliki tanggung jawab utama memimpin dan mengelola satuan pendidikan anak usia dini agar layanan berjalan terarah, aman, bermutu, dan sesuai dengan tahap perkembangan anak.
              </p>
              <p className="text-justify">
                {institution.namaLembaga} menyelenggarakan layanan pendidikan anak usia dini berciri khas Islam di Kecamatan {institution.kecamatan || '-'}, {institution.kotaKab || '-'}. Dengan {ptkList.length} orang pendidik/staf dan {totalStudents} peserta didik aktif, lembaga terus menjaga mutu layanan sesuai instrumen PKKM v.26.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 uppercase mb-1">B. Dasar Hukum Pelaksanaan</h3>
              <ol className="list-decimal pl-4 space-y-1 text-slate-800">
                {programGoals.landasanHukum.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
                <li>Instrumen Penilaian Kinerja Kepala Raudhatul Athfal ({activeInds.length} Indikator).</li>
                <li>Surat Tugas Nomor {adminDocs.suratTugasNomor || '-'} dan SK Pembagian Tugas Nomor {adminDocs.skPanitiaNomor || '-'}.</li>
              </ol>
            </div>
          </div>
        )}

        {showChapter('bab2') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-4 text-xs">
            <div className="border-b-2 border-emerald-950 pb-1 mb-2">
              <h2 className="text-sm font-extrabold uppercase text-emerald-950 tracking-wide">BAB II PROFIL DAN ARAH PENGEMBANGAN RA</h2>
            </div>
            <table className="w-full text-xs border border-slate-400 border-collapse mb-2">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-400 uppercase">
                  <th className="p-1.5 text-left w-44 border-r border-slate-400">Aspek Kelembagaan</th>
                  <th className="p-1.5 text-left">Kondisi Riil {institution.namaLembaga}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                <tr><td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">Penyelenggara &amp; IJOP</td><td className="p-1.5">{adminDocs.namaYayasan || '-'} · SK IJOP: <span className="font-mono">{adminDocs.izinOperasionalNomor || '-'}</span></td></tr>
                <tr><td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">Peringkat Akreditasi</td><td className="p-1.5 font-bold text-emerald-900">{institution.accreditationDetail?.peringkat || institution.akreditasi || '-'}</td></tr>
                <tr><td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">Jumlah Pendidik &amp; Staf</td><td className="p-1.5">{ptkList.length} Orang {ptkList.length > 0 ? `(${ptkList.map((p) => p.nama).join(', ')})` : ''}</td></tr>
                <tr><td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">Jumlah Peserta Didik</td><td className="p-1.5 font-bold tabular-nums">{totalStudents} Santri {students.length > 0 ? `(${students.map((s) => `${s.kelas}: ${s.lakiLaki + s.perempuan}`).join(' · ')})` : ''}</td></tr>
                <tr><td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">Sarana Bangunan &amp; APE</td><td className="p-1.5">{buildings.length} bangunan · {inventory.length} item inventaris &amp; APE</td></tr>
                <tr><td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">Status Lahan &amp; Bangunan</td><td className="p-1.5">{institution.statusTanah || '-'} ({institution.luasTanah || '-'})</td></tr>
              </tbody>
            </table>

            <div className="border border-slate-300 p-3 bg-slate-50/70 space-y-2">
              <div>
                <span className="text-[10px] font-bold text-emerald-950 uppercase block">VISI UTAMA:</span>
                <p className="text-xs font-bold text-slate-900 italic">&ldquo;{programGoals.visi || '-'}&rdquo;</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-950 uppercase block">MISI RAUDHATUL ATHFAL:</span>
                {programGoals.misi.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Belum ada daftar misi yang diisi.</p>
                ) : (
                  <ol className="list-decimal pl-4 text-xs space-y-0.5 text-slate-800">
                    {programGoals.misi.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </div>
        )}

        {showChapter('bab3') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-4 text-xs">
            <div className="border-b-2 border-emerald-950 pb-1 mb-2">
              <h2 className="text-sm font-extrabold uppercase text-emerald-950 tracking-wide">BAB III PELAKSANAAN TUGAS DAN EVALUASI KINERJA</h2>
            </div>
            <div className="space-y-3 text-justify">
              <div>
                <h3 className="font-bold text-slate-900 uppercase">A. Perencanaan Program</h3>
                <p className="text-slate-800">Kepala RA mengoordinasikan penyusunan program berdasarkan visi, misi, RKJM, RKT, Kalender Pendidikan, dan RKAM BOP.</p>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 uppercase">B. Pengorganisasian dan Pembagian Tugas</h3>
                <p className="text-slate-800">Pembagian tugas {ptkList.length} orang pendidik dan staf dituangkan dalam Keputusan Kepala RA Nomor {adminDocs.skPanitiaNomor || '-'}.</p>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 uppercase">C. Pelaksanaan, Pengawasan &amp; Sarana APE</h3>
                <p className="text-slate-800">Pelaksanaan KBM, pengelolaan BOP transparan, supervisi akademik guru, serta pemeriksaan keamanan sarana bermain indoor/outdoor.</p>
              </div>
            </div>
          </div>
        )}

        {showChapter('bab4') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-4 text-xs">
            <div className="border-b-2 border-emerald-950 pb-1 mb-2">
              <h2 className="text-sm font-extrabold uppercase text-emerald-950 tracking-wide">BAB IV HASIL EVALUASI DIRI KOMPONEN KINERJA</h2>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 uppercase mb-1">Rekapitulasi Penugasan &amp; Supervisi Pendidik ({ptkList.length} PTK)</h3>
              <table className="w-full text-[9.5px] border border-slate-400 border-collapse">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-400 uppercase">
                    <th className="p-1 text-center w-6 border-r border-slate-400">No</th>
                    <th className="p-1 text-left border-r border-slate-400">Nama Guru</th>
                    <th className="p-1 text-left border-r border-slate-400">Tugas Pokok</th>
                    <th className="p-1 text-center border-r border-slate-400">Pendidikan</th>
                    <th className="p-1 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {ptkList.length === 0 ? (
                    <tr><td colSpan={5} className="p-2 text-center text-slate-500 italic">Belum ada data PTK.</td></tr>
                  ) : (
                    ptkList.map((ptk, idx) => (
                      <tr key={ptk.id}>
                        <td className="p-1 text-center font-mono tabular-nums">{idx + 1}</td>
                        <td className="p-1 font-bold">{ptk.nama}</td>
                        <td className="p-1">{ptk.tugas}</td>
                        <td className="p-1 text-center">{ptk.pendidikanTerakhir}</td>
                        <td className="p-1 text-center">{ptk.statusPegawai}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showChapter('bab5') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-4 text-xs">
            <div className="border-b-2 border-emerald-950 pb-1 mb-2">
              <h2 className="text-sm font-extrabold uppercase text-emerald-950 tracking-wide">BAB V REKAPITULASI BUKTI DUKUNG DAN EVALUASI</h2>
            </div>
            <table className="w-full text-[10px] border border-slate-400 border-collapse">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-400">
                  <th className="p-1.5 text-left border-r border-slate-400">Komponen Kinerja</th>
                  <th className="p-1.5 text-center border-r border-slate-400">Indikator</th>
                  <th className="p-1.5 text-center border-r border-slate-400">Kesiapan Kepala RA</th>
                  <th className="p-1.5 text-center">Berkas Bukti Fisik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 tabular-nums">
                {rekapV26.penilai1.components.map((comp) => {
                  const compInds = activeInds.filter((i) => i.komponenCode === comp.komponenCode);
                  const readyCount = compInds.filter((i) => responses[i.id]?.completionStatus === 'complete').length;
                  const evCount = evidenceFiles.filter((ev) => compInds.some((ind) => isEvidenceLinkedToIndicator(ev, ind.id))).length;
                  return (
                    <tr key={comp.komponenCode}>
                      <td className="p-1.5 border-r border-slate-300 font-semibold">{comp.komponenNomor}. {comp.komponenNama}</td>
                      <td className="p-1.5 text-center border-r border-slate-300 font-mono">{comp.indicatorCount}</td>
                      <td className="p-1.5 text-center border-r border-slate-300 font-mono">{readyCount}/{compInds.length} siap</td>
                      <td className="p-1.5 text-center font-mono">{evCount} berkas</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {showChapter('bab6') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-4 text-xs">
            <div className="border-b-2 border-emerald-950 pb-1 mb-2">
              <h2 className="text-sm font-extrabold uppercase text-emerald-950 tracking-wide">BAB VI RENCANA TINDAK LANJUT (RTL)</h2>
            </div>
            <table className="w-full text-[9.5px] border border-slate-400 border-collapse">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-400 uppercase">
                  <th className="p-1 text-center w-6 border-r border-slate-400">No</th>
                  <th className="p-1 text-left border-r border-slate-400">Temuan &amp; Rekomendasi</th>
                  <th className="p-1 text-left border-r border-slate-400">Langkah Tindak Lanjut</th>
                  <th className="p-1 text-center w-24 border-r border-slate-400">PJ / Target</th>
                  <th className="p-1 text-center w-16">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {recommendations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-2 text-center text-slate-500 italic">
                      Belum ada item rekomendasi RTL yang ditambahkan pada menu Rekomendasi &amp; Tindak Lanjut.
                    </td>
                  </tr>
                ) : (
                  recommendations.map((rec, idx) => (
                    <tr key={rec.recId}>
                      <td className="p-1 text-center font-mono tabular-nums">{idx + 1}</td>
                      <td className="p-1">
                        <strong className="block">{rec.komponenNama}</strong>
                        <span>{rec.rekomendasi || rec.temuan}</span>
                      </td>
                      <td className="p-1">{rec.rencanaTindakLanjut}</td>
                      <td className="p-1 text-center">{rec.penanggungJawab} ({rec.targetWaktu})</td>
                      <td className="p-1 text-center font-bold">{rec.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {showChapter('bab7') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-4 text-xs">
            <div className="border-b-2 border-emerald-950 pb-1 mb-2">
              <h2 className="text-sm font-extrabold uppercase text-emerald-950 tracking-wide">BAB VII PENUTUP</h2>
            </div>
            <div className="space-y-3 text-justify leading-relaxed">
              <div>
                <h3 className="font-bold text-slate-900 uppercase mb-1">A. Kesimpulan</h3>
                <p>
                  Pelaksanaan tugas Kepala {institution.namaLembaga} selama periode {institution.periodePenilaian || periodLabel || '-'} telah terdokumentasi pada seluruh instrumen PKKM v.26 ({activeInds.length} indikator).
                </p>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 uppercase mb-1">B. Saran Rekomendasi</h3>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-800">
                  <li>Penguatan pembinaan dan pendampingan berkelanjutan dari Pengawas Pembina Kemenag.</li>
                  <li>Pelaksanaan rencana tindak lanjut (RTL) sesuai hasil evaluasi Penilai 1 dan Penilai 2.</li>
                </ul>
              </div>
              <div className="text-right pt-4 avoid-break">
                <p>{evaluators.tempatPenilaian || '-'}, {currentDateStr}</p>
                <p className="font-bold text-slate-900">Kepala {institution.namaLembaga},</p>
                <p className="font-bold underline text-emerald-950 mt-10">{principal.namaLengkap || '-'}</p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* FORMAT 5 & 6 UNTUK BUNDEL LENGKAP / STANDALONE SUDAH DI ATAS   */}
        {/* HALAMAN 53: REKAPITULASI HASIL PENILAIAN KINERJA TAHUNAN       */}
        {/* ============================================================== */}
        {showSection('format7_rekap_nilai') && (
          <div className="a4-sheet bg-white p-7 md:p-9 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-5 text-[11px] text-black">
            <div className="text-center space-y-0.5 pb-2 border-b-2 border-[#008000]">
              <h2 className="text-[13px] font-black uppercase tracking-wide text-black">
                REKAPITULASI HASIL PENILAIAN KINERJA TAHUNAN KEPALA RA TAHUN {assessmentYear}
              </h2>
            </div>

            {rekapV26.incompleteWarning && (
              <div className="border border-amber-400 bg-amber-50 p-2.5 text-[10.5px] text-amber-950 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                <div>
                  <strong className="block">{rekapV26.incompleteWarning}</strong>
                  <span>
                    P1: {rekapV26.penilai1.scoredIndicators}/{rekapV26.penilai1.totalIndicators} · P2: {rekapV26.penilai2.scoredIndicators}/{rekapV26.penilai2.totalIndicators}.
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-[10px]">
              <table className="w-full border-collapse">
                <tbody>
                  <tr><td className="py-0.5 w-32 align-top">Nama Kepala RA</td><td className="w-3 align-top">:</td><td className="font-bold">{principal.namaLengkap || '-'}</td></tr>
                  <tr><td className="py-0.5 align-top">NIP</td><td className="align-top">:</td><td className="font-mono">{principal.nip || '-'}</td></tr>
                  <tr><td className="py-0.5 align-top">Pangkat / Gol. Ruang</td><td className="align-top">:</td><td>{principal.pangkatGol || '-'}</td></tr>
                  <tr><td className="py-0.5 align-top">NUPTK/PegID / NRG</td><td className="align-top">:</td><td className="font-mono">{[principal.nuptk, principal.nrg].filter((v) => v && v !== '-').join(' / ') || principal.nuptk || '-'}</td></tr>
                  <tr><td className="py-0.5 align-top">Jabatan</td><td className="align-top">:</td><td>{principal.jabatan || 'Kepala Raudhatul Athfal'}</td></tr>
                  <tr><td className="py-0.5 align-top">Tempat Tugas</td><td className="align-top">:</td><td className="font-semibold">{institution.namaLembaga || '-'}</td></tr>
                  <tr><td className="py-0.5 align-top">Unit Kerja</td><td className="align-top">:</td><td>{principal.unitKerja || '-'}</td></tr>
                </tbody>
              </table>

              <table className="w-full border-collapse">
                <tbody>
                  <tr><td className="py-0.5 w-32 align-top">Periode Penilaian</td><td className="w-3 align-top">:</td><td className="font-semibold">{institution.periodePenilaian || periodLabel || '-'}</td></tr>
                  <tr><td className="py-0.5 align-top">Nama Penilai 1</td><td className="align-top">:</td><td className="font-bold">{evaluators.pengawas1Nama || '-'}</td></tr>
                  <tr><td className="py-0.5 align-top">NIP Penilai 1</td><td className="align-top">:</td><td className="font-mono">{evaluators.pengawas1Nip || '-'}</td></tr>
                  <tr><td className="py-0.5 align-top">Nama Penilai 2</td><td className="align-top">:</td><td className="font-bold">{evaluators.pengawas2Nama || '-'}</td></tr>
                  <tr><td className="py-0.5 align-top">NIP Penilai 2</td><td className="align-top">:</td><td className="font-mono">{evaluators.pengawas2Nip || '-'}</td></tr>
                  <tr><td className="py-0.5 align-top">Nomor SK Tugas</td><td className="align-top">:</td><td className="font-mono">{evaluators.skPenugasanNomor || adminDocs.suratTugasNomor || '-'}</td></tr>
                </tbody>
              </table>
            </div>

            <table className="w-full text-[11px] border border-black border-collapse tabular-nums">
              <thead>
                <tr className="bg-[#e8f5e9] font-bold border-b border-black">
                  <th className="p-2 text-center border-r border-black w-10">No</th>
                  <th className="p-2 text-center border-r border-black">Komponen</th>
                  <th className="p-2 text-center border-r border-black w-24">Penilai 1</th>
                  <th className="p-2 text-center border-r border-black w-24">Penilai 2</th>
                  <th className="p-2 text-center w-24">Rata-Rata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {rekapV26.rataRataKomponen.map((row) => (
                  <tr key={row.komponenCode}>
                    <td className="p-2 text-center border-r border-black font-mono">{row.komponenNomor}</td>
                    <td className="p-2 border-r border-black font-semibold">{row.komponenNama}</td>
                    <td className="p-2 text-center border-r border-black font-mono">{row.p1Skor}</td>
                    <td className="p-2 text-center border-r border-black font-mono">{row.p2Skor}</td>
                    <td className="p-2 text-center font-mono font-bold">
                      {formatCommaNum(row.rataSkor, 2)}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold bg-slate-50">
                  <td colSpan={2} className="p-2 text-center border-r border-black">
                    Jumlah Skor
                  </td>
                  <td className="p-2 text-center border-r border-black font-mono">{rekapV26.penilai1.jumlahSkor}</td>
                  <td className="p-2 text-center border-r border-black font-mono">{rekapV26.penilai2.jumlahSkor}</td>
                  <td className="p-2 text-center font-mono">{formatCommaNum(rekapV26.jumlahSkorRataRata, 2)}</td>
                </tr>
                <tr className="font-bold bg-slate-50">
                  <td colSpan={2} className="p-2 text-center border-r border-black">
                    Nilai Kinerja
                  </td>
                  <td className="p-2 text-center border-r border-black font-mono">
                    {rekapV26.penilai1.isComplete ? Math.round(rekapV26.penilai1.nilaiKinerja) : '-'}
                  </td>
                  <td className="p-2 text-center border-r border-black font-mono">
                    {rekapV26.penilai2.isComplete ? Math.round(rekapV26.penilai2.nilaiKinerja) : '-'}
                  </td>
                  <td className="p-2 text-center font-mono font-black">
                    {rekapV26.isBothComplete && rekapV26.finalNilaiKinerjaTahunan !== null
                      ? formatCommaNum(rekapV26.finalNilaiKinerjaTahunan, 2)
                      : '-'}
                  </td>
                </tr>
                <tr className="bg-[#e8f5e9] font-black text-black">
                  <td colSpan={2} className="p-2 text-center border-r border-black">
                    Nilai Kinerja Tahunan
                  </td>
                  <td colSpan={3} className="p-2 text-center font-mono text-sm">
                    {rekapV26.isBothComplete && rekapV26.finalNilaiKinerjaTahunan !== null
                      ? formatCommaNum(rekapV26.finalNilaiKinerjaTahunan, 2)
                      : 'BELUM FINAL'}
                  </td>
                </tr>
                <tr className="bg-[#e8f5e9] font-black text-black">
                  <td colSpan={2} className="p-2 text-center border-r border-black">
                    Predikat Penilaian Kinerja Tahunan
                  </td>
                  <td colSpan={3} className="p-2 text-center text-sm uppercase">
                    {rekapV26.isBothComplete && rekapV26.finalPredikat
                      ? rekapV26.finalPredikat
                      : 'MENUNGGU KELENGKAPAN P1 & P2'}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="border border-black p-3 bg-rose-50/60 space-y-1.5 text-[10.5px]">
              <p className="font-bold text-rose-700">Rekomendasi:</p>
              <p>
                <strong>Penilai 1:</strong> {p1Note || 'Tingkatkan kesinambungan supervisi akademik dan pendampingan kompetensi guru RA.'}
              </p>
              <p>
                <strong>Penilai 2:</strong> {p2Note || 'Pertahankan tata kelola madrasah dan kelengkapan administrasi portofolio secara berkelanjutan.'}
              </p>
            </div>

            <div className="pt-8 grid grid-cols-3 gap-4 text-center text-[10px] avoid-break">
              <div>
                <p>Kepala {institution.namaLembaga || '-'},</p>
                <div className="h-16" />
                <p className="font-bold underline">{principal.namaLengkap || '-'}</p>
                <p className="font-mono text-[9px]">NIP. {principal.nip || '-'}</p>
              </div>
              <div>
                <p>Penilai 2,</p>
                <div className="h-16" />
                <p className="font-bold underline">{evaluators.pengawas2Nama || '-'}</p>
                <p className="font-mono text-[9px]">NIP. {evaluators.pengawas2Nip || '-'}</p>
              </div>
              <div>
                <p>{evaluators.tempatPenilaian || 'Cirebon'}, {currentDateStr}</p>
                <p>Penilai 1,</p>
                <div className="h-16" />
                <p className="font-bold underline">{evaluators.pengawas1Nama || '-'}</p>
                <p className="font-mono text-[9px]">NIP. {evaluators.pengawas1Nip || '-'}</p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* FORMAT 8: REKAP & GRAFIK CAPAIAN KOMPONEN                      */}
        {/* ============================================================== */}
        {showSection('format8_rekap_grafik') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-4 text-xs text-black">
            <KopSuratDinas variant="kemenag" />

            <div className="text-center space-y-0.5">
              <p className="text-[10px] font-bold uppercase text-emerald-900">FORMAT 8 · GRAFIK PERBANDINGAN PENILAI 1 &amp; PENILAI 2</p>
              <h2 className="text-sm font-black uppercase underline underline-offset-4">
                GRAFIK CAPAIAN KOMPONEN KINERJA KEPALA RA (%)
              </h2>
            </div>

            <div className="space-y-3 border border-slate-300 p-4 bg-slate-50/40">
              {rekapV26.rataRataKomponen.map((row) => (
                <div key={row.komponenCode} className="bg-white border border-slate-300 p-3 space-y-1.5">
                  <div className="flex justify-between font-bold text-[11px]">
                    <span>{row.komponenNomor}. {row.komponenNama}</span>
                    <span className="font-mono tabular-nums">Rata-rata: {row.rataNilai100.toFixed(1)}%</span>
                  </div>
                  <div className="space-y-1 text-[10px] tabular-nums">
                    <div className="flex items-center gap-2">
                      <span className="w-16 font-semibold">Penilai 1</span>
                      <div className="flex-1 h-3 bg-slate-100 border border-slate-300 overflow-hidden">
                        <div className="h-full bg-emerald-800" style={{ width: `${row.p1Nilai100}%` }} />
                      </div>
                      <span className="w-12 text-right font-mono font-bold">{row.p1Nilai100.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-16 font-semibold">Penilai 2</span>
                      <div className="flex-1 h-3 bg-slate-100 border border-slate-300 overflow-hidden">
                        <div className="h-full bg-amber-600" style={{ width: `${row.p2Nilai100}%` }} />
                      </div>
                      <span className="w-12 text-right font-mono font-bold">{row.p2Nilai100.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border border-slate-300 p-3 text-[10px]">
              <p className="font-bold uppercase mb-1">Rentang Predikat Resmi Kementerian Agama RI:</p>
              <div className="grid grid-cols-5 gap-1 text-center font-mono">
                <div className="p-1 border border-slate-300">90,01–100: Amat Baik</div>
                <div className="p-1 border border-slate-300">75,01–90: Baik</div>
                <div className="p-1 border border-slate-300">60,01–75: Cukup</div>
                <div className="p-1 border border-slate-300">50,01–60: Sedang</div>
                <div className="p-1 border border-slate-300">≤ 50,00: Kurang</div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* FORMAT 9: REKAP BUKTI FISIK TERUNGGAH                          */}
        {/* ============================================================== */}
        {showSection('format9_bukti_fisik') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-4 text-xs text-black">
            <KopSuratDinas variant="yayasan" />

            <div className="text-center">
              <p className="text-[10px] font-bold uppercase text-emerald-900">FORMAT 9 · DAFTAR REKAPITULASI BUKTI FISIK</p>
              <h2 className="text-sm font-black uppercase underline underline-offset-4">
                REKAPITULASI ARSIP BUKTI FISIK PORTOFOLIO PKKRA
              </h2>
            </div>

            <table className="w-full text-[9.5px] border border-slate-400 border-collapse tabular-nums">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-400">
                  <th className="p-1.5 text-center border-r border-slate-400 w-8">No</th>
                  <th className="p-1.5 text-left border-r border-slate-400">Nama Berkas</th>
                  <th className="p-1.5 text-left border-r border-slate-400 w-28">Indikator Tertaut</th>
                  <th className="p-1.5 text-center border-r border-slate-400 w-16">Ukuran</th>
                  <th className="p-1.5 text-center w-28">Status Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {evidenceFiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-3 text-center text-slate-500 italic">
                      Belum ada berkas bukti fisik yang diunggah pada menu Bukti Fisik.
                    </td>
                  </tr>
                ) : (
                  evidenceFiles.map((ev, idx) => {
                    const linked = ev.linkedIndicatorIds && ev.linkedIndicatorIds.length > 0
                      ? ev.linkedIndicatorIds
                      : [ev.indicatorId];
                    return (
                      <tr key={ev.evidenceId}>
                        <td className="p-1.5 text-center border-r border-slate-300 font-mono">{idx + 1}</td>
                        <td className="p-1.5 border-r border-slate-300">
                          <strong className="block">{ev.fileName}</strong>
                          <span className="text-[8.5px] text-slate-600">{ev.description}</span>
                        </td>
                        <td className="p-1.5 border-r border-slate-300 font-mono">{linked.join(', ')}</td>
                        <td className="p-1.5 text-center border-r border-slate-300 font-mono">
                          {Math.max(1, Math.round(ev.sizeBytes / 1024))} KB
                        </td>
                        <td className="p-1.5 text-center font-semibold">
                          {VERIF_LABEL[ev.verificationStatus] || ev.verificationStatus}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ============================================================== */}
        {/* FORMAT 10: REKOMENDASI & RENCANA TINDAK LANJUT (RTL)           */}
        {/* ============================================================== */}
        {showSection('format10_rtl') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-4 text-xs text-black">
            <KopSuratDinas variant="kemenag" />

            <div className="text-center">
              <p className="text-[10px] font-bold uppercase text-emerald-900">FORMAT 10 · REKOMENDASI &amp; RENCANA TINDAK LANJUT</p>
              <h2 className="text-sm font-black uppercase underline underline-offset-4">
                REKOMENDASI PEMBINAAN &amp; RENCANA TINDAK LANJUT (RTL)
              </h2>
            </div>

            <table className="w-full text-[9.5px] border border-slate-400 border-collapse">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-400">
                  <th className="p-1.5 text-center border-r border-slate-400 w-7">No</th>
                  <th className="p-1.5 text-left border-r border-slate-400 w-20">Sumber</th>
                  <th className="p-1.5 text-left border-r border-slate-400">Komponen &amp; Temuan</th>
                  <th className="p-1.5 text-left border-r border-slate-400">Rekomendasi &amp; Rencana Tindak Lanjut</th>
                  <th className="p-1.5 text-center border-r border-slate-400 w-24">PJ &amp; Target</th>
                  <th className="p-1.5 text-center w-16">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {recommendations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-3 text-center text-slate-500 italic">
                      Belum ada rekomendasi &amp; RTL tercatat. Silakan tambahkan atau tarik dari catatan Penilai pada menu Rekomendasi &amp; Tindak Lanjut.
                    </td>
                  </tr>
                ) : (
                  recommendations.map((rec, idx) => (
                    <tr key={rec.recId}>
                      <td className="p-1.5 text-center border-r border-slate-300 font-mono">{idx + 1}</td>
                      <td className="p-1.5 border-r border-slate-300 font-semibold">{rec.sourceRole}</td>
                      <td className="p-1.5 border-r border-slate-300">
                        <strong className="block">{rec.komponenNama}</strong>
                        <span>{rec.temuan}</span>
                      </td>
                      <td className="p-1.5 border-r border-slate-300">
                        <p className="font-semibold">{rec.rekomendasi}</p>
                        <p className="text-slate-700 mt-0.5">RTL: {rec.rencanaTindakLanjut}</p>
                      </td>
                      <td className="p-1.5 text-center border-r border-slate-300">
                        {rec.penanggungJawab} · {rec.targetWaktu}
                      </td>
                      <td className="p-1.5 text-center font-bold">{rec.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ============================================================== */}
        {/* FORMAT 4: INSTRUMEN 96 INDIKATOR (LANDSCAPE A4)                */}
        {/* ============================================================== */}
        {showSection('format4_instrumen_96') && (
          <div className="a4-sheet-landscape bg-white p-5 border border-slate-300 shadow-md mx-auto mb-8 max-w-[297mm] space-y-3 text-xs text-black">
            <div className="flex items-center justify-between border-b-2 border-emerald-950 pb-2">
              <div>
                <p className="text-[10px] font-bold uppercase text-emerald-900">FORMAT 4 · INSTRUMEN PENILAIAN KINERJA ({activeInds.length} INDIKATOR)</p>
                <h2 className="text-sm font-black uppercase">
                  MATRIKS INSTRUMEN PKKM_v.26 — {institution.namaLembaga}
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-600">{periodLabel || institution.periodePenilaian}</span>
            </div>

            <table className="w-full text-[8.5px] border border-slate-400 border-collapse tabular-nums">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-400">
                  <th className="p-1 text-center border-r border-slate-400 w-11">Kode</th>
                  <th className="p-1 text-left border-r border-slate-400 w-36">Komponen / Sub</th>
                  <th className="p-1 text-left border-r border-slate-400">Indikator Kinerja Kepala RA</th>
                  <th className="p-1 text-left border-r border-slate-400 w-44">Bukti Fisik Diharapkan</th>
                  <th className="p-1 text-center border-r border-slate-400 w-16">Kesiapan</th>
                  <th className="p-1 text-center border-r border-slate-400 w-9">P1</th>
                  <th className="p-1 text-center border-r border-slate-400 w-9">P2</th>
                  <th className="p-1 text-center w-10">Rata2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {activeInds.map((ind) => {
                  const resp = responses[ind.id];
                  const linkedCount = evidenceFiles.filter((ev) => isEvidenceLinkedToIndicator(ev, ind.id)).length;
                  const s1 = p1Scores[ind.id]?.score;
                  const s2 = p2Scores[ind.id]?.score;
                  const avg = s1 && s2 ? ((s1 + s2) / 2).toFixed(1) : '-';
                  return (
                    <tr key={ind.id}>
                      <td className="p-1 text-center border-r border-slate-300 font-mono font-bold">{ind.id}</td>
                      <td className="p-1 border-r border-slate-300">
                        <span className="font-semibold block">{ind.komponenCode}</span>
                        <span className="text-[8px] text-slate-600">{ind.subKomponenNama}</span>
                      </td>
                      <td className="p-1 border-r border-slate-300">{ind.indikatorNama}</td>
                      <td className="p-1 border-r border-slate-300 text-[8px] text-slate-700">
                        {ind.buktiWajib.join('; ')}
                      </td>
                      <td className="p-1 text-center border-r border-slate-300 font-semibold">
                        {resp?.completionStatus === 'complete' ? 'Siap' : resp?.completionStatus === 'draft' ? 'Draft' : 'Kosong'}
                        {linkedCount > 0 ? ` (${linkedCount})` : ''}
                      </td>
                      <td className="p-1 text-center border-r border-slate-300 font-mono">{s1 || '-'}</td>
                      <td className="p-1 text-center border-r border-slate-300 font-mono">{s2 || '-'}</td>
                      <td className="p-1 text-center font-mono font-bold">{avg}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ============================================================== */}
        {/* RINGKASAN MATRIKS 96 (STANDALONE TAB COMPATIBILITY)            */}
        {/* ============================================================== */}
        {activePrintTab === 'rekap_instrumen' && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-4 text-xs">
            <KopSuratDinas variant="kemenag" />

            <div className="text-center space-y-0.5">
              <h2 className="text-sm font-black uppercase underline underline-offset-4 text-black">
                REKAPITULASI HASIL PENILAIAN KINERJA KEPALA RA (PKKM_v.26)
              </h2>
              <p className="text-[10.5px] font-semibold text-slate-700">
                {institution.namaLembaga} · {periodLabel || institution.periodePenilaian}
              </p>
            </div>

            {rekapV26.incompleteWarning && (
              <div className="border border-amber-400 bg-amber-50 p-2 text-[10px] text-amber-950 font-semibold">
                {rekapV26.incompleteWarning} (P1: {rekapV26.penilai1.scoredIndicators}/{rekapV26.penilai1.totalIndicators}, P2: {rekapV26.penilai2.scoredIndicators}/{rekapV26.penilai2.totalIndicators})
              </div>
            )}

            <table className="w-full text-[10px] border border-slate-400 border-collapse tabular-nums">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-400">
                  <th className="p-1.5 text-center border-r border-slate-400 w-8">No</th>
                  <th className="p-1.5 text-left border-r border-slate-400">Komponen Utama PKKM_v.26</th>
                  <th className="p-1.5 text-right border-r border-slate-400 w-20">Skor P1</th>
                  <th className="p-1.5 text-right border-r border-slate-400 w-20">Skor P2</th>
                  <th className="p-1.5 text-right w-24">Rata-rata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {rekapV26.rataRataKomponen.map((row) => (
                  <tr key={row.komponenCode}>
                    <td className="p-1.5 text-center border-r border-slate-300 font-mono">{row.komponenNomor}.</td>
                    <td className="p-1.5 border-r border-slate-300 font-semibold">{row.komponenNama}</td>
                    <td className="p-1.5 text-right border-r border-slate-300 font-mono">{row.p1Skor}</td>
                    <td className="p-1.5 text-right border-r border-slate-300 font-mono">{row.p2Skor}</td>
                    <td className="p-1.5 text-right font-mono font-bold">{row.rataSkor.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td className="p-1.5 border-r border-slate-300" />
                  <td className="p-1.5 border-r border-slate-300">Jumlah Skor Total (Maks. {rekapV26.penilai1.maxSkorTotal})</td>
                  <td className="p-1.5 text-right border-r border-slate-300 font-mono">{rekapV26.penilai1.jumlahSkor}</td>
                  <td className="p-1.5 text-right border-r border-slate-300 font-mono">{rekapV26.penilai2.jumlahSkor}</td>
                  <td className="p-1.5 text-right font-mono">{rekapV26.jumlahSkorRataRata.toFixed(2)}</td>
                </tr>
                <tr className="bg-emerald-50 font-black text-emerald-950">
                  <td className="p-2 border-r border-slate-300" />
                  <td className="p-2 border-r border-slate-300">Nilai Kinerja Tahunan (Skala 100) &amp; Predikat</td>
                  <td colSpan={3} className="p-2 text-right font-mono text-xs">
                    {rekapV26.isBothComplete && rekapV26.finalNilaiKinerjaTahunan !== null
                      ? `${rekapV26.finalNilaiKinerjaTahunan.toFixed(2)} — ${rekapV26.finalPredikat}`
                      : 'BELUM FINAL'}
                  </td>
                </tr>
              </tbody>
            </table>

            <div>
              <h3 className="font-bold text-slate-900 uppercase mb-1 text-[11px]">
                Matriks Kesiapan Bukti &amp; Skor {activeInds.length} Indikator Instrumen
              </h3>
              <table className="w-full text-[8.5px] border border-slate-400 border-collapse tabular-nums">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-400">
                    <th className="p-1 text-center border-r border-slate-400 w-10">Kode</th>
                    <th className="p-1 text-left border-r border-slate-400">Indikator Kinerja Kepala RA</th>
                    <th className="p-1 text-center border-r border-slate-400 w-16">Kesiapan</th>
                    <th className="p-1 text-center border-r border-slate-400 w-10">P1</th>
                    <th className="p-1 text-center border-r border-slate-400 w-10">P2</th>
                    <th className="p-1 text-center w-12">Rata2</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {activeInds.map((ind) => {
                    const resp = responses[ind.id];
                    const s1 = p1Scores[ind.id]?.score;
                    const s2 = p2Scores[ind.id]?.score;
                    const avg = s1 && s2 ? ((s1 + s2) / 2).toFixed(1) : '-';
                    return (
                      <tr key={ind.id}>
                        <td className="p-1 text-center border-r border-slate-300 font-mono font-bold">{ind.id}</td>
                        <td className="p-1 border-r border-slate-300">{ind.indikatorNama}</td>
                        <td className="p-1 text-center border-r border-slate-300 font-semibold">
                          {resp?.completionStatus === 'complete'
                            ? 'Siap'
                            : resp?.completionStatus === 'draft'
                            ? 'Draft'
                            : 'Kosong'}
                        </td>
                        <td className="p-1 text-center border-r border-slate-300 font-mono">{s1 || '-'}</td>
                        <td className="p-1 text-center border-r border-slate-300 font-mono">{s2 || '-'}</td>
                        <td className="p-1 text-center font-mono font-bold">{avg}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 15. LAMPIRAN FOTO DOKUMENTASI BUKTI FISIK                      */}
        {/* ============================================================== */}
        {showSection('lampiran') &&
          photoChunks.map((chunk, pageIndex) => (
            <div
              key={pageIndex}
              className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] flex flex-col justify-between"
            >
              <div>
                <div className="border-b-2 border-emerald-950 pb-1 mb-3 flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase text-emerald-950 tracking-wider">
                    LAMPIRAN DOKUMENTASI FOTO BUKTI FISIK KEGIATAN (LEMBAR {pageIndex + 1})
                  </h2>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Lembar Foto {pageIndex + 1} dari {photoChunks.length}
                  </span>
                </div>

                {photoLayout === '2_per_page' ? (
                  <div className="space-y-4">
                    {chunk.map((photo, idx) => (
                      <div key={photo.id} className="border border-slate-300 p-3 bg-white avoid-break">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 mb-2">
                          <span className="font-bold text-xs text-slate-900">
                            {pageIndex * 2 + idx + 1}. {photo.judul}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-900">
                            {photo.kategori}{photo.tanggal ? ` · ${photo.tanggal}` : ''}
                          </span>
                        </div>

                        <div className="h-56 w-full border border-slate-300 overflow-hidden bg-slate-50 mb-2 flex items-center justify-center p-1">
                          <img src={photo.fotoUrl} alt={photo.judul} className="max-h-full max-w-full object-contain" />
                        </div>

                        <p className="text-[10px] text-slate-700 leading-snug">
                          <strong>Keterangan Foto:</strong> {photo.deskripsi}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {chunk.map((photo, idx) => (
                      <div key={photo.id} className="border border-slate-300 p-2 bg-white avoid-break">
                        <span className="font-bold text-[10px] text-slate-900 truncate block mb-1">
                          {pageIndex * 4 + idx + 1}. {photo.judul}
                        </span>
                        <div className="h-36 w-full border border-slate-300 overflow-hidden bg-slate-50 mb-1 flex items-center justify-center p-1">
                          <img src={photo.fotoUrl} alt={photo.judul} className="max-h-full max-w-full object-contain" />
                        </div>
                        <p className="text-[9px] text-slate-700 line-clamp-2">{photo.deskripsi}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 text-[9.5px] text-slate-500 flex justify-between italic">
                <span>Dokumen Portofolio Resmi {institution.namaLembaga}</span>
                <span>Diverifikasi Tim Penilai PKKRA Kemenag {institution.kotaKab || '-'}</span>
              </div>
            </div>
          ))}

        {/* ============================================================== */}
        {/* 17. DOKUMEN ADMINISTRASI OTOMATIS (27 BERKAS A4)               */}
        {/* ============================================================== */}
        {(activePrintTab === 'dokumen_otomatis' ||
          (activePrintTab === 'bundel_lengkap' && includeDocsInBundle)) &&
          generatedDocs.map((docItem, idx) => (
            <div
              key={docItem.docId}
              className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-4 text-xs"
            >
              <KopSuratDinas variant="yayasan" />

              <div className="flex items-center justify-between text-[10px] text-slate-500 border-b border-slate-200 pb-1">
                <span className="font-semibold uppercase">{docItem.category}</span>
                <span className="font-mono">Berkas {idx + 1} / {generatedDocs.length}</span>
              </div>

              <div className="text-center space-y-0.5 py-1">
                <h2 className="text-sm font-black uppercase underline underline-offset-4 text-black">
                  {docItem.title}
                </h2>
                <p className="text-[11px] font-mono text-slate-700">
                  Nomor: {docItem.docNumber}
                </p>
              </div>

              <div className="text-[11.5px] leading-relaxed text-black whitespace-pre-line text-justify">
                {docItem.bodyContent}
              </div>

              <div className="pt-6 flex justify-end avoid-break">
                <div className="w-60 text-left text-xs">
                  <p>{evaluators.tempatPenilaian || '-'}, {currentDateStr}</p>
                  <p className="font-bold text-slate-900">Kepala {institution.namaLembaga},</p>
                  <p className="font-bold underline text-emerald-950 mt-12">{principal.namaLengkap || '-'}</p>
                  <p className="text-[10px] font-mono text-slate-700">NUPTK: {principal.nuptk || '-'}</p>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
