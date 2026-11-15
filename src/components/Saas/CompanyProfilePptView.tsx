import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileDown,
  Globe,
  Grid,
  Image as ImageIcon,
  Layers,
  Link2,
  Maximize2,
  Plus,
  Presentation,
  Printer,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useSaas } from '../../context/SaasContext';
import {
  CompanyProfilePptConfig,
  CompanyProfilePptGalleryItem,
  FeaturedProgram,
  KomponenAchievements,
  PpkmData,
  SwotRtlItem,
} from '../../types/ppkm';
import { EMPTY_ADMIN_DOCS } from '../../data/cleanPpkmFactory';
import {
  buildAutoCompanyProfilePptConfig,
  COMPANY_PPT_SLIDES,
  compressImageFileToDataUrl,
  exportCompanyProfileToPptx,
  formatRtlEntry,
  mergeCompanyProfilePptConfig,
  normalizeEmailHref,
  normalizeExternalUrl,
  normalizeSocialUrl,
  normalizeWhatsappUrl,
} from '../../utils/companyProfilePpt';
import {
  clearPptDraft,
  formatClockTimeId,
  loadPersistedPptUiState,
  loadPptDraft,
  PptQuickEditTab,
  savePersistedPptUiState,
  savePptDraft,
} from '../../utils/draftPersistence';

type QuickEditTab = PptQuickEditTab;

const EMPTY_KOMPONEN_ACHIEVEMENTS: KomponenAchievements = {
  komponenA: {
    kode: 'KOMPONEN A',
    namaKomponen: 'Usaha Pengembangan RA / Kebijakan',
    judulSlide: 'Capaian Komponen A',
    deskripsi: '',
    poinPencapaian: [],
  },
  komponenB: {
    kode: 'KOMPONEN B',
    namaKomponen: 'Pelaksanaan Tugas Manajerial & Sarpras',
    judulSlide: 'Capaian Komponen B',
    deskripsi: '',
    poinPencapaian: [],
  },
  komponenC: {
    kode: 'KOMPONEN C',
    namaKomponen: 'Pengembangan Kewirausahaan & Inovasi',
    judulSlide: 'Capaian Komponen C',
    deskripsi: '',
    poinPencapaian: [],
  },
  komponenD: {
    kode: 'KOMPONEN D',
    namaKomponen: 'Supervisi Guru & Tendik',
    judulSlide: 'Capaian Komponen D',
    deskripsi: '',
    poinPencapaian: [],
  },
  komponenE: {
    kode: 'KOMPONEN E',
    namaKomponen: 'Hasil Kinerja & Prestasi RA',
    judulSlide: 'Capaian Komponen E',
    deskripsi: '',
    poinPencapaian: [],
  },
  swotRtl: {
    kekuatan: [],
    kelemahanKendala: [],
    peluang: [],
    rencanaTindakLanjut: [],
  },
};

interface SlideCanvasProps {
  slideIndex: number;
  data: PpkmData;
  config: CompanyProfilePptConfig;
  className?: string;
}

const SlidePhoto: React.FC<{
  src?: string;
  alt: string;
  placeholder: string;
  className?: string;
  imgClassName?: string;
}> = ({ src, alt, placeholder, className = '', imgClassName = 'w-full h-full object-cover' }) => {
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [src]);

  if (!src || !src.trim() || errored) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-emerald-50 border border-dashed border-emerald-300 text-emerald-800/80 text-center p-3 ${className}`}
      >
        <ImageIcon className="w-6 h-6 mb-1.5 text-emerald-700/60" />
        <span className="text-[11px] font-medium leading-snug">{placeholder}</span>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden bg-slate-100 ${className}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setErrored(true)}
        className={imgClassName}
      />
    </div>
  );
};

const SlideChrome: React.FC<{
  slideNumber: number;
  title: string;
  institutionName: string;
  yearLabel: string;
  children: React.ReactNode;
}> = ({ slideNumber, title, institutionName, yearLabel, children }) => (
  <div className="w-full h-full bg-[#FBF9F5] text-slate-900 flex flex-col justify-between overflow-hidden select-none">
    <div className="bg-[#064E3B] border-b-[3px] border-[#D4AF37] px-5 py-2.5 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-7 bg-[#D4AF37] text-[#064E3B] font-bold text-xs flex items-center justify-center shrink-0 tabular-nums">
          {String(slideNumber).padStart(2, '0')}
        </div>
        <h2
          className="text-sm sm:text-base font-bold text-white truncate"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {title}
        </h2>
      </div>
      <div className="text-[10px] font-medium text-amber-100 truncate shrink-0">
        {institutionName} · {yearLabel}
      </div>
    </div>

    <div className="flex-1 p-4 sm:p-5 overflow-hidden flex flex-col justify-between min-h-0">
      {children}
    </div>

    <div className="px-5 py-1.5 border-t border-slate-200 bg-[#F5F2EB] flex items-center justify-between text-[9px] text-slate-500 shrink-0">
      <span className="truncate">Company Profile Resmi · {institutionName}</span>
      <span className="font-semibold text-[#064E3B] tabular-nums shrink-0">
        Slide {slideNumber} dari 12
      </span>
    </div>
  </div>
);

export const CompanySlideCanvas: React.FC<SlideCanvasProps> = ({
  slideIndex,
  data,
  config,
  className = '',
}) => {
  const inst = data.institution;
  const principal = data.principal;
  const adminDocs = data.adminDocs;
  const ach = data.komponenAchievements;
  const namaRa = inst.namaLembaga?.trim() || 'RAUDHATUL ATHFAL';
  const yearLabel = inst.tahunPelajaran?.trim() || '2025/2026';
  const slideTitle =
    config.slideTitles?.[slideIndex]?.trim() ||
    COMPANY_PPT_SLIDES[slideIndex]?.defaultTitle ||
    `Slide ${slideIndex + 1}`;

  const websiteHref = normalizeExternalUrl(inst.socialMedia?.website);
  const portalHref = normalizeExternalUrl(config.portalUrl);
  const ppdbHref = normalizeExternalUrl(config.ppdbOnlineUrl);
  const waHref = normalizeWhatsappUrl(inst.socialMedia?.whatsapp || inst.telepon);
  const emailHref = normalizeEmailHref(inst.socialMedia?.email || inst.email);
  const igHref = normalizeSocialUrl('instagram', inst.socialMedia?.instagram);
  const ytHref = normalizeSocialUrl('youtube', inst.socialMedia?.youtube);
  const ttHref = normalizeSocialUrl('tiktok', inst.socialMedia?.tiktok);
  const fbHref = normalizeSocialUrl('facebook', inst.socialMedia?.facebook);

  const renderContent = () => {
    switch (slideIndex) {
      // =====================================================================
      // SLIDE 1: SAMPUL RESMI
      // =====================================================================
      case 0:
        return (
          <div className="w-full h-full bg-[#064E3B] text-white flex overflow-hidden relative">
            <div className="w-2.5 bg-[#D4AF37] shrink-0" />
            <div className="flex-1 p-5 sm:p-7 grid grid-cols-12 gap-5 items-stretch min-h-0">
              <div className="col-span-7 flex flex-col justify-between min-w-0">
                <div className="flex items-center gap-3">
                  {(inst.logoKemenagUrl || inst.logoUrl) && (
                    <SlidePhoto
                      src={inst.logoKemenagUrl || inst.logoUrl}
                      alt="Logo Lembaga"
                      placeholder="Logo"
                      className="w-11 h-11 bg-white p-1 border border-[#D4AF37] shrink-0"
                      imgClassName="w-full h-full object-contain"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#D4AF37]">
                      Profil Kelembagaan Resmi
                    </div>
                    <div className="text-xs text-emerald-100 truncate">
                      {adminDocs?.namaYayasan || 'Kementerian Agama Republik Indonesia'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 my-auto py-1">
                  <h1
                    className="text-2xl sm:text-3xl font-bold leading-tight text-white uppercase tracking-tight"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {namaRa}
                  </h1>
                  <div className="w-24 h-1 bg-[#D4AF37]" />
                  <p
                    className="text-sm sm:text-base italic text-amber-100 leading-snug"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    &ldquo;{config.coverTagline}&rdquo;
                  </p>
                  <p className="text-xs text-emerald-100/90 leading-relaxed line-clamp-2">
                    {config.coverSubtitle}
                  </p>
                </div>

                <div className="bg-[#047857] border border-[#D4AF37]/70 px-3.5 py-2.5 text-[11px] space-y-1">
                  <div className="font-semibold text-amber-200 tabular-nums">
                    Tahun Pelajaran {yearLabel}
                  </div>
                  <div className="text-emerald-50 truncate">
                    {[inst.alamat, inst.kecamatan, inst.kotaKab].filter(Boolean).join(', ') ||
                      'Alamat lembaga belum dilengkapi'}
                  </div>
                  {websiteHref && (
                    <div className="pt-0.5 truncate">
                      <a
                        href={websiteHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-amber-200 underline decoration-[#D4AF37] hover:text-white"
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate">{websiteHref}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-5 bg-[#FBF9F5] border-2 border-[#D4AF37] p-2.5 flex flex-col justify-between min-h-0">
                <SlidePhoto
                  src={config.coverPhotoUrl || inst.fotoMadrasahUrl}
                  alt={`Gedung ${namaRa}`}
                  placeholder="Unggah Foto Gedung RA"
                  className="flex-1 min-h-0 border border-slate-200"
                />
                <div className="pt-2 text-center border-t border-slate-200 mt-2 shrink-0">
                  <div className="text-[11px] font-bold text-[#064E3B] truncate">
                    {inst.accreditationDetail?.peringkat ||
                      inst.akreditasi ||
                      'Lembaga Pendidikan Anak Usia Dini'}
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono tabular-nums mt-0.5">
                    NSM: {inst.nsm || '-'} · NPSN: {inst.npsn || inst.npsm || '-'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      // =====================================================================
      // SLIDE 2: SAMBUTAN & PROFIL KEPALA RA
      // =====================================================================
      case 1:
        return (
          <SlideChrome
            slideNumber={2}
            title={slideTitle}
            institutionName={namaRa}
            yearLabel={yearLabel}
          >
            <div className="grid grid-cols-12 gap-4 h-full min-h-0">
              <div className="col-span-4 bg-white border border-emerald-200 p-3 flex flex-col justify-between min-h-0">
                <SlidePhoto
                  src={principal.fotoUrl}
                  alt={principal.namaLengkap}
                  placeholder="Foto Kepala RA"
                  className="flex-1 min-h-0 border border-slate-200"
                />
                <div className="pt-2.5 text-center shrink-0">
                  <div
                    className="text-sm font-bold text-[#064E3B] leading-tight"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {principal.namaLengkap || 'Nama Kepala RA'}
                  </div>
                  <div className="text-[11px] font-semibold text-[#B45309] mt-0.5">
                    {principal.jabatan || 'Kepala Raudhatul Athfal'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 tabular-nums">
                    TMT: {principal.tmtJabatan || '-'} · NUPTK: {principal.nuptk || '-'}
                  </div>
                </div>
              </div>

              <div className="col-span-8 bg-white border border-slate-200 p-4 sm:p-5 flex flex-col justify-between min-h-0">
                <div className="space-y-2.5 overflow-hidden">
                  <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#B45309]">
                    {config.sambutanTitle}
                  </div>
                  <blockquote
                    className="text-xs sm:text-sm italic text-slate-800 leading-relaxed line-clamp-[9]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    &ldquo;{config.sambutanQuote}&rdquo;
                  </blockquote>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-[11px] text-[#064E3B] shrink-0">
                  <span className="font-bold block text-[10px] uppercase tracking-wider text-emerald-800">
                    Profil Singkat Pimpinan
                  </span>
                  <span className="leading-snug block mt-0.5">{config.principalBioHighlight}</span>
                </div>
              </div>
            </div>
          </SlideChrome>
        );

      // =====================================================================
      // SLIDE 3: IDENTITAS, LEGALITAS & AKREDITASI
      // =====================================================================
      case 2: {
        const acc = inst.accreditationDetail;
        const rows: { label: string; value: React.ReactNode }[] = [
          { label: 'Nama Lembaga', value: namaRa },
          {
            label: 'Status / Yayasan',
            value: `${inst.status || 'Swasta'} · ${adminDocs?.namaYayasan || '-'}`,
          },
          {
            label: 'NSM / NPSN',
            value: `${inst.nsm || '-'} / ${inst.npsn || inst.npsm || '-'}`,
          },
          { label: 'Izin Operasional', value: adminDocs?.izinOperasionalNomor || '-' },
          {
            label: 'Alamat Lengkap',
            value:
              [inst.alamat, inst.desaKelurahan, inst.kecamatan, inst.kotaKab, inst.provinsi]
                .filter(Boolean)
                .join(', ') || '-',
          },
          {
            label: 'Akreditasi BAN-PDM',
            value: `${acc?.peringkat || inst.akreditasi || '-'}${
              acc?.nilaiAngka ? ` (Nilai ${acc.nilaiAngka})` : ''
            } · SK: ${acc?.nomorSk || '-'}`,
          },
          {
            label: 'Website Resmi',
            value: websiteHref ? (
              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#047857] underline hover:text-[#064E3B]"
              >
                <span>{websiteHref}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ) : (
              inst.socialMedia?.website || '-'
            ),
          },
          {
            label: 'Email / WhatsApp',
            value: `${inst.email || '-'} · ${inst.socialMedia?.whatsapp || inst.telepon || '-'}`,
          },
        ];
        return (
          <SlideChrome
            slideNumber={3}
            title={slideTitle}
            institutionName={namaRa}
            yearLabel={yearLabel}
          >
            <div className="grid grid-cols-12 gap-4 h-full min-h-0">
              <div className="col-span-7 bg-white border border-slate-200 overflow-hidden flex flex-col">
                <table className="w-full h-full text-[10.5px] border-collapse">
                  <tbody className="divide-y divide-slate-200">
                    {rows.map((r) => (
                      <tr key={r.label}>
                        <td className="px-3 py-1.5 font-semibold text-[#064E3B] bg-emerald-50/50 w-36 align-middle border-r border-slate-200">
                          {r.label}
                        </td>
                        <td className="px-3 py-1.5 text-slate-800 align-middle leading-tight">
                          {r.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="col-span-5 bg-[#064E3B] border border-[#D4AF37] p-4 flex flex-col justify-between text-white min-h-0">
                <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#D4AF37]">
                  4 Keunggulan Utama Lembaga
                </div>
                <div className="space-y-2 my-auto">
                  {config.keyHighlights.slice(0, 4).map((hl, idx) => (
                    <div
                      key={idx}
                      className="bg-[#047857] border border-emerald-300/30 px-3 py-2 text-[10.5px] leading-snug"
                    >
                      <span className="font-bold text-[#D4AF37] mr-1.5 tabular-nums">
                        0{idx + 1}.
                      </span>
                      <span>{hl}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SlideChrome>
        );
      }

      // =====================================================================
      // SLIDE 4: VISI, MISI & TUJUAN
      // =====================================================================
      case 3: {
        const visiText = inst.visi || data.programGoals.visi || 'Visi lembaga belum diisi.';
        const misiList =
          (inst.misi && inst.misi.length > 0 ? inst.misi : data.programGoals.misi) || [];
        const tujuanList = data.programGoals.tujuan || [];
        return (
          <SlideChrome
            slideNumber={4}
            title={slideTitle}
            institutionName={namaRa}
            yearLabel={yearLabel}
          >
            <div className="flex flex-col gap-3.5 h-full min-h-0">
              <div className="bg-[#064E3B] border border-[#D4AF37] px-5 py-3 text-white shrink-0">
                <div className="text-[9.5px] font-bold tracking-[0.16em] uppercase text-[#D4AF37]">
                  Visi Lembaga
                </div>
                <p
                  className="text-sm sm:text-base italic font-bold mt-1 leading-snug"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  &ldquo;{visiText}&rdquo;
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                <div className="bg-white border border-slate-200 p-3.5 overflow-hidden">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#064E3B] border-b border-slate-100 pb-1.5 mb-2">
                    Misi Pendidikan
                  </div>
                  <ol className="space-y-1.5 text-[10.5px] text-slate-700 leading-snug">
                    {misiList.length > 0 ? (
                      misiList.slice(0, 5).map((m, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="font-bold text-[#047857] tabular-nums shrink-0">
                            {idx + 1}.
                          </span>
                          <span>{m}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-400">Belum ada data misi yang diinput.</li>
                    )}
                  </ol>
                </div>

                <div className="bg-white border border-slate-200 p-3.5 overflow-hidden">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#B45309] border-b border-slate-100 pb-1.5 mb-2">
                    Tujuan Strategis RA
                  </div>
                  <ol className="space-y-1.5 text-[10.5px] text-slate-700 leading-snug">
                    {tujuanList.length > 0 ? (
                      tujuanList.slice(0, 5).map((t, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="font-bold text-[#B45309] tabular-nums shrink-0">
                            {idx + 1}.
                          </span>
                          <span>{t}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-400">
                        Membentuk peserta didik usia dini yang berakhlak mulia, cerdas, dan mandiri.
                      </li>
                    )}
                  </ol>
                </div>
              </div>
            </div>
          </SlideChrome>
        );
      }

      // =====================================================================
      // SLIDE 5: STRUKTUR ORGANISASI & PROFIL PTK
      // =====================================================================
      case 4: {
        const totalPtk = data.ptkList.length;
        const s1Count = data.ptkList.filter(
          (p) =>
            p.pendidikanTerakhir.toLowerCase().includes('s-1') ||
            p.pendidikanTerakhir.toLowerCase().includes('s1') ||
            p.pendidikanTerakhir.toLowerCase().includes('s.1')
        ).length;
        const certCount = data.ptkList.filter(
          (p) => p.statusSertifikasi.toUpperCase() === 'SERTIFIKASI'
        ).length;
        return (
          <SlideChrome
            slideNumber={5}
            title={slideTitle}
            institutionName={namaRa}
            yearLabel={yearLabel}
          >
            <div className="flex flex-col gap-3 h-full min-h-0">
              <div className="grid grid-cols-3 gap-3 shrink-0 tabular-nums">
                <div className="bg-[#064E3B] border border-[#D4AF37] px-3.5 py-2 text-white">
                  <div className="text-[9px] font-bold tracking-wider uppercase text-[#D4AF37]">
                    Total Pendidik &amp; Tendik
                  </div>
                  <div
                    className="text-lg font-bold mt-0.5"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {totalPtk} Orang
                  </div>
                </div>
                <div className="bg-white border border-emerald-200 px-3.5 py-2">
                  <div className="text-[9px] font-bold tracking-wider uppercase text-slate-500">
                    Kualifikasi Sarjana (S-1)
                  </div>
                  <div
                    className="text-lg font-bold text-[#064E3B] mt-0.5"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {s1Count} Orang
                  </div>
                </div>
                <div className="bg-white border border-emerald-200 px-3.5 py-2">
                  <div className="text-[9px] font-bold tracking-wider uppercase text-slate-500">
                    Pendidik Bersertifikasi
                  </div>
                  <div
                    className="text-lg font-bold text-[#064E3B] mt-0.5"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {certCount} Orang
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
                <div className="col-span-8 bg-white border border-slate-200 overflow-hidden">
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-[#064E3B] text-white text-left">
                        <th className="px-2 py-1.5 w-7 text-center">No</th>
                        <th className="px-2 py-1.5">Nama Pendidik / Tendik</th>
                        <th className="px-2 py-1.5">Jabatan / Tugas</th>
                        <th className="px-2 py-1.5">Pendidikan</th>
                        <th className="px-2 py-1.5">Sertifikasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {data.ptkList.length > 0 ? (
                        data.ptkList.slice(0, 7).map((ptk, idx) => (
                          <tr key={ptk.id || idx}>
                            <td className="px-2 py-1 text-center tabular-nums text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="px-2 py-1 font-semibold text-slate-900">{ptk.nama}</td>
                            <td className="px-2 py-1 text-slate-700">{ptk.tugas}</td>
                            <td className="px-2 py-1 text-slate-700">{ptk.pendidikanTerakhir}</td>
                            <td className="px-2 py-1 text-emerald-800 font-medium">
                              {ptk.statusSertifikasi}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-slate-400">
                            Belum ada data PTK diinput.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="col-span-4 bg-white border border-slate-200 p-3 overflow-hidden">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#064E3B] border-b border-slate-100 pb-1 mb-2">
                    Bagan Jabatan Inti
                  </div>
                  <div className="space-y-1.5 text-[9.5px]">
                    {(data.structuralPositions || []).length > 0 ? (
                      data.structuralPositions.slice(0, 6).map((st) => (
                        <div key={st.id} className="border-b border-slate-100 pb-1 last:border-0">
                          <div className="font-bold text-[#047857] leading-tight">{st.jabatan}</div>
                          <div className="text-slate-800">{st.nama}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400">Belum ada struktur jabatan.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SlideChrome>
        );
      }

      // =====================================================================
      // SLIDE 6: DATA PESERTA DIDIK, TREN ROMBEL & ALUMNI
      // =====================================================================
      case 5: {
        const totalL = data.students.reduce((s, r) => s + (r.lakiLaki || 0), 0);
        const totalP = data.students.reduce((s, r) => s + (r.perempuan || 0), 0);
        const totalStudents = totalL + totalP;
        return (
          <SlideChrome
            slideNumber={6}
            title={slideTitle}
            institutionName={namaRa}
            yearLabel={yearLabel}
          >
            <div className="flex flex-col gap-3.5 h-full min-h-0">
              <div className="grid grid-cols-4 gap-2.5 shrink-0 tabular-nums">
                {[
                  { label: 'Total Santri', value: `${totalStudents} Anak`, dark: true },
                  { label: 'Jumlah Rombel', value: `${data.students.length} Rombel`, dark: false },
                  { label: 'Komposisi L / P', value: `${totalL} L · ${totalP} P`, dark: false },
                  { label: 'Melanjutkan MI/SD', value: '100% Lulus', dark: false },
                ].map((k) => (
                  <div
                    key={k.label}
                    className={`px-3 py-2 border ${
                      k.dark
                        ? 'bg-[#064E3B] border-[#D4AF37] text-white'
                        : 'bg-white border-emerald-200 text-[#064E3B]'
                    }`}
                  >
                    <div
                      className={`text-[9px] font-bold uppercase tracking-wider ${
                        k.dark ? 'text-[#D4AF37]' : 'text-slate-500'
                      }`}
                    >
                      {k.label}
                    </div>
                    <div
                      className="text-base font-bold mt-0.5"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {k.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                <div className="bg-white border border-slate-200 p-3 overflow-hidden">
                  <div className="text-[10.5px] font-bold text-[#064E3B] mb-2">
                    Rincian Peserta Didik per Kelompok Usia
                  </div>
                  <table className="w-full text-[10px] border-collapse tabular-nums">
                    <thead>
                      <tr className="bg-[#064E3B] text-white">
                        <th className="px-2 py-1.5 text-left">Kelompok / Kelas</th>
                        <th className="px-2 py-1.5 text-center">L</th>
                        <th className="px-2 py-1.5 text-center">P</th>
                        <th className="px-2 py-1.5 text-center">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {data.students.length > 0 ? (
                        data.students.map((st, idx) => (
                          <tr key={idx}>
                            <td className="px-2 py-1.5 font-medium">{st.kelas}</td>
                            <td className="px-2 py-1.5 text-center">{st.lakiLaki}</td>
                            <td className="px-2 py-1.5 text-center">{st.perempuan}</td>
                            <td className="px-2 py-1.5 text-center font-bold text-[#064E3B]">
                              {st.lakiLaki + st.perempuan}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-2 py-4 text-center text-slate-400">
                            Belum ada data kelompok belajar.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="bg-white border border-slate-200 p-3 overflow-hidden">
                  <div className="text-[10.5px] font-bold text-[#B45309] mb-2">
                    Tren Perkembangan Santri &amp; Alumni
                  </div>
                  <table className="w-full text-[10px] border-collapse tabular-nums">
                    <thead>
                      <tr className="bg-[#047857] text-white">
                        <th className="px-2 py-1.5 text-left">Tahun Pelajaran</th>
                        <th className="px-2 py-1.5 text-center">Rombel</th>
                        <th className="px-2 py-1.5 text-center">Santri</th>
                        <th className="px-2 py-1.5 text-center">Lulus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {data.studentTrends.length > 0 ? (
                        data.studentTrends.slice(-5).map((tr, idx) => {
                          const grad = data.graduates.find((g) => g.tahun === tr.tahun);
                          return (
                            <tr key={idx}>
                              <td className="px-2 py-1.5 font-medium">{tr.tahun}</td>
                              <td className="px-2 py-1.5 text-center">{tr.rombel}</td>
                              <td className="px-2 py-1.5 text-center font-bold text-[#064E3B]">
                                {tr.lakiLaki + tr.perempuan}
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                {grad ? grad.melanjutkan : '-'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-2 py-4 text-center text-slate-400">
                            Belum ada data tren tahunan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </SlideChrome>
        );
      }

      // =====================================================================
      // SLIDE 7: SARANA PRASARANA & FASILITAS APE
      // =====================================================================
      case 6: {
        const sarprasPhoto =
          data.buildings.find((b) => b.fotoUrl)?.fotoUrl ||
          data.inventory.find((i) => i.fotoUrl)?.fotoUrl;
        return (
          <SlideChrome
            slideNumber={7}
            title={slideTitle}
            institutionName={namaRa}
            yearLabel={yearLabel}
          >
            <div className="flex flex-col gap-2.5 h-full min-h-0">
              <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-[10.5px] font-semibold text-[#064E3B] shrink-0">
                Luas Tanah: {inst.luasTanah || '-'} · Status Tanah: {inst.statusTanah || '-'}
              </div>

              <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
                <div className="col-span-8 flex flex-col gap-2.5 min-h-0">
                  <div className="bg-white border border-slate-200 overflow-hidden">
                    <table className="w-full text-[9.8px] border-collapse tabular-nums">
                      <thead>
                        <tr className="bg-[#064E3B] text-white">
                          <th className="px-2 py-1 text-left">Ruang / Fasilitas Bangunan</th>
                          <th className="px-2 py-1 text-center w-12">Jml</th>
                          <th className="px-2 py-1 text-center w-12">Baik</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {data.buildings.length > 0 ? (
                          data.buildings.slice(0, 5).map((b) => (
                            <tr key={b.id}>
                              <td className="px-2 py-1 font-medium text-slate-800">
                                {b.jenisBangunan}
                              </td>
                              <td className="px-2 py-1 text-center">{b.jumlahLokal}</td>
                              <td className="px-2 py-1 text-center text-emerald-700 font-semibold">
                                {b.baik}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-2 py-2 text-center text-slate-400">
                              Belum ada data bangunan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-white border border-slate-200 overflow-hidden flex-1">
                    <table className="w-full text-[9.8px] border-collapse tabular-nums">
                      <thead>
                        <tr className="bg-[#047857] text-white">
                          <th className="px-2 py-1 text-left">Inventaris APE &amp; Media</th>
                          <th className="px-2 py-1 text-left w-24">Kategori</th>
                          <th className="px-2 py-1 text-center w-12">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {data.inventory.length > 0 ? (
                          data.inventory.slice(0, 5).map((item) => (
                            <tr key={item.id}>
                              <td className="px-2 py-1 font-medium text-slate-800">
                                {item.namaBarang}
                              </td>
                              <td className="px-2 py-1 text-slate-600">
                                {item.kategori || 'Umum'}
                              </td>
                              <td className="px-2 py-1 text-center font-semibold">
                                {item.jumlah}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-2 py-2 text-center text-slate-400">
                              Belum ada inventaris APE.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="col-span-4 bg-white border border-slate-200 p-2.5 flex flex-col justify-between min-h-0">
                  <SlidePhoto
                    src={sarprasPhoto}
                    alt="Sarpras APE"
                    placeholder="Foto Sarpras & APE"
                    className="flex-1 min-h-0 border border-slate-200"
                  />
                  <div className="pt-2 text-[9.5px] text-slate-600 text-center leading-snug shrink-0">
                    Fasilitas ruang belajar &amp; area bermain APE ramah anak yang aman dan terawat.
                  </div>
                </div>
              </div>
            </div>
          </SlideChrome>
        );
      }

      // =====================================================================
      // SLIDE 8: PROGRAM UNGGULAN, KEMITRAAN MoU & INOVASI KEWIRAUSAHAAN
      // =====================================================================
      case 7: {
        const programs = inst.featuredPrograms || [];
        const mouItems = (config.partnershipHighlights || []).slice(0, 3);
        const habitLines = [
          ...data.activityReports.harian.slice(0, 1).map((h) => `Harian: ${h.namaKegiatan}`),
          ...data.activityReports.mingguan.slice(0, 1).map((m) => `Mingguan: ${m.namaKegiatan}`),
        ];
        const bottomList = [...mouItems, ...habitLines];
        return (
          <SlideChrome
            slideNumber={8}
            title={slideTitle}
            institutionName={namaRa}
            yearLabel={yearLabel}
          >
            <div className="flex flex-col gap-2.5 h-full min-h-0">
              <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-0">
                {[0, 1, 2, 3].map((idx) => {
                  const prog = programs[idx];
                  return (
                    <div
                      key={prog?.id || idx}
                      className="bg-white border border-emerald-200 p-2.5 flex flex-col justify-between overflow-hidden"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#B45309]">
                            {prog?.kategori || 'Program Unggulan'}
                          </span>
                          <span className="text-[9.5px] font-mono font-bold text-[#064E3B] tabular-nums">
                            0{idx + 1}
                          </span>
                        </div>
                        <h3
                          className="text-xs font-bold text-[#064E3B] mt-0.5 leading-snug"
                          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                          {prog ? prog.nama : `Program Unggulan ${idx + 1}`}
                        </h3>
                      </div>
                      <p className="text-[9.5px] text-slate-600 leading-snug mt-1 line-clamp-2">
                        {prog
                          ? prog.deskripsi
                          : 'Tambahkan deskripsi program unggulan pada panel Edit Cepat.'}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="bg-[#064E3B] border border-[#D4AF37] px-4 py-2.5 text-white shrink-0">
                <div className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#D4AF37]">
                  Kemitraan MoU, Inovasi Kewirausahaan &amp; Pembiasaan Rutin RA
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-[9.5px] text-emerald-50">
                  {bottomList.length > 0 ? (
                    bottomList.slice(0, 4).map((line, i) => (
                      <div key={i} className="truncate">
                        • {line}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2">
                      • Kemitraan Puskesmas, Market Day cilik, dan pembiasaan ibadah pagi harian.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SlideChrome>
        );
      }

      // =====================================================================
      // SLIDE 9: CAPAIAN 5 KOMPONEN PKKM (A–E) SESUAI JUKNIS
      // =====================================================================
      case 8: {
        const compCards = [
          {
            kode: 'KOMPONEN A',
            detail: ach?.komponenA,
            fallbackTitle: 'Usaha Pengembangan RA',
            fallbackPts: [
              'Legalitas Izin Operasional & Akreditasi BAN-PDM',
              'Struktur organisasi, SOP layanan & EMIS/Simpatika aktif',
            ],
          },
          {
            kode: 'KOMPONEN B',
            detail: ach?.komponenB,
            fallbackTitle: 'Pelaksanaan Tugas Manajerial',
            fallbackPts: [
              'RKJM/RKT, Kurikulum Merdeka PIAUD & Kaldik',
              'Manajemen kesiswaan, sarana APE & keuangan BOP transparan',
            ],
          },
          {
            kode: 'KOMPONEN C',
            detail: ach?.komponenC,
            fallbackTitle: 'Pengembangan Kewirausahaan',
            fallbackPts: [
              'Program Tahfidz, P5-RA & Market Day wirausaha cilik',
              'Kemitraan MoU kesehatan & dukungan komite/yayasan',
            ],
          },
          {
            kode: 'KOMPONEN D',
            detail: ach?.komponenD,
            fallbackTitle: 'Supervisi Guru & Tendik',
            fallbackPts: [
              'Program supervisi akademik klinis semester ganjil/genap',
              'Observasi KBM, umpan balik & diklat peningkatan kompetensi guru',
            ],
          },
          {
            kode: 'KOMPONEN E',
            detail: ach?.komponenE,
            fallbackTitle: 'Hasil Kinerja & Prestasi RA',
            fallbackPts: [
              'Mutu kelembagaan terakreditasi & kepuasan wali santri',
              'Raihan prestasi santri, guru & tingkat kelulusan 100%',
            ],
          },
        ];

        return (
          <SlideChrome
            slideNumber={9}
            title={slideTitle}
            institutionName={namaRa}
            yearLabel={yearLabel}
          >
            <div className="flex flex-col gap-2.5 h-full min-h-0">
              <div className="text-[10px] italic text-slate-600 shrink-0">
                Rangkuman Kinerja Lima Komponen Utama Penilaian Kinerja Kepala RA (Juknis Dirjen
                Pendis Nomor 1111 Tahun 2019)
              </div>

              <div className="grid grid-cols-3 gap-2.5 shrink-0">
                {compCards.slice(0, 3).map((comp) => {
                  const pts =
                    comp.detail?.poinPencapaian && comp.detail.poinPencapaian.length > 0
                      ? comp.detail.poinPencapaian.slice(0, 3)
                      : comp.fallbackPts;
                  return (
                    <div
                      key={comp.kode}
                      className="bg-white border border-emerald-200 flex flex-col overflow-hidden"
                    >
                      <div className="bg-[#064E3B] text-white px-2.5 py-1.5 text-[9.5px] font-bold truncate">
                        {comp.kode}: {comp.detail?.namaKomponen || comp.fallbackTitle}
                      </div>
                      <ul className="p-2.5 space-y-1 text-[9.2px] text-slate-700 leading-snug">
                        {pts.map((pt, i) => (
                          <li key={i} className="line-clamp-2">
                            • {pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-0">
                {compCards.slice(3, 5).map((comp, idx) => {
                  const pts =
                    comp.detail?.poinPencapaian && comp.detail.poinPencapaian.length > 0
                      ? comp.detail.poinPencapaian.slice(0, 3)
                      : comp.fallbackPts;
                  return (
                    <div
                      key={comp.kode}
                      className="bg-white border border-emerald-200 flex flex-col overflow-hidden"
                    >
                      <div
                        className={`px-3 py-1.5 text-[9.5px] font-bold text-white truncate ${
                          idx === 1 ? 'bg-[#B45309]' : 'bg-[#047857]'
                        }`}
                      >
                        {comp.kode}: {comp.detail?.namaKomponen || comp.fallbackTitle}
                      </div>
                      <ul className="p-2.5 space-y-1 text-[9.5px] text-slate-700 leading-snug">
                        {pts.map((pt, i) => (
                          <li key={i} className="line-clamp-2">
                            • {pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </SlideChrome>
        );
      }

      // =====================================================================
      // SLIDE 10: TANTANGAN / KENDALA NYATA, SWOT & PROGRAM KE DEPAN (RTL)
      // =====================================================================
      case 9: {
        const swot = ach?.swotRtl;
        const strengths =
          swot?.kekuatan && swot.kekuatan.length > 0
            ? swot.kekuatan
            : ['Pendidik berdedikasi dan berkualifikasi S-1', 'Dukungan aktif Yayasan & Komite'];
        const challenges =
          swot?.kelemahanKendala && swot.kelemahanKendala.length > 0
            ? swot.kelemahanKendala
            : ['Penambahan fasilitas APE & peneduh halaman bermain', 'Penguatan literasi digital'];
        const opportunities =
          swot?.peluang && swot.peluang.length > 0
            ? swot.peluang
            : ['Pemanfaatan BOP & kemitraan instansi', 'Ekspansi layanan portal & PPDB online'];
        const rtlItems =
          swot?.rencanaTindakLanjut && swot.rencanaTindakLanjut.length > 0
            ? swot.rencanaTindakLanjut.map(formatRtlEntry)
            : ['Peningkatan sarana APE tematik & digitalisasi layanan informasi lembaga.'];

        return (
          <SlideChrome
            slideNumber={10}
            title={slideTitle}
            institutionName={namaRa}
            yearLabel={yearLabel}
          >
            <div className="grid grid-cols-2 grid-rows-2 gap-3 h-full min-h-0">
              <div className="bg-white border border-emerald-200 p-3 overflow-hidden">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#064E3B] border-b border-slate-100 pb-1 mb-1.5">
                  01. Kekuatan Lembaga (Strengths)
                </div>
                <ul className="space-y-1 text-[9.8px] text-slate-700 leading-snug">
                  {strengths.slice(0, 4).map((s, idx) => (
                    <li key={idx} className="line-clamp-2">
                      • {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-rose-50/70 border border-rose-200 p-3 overflow-hidden">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-900 border-b border-rose-200/70 pb-1 mb-1.5">
                  03. Tantangan &amp; Kendala Nyata Saat Ini
                </div>
                <ul className="space-y-1 text-[9.8px] text-slate-800 leading-snug">
                  {challenges.slice(0, 4).map((c, idx) => (
                    <li key={idx} className="line-clamp-2">
                      • {c}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border border-slate-200 p-3 overflow-hidden">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#047857] border-b border-slate-100 pb-1 mb-1.5">
                  02. Peluang Pengembangan (Opportunities)
                </div>
                <ul className="space-y-1 text-[9.8px] text-slate-700 leading-snug">
                  {opportunities.slice(0, 4).map((o, idx) => (
                    <li key={idx} className="line-clamp-2">
                      • {o}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#064E3B] border border-[#D4AF37] p-3 text-white overflow-hidden">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] border-b border-emerald-700 pb-1 mb-1.5">
                  04. Program Lembaga Ke Depan (RTL Juknis)
                </div>
                <ol className="space-y-1 text-[9.8px] text-emerald-50 leading-snug">
                  {rtlItems.slice(0, 4).map((r, idx) => (
                    <li key={idx} className="line-clamp-2 tabular-nums">
                      {idx + 1}. {r}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </SlideChrome>
        );
      }

      // =====================================================================
      // SLIDE 11: PRESTASI & GALERI DOKUMENTASI
      // =====================================================================
      case 10: {
        const prestasiEntries =
          (ach?.prestasiList || []).length > 0
            ? ach!.prestasiList!.map(
                (pr) => `${pr.namaPrestasi} (${pr.tingkat} · ${pr.tahun}) — ${pr.peraih}`
              )
            : ach?.komponenE?.poinPencapaian || [
                'Tambahkan daftar prestasi lembaga dan peserta didik pada panel Edit Cepat.',
              ];
        const galleryItems = (config.galleryItems || []).slice(0, 4);

        return (
          <SlideChrome
            slideNumber={11}
            title={slideTitle}
            institutionName={namaRa}
            yearLabel={yearLabel}
          >
            <div className="grid grid-cols-12 gap-3.5 h-full min-h-0">
              <div className="col-span-5 bg-white border border-slate-200 p-3.5 overflow-hidden flex flex-col">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#064E3B] border-b border-slate-100 pb-1.5 mb-2">
                  Prestasi &amp; Penghargaan
                </div>
                <ul className="space-y-2 text-[10px] text-slate-700 leading-snug">
                  {prestasiEntries.slice(0, 6).map((item, idx) => (
                    <li key={idx} className="flex gap-2">
                      <Award className="w-3.5 h-3.5 text-[#B45309] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="col-span-7 grid grid-cols-2 grid-rows-2 gap-2.5 min-h-0">
                {[0, 1, 2, 3].map((idx) => {
                  const gal = galleryItems[idx];
                  return (
                    <div
                      key={gal?.id || idx}
                      className="bg-white border border-emerald-200 p-1.5 flex flex-col justify-between min-h-0"
                    >
                      <SlidePhoto
                        src={gal?.fotoUrl}
                        alt={gal?.judul || `Galeri ${idx + 1}`}
                        placeholder={`Foto Galeri ${idx + 1}`}
                        className="flex-1 min-h-0 border border-slate-100"
                      />
                      <div className="pt-1 text-[9.5px] font-semibold text-[#064E3B] text-center truncate shrink-0">
                        {gal?.judul || `Dokumentasi Kegiatan ${idx + 1}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </SlideChrome>
        );
      }

      // =====================================================================
      // SLIDE 12: PROMOSI WEBSITE, PORTAL LEMBAGA (LINK AKTIF), PPDB & PENUTUP
      // =====================================================================
      case 11:
      default: {
        const sm = inst.socialMedia;
        const rightPhoto =
          config.closingPhotoUrl || inst.fotoBersamaUrl || inst.websiteScreenshotUrl;

        return (
          <SlideChrome
            slideNumber={12}
            title={slideTitle}
            institutionName={namaRa}
            yearLabel={yearLabel}
          >
            <div className="grid grid-cols-12 gap-3.5 h-full min-h-0">
              <div className="col-span-7 flex flex-col gap-2.5 min-h-0">
                {/* Website & Portal Promo Card with Direct Clickable Links */}
                <div className="bg-[#064E3B] border border-[#D4AF37] p-3 text-white flex-1 overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                      {config.websitePromoHeadline ||
                        `Website Resmi & Portal Digital ${namaRa}`}
                    </div>
                    <p className="text-[9.5px] text-emerald-100 mt-0.5 leading-snug line-clamp-2">
                      {config.websitePromoDescription ||
                        'Klik tautan aktif di bawah ini untuk langsung mengunjungi website resmi dan portal layanan kami:'}
                    </p>
                  </div>

                  <div className="space-y-1.5 mt-2">
                    {[
                      {
                        label: 'Website Resmi',
                        display: sm?.website || 'Belum diisi',
                        href: websiteHref,
                      },
                      {
                        label: config.portalLabel || 'Portal Digital / Siswa',
                        display: config.portalUrl || 'Belum diisi',
                        href: portalHref,
                      },
                      {
                        label: 'PPDB Online / Kontak',
                        display: config.ppdbOnlineUrl || config.ppdbContactPerson,
                        href: ppdbHref || waHref,
                      },
                    ].map((lk) => (
                      <div
                        key={lk.label}
                        className="bg-[#047857] border border-[#D4AF37]/60 px-2.5 py-1.5 flex items-center justify-between gap-2 text-[9.8px]"
                      >
                        <span className="font-semibold text-amber-200 shrink-0">{lk.label}:</span>
                        {lk.href ? (
                          <a
                            href={lk.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-white underline decoration-[#D4AF37] hover:text-amber-200 truncate"
                          >
                            <span className="truncate">{lk.display}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-emerald-100/80 truncate">{lk.display}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* PPDB + Clickable Social & Contact Links */}
                <div className="bg-white border border-slate-200 p-2.5 shrink-0 space-y-1">
                  <div className="text-[10px] font-bold text-[#064E3B] truncate">
                    {config.ppdbTitle}
                  </div>
                  <div className="text-[9px] text-slate-600 leading-snug line-clamp-2">
                    {config.ppdbSchedule} · Syarat: {config.ppdbRequirements.slice(0, 3).join(', ')}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-1 border-t border-slate-100 text-[9.2px]">
                    {waHref && (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#047857] underline hover:text-[#064E3B]"
                      >
                        WA: {sm?.whatsapp || inst.telepon}
                      </a>
                    )}
                    {emailHref && (
                      <a
                        href={emailHref}
                        className="font-semibold text-[#047857] underline hover:text-[#064E3B]"
                      >
                        Email: {sm?.email || inst.email}
                      </a>
                    )}
                    {igHref && (
                      <a
                        href={igHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#047857] underline hover:text-[#064E3B]"
                      >
                        IG: {sm?.instagram}
                      </a>
                    )}
                    {ytHref && (
                      <a
                        href={ytHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#047857] underline hover:text-[#064E3B]"
                      >
                        YT: {sm?.youtube}
                      </a>
                    )}
                    {ttHref && (
                      <a
                        href={ttHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#047857] underline hover:text-[#064E3B]"
                      >
                        TikTok: {sm?.tiktok}
                      </a>
                    )}
                    {fbHref && (
                      <a
                        href={fbHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#047857] underline hover:text-[#064E3B]"
                      >
                        FB: {sm?.facebook}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-5 bg-white border border-emerald-200 p-2.5 flex flex-col justify-between min-h-0">
                <SlidePhoto
                  src={rightPhoto}
                  alt="Foto Kebersamaan & Portal Lembaga"
                  placeholder="Foto Kebersamaan / Website RA"
                  className="flex-1 min-h-0 border border-slate-200"
                />
                <div className="pt-2 text-center shrink-0">
                  <div
                    className="text-xs font-bold text-[#064E3B] leading-snug"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {config.closingTitle}
                  </div>
                  <p className="text-[9.2px] text-slate-600 mt-1 leading-snug line-clamp-3">
                    {config.closingMessage}
                  </p>
                </div>
              </div>
            </div>
          </SlideChrome>
        );
      }
    }
  };

  return <div className={`w-full h-full overflow-hidden ${className}`}>{renderContent()}</div>;
};

export const CompanyProfilePptView: React.FC = () => {
  const { activeInstitution, updateActiveInstitutionData, setActiveMenu, firebaseUser } = useSaas();
  const instId = activeInstitution.institutionId;
  const profileData = activeInstitution.profileData;
  const isCloudLoggedIn = Boolean(firebaseUser && firebaseUser.emailVerified);

  const initialDraftBundle = useMemo(() => {
    const recovered = loadPptDraft(instId);
    if (recovered) {
      return {
        ppkm: recovered.ppkmDraft,
        config: mergeCompanyProfilePptConfig({
          ...recovered.ppkmDraft,
          companyProfilePpt: recovered.pptConfig,
        }),
        hadDraft: true,
      };
    }
    return {
      ppkm: profileData,
      config: mergeCompanyProfilePptConfig(profileData),
      hadDraft: false,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialUiState = useMemo(() => loadPersistedPptUiState(instId), [instId]);

  const [ppkmDraft, setPpkmDraft] = useState<PpkmData>(initialDraftBundle.ppkm);
  const [pptConfig, setPptConfig] = useState<CompanyProfilePptConfig>(initialDraftBundle.config);
  const [activeTab, setActiveTab] = useState<QuickEditTab>(initialUiState.activeTab);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(initialUiState.activeSlideIndex);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>(initialUiState.viewMode);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportingPptx, setExportingPptx] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [hasUnsaved, setHasUnsaved] = useState(initialDraftBundle.hadDraft);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'pending' | 'saving' | 'error'>(
    initialDraftBundle.hadDraft ? 'pending' : 'saved'
  );
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  const coverFileRef = useRef<HTMLInputElement | null>(null);
  const principalFileRef = useRef<HTMLInputElement | null>(null);
  const closingFileRef = useRef<HTMLInputElement | null>(null);
  const webShotFileRef = useRef<HTMLInputElement | null>(null);

  const hydratedInstIdRef = useRef<string>(instId);
  const lastCommittedJsonRef = useRef<string>(
    initialDraftBundle.hadDraft
      ? JSON.stringify({
          ppkm: profileData,
          config: mergeCompanyProfilePptConfig(profileData),
        })
      : JSON.stringify({
          ppkm: initialDraftBundle.ppkm,
          config: initialDraftBundle.config,
        })
  );
  const lastLocalEditAtRef = useRef<number>(initialDraftBundle.hadDraft ? Date.now() : 0);
  const isLocalDirtyRef = useRef<boolean>(initialDraftBundle.hadDraft);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPayloadRef = useRef({ instId, ppkmDraft, pptConfig });
  latestPayloadRef.current = { instId, ppkmDraft, pptConfig };

  // Persist tab editor, active slide, and view mode per institution
  useEffect(() => {
    savePersistedPptUiState(instId, { activeTab, activeSlideIndex, viewMode });
  }, [instId, activeTab, activeSlideIndex, viewMode]);

  // Handle institution switch and safe external snapshot sync
  useEffect(() => {
    if (hydratedInstIdRef.current !== instId) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      hydratedInstIdRef.current = instId;
      const recovered = loadPptDraft(instId);
      const nextUi = loadPersistedPptUiState(instId);
      setActiveTab(nextUi.activeTab);
      setActiveSlideIndex(nextUi.activeSlideIndex);
      setViewMode(nextUi.viewMode);

      if (recovered) {
        const mergedCfg = mergeCompanyProfilePptConfig({
          ...recovered.ppkmDraft,
          companyProfilePpt: recovered.pptConfig,
        });
        setPpkmDraft(recovered.ppkmDraft);
        setPptConfig(mergedCfg);
        lastCommittedJsonRef.current = JSON.stringify({
          ppkm: profileData,
          config: mergeCompanyProfilePptConfig(profileData),
        });
        isLocalDirtyRef.current = true;
        lastLocalEditAtRef.current = Date.now();
        setHasUnsaved(true);
        setAutoSaveStatus('pending');
      } else {
        const nextCfg = mergeCompanyProfilePptConfig(profileData);
        setPpkmDraft(profileData);
        setPptConfig(nextCfg);
        lastCommittedJsonRef.current = JSON.stringify({ ppkm: profileData, config: nextCfg });
        isLocalDirtyRef.current = false;
        setHasUnsaved(false);
        setAutoSaveStatus('saved');
      }
      return;
    }

    // Do not clobber active typing with incoming Firestore snapshots
    if (
      isLocalDirtyRef.current ||
      Date.now() - lastLocalEditAtRef.current < 2500 ||
      Boolean(loadPptDraft(instId))
    ) {
      return;
    }

    const nextCfg = mergeCompanyProfilePptConfig(profileData);
    const incomingJson = JSON.stringify({ ppkm: profileData, config: nextCfg });
    if (incomingJson !== lastCommittedJsonRef.current) {
      lastCommittedJsonRef.current = incomingJson;
      setPpkmDraft(profileData);
      setPptConfig(nextCfg);
      setHasUnsaved(false);
    }
  }, [instId, profileData]);

  const commitAutoSave = async (
    targetInstId: string,
    draftData: PpkmData,
    draftConfig: CompanyProfilePptConfig,
    fullSync = false
  ) => {
    if (targetInstId === 'onboarding-ra') return;
    setAutoSaveStatus('saving');
    const syncedAt = new Date().toISOString();
    const configToSave: CompanyProfilePptConfig = {
      ...draftConfig,
      lastAutoSyncedAt: syncedAt,
    };
    const committedSnapshot = JSON.stringify({ ppkm: draftData, config: draftConfig });
    try {
      await updateActiveInstitutionData(
        () => ({
          ...draftData,
          companyProfilePpt: configToSave,
        }),
        { skipHeavyDocSync: !fullSync, quiet: !fullSync }
      );
      lastCommittedJsonRef.current = committedSnapshot;
      if (JSON.stringify({ ppkm: latestPayloadRef.current.ppkmDraft, config: latestPayloadRef.current.pptConfig }) === committedSnapshot) {
        clearPptDraft(targetInstId);
        isLocalDirtyRef.current = false;
        setHasUnsaved(false);
        setAutoSaveStatus('saved');
      }
      setLastSavedTime(formatClockTimeId());
    } catch {
      setAutoSaveStatus('error');
    }
  };

  // Real-time 0ms local draft save + 750ms debounced Cloud/Store auto-save
  useEffect(() => {
    const currentSnapshot = JSON.stringify({ ppkm: ppkmDraft, config: pptConfig });
    if (currentSnapshot === lastCommittedJsonRef.current) {
      return;
    }

    isLocalDirtyRef.current = true;
    lastLocalEditAtRef.current = Date.now();
    setHasUnsaved(true);
    setAutoSaveStatus('pending');
    savePptDraft({
      institutionId: instId,
      updatedAt: Date.now(),
      ppkmDraft,
      pptConfig,
    });

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const scheduledInstId = instId;
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void commitAutoSave(scheduledInstId, ppkmDraft, pptConfig, false);
    }, 750);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instId, ppkmDraft, pptConfig]);

  // Flush draft immediately on page reload / tab close / component unmount
  useEffect(() => {
    const flushNow = () => {
      if (!isLocalDirtyRef.current) return;
      const { instId: curId, ppkmDraft: curPpkm, pptConfig: curCfg } = latestPayloadRef.current;
      savePptDraft({
        institutionId: curId,
        updatedAt: Date.now(),
        ppkmDraft: curPpkm,
        pptConfig: curCfg,
      });
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      void commitAutoSave(curId, curPpkm, curCfg, false);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushNow();
      }
    };

    window.addEventListener('pagehide', flushNow);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pagehide', flushNow);
      document.removeEventListener('visibilitychange', handleVisibility);
      flushNow();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fullscreenOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullscreenOpen(false);
      } else if (e.key === 'ArrowRight') {
        setActiveSlideIndex((prev) => Math.min(11, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setActiveSlideIndex((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullscreenOpen]);

  const metrics = useMemo(() => {
    const totalPtk = ppkmDraft.ptkList.length;
    const totalSiswa = ppkmDraft.students.reduce(
      (sum, row) => sum + (row.lakiLaki || 0) + (row.perempuan || 0),
      0
    );
    const totalRombel = ppkmDraft.students.length;
    const totalBuildings = ppkmDraft.buildings.reduce((s, b) => s + (b.jumlahLokal || 0), 0);
    const totalInventory = ppkmDraft.inventory.reduce((s, i) => s + (i.jumlah || 0), 0);
    return { totalPtk, totalSiswa, totalRombel, totalBuildings, totalInventory };
  }, [ppkmDraft]);

  const markDirty = () => {
    lastLocalEditAtRef.current = Date.now();
    setHasUnsaved(true);
  };

  const handleReSyncAuto = () => {
    const freshConfig = buildAutoCompanyProfilePptConfig(ppkmDraft);
    setPptConfig(freshConfig);
    markDirty();
    setFeedback({
      type: 'success',
      text: 'Data lembaga & Juknis PKKM terbaru berhasil ditarik otomatis ke 12 slide PPT dan langsung tersimpan otomatis.',
    });
  };

  const handleSaveToCloud = async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await commitAutoSave(instId, ppkmDraft, pptConfig, true);
      setFeedback({
        type: 'success',
        text: isCloudLoggedIn
          ? 'Seluruh 12 slide PPT, tautan aktif, dan berkas lembaga tersinkron ke browser & Cloud Firestore.'
          : 'Seluruh perubahan 12 slide PPT tersimpan otomatis di browser (Masuk Google Cloud jika ingin sinkron antar perangkat).',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan data PPT.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePrintPdf = () => {
    setFeedback(null);
    document.body.classList.add('company-ppt-printing');
    const cleanup = () => {
      document.body.classList.remove('company-ppt-printing');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 1200);
    }, 120);
  };

  const handleExportPptx = async () => {
    setExportingPptx(true);
    setFeedback(null);
    try {
      const fileName = await exportCompanyProfileToPptx(ppkmDraft, pptConfig);
      setFeedback({
        type: 'success',
        text: `File PowerPoint asli (${fileName}) berisi 12 slide beserta link aktif berhasil diunduh.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? `Gagal mengekspor .pptx: ${err.message}`
            : 'Gagal membuat file PowerPoint (.pptx).',
      });
    } finally {
      setExportingPptx(false);
    }
  };

  const handleImageUpload = async (
    file: File | undefined,
    onSuccess: (dataUrl: string) => void
  ) => {
    if (!file) return;
    setFeedback(null);
    try {
      const compressed = await compressImageFileToDataUrl(file, 900, 0.72);
      onSuccess(compressed);
      markDirty();
      setFeedback({
        type: 'success',
        text: 'Foto berhasil diunggah & dikompresi otomatis untuk slide PPT.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memproses gambar.',
      });
    }
  };

  const updateInstitutionField = <K extends keyof PpkmData['institution']>(
    field: K,
    value: PpkmData['institution'][K]
  ) => {
    setPpkmDraft((prev) => ({
      ...prev,
      institution: { ...prev.institution, [field]: value },
    }));
    markDirty();
  };

  const updateSocialField = (
    field: keyof NonNullable<PpkmData['institution']['socialMedia']>,
    value: string
  ) => {
    setPpkmDraft((prev) => ({
      ...prev,
      institution: {
        ...prev.institution,
        socialMedia: {
          instagram: prev.institution.socialMedia?.instagram || '',
          youtube: prev.institution.socialMedia?.youtube || '',
          facebook: prev.institution.socialMedia?.facebook || '',
          tiktok: prev.institution.socialMedia?.tiktok || '',
          website: prev.institution.socialMedia?.website || '',
          whatsapp: prev.institution.socialMedia?.whatsapp || '',
          email: prev.institution.socialMedia?.email || '',
          [field]: value,
        },
      },
    }));
    markDirty();
  };

  const updateAccreditationField = (
    field: keyof NonNullable<PpkmData['institution']['accreditationDetail']>,
    value: string
  ) => {
    setPpkmDraft((prev) => ({
      ...prev,
      institution: {
        ...prev.institution,
        accreditationDetail: {
          peringkat: prev.institution.accreditationDetail?.peringkat || '',
          nilaiAngka: prev.institution.accreditationDetail?.nilaiAngka || '',
          nomorSk: prev.institution.accreditationDetail?.nomorSk || '',
          lembagaAkreditasi: prev.institution.accreditationDetail?.lembagaAkreditasi || 'BAN-PDM',
          tahunAkreditasi: prev.institution.accreditationDetail?.tahunAkreditasi || '',
          masaBerlaku: prev.institution.accreditationDetail?.masaBerlaku || '',
          sertifikatUrl: prev.institution.accreditationDetail?.sertifikatUrl || '',
          [field]: value,
        },
      },
    }));
    markDirty();
  };

  const activeAch: KomponenAchievements =
    ppkmDraft.komponenAchievements || EMPTY_KOMPONEN_ACHIEVEMENTS;

  const updateSwotField = (
    field: 'kekuatan' | 'kelemahanKendala' | 'peluang',
    values: string[]
  ) => {
    setPpkmDraft((prev) => {
      const current = prev.komponenAchievements || EMPTY_KOMPONEN_ACHIEVEMENTS;
      return {
        ...prev,
        komponenAchievements: {
          ...current,
          swotRtl: {
            ...current.swotRtl,
            [field]: values,
          },
        },
      };
    });
    markDirty();
  };

  const updateRtlItems = (values: (string | SwotRtlItem)[]) => {
    setPpkmDraft((prev) => {
      const current = prev.komponenAchievements || EMPTY_KOMPONEN_ACHIEVEMENTS;
      return {
        ...prev,
        komponenAchievements: {
          ...current,
          swotRtl: {
            ...current.swotRtl,
            rencanaTindakLanjut: values,
          },
        },
      };
    });
    markDirty();
  };

  const updateKomponenPoints = (
    compKey: 'komponenA' | 'komponenB' | 'komponenC' | 'komponenD' | 'komponenE',
    poinPencapaian: string[]
  ) => {
    setPpkmDraft((prev) => {
      const current = prev.komponenAchievements || EMPTY_KOMPONEN_ACHIEVEMENTS;
      return {
        ...prev,
        komponenAchievements: {
          ...current,
          [compKey]: {
            ...current[compKey],
            poinPencapaian,
          },
        },
      };
    });
    markDirty();
  };

  const activeMisi =
    ppkmDraft.institution.misi && ppkmDraft.institution.misi.length > 0
      ? ppkmDraft.institution.misi
      : ppkmDraft.programGoals.misi;

  const setMisiList = (nextMisi: string[]) => {
    setPpkmDraft((prev) => ({
      ...prev,
      institution: { ...prev.institution, misi: nextMisi },
      programGoals: { ...prev.programGoals, misi: nextMisi },
    }));
    markDirty();
  };

  const activePrograms = ppkmDraft.institution.featuredPrograms || [];
  const setProgramsList = (nextProgs: FeaturedProgram[]) => {
    setPpkmDraft((prev) => ({
      ...prev,
      institution: { ...prev.institution, featuredPrograms: nextProgs },
    }));
    markDirty();
  };

  const activePrestasi = ppkmDraft.komponenAchievements?.prestasiList || [];
  const setPrestasiList = (
    nextList: { namaPrestasi: string; tingkat: string; tahun: string; peraih: string }[]
  ) => {
    setPpkmDraft((prev) => ({
      ...prev,
      komponenAchievements: {
        ...(prev.komponenAchievements || EMPTY_KOMPONEN_ACHIEVEMENTS),
        prestasiList: nextList,
      },
    }));
    markDirty();
  };

  const galleryItems: CompanyProfilePptGalleryItem[] = pptConfig.galleryItems || [];
  const websiteTestHref = normalizeExternalUrl(ppkmDraft.institution.socialMedia?.website);
  const portalTestHref = normalizeExternalUrl(pptConfig.portalUrl);
  const ppdbTestHref = normalizeExternalUrl(pptConfig.ppdbOnlineUrl);

  return (
    <div className="space-y-4">
      <div className="ppt-hide-on-print space-y-4">
        {/* Top Action Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              <Presentation className="w-3.5 h-3.5 text-emerald-700" />
              <span>
                Generator Company Profile 12 Slide · Juknis PKKM &amp; Promosi Link Aktif
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 mt-0.5">
              Company Profile PPT — {ppkmDraft.institution.namaLembaga || 'Lembaga RA'}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Lengkap dengan Tantangan/Kendala, SWOT &amp; Program Ke Depan (RTL), Capaian 5 Komponen Juknis, Kemitraan MoU, serta Website &amp; Portal yang bisa langsung diklik di PPT maupun PDF.
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="font-semibold text-emerald-800">Auto-Save Aktif</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {saving || autoSaveStatus === 'saving'
                  ? 'Menyimpan perubahan ke browser & Cloud...'
                  : autoSaveStatus === 'pending' || hasUnsaved
                    ? 'Draft tersimpan di browser · menyinkronkan...'
                    : autoSaveStatus === 'error'
                      ? 'Tersimpan aman di browser (Cloud tertunda — klik Simpan Sekarang)'
                      : isCloudLoggedIn
                        ? `Tersimpan otomatis di browser & Cloud${lastSavedTime ? ` pukul ${lastSavedTime}` : ''}`
                        : `Tersimpan otomatis di browser${lastSavedTime ? ` pukul ${lastSavedTime}` : ''} (Masuk Google untuk Cloud)`}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleReSyncAuto}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tarik Ulang Data Otomatis</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToCloud}
              disabled={saving}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border cursor-pointer whitespace-nowrap ${
                hasUnsaved || autoSaveStatus === 'error'
                  ? 'bg-amber-50 text-amber-900 border-amber-400 hover:bg-amber-100'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {saving || autoSaveStatus === 'saving' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>
                {saving || autoSaveStatus === 'saving'
                  ? 'Menyimpan...'
                  : hasUnsaved
                    ? 'Simpan Sekarang'
                    : 'Tersimpan'}
              </span>
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-700" />
              <span>Cetak / Simpan PDF (12 Slide)</span>
            </button>

            <button
              type="button"
              onClick={handleExportPptx}
              disabled={exportingPptx}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#064E3B] hover:bg-emerald-900 disabled:opacity-60 rounded-lg cursor-pointer whitespace-nowrap"
            >
              {exportingPptx ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-[#D4AF37]" />
              )}
              <span>{exportingPptx ? 'Menyiapkan PPTX...' : 'Unduh PowerPoint (.pptx)'}</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`px-4 py-2.5 rounded-lg border text-xs font-medium flex items-center justify-between gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 2-Column Interactive Studio */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* LEFT PANEL: Quick-Edit Form */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 sm:grid-cols-6 border-b border-slate-200 bg-slate-50 text-[10.5px] font-semibold">
              {(
                [
                  { key: 'sampul', label: 'Sampul & Kepala' },
                  { key: 'identitas', label: 'Identitas & Visi' },
                  { key: 'sdm_sarpras', label: 'PTK & Sarpras' },
                  { key: 'tantangan_juknis', label: 'Tantangan & Juknis' },
                  { key: 'program_galeri', label: 'Program & Galeri' },
                  { key: 'ppdb_penutup', label: 'Web, Portal & PPDB' },
                ] as { key: QuickEditTab; label: string }[]
              ).map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-1.5 py-2.5 text-center border-b-2 transition-colors cursor-pointer leading-tight ${
                      active
                        ? 'border-[#064E3B] bg-white text-[#064E3B] font-bold'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="p-4 space-y-4 max-h-[680px] overflow-y-auto text-xs">
              {/* TAB 1: SAMPUL & SAMBUTAN */}
              {activeTab === 'sampul' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-900">Slide 1: Sampul Lembaga</span>
                    <button
                      type="button"
                      onClick={() => setActiveSlideIndex(0)}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Lihat Slide 1
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="font-semibold text-slate-700 block mb-1">
                        Nama Lembaga RA
                      </label>
                      <input
                        type="text"
                        value={ppkmDraft.institution.namaLembaga}
                        onChange={(e) => updateInstitutionField('namaLembaga', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Tahun Pelajaran
                      </label>
                      <input
                        type="text"
                        value={ppkmDraft.institution.tahunPelajaran}
                        onChange={(e) => updateInstitutionField('tahunPelajaran', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Status Akreditasi Singkat
                      </label>
                      <input
                        type="text"
                        value={ppkmDraft.institution.akreditasi}
                        onChange={(e) => updateInstitutionField('akreditasi', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="font-semibold text-slate-700 block mb-1">
                        Motto / Tagline Sampul
                      </label>
                      <input
                        type="text"
                        value={pptConfig.coverTagline}
                        onChange={(e) => {
                          setPptConfig((prev) => ({ ...prev, coverTagline: e.target.value }));
                          markDirty();
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="font-semibold text-slate-700 block mb-1">
                        Subjudul Sampul
                      </label>
                      <input
                        type="text"
                        value={pptConfig.coverSubtitle}
                        onChange={(e) => {
                          setPptConfig((prev) => ({ ...prev, coverSubtitle: e.target.value }));
                          markDirty();
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>

                    <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SlidePhoto
                          src={pptConfig.coverPhotoUrl || ppkmDraft.institution.fotoMadrasahUrl}
                          alt="Foto Sampul"
                          placeholder="Belum ada"
                          className="w-12 h-10 border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800">Foto Gedung / Sampul</div>
                          <div className="text-[11px] text-slate-500 truncate">
                            Otomatis dikompresi agar aman tersimpan
                          </div>
                        </div>
                      </div>
                      <input
                        ref={coverFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleImageUpload(e.target.files?.[0], (url) => {
                            setPptConfig((prev) => ({ ...prev, coverPhotoUrl: url }));
                            updateInstitutionField('fotoMadrasahUrl', url);
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => coverFileRef.current?.click()}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-white border border-slate-300 hover:bg-slate-100 rounded-md cursor-pointer shrink-0"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Unggah Foto</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 pt-2">
                    <span className="font-bold text-slate-900">Slide 2: Sambutan Kepala RA</span>
                    <button
                      type="button"
                      onClick={() => setActiveSlideIndex(1)}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Lihat Slide 2
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Nama Kepala RA
                      </label>
                      <input
                        type="text"
                        value={ppkmDraft.principal.namaLengkap}
                        onChange={(e) => {
                          setPpkmDraft((prev) => ({
                            ...prev,
                            principal: { ...prev.principal, namaLengkap: e.target.value },
                          }));
                          markDirty();
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        TMT Jabatan
                      </label>
                      <input
                        type="text"
                        value={ppkmDraft.principal.tmtJabatan}
                        onChange={(e) => {
                          setPpkmDraft((prev) => ({
                            ...prev,
                            principal: { ...prev.principal, tmtJabatan: e.target.value },
                          }));
                          markDirty();
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="font-semibold text-slate-700 block mb-1">
                        Kutipan Sambutan Kepala RA
                      </label>
                      <textarea
                        rows={3}
                        value={pptConfig.sambutanQuote}
                        onChange={(e) => {
                          setPptConfig((prev) => ({ ...prev, sambutanQuote: e.target.value }));
                          updateInstitutionField('sambutanKepala', e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="font-semibold text-slate-700 block mb-1">
                        Ringkasan Profil Kepala RA
                      </label>
                      <input
                        type="text"
                        value={pptConfig.principalBioHighlight}
                        onChange={(e) => {
                          setPptConfig((prev) => ({
                            ...prev,
                            principalBioHighlight: e.target.value,
                          }));
                          markDirty();
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>

                    <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SlidePhoto
                          src={ppkmDraft.principal.fotoUrl}
                          alt="Foto Kepala RA"
                          placeholder="Belum ada"
                          className="w-10 h-10 border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800">Foto Kepala RA</div>
                          <div className="text-[11px] text-slate-500 truncate">
                            Ditampilkan di Slide 2 Sambutan
                          </div>
                        </div>
                      </div>
                      <input
                        ref={principalFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleImageUpload(e.target.files?.[0], (url) => {
                            setPpkmDraft((prev) => ({
                              ...prev,
                              principal: { ...prev.principal, fotoUrl: url },
                            }));
                            markDirty();
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => principalFileRef.current?.click()}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-white border border-slate-300 hover:bg-slate-100 rounded-md cursor-pointer shrink-0"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Unggah Foto</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: IDENTITAS & VISI */}
              {activeTab === 'identitas' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-900">Slide 3: Identitas &amp; Legalitas</span>
                    <button
                      type="button"
                      onClick={() => setActiveSlideIndex(2)}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Lihat Slide 3
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">NSM</label>
                      <input
                        type="text"
                        value={ppkmDraft.institution.nsm}
                        onChange={(e) => updateInstitutionField('nsm', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">NPSN</label>
                      <input
                        type="text"
                        value={ppkmDraft.institution.npsn || ppkmDraft.institution.npsm}
                        onChange={(e) => {
                          updateInstitutionField('npsn', e.target.value);
                          updateInstitutionField('npsm', e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="font-semibold text-slate-700 block mb-1">Nama Yayasan</label>
                      <input
                        type="text"
                        value={ppkmDraft.adminDocs?.namaYayasan || ''}
                        onChange={(e) => {
                          setPpkmDraft((prev) => ({
                            ...prev,
                            adminDocs: {
                              ...(prev.adminDocs || EMPTY_ADMIN_DOCS),
                              namaYayasan: e.target.value,
                            },
                          }));
                          markDirty();
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Nomor Izin Operasional
                      </label>
                      <input
                        type="text"
                        value={ppkmDraft.adminDocs?.izinOperasionalNomor || ''}
                        onChange={(e) => {
                          setPpkmDraft((prev) => ({
                            ...prev,
                            adminDocs: {
                              ...(prev.adminDocs || EMPTY_ADMIN_DOCS),
                              izinOperasionalNomor: e.target.value,
                            },
                          }));
                          markDirty();
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        SK Akreditasi BAN-PDM
                      </label>
                      <input
                        type="text"
                        value={ppkmDraft.institution.accreditationDetail?.nomorSk || ''}
                        onChange={(e) => updateAccreditationField('nomorSk', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Peringkat Akreditasi
                      </label>
                      <input
                        type="text"
                        value={ppkmDraft.institution.accreditationDetail?.peringkat || ''}
                        onChange={(e) => updateAccreditationField('peringkat', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Nilai Angka Akreditasi
                      </label>
                      <input
                        type="text"
                        value={String(ppkmDraft.institution.accreditationDetail?.nilaiAngka || '')}
                        onChange={(e) => updateAccreditationField('nilaiAngka', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="font-semibold text-slate-700 block mb-1">Alamat Lengkap</label>
                      <input
                        type="text"
                        value={ppkmDraft.institution.alamat}
                        onChange={(e) => updateInstitutionField('alamat', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Kecamatan</label>
                      <input
                        type="text"
                        value={ppkmDraft.institution.kecamatan}
                        onChange={(e) => updateInstitutionField('kecamatan', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Kabupaten / Kota</label>
                      <input
                        type="text"
                        value={ppkmDraft.institution.kotaKab}
                        onChange={(e) => updateInstitutionField('kotaKab', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">4 Keunggulan Utama (Slide 3)</span>
                      {pptConfig.keyHighlights.length < 4 && (
                        <button
                          type="button"
                          onClick={() => {
                            setPptConfig((prev) => ({
                              ...prev,
                              keyHighlights: [...prev.keyHighlights, 'Keunggulan lembaga baru'],
                            }));
                            markDirty();
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Tambah
                        </button>
                      )}
                    </div>
                    {pptConfig.keyHighlights.map((hl, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={hl}
                          onChange={(e) => {
                            const next = [...pptConfig.keyHighlights];
                            next[idx] = e.target.value;
                            setPptConfig((prev) => ({ ...prev, keyHighlights: next }));
                            markDirty();
                          }}
                          className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPptConfig((prev) => ({
                              ...prev,
                              keyHighlights: prev.keyHighlights.filter((_, i) => i !== idx),
                            }));
                            markDirty();
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Slide 4: Visi &amp; Misi Lembaga</span>
                      <button
                        type="button"
                        onClick={() => setActiveSlideIndex(3)}
                        className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Lihat Slide 4
                      </button>
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Visi RA</label>
                      <textarea
                        rows={2}
                        value={ppkmDraft.institution.visi || ppkmDraft.programGoals.visi}
                        onChange={(e) => {
                          const v = e.target.value;
                          setPpkmDraft((prev) => ({
                            ...prev,
                            institution: { ...prev.institution, visi: v },
                            programGoals: { ...prev.programGoals, visi: v },
                          }));
                          markDirty();
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <label className="font-semibold text-slate-700">Daftar Misi</label>
                      <button
                        type="button"
                        onClick={() => setMisiList([...activeMisi, 'Misi baru lembaga'])}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Tambah Misi
                      </button>
                    </div>
                    {activeMisi.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={m}
                          onChange={(e) => {
                            const next = [...activeMisi];
                            next[idx] = e.target.value;
                            setMisiList(next);
                          }}
                          className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setMisiList(activeMisi.filter((_, i) => i !== idx))}
                          className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: PTK, SISWA, SARPRAS & CUSTOM TITLES */}
              {activeTab === 'sdm_sarpras' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-900">
                      Ringkasan Data Otomatis (Slide 5, 6 &amp; 7)
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSlideIndex(4)}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Lihat Slide 5–7
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 tabular-nums">
                    <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-emerald-900">
                          Slide 5 · PTK &amp; Struktur
                        </span>
                        <Users className="w-3.5 h-3.5 text-emerald-700" />
                      </div>
                      <div className="text-base font-bold text-slate-900 mt-1">
                        {metrics.totalPtk} PTK
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveMenu('data_guru')}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:underline cursor-pointer"
                      >
                        <span>Kelola Daftar PTK</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-emerald-900">
                          Slide 6 · Peserta Didik
                        </span>
                        <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                      </div>
                      <div className="text-base font-bold text-slate-900 mt-1">
                        {metrics.totalSiswa} Anak ({metrics.totalRombel} Rombel)
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveMenu('profil_lembaga')}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:underline cursor-pointer"
                      >
                        <span>Kelola Rombel &amp; Tren</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Slide 7: Sarpras &amp; Tanah</span>
                      <span className="text-[11px] text-slate-500 tabular-nums">
                        {metrics.totalBuildings} Lokal · {metrics.totalInventory} Unit APE
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Luas Tanah</label>
                        <input
                          type="text"
                          value={ppkmDraft.institution.luasTanah}
                          onChange={(e) => updateInstitutionField('luasTanah', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Status Kepemilikan
                        </label>
                        <input
                          type="text"
                          value={ppkmDraft.institution.statusTanah}
                          onChange={(e) => updateInstitutionField('statusTanah', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <span className="font-bold text-slate-900 block">
                      Kustomisasi Judul Header Slide (2–12)
                    </span>
                    <div className="space-y-1.5">
                      {COMPANY_PPT_SLIDES.slice(1).map((s) => (
                        <div key={s.index} className="flex items-center gap-2">
                          <span className="w-14 text-[11px] font-mono text-slate-500 shrink-0 tabular-nums">
                            Slide {s.numberLabel}
                          </span>
                          <input
                            type="text"
                            value={pptConfig.slideTitles?.[s.index] ?? s.defaultTitle}
                            onChange={(e) => {
                              const nextVal = e.target.value;
                              setPptConfig((prev) => ({
                                ...prev,
                                slideTitles: {
                                  ...(prev.slideTitles || {}),
                                  [s.index]: nextVal,
                                },
                              }));
                              markDirty();
                            }}
                            className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-md"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: TANTANGAN, SWOT, PROGRAM KE DEPAN (RTL) & 5 KOMPONEN JUKNIS */}
              {activeTab === 'tantangan_juknis' && (
                <div className="space-y-4">
                  {/* Slide 10: Tantangan / Kendala Nyata */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-bold text-rose-900">
                        Slide 10: Tantangan &amp; Kendala Nyata Saat Ini
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveSlideIndex(9)}
                        className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Lihat Slide 10
                      </button>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          updateSwotField('kelemahanKendala', [
                            ...activeAch.swotRtl.kelemahanKendala,
                            'Tantangan / kendala operasional baru lembaga',
                          ]);
                          setActiveSlideIndex(9);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Tambah Tantangan
                      </button>
                    </div>
                    {activeAch.swotRtl.kelemahanKendala.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const next = [...activeAch.swotRtl.kelemahanKendala];
                            next[idx] = e.target.value;
                            updateSwotField('kelemahanKendala', next);
                          }}
                          className="flex-1 px-2.5 py-1.5 border border-rose-200 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateSwotField(
                              'kelemahanKendala',
                              activeAch.swotRtl.kelemahanKendala.filter((_, i) => i !== idx)
                            )
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Slide 10: Program Lembaga Ke Depan (RTL Juknis) */}
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#064E3B]">
                        Slide 10: Program Lembaga Ke Depan (RTL)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          updateRtlItems([
                            ...activeAch.swotRtl.rencanaTindakLanjut,
                            'Program pengembangan strategis periode berikutnya',
                          ]);
                          setActiveSlideIndex(9);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Tambah Program
                      </button>
                    </div>
                    {activeAch.swotRtl.rencanaTindakLanjut.map((rtl, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={formatRtlEntry(rtl)}
                          onChange={(e) => {
                            const next = [...activeAch.swotRtl.rencanaTindakLanjut];
                            next[idx] = e.target.value;
                            updateRtlItems(next);
                          }}
                          className="flex-1 px-2.5 py-1.5 border border-emerald-200 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateRtlItems(
                              activeAch.swotRtl.rencanaTindakLanjut.filter((_, i) => i !== idx)
                            )
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Kekuatan & Peluang (SWOT) */}
                  <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">Kekuatan (Strengths)</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateSwotField('kekuatan', [
                              ...activeAch.swotRtl.kekuatan,
                              'Kekuatan baru lembaga',
                            ])
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Tambah
                        </button>
                      </div>
                      {activeAch.swotRtl.kekuatan.map((k, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={k}
                            onChange={(e) => {
                              const next = [...activeAch.swotRtl.kekuatan];
                              next[idx] = e.target.value;
                              updateSwotField('kekuatan', next);
                            }}
                            className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateSwotField(
                                'kekuatan',
                                activeAch.swotRtl.kekuatan.filter((_, i) => i !== idx)
                              )
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">Peluang (Opportunities)</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateSwotField('peluang', [
                              ...activeAch.swotRtl.peluang,
                              'Peluang kerja sama / pengembangan baru',
                            ])
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Tambah
                        </button>
                      </div>
                      {activeAch.swotRtl.peluang.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={p}
                            onChange={(e) => {
                              const next = [...activeAch.swotRtl.peluang];
                              next[idx] = e.target.value;
                              updateSwotField('peluang', next);
                            }}
                            className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateSwotField(
                                'peluang',
                                activeAch.swotRtl.peluang.filter((_, i) => i !== idx)
                              )
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Slide 8: Kemitraan MoU & Kewirausahaan */}
                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        Slide 8: Sorotan Kemitraan MoU &amp; Kewirausahaan
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPptConfig((prev) => ({
                            ...prev,
                            partnershipHighlights: [
                              ...(prev.partnershipHighlights || []),
                              'Kemitraan MoU baru lembaga',
                            ],
                          }));
                          markDirty();
                          setActiveSlideIndex(7);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Tambah
                      </button>
                    </div>
                    {(pptConfig.partnershipHighlights || []).map((m, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={m}
                          onChange={(e) => {
                            const next = [...(pptConfig.partnershipHighlights || [])];
                            next[idx] = e.target.value;
                            setPptConfig((prev) => ({ ...prev, partnershipHighlights: next }));
                            markDirty();
                          }}
                          className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPptConfig((prev) => ({
                              ...prev,
                              partnershipHighlights: (prev.partnershipHighlights || []).filter(
                                (_, i) => i !== idx
                              ),
                            }));
                            markDirty();
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Slide 9: Poin Ringkas 5 Komponen Juknis A-E */}
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        Slide 9: Capaian 5 Komponen Juknis (A–E)
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveSlideIndex(8)}
                        className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Lihat Slide 9
                      </button>
                    </div>
                    {(
                      [
                        { key: 'komponenA', label: 'Komponen A (Pengembangan RA)' },
                        { key: 'komponenB', label: 'Komponen B (Manajerial)' },
                        { key: 'komponenC', label: 'Komponen C (Kewirausahaan)' },
                        { key: 'komponenD', label: 'Komponen D (Supervisi)' },
                        { key: 'komponenE', label: 'Komponen E (Hasil Kinerja)' },
                      ] as const
                    ).map((c) => {
                      const pts = activeAch[c.key]?.poinPencapaian || [];
                      return (
                        <div key={c.key} className="p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-emerald-900">{c.label}</span>
                            <button
                              type="button"
                              onClick={() => {
                                updateKomponenPoints(c.key, [
                                  ...pts,
                                  `Poin capaian ${c.label}`,
                                ]);
                                setActiveSlideIndex(8);
                              }}
                              className="text-[10.5px] font-semibold text-emerald-700 cursor-pointer"
                            >
                              + Poin
                            </button>
                          </div>
                          {pts.slice(0, 3).map((pt, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <input
                                type="text"
                                value={pt}
                                onChange={(e) => {
                                  const next = [...pts];
                                  next[idx] = e.target.value;
                                  updateKomponenPoints(c.key, next);
                                }}
                                className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateKomponenPoints(
                                    c.key,
                                    pts.filter((_, i) => i !== idx)
                                  )
                                }
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 5: PROGRAM UNGGULAN, PRESTASI & GALERI */}
              {activeTab === 'program_galeri' && (
                <div className="space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-bold text-slate-900">
                        Slide 8: Program Unggulan RA
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setProgramsList([
                            ...activePrograms,
                            {
                              id: `prog-${Date.now()}`,
                              nama: 'Program Unggulan Baru',
                              deskripsi:
                                'Deskripsi singkat pelaksanaan dan manfaat program bagi santri.',
                              kategori: 'Unggulan',
                            },
                          ]);
                          setActiveSlideIndex(7);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Program
                      </button>
                    </div>

                    {activePrograms.map((prog, idx) => (
                      <div
                        key={prog.id}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={prog.nama}
                            onChange={(e) => {
                              const next = [...activePrograms];
                              next[idx] = { ...prog, nama: e.target.value };
                              setProgramsList(next);
                            }}
                            placeholder="Nama Program"
                            className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setProgramsList(activePrograms.filter((_, i) => i !== idx))
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={prog.kategori || ''}
                            onChange={(e) => {
                              const next = [...activePrograms];
                              next[idx] = { ...prog, kategori: e.target.value };
                              setProgramsList(next);
                            }}
                            placeholder="Kategori"
                            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
                          />
                          <input
                            type="text"
                            value={prog.deskripsi}
                            onChange={(e) => {
                              const next = [...activePrograms];
                              next[idx] = { ...prog, deskripsi: e.target.value };
                              setProgramsList(next);
                            }}
                            placeholder="Deskripsi singkat"
                            className="col-span-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        Slide 11: Prestasi Lembaga &amp; Santri
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPrestasiList([
                            ...activePrestasi,
                            {
                              namaPrestasi: 'Juara Lomba Kreativitas Anak RA',
                              tingkat: 'Kabupaten',
                              tahun: '2026',
                              peraih: 'Santri RA',
                            },
                          ]);
                          setActiveSlideIndex(10);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Prestasi
                      </button>
                    </div>
                    {activePrestasi.map((pr, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={pr.namaPrestasi}
                            onChange={(e) => {
                              const next = [...activePrestasi];
                              next[idx] = { ...pr, namaPrestasi: e.target.value };
                              setPrestasiList(next);
                            }}
                            className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setPrestasiList(activePrestasi.filter((_, i) => i !== idx))
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <input
                            type="text"
                            value={pr.tingkat}
                            onChange={(e) => {
                              const next = [...activePrestasi];
                              next[idx] = { ...pr, tingkat: e.target.value };
                              setPrestasiList(next);
                            }}
                            placeholder="Tingkat"
                            className="px-2 py-1 bg-white border border-slate-200 rounded-md"
                          />
                          <input
                            type="text"
                            value={pr.tahun}
                            onChange={(e) => {
                              const next = [...activePrestasi];
                              next[idx] = { ...pr, tahun: e.target.value };
                              setPrestasiList(next);
                            }}
                            placeholder="Tahun"
                            className="px-2 py-1 bg-white border border-slate-200 rounded-md"
                          />
                          <input
                            type="text"
                            value={pr.peraih}
                            onChange={(e) => {
                              const next = [...activePrestasi];
                              next[idx] = { ...pr, peraih: e.target.value };
                              setPrestasiList(next);
                            }}
                            placeholder="Peraih"
                            className="px-2 py-1 bg-white border border-slate-200 rounded-md"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        Slide 11: Galeri Foto Dokumentasi (Maks. 4 Kolase)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPptConfig((prev) => ({
                            ...prev,
                            galleryItems: [
                              ...(prev.galleryItems || []),
                              {
                                id: `gal-${Date.now()}`,
                                judul: 'Dokumentasi Kegiatan Baru',
                                kategori: 'Kegiatan',
                                fotoUrl: '',
                              },
                            ],
                          }));
                          markDirty();
                          setActiveSlideIndex(10);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Foto
                      </button>
                    </div>

                    {galleryItems.map((gal, idx) => (
                      <div
                        key={gal.id}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2.5"
                      >
                        <SlidePhoto
                          src={gal.fotoUrl}
                          alt={gal.judul}
                          placeholder="Kosong"
                          className="w-14 h-11 border border-slate-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <input
                            type="text"
                            value={gal.judul}
                            onChange={(e) => {
                              const next = [...galleryItems];
                              next[idx] = { ...gal, judul: e.target.value };
                              setPptConfig((prev) => ({ ...prev, galleryItems: next }));
                              markDirty();
                            }}
                            placeholder="Judul / Caption Foto"
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md font-medium"
                          />
                          <div className="flex items-center gap-2">
                            <label className="inline-flex items-center gap-1 px-2 py-1 text-[10.5px] font-semibold bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer">
                              <Upload className="w-3 h-3" />
                              <span>Pilih Gambar</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handleImageUpload(e.target.files?.[0], (url) => {
                                    const next = [...galleryItems];
                                    next[idx] = { ...gal, fotoUrl: url };
                                    setPptConfig((prev) => ({ ...prev, galleryItems: next }));
                                  })
                                }
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setPptConfig((prev) => ({
                                  ...prev,
                                  galleryItems: (prev.galleryItems || []).filter(
                                    (_, i) => i !== idx
                                  ),
                                }));
                                markDirty();
                              }}
                              className="text-[10.5px] text-rose-600 hover:underline cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: WEBSITE PROMO, PORTAL LINK AKTIF, PPDB & PENUTUP */}
              {activeTab === 'ppdb_penutup' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-900">
                      Slide 12: Promosi Website, Portal &amp; Link Aktif
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSlideIndex(11)}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Lihat Slide 12
                    </button>
                  </div>

                  {/* Direct Clickable Website & Portal Inputs */}
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-2.5">
                    <div className="flex items-center gap-1.5 font-bold text-[#064E3B]">
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Tautan Website &amp; Portal (Otomatis Bisa Diklik)</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700">
                          URL Website Resmi Lembaga
                        </label>
                        {websiteTestHref && (
                          <a
                            href={websiteTestHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 hover:underline"
                          >
                            <span>Uji Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <input
                        type="url"
                        value={ppkmDraft.institution.socialMedia?.website || ''}
                        onChange={(e) => updateSocialField('website', e.target.value)}
                        placeholder="https://websitelembaga.sch.id"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Nama/Label Portal
                        </label>
                        <input
                          type="text"
                          value={pptConfig.portalLabel || ''}
                          onChange={(e) => {
                            setPptConfig((prev) => ({ ...prev, portalLabel: e.target.value }));
                            markDirty();
                          }}
                          placeholder="Portal Siswa & Layanan RA"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-semibold text-slate-700">URL Portal</label>
                          {portalTestHref && (
                            <a
                              href={portalTestHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 hover:underline"
                            >
                              <span>Uji Link</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <input
                          type="url"
                          value={pptConfig.portalUrl || ''}
                          onChange={(e) => {
                            setPptConfig((prev) => ({ ...prev, portalUrl: e.target.value }));
                            markDirty();
                          }}
                          placeholder="https://portal.website.sch.id"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700">
                          URL Formulir PPDB Online (Opsional)
                        </label>
                        {ppdbTestHref && (
                          <a
                            href={ppdbTestHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 hover:underline"
                          >
                            <span>Uji Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <input
                        type="url"
                        value={pptConfig.ppdbOnlineUrl || ''}
                        onChange={(e) => {
                          setPptConfig((prev) => ({ ...prev, ppdbOnlineUrl: e.target.value }));
                          markDirty();
                        }}
                        placeholder="https://websitelembaga.sch.id/ppdb"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Judul Ajakan Promosi Website
                      </label>
                      <input
                        type="text"
                        value={pptConfig.websitePromoHeadline || ''}
                        onChange={(e) => {
                          setPptConfig((prev) => ({
                            ...prev,
                            websitePromoHeadline: e.target.value,
                          }));
                          markDirty();
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Deskripsi Singkat Promosi Digital
                      </label>
                      <textarea
                        rows={2}
                        value={pptConfig.websitePromoDescription || ''}
                        onChange={(e) => {
                          setPptConfig((prev) => ({
                            ...prev,
                            websitePromoDescription: e.target.value,
                          }));
                          markDirty();
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* PPDB Schedule & Contact */}
                  <div className="space-y-2 border-t border-slate-100 pt-2.5">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Judul PPDB</label>
                      <input
                        type="text"
                        value={pptConfig.ppdbTitle}
                        onChange={(e) => {
                          setPptConfig((prev) => ({ ...prev, ppdbTitle: e.target.value }));
                          markDirty();
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Jadwal &amp; Ketentuan Kelompok Usia
                      </label>
                      <textarea
                        rows={2}
                        value={pptConfig.ppdbSchedule}
                        onChange={(e) => {
                          setPptConfig((prev) => ({ ...prev, ppdbSchedule: e.target.value }));
                          markDirty();
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Narahubung &amp; WhatsApp PPDB
                      </label>
                      <input
                        type="text"
                        value={pptConfig.ppdbContactPerson}
                        onChange={(e) => {
                          setPptConfig((prev) => ({
                            ...prev,
                            ppdbContactPerson: e.target.value,
                          }));
                          markDirty();
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Social Media Links */}
                  <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5">
                    <div className="col-span-2 flex items-center gap-1.5 font-bold text-slate-800">
                      <Globe className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Kontak &amp; Media Sosial (Klik Langsung di Slide)</span>
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Nomor WA</label>
                      <input
                        type="text"
                        value={ppkmDraft.institution.socialMedia?.whatsapp || ''}
                        onChange={(e) => updateSocialField('whatsapp', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Email Resmi</label>
                      <input
                        type="text"
                        value={
                          ppkmDraft.institution.socialMedia?.email || ppkmDraft.institution.email
                        }
                        onChange={(e) => {
                          updateSocialField('email', e.target.value);
                          updateInstitutionField('email', e.target.value);
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Instagram</label>
                      <input
                        type="text"
                        value={ppkmDraft.institution.socialMedia?.instagram || ''}
                        onChange={(e) => updateSocialField('instagram', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">YouTube</label>
                      <input
                        type="text"
                        value={ppkmDraft.institution.socialMedia?.youtube || ''}
                        onChange={(e) => updateSocialField('youtube', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">TikTok</label>
                      <input
                        type="text"
                        value={ppkmDraft.institution.socialMedia?.tiktok || ''}
                        onChange={(e) => updateSocialField('tiktok', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Facebook</label>
                      <input
                        type="text"
                        value={ppkmDraft.institution.socialMedia?.facebook || ''}
                        onChange={(e) => updateSocialField('facebook', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Closing message & photo */}
                  <div className="space-y-2 border-t border-slate-100 pt-2.5">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Judul Penutup
                      </label>
                      <input
                        type="text"
                        value={pptConfig.closingTitle}
                        onChange={(e) => {
                          setPptConfig((prev) => ({ ...prev, closingTitle: e.target.value }));
                          markDirty();
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Kalimat Penutup
                      </label>
                      <textarea
                        rows={2}
                        value={pptConfig.closingMessage}
                        onChange={(e) => {
                          setPptConfig((prev) => ({ ...prev, closingMessage: e.target.value }));
                          markDirty();
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SlidePhoto
                          src={pptConfig.closingPhotoUrl || ppkmDraft.institution.fotoBersamaUrl}
                          alt="Foto Kebersamaan"
                          placeholder="Belum ada"
                          className="w-12 h-10 border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800">
                            Foto Kebersamaan Penutup
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            Ditampilkan pada Slide 12
                          </div>
                        </div>
                      </div>
                      <input
                        ref={closingFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleImageUpload(e.target.files?.[0], (url) => {
                            setPptConfig((prev) => ({ ...prev, closingPhotoUrl: url }));
                            updateInstitutionField('fotoBersamaUrl', url);
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => closingFileRef.current?.click()}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-white border border-slate-300 hover:bg-slate-100 rounded-md cursor-pointer shrink-0"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Unggah Foto</span>
                      </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SlidePhoto
                          src={ppkmDraft.institution.websiteScreenshotUrl}
                          alt="Screenshot Website"
                          placeholder="Belum ada"
                          className="w-12 h-10 border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800">
                            Tangkapan Layar Website / Portal
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            Dipakai bila foto penutup kosong
                          </div>
                        </div>
                      </div>
                      <input
                        ref={webShotFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleImageUpload(e.target.files?.[0], (url) =>
                            updateInstitutionField('websiteScreenshotUrl', url)
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() => webShotFileRef.current?.click()}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-white border border-slate-300 hover:bg-slate-100 rounded-md cursor-pointer shrink-0"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Unggah</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: 16:9 Live Preview & Slide Switcher */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={activeSlideIndex === 0}
                  onClick={() => setActiveSlideIndex((p) => Math.max(0, p - 1))}
                  className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  aria-label="Slide Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2.5 py-1 text-xs font-bold text-[#064E3B] bg-emerald-50 border border-emerald-200 rounded-md tabular-nums">
                  Slide {String(activeSlideIndex + 1).padStart(2, '0')} / 12
                </span>
                <button
                  type="button"
                  disabled={activeSlideIndex === 11}
                  onClick={() => setActiveSlideIndex((p) => Math.min(11, p + 1))}
                  className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  aria-label="Slide Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium text-slate-600 ml-1 truncate max-w-[210px]">
                  {COMPANY_PPT_SLIDES[activeSlideIndex]?.defaultTitle}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode((v) => (v === 'single' ? 'grid' : 'single'))}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border rounded-md cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-[#064E3B] text-white border-[#064E3B]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {viewMode === 'grid' ? (
                    <Layers className="w-3.5 h-3.5" />
                  ) : (
                    <Grid className="w-3.5 h-3.5" />
                  )}
                  <span>{viewMode === 'grid' ? 'Fokus 1 Slide' : 'Grid 12 Slide'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFullscreenOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Layar Penuh</span>
                </button>
              </div>
            </div>

            {viewMode === 'single' ? (
              <div className="space-y-3">
                <div className="aspect-video w-full border border-slate-300 shadow-sm overflow-hidden bg-[#FBF9F5]">
                  <CompanySlideCanvas
                    slideIndex={activeSlideIndex}
                    data={ppkmDraft}
                    config={pptConfig}
                  />
                </div>

                {/* 12-Slide Strip Switcher */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 pt-1">
                  {COMPANY_PPT_SLIDES.map((s) => {
                    const isCurrent = activeSlideIndex === s.index;
                    return (
                      <button
                        key={s.index}
                        type="button"
                        onClick={() => setActiveSlideIndex(s.index)}
                        className={`px-1.5 py-1.5 border text-center rounded-md transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-[#064E3B] text-white border-[#D4AF37] font-bold'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                        }`}
                      >
                        <div className="text-[10px] font-mono tabular-nums">{s.numberLabel}</div>
                        <div className="text-[9px] truncate mt-0.5">{s.shortLabel}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
                {COMPANY_PPT_SLIDES.map((s) => (
                  <button
                    key={s.index}
                    type="button"
                    onClick={() => {
                      setActiveSlideIndex(s.index);
                      setViewMode('single');
                    }}
                    className={`text-left border rounded-lg overflow-hidden transition-all cursor-pointer ${
                      activeSlideIndex === s.index
                        ? 'border-[#064E3B] ring-2 ring-[#D4AF37]'
                        : 'border-slate-200 hover:border-emerald-400'
                    }`}
                  >
                    <div className="aspect-video w-full pointer-events-none">
                      <CompanySlideCanvas
                        slideIndex={s.index}
                        data={ppkmDraft}
                        config={pptConfig}
                      />
                    </div>
                    <div className="px-2.5 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-800 truncate">
                        {s.numberLabel}. {s.defaultTitle}
                      </span>
                      <span className="text-emerald-700 font-semibold shrink-0">Edit</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-950">
                <Sparkles className="w-4 h-4 text-[#B45309] shrink-0" />
                <span>
                  12 Slide sesuai Juknis PKKM + link website &amp; portal dapat diklik langsung di PPT &amp; PDF.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 font-semibold text-emerald-900 bg-white border border-emerald-300 rounded-md hover:bg-emerald-100 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPptx}
                  disabled={exportingPptx}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 font-semibold text-white bg-[#064E3B] rounded-md hover:bg-emerald-900 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>.PPTX</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Presentation Modal */}
      {fullscreenOpen && (
        <div className="ppt-hide-on-print fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-6xl flex items-center justify-between text-white mb-3 text-xs">
            <div className="font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-[#D4AF37]" />
              <span>
                Presentasi Company Profile — {ppkmDraft.institution.namaLembaga} (Slide{' '}
                {activeSlideIndex + 1} / 12)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={activeSlideIndex === 0}
                onClick={() => setActiveSlideIndex((p) => Math.max(0, p - 1))}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-40 rounded-md cursor-pointer"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={activeSlideIndex === 11}
                onClick={() => setActiveSlideIndex((p) => Math.min(11, p + 1))}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-40 rounded-md cursor-pointer"
              >
                Berikutnya
              </button>
              <button
                type="button"
                onClick={() => setFullscreenOpen(false)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 rounded-md font-semibold cursor-pointer"
              >
                Tutup (Esc)
              </button>
            </div>
          </div>
          <div className="w-full max-w-6xl aspect-video border-2 border-[#D4AF37] shadow-2xl overflow-hidden bg-[#FBF9F5]">
            <CompanySlideCanvas
              slideIndex={activeSlideIndex}
              data={ppkmDraft}
              config={pptConfig}
            />
          </div>
        </div>
      )}

      {/* Hidden 12-Slide Landscape Print Deck */}
      <div className="hidden ppt-print-deck">
        {COMPANY_PPT_SLIDES.map((s) => (
          <div key={s.index} className="ppt-print-slide">
            <CompanySlideCanvas slideIndex={s.index} data={ppkmDraft} config={pptConfig} />
          </div>
        ))}
      </div>
    </div>
  );
};
