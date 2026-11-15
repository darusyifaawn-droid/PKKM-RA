import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Sparkles,
  ArrowRight,
  Search,
} from 'lucide-react';
import { useSaas } from '../../context/SaasContext';
import { MASTER_COMPONENTS } from '../../data/masterInstrumentV26';
import { EMPTY_ADMIN_DOCS } from '../../data/cleanPpkmFactory';
import { isEvidenceLinkedToIndicator } from '../../utils/autoPopulatePkkm';

export const PemeriksaanKelengkapanView: React.FC<{
  onOpenAiAssistant: () => void;
  onJumpToMenu: (menu: 'profil_lembaga' | 'data_kepala' | 'data_guru' | 'data_penilai' | 'administrasi_dokumen' | 'program_kerja' | 'bukti_fisik' | 'instrumen_penilaian') => void;
  onJumpToIndicator: (indicatorId: string) => void;
}> = ({ onOpenAiAssistant, onJumpToMenu, onJumpToIndicator }) => {
  const {
    activeInstitution,
    activePeriod,
    activeIndicators,
    responses,
    evidenceFiles,
    generatedDocs,
  } = useSaas();

  const [filterStatus, setFilterStatus] = useState<'ALL' | 'READY' | 'INCOMPLETE'>('ALL');
  const [search, setSearch] = useState('');

  const ppkm = activeInstitution.profileData;
  const admin = { ...EMPTY_ADMIN_DOCS, ...(ppkm.adminDocs || {}) };

  const coreChecklist = useMemo(
    () => [
      {
        no: 1,
        name: 'Identitas Satuan Pendidikan (Nama RA, NSM, NPSN, Alamat)',
        ready: Boolean(ppkm.institution.namaLembaga && ppkm.institution.nsm && ppkm.institution.alamat),
        detail: `${ppkm.institution.namaLembaga || '-'} · NSM ${ppkm.institution.nsm || '-'}`,
        menu: 'profil_lembaga' as const,
      },
      {
        no: 2,
        name: 'Legalitas Yayasan, Izin Operasional (IJOP) & Akreditasi',
        ready: Boolean(admin.namaYayasan && admin.izinOperasionalNomor && ppkm.institution.akreditasi),
        detail: admin.izinOperasionalNomor || 'Nomor IJOP / Yayasan belum lengkap',
        menu: 'profil_lembaga' as const,
      },
      {
        no: 3,
        name: 'Biodata Kepala RA (NIP/NUPTK/NPK, Pendidikan, TMT Jabatan)',
        ready: Boolean(ppkm.principal.namaLengkap && (ppkm.principal.nuptk || ppkm.principal.nip)),
        detail: ppkm.principal.namaLengkap || 'Belum diisi',
        menu: 'data_kepala' as const,
      },
      {
        no: 4,
        name: 'Data Pendidik & Tenaga Kependidikan (PTK) & Struktur Organisasi',
        ready: ppkm.ptkList.length > 0,
        detail: `${ppkm.ptkList.length} personil terdata`,
        menu: 'data_guru' as const,
      },
      {
        no: 5,
        name: 'Data Peserta Didik, Sarana Bangunan & Inventaris APE',
        ready: ppkm.students.length > 0 && (ppkm.buildings.length > 0 || ppkm.inventory.length > 0),
        detail: `${ppkm.students.reduce((s, r) => s + (Number(r.lakiLaki) || 0) + (Number(r.perempuan) || 0), 0)} santri · ${ppkm.buildings.length} bangunan · ${ppkm.inventory.length} APE`,
        menu: 'profil_lembaga' as const,
      },
      {
        no: 6,
        name: 'Penetapan Tim Penilai 1, Penilai 2 & SK Penugasan Kemenag',
        ready: Boolean(ppkm.evaluators.pengawas1Nama && ppkm.evaluators.pengawas2Nama && ppkm.evaluators.tempatPenilaian),
        detail: `P1: ${ppkm.evaluators.pengawas1Nama || '-'} | P2: ${ppkm.evaluators.pengawas2Nama || '-'}`,
        menu: 'data_penilai' as const,
      },
      {
        no: 7,
        name: 'Naskah Dinas (Surat Pernyataan, Surat Tugas, SK Panitia, Berita Acara)',
        ready: Boolean(admin.suratPernyataanNomor && admin.suratTugasNomor && admin.skPanitiaNomor && admin.beritaAcaraNomor),
        detail: admin.skPanitiaNomor || 'Nomor SK / Surat Dinas belum lengkap',
        menu: 'profil_lembaga' as const,
      },
      {
        no: 8,
        name: 'Visi, Misi, Program Kerja (RKJM/RKT) & Laporan Kegiatan',
        ready: Boolean(ppkm.programGoals.visi && ppkm.programGoals.misi.length > 0),
        detail: `${ppkm.programGoals.misi.length} misi · ${
          ppkm.activityReports.harian.length +
          ppkm.activityReports.mingguan.length +
          ppkm.activityReports.bulanan.length +
          ppkm.activityReports.semesteran.length +
          ppkm.activityReports.tahunan.length
        } laporan kegiatan`,
        menu: 'program_kerja' as const,
      },
      {
        no: 9,
        name: 'Dokumen Administrasi Otomatis Komponen 1–4 (Minimal 12 Berkas)',
        ready: generatedDocs.length >= 12,
        detail: `${generatedDocs.length} dokumen tersimpan (${generatedDocs.filter((d) => d.status === 'APPROVED').length} disetujui)`,
        menu: 'administrasi_dokumen' as const,
      },
      {
        no: 10,
        name: 'Portofolio Bukti Fisik Terunggah & Verifikasi Penilai',
        ready: evidenceFiles.length > 0,
        detail: `${evidenceFiles.length} berkas (${evidenceFiles.filter((e) => e.verificationStatus === 'verified').length} terverifikasi)`,
        menu: 'bukti_fisik' as const,
      },
      {
        no: 11,
        name: `Kelengkapan Isian Indikator Instrumen (${activeIndicators.length} Butir)`,
        ready:
          activeIndicators.length > 0 &&
          activeIndicators.every((ind) => responses[ind.id]?.completionStatus === 'complete'),
        detail: `${activeIndicators.filter((ind) => responses[ind.id]?.completionStatus === 'complete').length} / ${activeIndicators.length} indikator siap dinilai`,
        menu: 'instrumen_penilaian' as const,
      },
      {
        no: 12,
        name: 'Dokumentasi Foto Bukti Fisik Kegiatan (Lampiran Laporan)',
        ready: ppkm.photoEvidences.length > 0,
        detail: `${ppkm.photoEvidences.length} foto kegiatan terlampir`,
        menu: 'program_kerja' as const,
      },
    ],
    [ppkm, admin, generatedDocs, evidenceFiles, activeIndicators, responses]
  );

  const readyCoreCount = coreChecklist.filter((c) => c.ready).length;

  const indicatorReadiness = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeIndicators
      .map((ind) => {
        const resp = responses[ind.id];
        const linkedFiles = evidenceFiles.filter((ev) => isEvidenceLinkedToIndicator(ev, ind.id));
        const verifiedFiles = linkedFiles.filter((ev) => ev.verificationStatus === 'verified').length;
        const isReady = resp?.completionStatus === 'complete' || linkedFiles.length > 0;
        return {
          ind,
          resp,
          linkedCount: linkedFiles.length,
          verifiedFiles,
          isReady,
        };
      })
      .filter((row) => {
        if (filterStatus === 'READY' && !row.isReady) return false;
        if (filterStatus === 'INCOMPLETE' && row.isReady) return false;
        if (!q) return true;
        return (
          row.ind.id.toLowerCase().includes(q) ||
          row.ind.indikatorNama.toLowerCase().includes(q) ||
          row.ind.subKomponenNama.toLowerCase().includes(q)
        );
      });
  }, [activeIndicators, responses, evidenceFiles, filterStatus, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-emerald-700 mb-1">
            Format 3 · Daftar Periksa Kelengkapan Administrasi & Portofolio PKKM
          </div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-700" />
            <span>Pemeriksaan Kelengkapan Berkas ({readyCoreCount}/{coreChecklist.length} Sektor Siap)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeInstitution.name} · {activePeriod.yearLabel} · Dihitung otomatis langsung dari kondisi data riil di database (tanpa manipulasi status).
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAiAssistant}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Tanya Panduan AI PKKM</span>
        </button>
      </div>

      {/* Format 3: Core Administrative Checklist */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            12 Sektor Kelengkapan Utama Lembaga & Dokumen Resmi
          </h2>
          <span className="text-xs font-mono tabular-nums text-slate-600">
            {Math.round((readyCoreCount / coreChecklist.length) * 100)}% terpenuhi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 px-3 w-12 text-center">No</th>
                <th className="py-2.5 px-3">Komponen Administrasi & Berkas</th>
                <th className="py-2.5 px-3">Kondisi Riil Database</th>
                <th className="py-2.5 px-3 w-28">Status</th>
                <th className="py-2.5 px-3 text-right">Tindak Lanjut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coreChecklist.map((item) => (
                <tr key={item.no} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-500">
                    {item.no}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{item.name}</td>
                  <td className="py-2.5 px-3 text-slate-600">{item.detail}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {item.ready ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Lengkap</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Perlu Dilengkapi</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onJumpToMenu(item.menu)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md cursor-pointer"
                    >
                      <span>Lengkapi</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Component Readiness Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {MASTER_COMPONENTS.map((comp) => {
          const items = activeIndicators.filter((i) => i.komponenCode === comp.code);
          const ready = items.filter(
            (i) =>
              responses[i.id]?.completionStatus === 'complete' ||
              evidenceFiles.some((ev) => isEvidenceLinkedToIndicator(ev, i.id))
          ).length;
          return (
            <div key={comp.code} className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5 text-xs">
              <div className="font-bold text-slate-900 truncate">
                {comp.nomor}. {comp.nama}
              </div>
              <div className="flex items-baseline justify-between font-mono tabular-nums">
                <span className="text-slate-500">{ready} / {items.length} siap</span>
                <span className="font-bold text-emerald-700">
                  {items.length > 0 ? Math.round((ready / items.length) * 100) : 0}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 96-Indicator Readiness Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>Matriks Kesiapan Bukti Fisik per Indikator ({activeIndicators.length} Butir)</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'READY' | 'INCOMPLETE')}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
            >
              <option value="ALL">Semua Butir ({activeIndicators.length})</option>
              <option value="READY">Sudah Ada Isian / Bukti</option>
              <option value="INCOMPLETE">Masih Kosong</option>
            </select>

            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari indikator..."
                className="w-full pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[520px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-2 px-3 w-16">Kode</th>
                <th className="py-2 px-3">Indikator Kinerja</th>
                <th className="py-2 px-3 w-28">Checklist</th>
                <th className="py-2 px-3 w-28 text-center">Berkas Bukti</th>
                <th className="py-2 px-3 w-28 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {indicatorReadiness.map(({ ind, resp, linkedCount, verifiedFiles, isReady }) => (
                <tr key={ind.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{ind.id}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-slate-900 block">{ind.indikatorNama}</span>
                    <span className="text-[11px] text-slate-500">{ind.subKomponenNama}</span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={
                        resp?.completionStatus === 'complete'
                          ? 'text-emerald-700 font-semibold'
                          : resp?.completionStatus === 'draft'
                          ? 'text-amber-700 font-semibold'
                          : 'text-slate-400'
                      }
                    >
                      {resp?.completionStatus === 'complete'
                        ? 'Selesai'
                        : resp?.completionStatus === 'draft'
                        ? 'Draft'
                        : 'Kosong'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums whitespace-nowrap">
                    <span className={isReady ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                      {linkedCount} berkas
                    </span>
                    {verifiedFiles > 0 && (
                      <span className="block text-[10px] text-emerald-700">({verifiedFiles} sah)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        onJumpToIndicator(ind.id);
                        onJumpToMenu('instrumen_penilaian');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                    >
                      <FolderOpen className="w-3 h-3" />
                      <span>Buka</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
