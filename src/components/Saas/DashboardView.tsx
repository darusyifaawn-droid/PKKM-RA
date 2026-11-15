import React, { useState } from 'react';
import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileCheck2,
  FolderOpen,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useSaas } from '../../context/SaasContext';
import { EMPTY_ADMIN_DOCS } from '../../data/cleanPpkmFactory';
import { MASTER_COMPONENTS } from '../../data/masterInstrumentV26';
import { computeDualAssessorRekap } from '../../utils/pkkmScoring';

export const DashboardView: React.FC<{
  onJumpToIndicator: (indicatorId: string) => void;
}> = ({ onJumpToIndicator }) => {
  const {
    activeRole,
    institutions,
    activeInstitution,
    setActiveInstitutionId,
    updateActiveInstitutionData,
    periods,
    activePeriod,
    activeIndicators,
    responses,
    p1Scores,
    p2Scores,
    evidenceFiles,
    generatedDocs,
    notifications,
    setActiveMenu,
    autoSyncAllNow,
    setPendingQuickPrint,
  } = useSaas();

  const [quickInputOpen, setQuickInputOpen] = useState(true);
  const [syncNotice, setSyncNotice] = useState('');

  const ppkmData = activeInstitution.profileData;
  const adminDocs = {
    ...EMPTY_ADMIN_DOCS,
    ...(ppkmData.adminDocs || {}),
  };

  const totalIndicators = activeIndicators.length;
  const completedIndicators = activeIndicators.filter(
    (ind) => responses[ind.id]?.completionStatus === 'complete'
  ).length;
  const incompleteIndicators = totalIndicators - completedIndicators;
  const progressPercent = totalIndicators > 0 ? Math.round((completedIndicators / totalIndicators) * 100) : 0;

  const pendingEvidenceCount = evidenceFiles.filter((e) => e.verificationStatus === 'pending' || e.verificationStatus === 'uploaded').length;
  const approvedDocsCount = generatedDocs.filter((d) => d.status === 'APPROVED').length;
  const rekap = computeDualAssessorRekap(p1Scores, p2Scores, activeIndicators);

  const resumeIndicatorId = activePeriod.lastActiveIndicatorId || activeIndicators[0]?.id || '1.1.1';

  const handleAutoSyncAndPrint = async () => {
    const res = await autoSyncAllNow(false);
    setSyncNotice(`${res.docsCount} dokumen & ${res.indicatorsDone}/${totalIndicators} indikator siap dicetak.`);
    setPendingQuickPrint(true);
    setActiveMenu('laporan_pkkm');
  };

  const handleSyncOnly = async () => {
    const res = await autoSyncAllNow(false);
    setSyncNotice(`Tersinkron otomatis: ${res.docsCount} dokumen & ${res.indicatorsDone}/${totalIndicators} indikator siap.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Executive Hero Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-emerald-700">{activeInstitution.name}</span>
            <span aria-hidden="true">·</span>
            <span>NSM {activeInstitution.nsm || '-'}</span>
            <span aria-hidden="true">·</span>
            <span>{activePeriod.yearLabel}</span>
            <span aria-hidden="true">·</span>
            <span>Peran: {activeRole.replace('_', ' ')}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Otomatisasi Data &amp; Laporan Cetak PKKM RA
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Cukup isi data lembaga di bawah sekali. Seluruh <strong>27 dokumen administrasi</strong>, <strong>96 indikator PKKM_v.26</strong>, <strong>Lembar Pengesahan</strong>, <strong>SK/Surat</strong>, <strong>Bab I–VII A4</strong>, dan <strong>Slide Presentasi 16:9</strong> otomatis terisi dan langsung siap cetak.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleAutoSyncAndPrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>CETAK LAPORAN LENGKAP A4</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onJumpToIndicator(resumeIndicatorId);
              setActiveMenu('instrumen_penilaian');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Lanjutkan Indikator ({resumeIndicatorId})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* PUSAT INPUT CEPAT 1 HALAMAN -> SEMUA OTOMATIS -> TINGGAL CETAK */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/40">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Input Data Cepat 1 Halaman (Langsung Otomatis ke Semua Berkas)
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Setiap perubahan yang Anda ketik di sini otomatis memperbarui Cover, Pengesahan, SK, Berita Acara, 27 Dokumen Administrasi, 96 Indikator, dan Slide PPT.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setQuickInputOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>{quickInputOpen ? 'Sembunyikan Form Cepat' : 'Tampilkan Form Cepat'}</span>
            {quickInputOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {quickInputOpen && (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 text-xs">
              {/* Column 1: Identitas RA */}
              <div className="space-y-3 bg-slate-50/60 border border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-2">
                  1. Identitas Lembaga RA
                </h3>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Nama Lembaga RA</label>
                  <input
                    type="text"
                    value={ppkmData.institution.namaLembaga}
                    onChange={(e) =>
                      updateActiveInstitutionData((prev) => ({
                        ...prev,
                        institution: { ...prev.institution, namaLembaga: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">NSM</label>
                    <input
                      type="text"
                      value={ppkmData.institution.nsm}
                      onChange={(e) =>
                        updateActiveInstitutionData((prev) => ({
                          ...prev,
                          institution: { ...prev.institution, nsm: e.target.value },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">NPSN</label>
                    <input
                      type="text"
                      value={ppkmData.institution.npsn || ppkmData.institution.npsm}
                      onChange={(e) =>
                        updateActiveInstitutionData((prev) => ({
                          ...prev,
                          institution: { ...prev.institution, npsn: e.target.value, npsm: e.target.value },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Tahun Pelajaran</label>
                    <input
                      type="text"
                      value={ppkmData.institution.tahunPelajaran}
                      onChange={(e) =>
                        updateActiveInstitutionData((prev) => ({
                          ...prev,
                          institution: { ...prev.institution, tahunPelajaran: e.target.value },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Akreditasi</label>
                    <input
                      type="text"
                      value={ppkmData.institution.akreditasi}
                      onChange={(e) =>
                        updateActiveInstitutionData((prev) => ({
                          ...prev,
                          institution: { ...prev.institution, akreditasi: e.target.value },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Alamat Lengkap</label>
                  <input
                    type="text"
                    value={ppkmData.institution.alamat}
                    onChange={(e) =>
                      updateActiveInstitutionData((prev) => ({
                        ...prev,
                        institution: { ...prev.institution, alamat: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Column 2: Kepala RA */}
              <div className="space-y-3 bg-slate-50/60 border border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-2">
                  2. Data Kepala RA
                </h3>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Nama Lengkap &amp; Gelar</label>
                  <input
                    type="text"
                    value={ppkmData.principal.namaLengkap}
                    onChange={(e) =>
                      updateActiveInstitutionData((prev) => ({
                        ...prev,
                        principal: { ...prev.principal, namaLengkap: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">NUPTK</label>
                    <input
                      type="text"
                      value={ppkmData.principal.nuptk}
                      onChange={(e) =>
                        updateActiveInstitutionData((prev) => ({
                          ...prev,
                          principal: { ...prev.principal, nuptk: e.target.value },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">NIP / NPK</label>
                    <input
                      type="text"
                      value={ppkmData.principal.nip}
                      onChange={(e) =>
                        updateActiveInstitutionData((prev) => ({
                          ...prev,
                          principal: { ...prev.principal, nip: e.target.value },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Pendidikan Terakhir</label>
                  <input
                    type="text"
                    value={ppkmData.principal.pendidikanTerakhir}
                    onChange={(e) =>
                      updateActiveInstitutionData((prev) => ({
                        ...prev,
                        principal: { ...prev.principal, pendidikanTerakhir: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">TMT Kepala RA</label>
                  <input
                    type="text"
                    value={ppkmData.principal.tmtJabatan}
                    onChange={(e) =>
                      updateActiveInstitutionData((prev) => ({
                        ...prev,
                        principal: { ...prev.principal, tmtJabatan: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Column 3: Penilai 1 & 2 */}
              <div className="space-y-3 bg-slate-50/60 border border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-2">
                  3. Data Tim Penilai Kemenag
                </h3>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Nama Penilai 1</label>
                  <input
                    type="text"
                    value={ppkmData.evaluators.pengawas1Nama}
                    onChange={(e) =>
                      updateActiveInstitutionData((prev) => ({
                        ...prev,
                        evaluators: { ...prev.evaluators, pengawas1Nama: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Nama Penilai 2</label>
                  <input
                    type="text"
                    value={ppkmData.evaluators.pengawas2Nama}
                    onChange={(e) =>
                      updateActiveInstitutionData((prev) => ({
                        ...prev,
                        evaluators: { ...prev.evaluators, pengawas2Nama: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Tempat Penilaian</label>
                    <input
                      type="text"
                      value={ppkmData.evaluators.tempatPenilaian}
                      onChange={(e) =>
                        updateActiveInstitutionData((prev) => ({
                          ...prev,
                          evaluators: { ...prev.evaluators, tempatPenilaian: e.target.value },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Tanggal Penilaian</label>
                    <input
                      type="text"
                      value={ppkmData.evaluators.tanggalPenilaian}
                      onChange={(e) =>
                        updateActiveInstitutionData((prev) => ({
                          ...prev,
                          evaluators: { ...prev.evaluators, tanggalPenilaian: e.target.value },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Komite RA / Yayasan</label>
                  <input
                    type="text"
                    value={ppkmData.evaluators.komiteNama}
                    onChange={(e) =>
                      updateActiveInstitutionData((prev) => ({
                        ...prev,
                        evaluators: { ...prev.evaluators, komiteNama: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Column 4: Nomor Dokumen Dinas Resmi */}
              <div className="space-y-3 bg-slate-50/60 border border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-2">
                  4. Nomor SK &amp; Naskah Dinas
                </h3>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Nama Yayasan / Penyelenggara</label>
                  <input
                    type="text"
                    value={adminDocs.namaYayasan}
                    onChange={(e) =>
                      updateActiveInstitutionData((prev) => ({
                        ...prev,
                        adminDocs: { ...adminDocs, namaYayasan: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">No. SK Pembagian Tugas PTK</label>
                  <input
                    type="text"
                    value={adminDocs.skPanitiaNomor}
                    onChange={(e) =>
                      updateActiveInstitutionData((prev) => ({
                        ...prev,
                        adminDocs: { ...adminDocs, skPanitiaNomor: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">No. Surat Tugas Kemenag</label>
                  <input
                    type="text"
                    value={adminDocs.suratTugasNomor}
                    onChange={(e) =>
                      updateActiveInstitutionData((prev) => ({
                        ...prev,
                        adminDocs: { ...adminDocs, suratTugasNomor: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">No. Berita Acara PKKRA</label>
                  <input
                    type="text"
                    value={adminDocs.beritaAcaraNomor}
                    onChange={(e) =>
                      updateActiveInstitutionData((prev) => ({
                        ...prev,
                        adminDocs: { ...adminDocs, beritaAcaraNomor: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Action Bar inside Quick Form */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                <span>
                  Otomatisasi aktif: <strong className="text-emerald-700">{generatedDocs.length} dokumen administrasi</strong> &amp; <strong className="text-emerald-700">{completedIndicators}/{totalIndicators} indikator</strong> siap.
                </span>
                {syncNotice && (
                  <span className="text-emerald-800 font-semibold">{syncNotice}</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveMenu('data_guru')}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Edit Guru ({ppkmData.ptkList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMenu('profil_lembaga')}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Edit Siswa &amp; Sarpras
                </button>
                <button
                  type="button"
                  onClick={handleSyncOnly}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sinkron Ulang Semua</span>
                </button>
                <button
                  type="button"
                  onClick={handleAutoSyncAndPrint}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Langsung Cetak A4 &amp; PDF</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Indikator Selesai</span>
            <ClipboardList className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {completedIndicators} <span className="text-sm font-medium text-slate-400">/ {totalIndicators}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            {incompleteIndicators} indikator belum lengkap ({progressPercent}%)
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Bukti Fisik Terunggah</span>
            <FolderOpen className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">{evidenceFiles.length}</div>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            {pendingEvidenceCount} berkas menunggu pemeriksaan penilai
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Dokumen Otomatis</span>
            <FileCheck2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">{generatedDocs.length}</div>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            {approvedDocsCount} disetujui siap cetak & ekspor
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Nilai Kinerja Tahunan</span>
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {rekap.isBothComplete && rekap.finalNilaiKinerjaTahunan !== null
              ? rekap.finalNilaiKinerjaTahunan.toFixed(2)
              : 'Belum Final'}
          </div>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            {rekap.isBothComplete ? (
              <>
                Predikat: <strong className="text-emerald-700">{rekap.finalPredikat}</strong> · P1 {activePeriod.p1Finalized ? 'Final' : 'Proses'} / P2 {activePeriod.p2Finalized ? 'Final' : 'Proses'}
              </>
            ) : (
              <>
                Lengkapi 100% skor P1 ({rekap.penilai1.scoredIndicators}/{totalIndicators}) &amp; P2 ({rekap.penilai2.scoredIndicators}/{totalIndicators})
              </>
            )}
          </p>
        </div>
      </div>

      {/* Component Progress Bars + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Progres 4 Komponen Utama PKKM_v.26</h2>
              <p className="text-xs text-slate-500">Pemetaan langsung terhadap {totalIndicators} indikator instrumen Penilaian Kepala RA</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveMenu('instrumen_penilaian')}
              className="text-xs font-semibold text-emerald-700 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              Buka Semua Indikator
            </button>
          </div>

          <div className="space-y-4">
            {MASTER_COMPONENTS.map((comp) => {
              const items = activeIndicators.filter((i) => i.komponenCode === comp.code);
              const done = items.filter((i) => responses[i.id]?.completionStatus === 'complete').length;
              const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
              return (
                <div key={comp.code} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      {comp.nomor}. {comp.nama}
                    </span>
                    <span className="font-mono tabular-nums text-slate-600">
                      {done}/{items.length} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dual Assessor Readiness */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-slate-500 block">Penilaian Penilai 1</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {rekap.penilai1.scoredIndicators}/{totalIndicators} Indikator · Skor {rekap.penilai1.nilaiKinerja.toFixed(1)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveMenu('penilaian_1')}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Buka P1
              </button>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-slate-500 block">Penilaian Penilai 2</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {rekap.penilai2.scoredIndicators}/{totalIndicators} Indikator · Skor {rekap.penilai2.nilaiKinerja.toFixed(1)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveMenu('penilaian_2')}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Buka P2
              </button>
            </div>
          </div>
        </div>

        {/* Notifications Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-700" />
              <span>Notifikasi Kepatuhan</span>
            </h2>
            <span className="text-xs text-slate-500 tabular-nums">{notifications.length} item</span>
          </div>

          {notifications.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 space-y-2">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
              <p>Seluruh kelengkapan indikator, bukti fisik, dan verifikasi telah terpenuhi.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">{n.title}</span>
                    <span
                      className={`text-[11px] font-semibold ${
                        n.severity === 'alert'
                          ? 'text-red-700'
                          : n.severity === 'warning'
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {n.severity === 'alert' ? 'Prioritas' : n.severity === 'warning' ? 'Perhatian' : 'Info'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.detail}</p>
                  <button
                    type="button"
                    onClick={() => setActiveMenu(n.targetMenu)}
                    className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Tindak Lanjuti
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Multi-RA Tenant Quick Overview (for Super Admin or Institution Overview) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <span>Direktori Lembaga RA Terdaftar (Multi-Tenant)</span>
            </h2>
            <p className="text-xs text-slate-500">
              {institutions.length} lembaga terdaftar · {periods.length} periode pada lembaga aktif · Data setiap RA terisolasi per ID Lembaga
            </p>
          </div>
          {activeRole === 'SUPER_ADMIN' && (
            <button
              type="button"
              onClick={() => setActiveMenu('pengaturan')}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              Kelola Multi-RA
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 px-3 font-semibold">Nama Lembaga RA</th>
                <th className="py-2.5 px-3 font-semibold">NSM / NPSN</th>
                <th className="py-2.5 px-3 font-semibold">Kepala RA</th>
                <th className="py-2.5 px-3 font-semibold">Status Akses</th>
                <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {institutions.map((inst) => {
                const isSelected = inst.institutionId === activeInstitution.institutionId;
                return (
                  <tr key={inst.institutionId} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-semibold text-slate-900">{inst.name}</td>
                    <td className="py-3 px-3 font-mono tabular-nums text-slate-600">
                      {inst.nsm} / {inst.npsn}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {inst.profileData.principal.namaLengkap}
                    </td>
                    <td className="py-3 px-3">
                      <span className={inst.status === 'active' ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'}>
                        {inst.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setActiveInstitutionId(inst.institutionId)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? 'Sedang Aktif' : 'Buka Workspace'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
