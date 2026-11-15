import PptxGenJS from 'pptxgenjs';
import {
  CompanyProfilePptConfig,
  CompanyProfilePptGalleryItem,
  PpkmData,
  SwotRtlItem,
} from '../types/ppkm';

export interface SlideMetaDef {
  index: number;
  numberLabel: string;
  defaultTitle: string;
  shortLabel: string;
}

export const COMPANY_PPT_SLIDES: SlideMetaDef[] = [
  { index: 0, numberLabel: '01', defaultTitle: 'Sampul Resmi Lembaga', shortLabel: 'Sampul' },
  { index: 1, numberLabel: '02', defaultTitle: 'Sambutan & Profil Kepala RA', shortLabel: 'Sambutan' },
  { index: 2, numberLabel: '03', defaultTitle: 'Identitas, Legalitas & Akreditasi BAN-PDM', shortLabel: 'Identitas' },
  { index: 3, numberLabel: '04', defaultTitle: 'Visi, Misi & Tujuan Pendidikan', shortLabel: 'Visi & Misi' },
  { index: 4, numberLabel: '05', defaultTitle: 'Struktur Organisasi & Profil PTK', shortLabel: 'PTK & Bagan' },
  { index: 5, numberLabel: '06', defaultTitle: 'Data Peserta Didik, Tren & Alumni', shortLabel: 'Peserta Didik' },
  { index: 6, numberLabel: '07', defaultTitle: 'Sarana Prasarana & Fasilitas APE', shortLabel: 'Sarpras & APE' },
  { index: 7, numberLabel: '08', defaultTitle: 'Program Unggulan, Kemitraan MoU & Kewirausahaan', shortLabel: 'Program & MoU' },
  { index: 8, numberLabel: '09', defaultTitle: 'Capaian 5 Komponen PKKM (A–E) sesuai Juknis', shortLabel: '5 Komponen' },
  { index: 9, numberLabel: '10', defaultTitle: 'Tantangan, Analisis SWOT & Program Ke Depan (RTL)', shortLabel: 'Tantangan & RTL' },
  { index: 10, numberLabel: '11', defaultTitle: 'Prestasi Lembaga, Santri & Galeri Dokumentasi', shortLabel: 'Prestasi' },
  { index: 11, numberLabel: '12', defaultTitle: 'Promosi Website, Portal Lembaga, PPDB & Penutup', shortLabel: 'Web & PPDB' },
];

export const PPT_THEME = {
  emeraldDark: '064E3B',
  emeraldMid: '047857',
  emeraldSoft: 'ECFDF5',
  emeraldBorder: 'A7F3D0',
  gold: 'D4AF37',
  goldAmber: 'B45309',
  goldSoft: 'FEF3C7',
  ivory: 'FBF9F5',
  white: 'FFFFFF',
  ink: '0F172A',
  muted: '475569',
  subtle: '64748B',
  border: 'CBD5E1',
  roseSoft: 'FFF1F2',
  roseText: '9F1239',
};

/**
 * Normalize website / portal URLs into valid clickable https:// links.
 */
export function normalizeExternalUrl(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'belum ada') return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.includes('.') && !trimmed.includes(' ')) {
    return `https://${trimmed.replace(/^\/+/, '')}`;
  }
  return null;
}

/**
 * Normalize Indonesian phone / WhatsApp numbers into https://wa.me/... links.
 */
export function normalizeWhatsappUrl(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-') return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/[^\d]/g, '');
  if (digits.length < 8) return null;
  if (digits.startsWith('0')) return `https://wa.me/62${digits.slice(1)}`;
  if (digits.startsWith('62')) return `https://wa.me/${digits}`;
  return `https://wa.me/${digits}`;
}

/**
 * Normalize email into mailto: URI.
 */
export function normalizeEmailHref(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-' || !trimmed.includes('@')) return null;
  return `mailto:${trimmed}`;
}

/**
 * Normalize social media handles or URLs into valid clickable URLs.
 */
export function normalizeSocialUrl(
  platform: 'instagram' | 'youtube' | 'tiktok' | 'facebook',
  raw?: string
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-') return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@/, '').trim();
  if (!handle) return null;
  switch (platform) {
    case 'instagram':
      return `https://instagram.com/${encodeURIComponent(handle)}`;
    case 'tiktok':
      return `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
    case 'youtube':
      return handle.includes(' ')
        ? `https://www.youtube.com/results?search_query=${encodeURIComponent(handle)}`
        : `https://www.youtube.com/@${encodeURIComponent(handle)}`;
    case 'facebook':
      return handle.includes(' ')
        ? `https://www.facebook.com/search/top?q=${encodeURIComponent(handle)}`
        : `https://www.facebook.com/${encodeURIComponent(handle)}`;
  }
}

/**
 * Format Rencana Tindak Lanjut entries whether stored as plain text or structured SwotRtlItem.
 */
export function formatRtlEntry(item: string | SwotRtlItem): string {
  if (typeof item === 'string') return item;
  const parts = [
    item.fokusProgram,
    item.langkahKonkret ? `— ${item.langkahKonkret}` : '',
    item.targetWaktu ? `(${item.targetWaktu})` : '',
    item.penanggungJawab ? `[PJ: ${item.penanggungJawab}]` : '',
  ].filter(Boolean);
  return parts.join(' ');
}

/**
 * Compress an uploaded image file using HTML canvas before storing in Firestore profileData (<1MB cap).
 */
export function compressImageFileToDataUrl(
  file: File,
  maxWidth = 900,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        reject(new Error('File gambar kosong.'));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak dikenali.'));
      img.onload = () => {
        const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
        const targetW = Math.max(1, Math.round(img.width * ratio));
        const targetH = Math.max(1, Math.round(img.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Derive clean auto-populated Company Profile PPT configuration from existing institution PpkmData.
 * Respects clean empty tenants (does not inject sample institution names or dummy strings).
 */
export function buildAutoCompanyProfilePptConfig(data: PpkmData): CompanyProfilePptConfig {
  const inst = data.institution;
  const principal = data.principal;
  const adminDocs = data.adminDocs;
  const ach = data.komponenAchievements;
  const namaRa = inst.namaLembaga?.trim() || 'Nama Raudhatul Athfal';

  const hasAddress = Boolean(inst.alamat || inst.kecamatan || inst.kotaKab);
  const locationSuffix = inst.kotaKab?.trim() || inst.kecamatan?.trim() || '';

  const defaultHighlights: string[] = [];
  if (inst.accreditationDetail?.peringkat || inst.akreditasi) {
    defaultHighlights.push(
      `Terakreditasi ${inst.accreditationDetail?.peringkat || inst.akreditasi}${
        inst.accreditationDetail?.nilaiAngka ? ` (Skor ${inst.accreditationDetail.nilaiAngka})` : ''
      }`
    );
  }
  if ((inst.featuredPrograms?.length || 0) > 0) {
    defaultHighlights.push(
      `Program Unggulan: ${inst.featuredPrograms!.slice(0, 2).map((p) => p.nama).join(' & ')}`
    );
  }
  if (data.ptkList.length > 0) {
    const s1Count = data.ptkList.filter(
      (p) =>
        p.pendidikanTerakhir.toLowerCase().includes('s-1') ||
        p.pendidikanTerakhir.toLowerCase().includes('s1') ||
        p.pendidikanTerakhir.toLowerCase().includes('s.1')
    ).length;
    defaultHighlights.push(
      `${data.ptkList.length} Pendidik & Tenaga Kependidikan (${s1Count} Kualifikasi Sarjana S-1)`
    );
  }
  if (data.buildings.length > 0 || data.inventory.length > 0) {
    defaultHighlights.push(
      `Lingkungan Belajar Aman dengan Fasilitas APE Indoor & Outdoor Terpelihara`
    );
  }
  if (defaultHighlights.length === 0) {
    defaultHighlights.push(
      "Pendidikan Anak Usia Dini Berbasis Nilai Al-Qur'an, Akhlakul Karimah & Kurikulum Merdeka PIAUD",
      'Lingkungan Belajar Ramah Anak, Aman, Nyaman & Kreatif',
      'Pembiasaan Ibadah Harian, Tahfidz Surat Pendek & Pengembangan Karakter',
      'Tata Kelola Lembaga Akuntabel & Kemitraan Aktif dengan Orang Tua'
    );
  }

  // Pull Kemitraan MoU & Kewirausahaan from Komponen C if available
  const partnershipHighlights =
    (ach?.komponenC?.poinPencapaian?.length || 0) > 0
      ? ach!.komponenC.poinPencapaian.slice(0, 4)
      : [
          'Kemitraan MoU layanan kesehatan anak & pemeriksaan tumbuh kembang berkala.',
          'Pembelajaran kewirausahaan cilik (Market Day) dan kreasi P5-RA.',
          'Sinergi aktif Paguyuban Orang Tua Murid (POMG) dan Komite Madrasah.',
        ];

  const galleryItems: CompanyProfilePptGalleryItem[] = (data.photoEvidences || [])
    .slice(0, 6)
    .map((p, idx) => ({
      id: p.id || `gal-${idx + 1}`,
      judul: p.judul || `Dokumentasi Kegiatan ${idx + 1}`,
      kategori: p.kategori || 'Dokumentasi Lembaga',
      keterangan: p.deskripsi || '',
      fotoUrl: p.fotoUrl || p.url || '',
    }));

  const defaultSambutan =
    inst.sambutanKepala?.trim() ||
    `Assalamu'alaikum Warahmatullahi Wabarakatuh. Selamat datang di profil resmi ${namaRa}. Kami berkomitmen menghadirkan layanan pendidikan anak usia dini yang islami, ceria, kreatif, serta menumbuhkan kecintaan terhadap Al-Qur'an, kemandirian, dan akhlakul karimah sejak dini.`;

  const principalBioParts = [
    principal.pendidikanTerakhir ? `Pendidikan ${principal.pendidikanTerakhir}` : '',
    principal.tmtJabatan ? `Menjabat sejak ${principal.tmtJabatan}` : '',
    principal.masaKerjaTahun
      ? `Pengalaman mengabdi ${principal.masaKerjaTahun} tahun${
          principal.masaKerjaBulan ? ` ${principal.masaKerjaBulan} bulan` : ''
        }`
      : '',
    principal.statusPegawai ? `Status: ${principal.statusPegawai}` : '',
  ].filter(Boolean);

  const closingMessage =
    ach?.kalimatPenutup?.trim() ||
    `Terima kasih atas kepercayaan orang tua, masyarakat, komite, serta Kementerian Agama${
      locationSuffix ? ` ${locationSuffix}` : ''
    } dalam mendukung tumbuh kembang generasi sholeh dan sholehah di ${namaRa}.`;

  const waNumber = inst.socialMedia?.whatsapp || inst.telepon || '';
  const contactSummary = [principal.namaLengkap, waNumber && waNumber !== '-' ? `WA: ${waNumber}` : '']
    .filter(Boolean)
    .join(' · ');

  const websiteNormalized = normalizeExternalUrl(inst.socialMedia?.website) || '';
  const defaultPortalUrl = websiteNormalized
    ? `${websiteNormalized.replace(/\/+$/, '')}/portal`
    : '';
  const defaultPpdbUrl = websiteNormalized
    ? `${websiteNormalized.replace(/\/+$/, '')}/ppdb`
    : '';

  return {
    coverSubtitle: `Profil Kelembagaan & Layanan Pendidikan Anak Usia Dini${
      adminDocs?.namaYayasan ? ` · ${adminDocs.namaYayasan}` : ''
    }`,
    coverTagline:
      inst.motto?.trim() || 'Cerdas, Islami, Mandiri & Berakhlakul Karimah',
    coverPhotoUrl: inst.fotoMadrasahUrl || '',
    sambutanTitle: `Sambutan ${principal.jabatan || 'Kepala RA'}`,
    sambutanQuote: defaultSambutan,
    principalBioHighlight:
      principalBioParts.join(' · ') || 'Pimpinan & Pengelola Layanan Pendidikan Anak Usia Dini',
    keyHighlights: defaultHighlights.slice(0, 4),
    partnershipHighlights,
    portalUrl: defaultPortalUrl,
    portalLabel: `Portal Layanan Digital & Info Santri ${namaRa}`,
    ppdbOnlineUrl: defaultPpdbUrl,
    websitePromoHeadline: `Kunjungi Website Resmi & Portal Digital ${namaRa}`,
    websitePromoDescription:
      'Akses informasi profil lembaga, kalender pendidikan, dokumentasi kegiatan santri, layanan portal siswa, dan pendaftaran PPDB secara langsung.',
    ppdbTitle: `Penerimaan Peserta Didik Baru (PPDB) ${inst.tahunPelajaran || ''}`.trim(),
    ppdbSchedule: `Pendaftaran dibuka setiap tahun ajaran baru (${
      inst.tahunPelajaran || '2026/2027'
    }) — Kelompok A (Usia 4–5 Tahun) & Kelompok B (Usia 5–6 Tahun)`,
    ppdbRequirements: [
      'Mengisi Formulir Pendaftaran Peserta Didik Baru (Offline / Online)',
      'Fotokopi Akta Kelahiran Anak & Kartu Keluarga (KK)',
      'Fotokopi KTP Orang Tua / Wali & Pas Foto Anak 3x4 (2 Lembar)',
      'Usia Minimal 4 Tahun (Kelompok A) dan 5 Tahun (Kelompok B)',
    ],
    ppdbContactPerson:
      contactSummary ||
      (hasAddress ? `Kantor Sekretariat ${namaRa}` : 'Sekretariat Pendaftaran RA'),
    closingTitle: `Mari Tumbuh & Berakhlak Mulia Bersama ${namaRa}`,
    closingMessage,
    closingPhotoUrl: inst.fotoBersamaUrl || ach?.fotoPenutupUrl || '',
    slideTitles: COMPANY_PPT_SLIDES.reduce<Record<number, string>>((acc, s) => {
      acc[s.index] = s.defaultTitle;
      return acc;
    }, {}),
    galleryItems,
    lastAutoSyncedAt: new Date().toISOString(),
  };
}

/**
 * Merge user's saved companyProfilePpt customizations onto fresh auto-derived defaults.
 */
export function mergeCompanyProfilePptConfig(data: PpkmData): CompanyProfilePptConfig {
  const auto = buildAutoCompanyProfilePptConfig(data);
  const saved = data.companyProfilePpt;
  if (!saved) return auto;

  return {
    ...auto,
    ...saved,
    keyHighlights:
      saved.keyHighlights && saved.keyHighlights.length > 0
        ? saved.keyHighlights
        : auto.keyHighlights,
    partnershipHighlights:
      saved.partnershipHighlights && saved.partnershipHighlights.length > 0
        ? saved.partnershipHighlights
        : auto.partnershipHighlights,
    ppdbRequirements:
      saved.ppdbRequirements && saved.ppdbRequirements.length > 0
        ? saved.ppdbRequirements
        : auto.ppdbRequirements,
    galleryItems:
      saved.galleryItems && saved.galleryItems.length > 0
        ? saved.galleryItems
        : auto.galleryItems,
    slideTitles: {
      ...(auto.slideTitles || {}),
      ...(saved.slideTitles || {}),
    },
  };
}

/**
 * Resolve any local asset path or data URL into a base64 data URI for pptxgenjs embedding.
 */
export async function imageUrlToDataUri(url?: string): Promise<string | null> {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }
  try {
    if (typeof fetch !== 'function') return null;
    const response = await fetch(trimmed);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (typeof FileReader !== 'undefined') {
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () =>
          resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
    const buf = new Uint8Array(await blob.arrayBuffer());
    const base64 =
      typeof Buffer !== 'undefined' ? Buffer.from(buf).toString('base64') : '';
    if (!base64) return null;
    const mime = blob.type || 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

function getSlideTitle(config: CompanyProfilePptConfig, index: number): string {
  return (
    config.slideTitles?.[index]?.trim() ||
    COMPANY_PPT_SLIDES[index]?.defaultTitle ||
    `Slide ${index + 1}`
  );
}

function addStandardSlideChrome(
  slide: PptxGenJS.Slide,
  slideNum: number,
  title: string,
  institutionName: string,
  yearLabel: string
) {
  slide.background = { color: PPT_THEME.ivory };

  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: 10,
    h: 0.72,
    fill: { color: PPT_THEME.emeraldDark },
    line: { color: PPT_THEME.emeraldDark, width: 0 },
  });

  slide.addShape('rect', {
    x: 0,
    y: 0.72,
    w: 10,
    h: 0.04,
    fill: { color: PPT_THEME.gold },
    line: { color: PPT_THEME.gold, width: 0 },
  });

  slide.addShape('rect', {
    x: 0.38,
    y: 0.16,
    w: 0.44,
    h: 0.4,
    fill: { color: PPT_THEME.gold },
    line: { color: PPT_THEME.gold, width: 0 },
  });
  slide.addText(String(slideNum).padStart(2, '0'), {
    x: 0.38,
    y: 0.16,
    w: 0.44,
    h: 0.4,
    fontFace: 'Plus Jakarta Sans',
    fontSize: 12,
    bold: true,
    color: PPT_THEME.emeraldDark,
    align: 'center',
    valign: 'middle',
  });

  slide.addText(title, {
    x: 0.94,
    y: 0.12,
    w: 6.3,
    h: 0.48,
    fontFace: 'Georgia',
    fontSize: 15.5,
    bold: true,
    color: PPT_THEME.white,
    valign: 'middle',
  });

  slide.addText(`${institutionName} · ${yearLabel}`, {
    x: 7.05,
    y: 0.18,
    w: 2.6,
    h: 0.36,
    fontFace: 'Plus Jakarta Sans',
    fontSize: 8.5,
    color: PPT_THEME.goldSoft,
    align: 'right',
    valign: 'middle',
  });

  slide.addShape('rect', {
    x: 0.38,
    y: 5.3,
    w: 9.24,
    h: 0.015,
    fill: { color: PPT_THEME.border },
    line: { color: PPT_THEME.border, width: 0 },
  });
  slide.addText(`Company Profile Resmi · ${institutionName}`, {
    x: 0.38,
    y: 5.34,
    w: 6.5,
    h: 0.22,
    fontFace: 'Plus Jakarta Sans',
    fontSize: 8,
    color: PPT_THEME.subtle,
  });
  slide.addText(`Slide ${slideNum} dari 12`, {
    x: 7.5,
    y: 5.34,
    w: 2.12,
    h: 0.22,
    fontFace: 'Plus Jakarta Sans',
    fontSize: 8,
    bold: true,
    color: PPT_THEME.emeraldDark,
    align: 'right',
  });
}

function addPlaceholderBox(
  slide: PptxGenJS.Slide,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string
) {
  slide.addShape('rect', {
    x,
    y,
    w,
    h,
    fill: { color: PPT_THEME.emeraldSoft },
    line: { color: PPT_THEME.emeraldBorder, width: 1, dashType: 'dash' },
  });
  slide.addText(label, {
    x: x + 0.1,
    y: y + 0.1,
    w: w - 0.2,
    h: h - 0.2,
    fontFace: 'Plus Jakarta Sans',
    fontSize: 9,
    color: PPT_THEME.emeraldMid,
    align: 'center',
    valign: 'middle',
  });
}

/**
 * Build the 12-slide PptxGenJS instance styled in Emerald Green & Gold Madrasah theme,
 * including Juknis PKKM SWOT/Tantangan/RTL, 5 Komponen A-E, MoU, and clickable hyperlinks.
 */
export async function buildCompanyProfilePptxInstance(
  data: PpkmData,
  config: CompanyProfilePptConfig
): Promise<{ pptx: PptxGenJS; fileName: string }> {
  const inst = data.institution;
  const principal = data.principal;
  const adminDocs = data.adminDocs;
  const ach = data.komponenAchievements;
  const namaRa = inst.namaLembaga?.trim() || 'RAUDHATUL ATHFAL';
  const yearLabel = inst.tahunPelajaran?.trim() || '2025/2026';

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9'; // 10 x 5.625 inches
  pptx.author = principal.namaLengkap || namaRa;
  pptx.company = namaRa;
  pptx.subject = `Company Profile ${namaRa}`;
  pptx.title = `Company Profile - ${namaRa}`;

  const websiteHref = normalizeExternalUrl(inst.socialMedia?.website);
  const portalHref = normalizeExternalUrl(config.portalUrl);
  const ppdbHref = normalizeExternalUrl(config.ppdbOnlineUrl);
  const waHref = normalizeWhatsappUrl(inst.socialMedia?.whatsapp || inst.telepon);
  const emailHref = normalizeEmailHref(inst.socialMedia?.email || inst.email);
  const igHref = normalizeSocialUrl('instagram', inst.socialMedia?.instagram);
  const ytHref = normalizeSocialUrl('youtube', inst.socialMedia?.youtube);
  const ttHref = normalizeSocialUrl('tiktok', inst.socialMedia?.tiktok);
  const fbHref = normalizeSocialUrl('facebook', inst.socialMedia?.facebook);

  const galleryList = (config.galleryItems || []).slice(0, 4);
  const [
    logoUri,
    coverPhotoUri,
    principalPhotoUri,
    closingPhotoUri,
    buildingPhotoUri,
    websiteShotUri,
    ...galleryUris
  ] = await Promise.all([
    imageUrlToDataUri(inst.logoKemenagUrl || inst.logoUrl),
    imageUrlToDataUri(config.coverPhotoUrl || inst.fotoMadrasahUrl),
    imageUrlToDataUri(principal.fotoUrl),
    imageUrlToDataUri(config.closingPhotoUrl || inst.fotoBersamaUrl),
    imageUrlToDataUri(
      data.buildings.find((b) => b.fotoUrl)?.fotoUrl ||
        data.inventory.find((i) => i.fotoUrl)?.fotoUrl
    ),
    imageUrlToDataUri(inst.websiteScreenshotUrl || inst.portalSiswaScreenshotUrl),
    ...galleryList.map((g) => imageUrlToDataUri(g.fotoUrl)),
  ]);

  // =========================================================================
  // SLIDE 1: SAMPUL RESMI LEMBAGA
  // =========================================================================
  {
    const slide = pptx.addSlide();
    slide.background = { color: PPT_THEME.emeraldDark };

    slide.addShape('rect', {
      x: 0,
      y: 0,
      w: 0.22,
      h: 5.625,
      fill: { color: PPT_THEME.gold },
      line: { color: PPT_THEME.gold, width: 0 },
    });

    slide.addShape('rect', {
      x: 5.85,
      y: 0.45,
      w: 3.75,
      h: 4.72,
      fill: { color: PPT_THEME.ivory },
      line: { color: PPT_THEME.gold, width: 2 },
    });

    if (coverPhotoUri) {
      slide.addImage({
        data: coverPhotoUri,
        x: 5.95,
        y: 0.55,
        w: 3.55,
        h: 3.85,
        sizing: { type: 'cover', w: 3.55, h: 3.85 },
      });
    } else {
      addPlaceholderBox(slide, 5.95, 0.55, 3.55, 3.85, 'Foto Gedung / Lingkungan RA');
    }

    slide.addText(
      `${inst.akreditasi || inst.accreditationDetail?.peringkat || 'Lembaga Pendidikan Anak Usia Dini'}\nNSM: ${
        inst.nsm || '-'
      } · NPSN: ${inst.npsn || inst.npsm || '-'}`,
      {
        x: 5.98,
        y: 4.46,
        w: 3.49,
        h: 0.62,
        fontFace: 'Plus Jakarta Sans',
        fontSize: 9,
        bold: true,
        color: PPT_THEME.emeraldDark,
        align: 'center',
        valign: 'middle',
      }
    );

    if (logoUri) {
      slide.addImage({
        data: logoUri,
        x: 0.55,
        y: 0.48,
        w: 0.72,
        h: 0.72,
        sizing: { type: 'contain', w: 0.72, h: 0.72 },
      });
    }

    slide.addText('PROFIL LEMBAGA PENDIDIKAN ANAK USIA DINI', {
      x: logoUri ? 1.4 : 0.55,
      y: 0.52,
      w: 4.2,
      h: 0.28,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 9,
      bold: true,
      color: PPT_THEME.gold,
      charSpacing: 1.5,
    });
    slide.addText(adminDocs?.namaYayasan || 'Kementerian Agama Republik Indonesia', {
      x: logoUri ? 1.4 : 0.55,
      y: 0.8,
      w: 4.2,
      h: 0.35,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 10,
      color: PPT_THEME.emeraldSoft,
    });

    slide.addText(namaRa.toUpperCase(), {
      x: 0.55,
      y: 1.45,
      w: 5.05,
      h: 1.1,
      fontFace: 'Georgia',
      fontSize: 27,
      bold: true,
      color: PPT_THEME.white,
      valign: 'top',
    });

    slide.addShape('rect', {
      x: 0.55,
      y: 2.6,
      w: 2.2,
      h: 0.05,
      fill: { color: PPT_THEME.gold },
      line: { color: PPT_THEME.gold, width: 0 },
    });

    slide.addText(`"${config.coverTagline}"`, {
      x: 0.55,
      y: 2.78,
      w: 5.0,
      h: 0.62,
      fontFace: 'Georgia',
      fontSize: 13.5,
      italic: true,
      color: PPT_THEME.goldSoft,
    });

    slide.addText(config.coverSubtitle, {
      x: 0.55,
      y: 3.45,
      w: 5.0,
      h: 0.52,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 10,
      color: PPT_THEME.emeraldSoft,
    });

    slide.addShape('rect', {
      x: 0.55,
      y: 4.18,
      w: 5.0,
      h: 0.98,
      fill: { color: PPT_THEME.emeraldMid },
      line: { color: PPT_THEME.gold, width: 0.75 },
    });
    slide.addText(
      `Tahun Pelajaran: ${yearLabel}\nAlamat: ${[inst.alamat, inst.kecamatan, inst.kotaKab]
        .filter(Boolean)
        .join(', ') || '-'}`,
      {
        x: 0.7,
        y: 4.22,
        w: 4.7,
        h: 0.52,
        fontFace: 'Plus Jakarta Sans',
        fontSize: 9,
        color: PPT_THEME.white,
        valign: 'top',
      }
    );
    if (websiteHref) {
      slide.addText(`Website Resmi: ${websiteHref}`, {
        x: 0.7,
        y: 4.76,
        w: 4.7,
        h: 0.3,
        fontFace: 'Plus Jakarta Sans',
        fontSize: 9.5,
        bold: true,
        underline: { style: 'sng' },
        color: PPT_THEME.goldSoft,
        hyperlink: { url: websiteHref, tooltip: `Buka Website ${namaRa}` },
      });
    }
  }

  // =========================================================================
  // SLIDE 2: SAMBUTAN & PROFIL KEPALA RA
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addStandardSlideChrome(slide, 2, getSlideTitle(config, 1), namaRa, yearLabel);

    slide.addShape('rect', {
      x: 0.38,
      y: 0.96,
      w: 3.1,
      h: 4.18,
      fill: { color: PPT_THEME.white },
      line: { color: PPT_THEME.emeraldBorder, width: 1 },
    });
    if (principalPhotoUri) {
      slide.addImage({
        data: principalPhotoUri,
        x: 0.53,
        y: 1.1,
        w: 2.8,
        h: 2.7,
        sizing: { type: 'cover', w: 2.8, h: 2.7 },
      });
    } else {
      addPlaceholderBox(slide, 0.53, 1.1, 2.8, 2.7, 'Foto Kepala RA');
    }

    slide.addText(principal.namaLengkap || 'Kepala RA', {
      x: 0.48,
      y: 3.9,
      w: 2.9,
      h: 0.38,
      fontFace: 'Georgia',
      fontSize: 12.5,
      bold: true,
      color: PPT_THEME.emeraldDark,
      align: 'center',
    });
    slide.addText(principal.jabatan || 'Kepala Raudhatul Athfal', {
      x: 0.48,
      y: 4.26,
      w: 2.9,
      h: 0.25,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 9.5,
      bold: true,
      color: PPT_THEME.goldAmber,
      align: 'center',
    });
    slide.addText(
      `TMT: ${principal.tmtJabatan || '-'} · NUPTK: ${principal.nuptk || '-'}\n${
        principal.pendidikanTerakhir || '-'
      }`,
      {
        x: 0.48,
        y: 4.54,
        w: 2.9,
        h: 0.5,
        fontFace: 'Plus Jakarta Sans',
        fontSize: 8.5,
        color: PPT_THEME.muted,
        align: 'center',
      }
    );

    slide.addShape('rect', {
      x: 3.7,
      y: 0.96,
      w: 5.92,
      h: 4.18,
      fill: { color: PPT_THEME.white },
      line: { color: PPT_THEME.border, width: 1 },
    });

    slide.addText(config.sambutanTitle.toUpperCase(), {
      x: 3.95,
      y: 1.15,
      w: 5.4,
      h: 0.3,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 9.5,
      bold: true,
      color: PPT_THEME.goldAmber,
      charSpacing: 1.2,
    });
    slide.addText(`"${config.sambutanQuote}"`, {
      x: 3.95,
      y: 1.52,
      w: 5.4,
      h: 2.45,
      fontFace: 'Georgia',
      fontSize: 11.5,
      italic: true,
      color: PPT_THEME.ink,
      valign: 'top',
    });

    slide.addShape('rect', {
      x: 3.95,
      y: 4.18,
      w: 5.42,
      h: 0.76,
      fill: { color: PPT_THEME.emeraldSoft },
      line: { color: PPT_THEME.emeraldBorder, width: 0.75 },
    });
    slide.addText(`Profil Singkat Pimpinan:\n${config.principalBioHighlight}`, {
      x: 4.1,
      y: 4.24,
      w: 5.12,
      h: 0.64,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 9,
      color: PPT_THEME.emeraldDark,
      valign: 'middle',
    });
  }

  // =========================================================================
  // SLIDE 3: IDENTITAS, LEGALITAS & AKREDITASI BAN-PDM
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addStandardSlideChrome(slide, 3, getSlideTitle(config, 2), namaRa, yearLabel);

    const acc = inst.accreditationDetail;
    const rows: PptxGenJS.TableRow[] = [
      [
        { text: 'Nama Lembaga', options: { bold: true, color: PPT_THEME.emeraldDark } },
        { text: namaRa },
      ],
      [
        { text: 'Status / Yayasan', options: { bold: true, color: PPT_THEME.emeraldDark } },
        { text: `${inst.status || 'Swasta'} · ${adminDocs?.namaYayasan || '-'}` },
      ],
      [
        { text: 'NSM / NPSN', options: { bold: true, color: PPT_THEME.emeraldDark } },
        { text: `${inst.nsm || '-'} / ${inst.npsn || inst.npsm || '-'}` },
      ],
      [
        { text: 'Izin Operasional', options: { bold: true, color: PPT_THEME.emeraldDark } },
        { text: adminDocs?.izinOperasionalNomor || '-' },
      ],
      [
        { text: 'Alamat Lengkap', options: { bold: true, color: PPT_THEME.emeraldDark } },
        {
          text:
            [inst.alamat, inst.desaKelurahan, inst.kecamatan, inst.kotaKab, inst.provinsi]
              .filter(Boolean)
              .join(', ') || '-',
        },
      ],
      [
        { text: 'Akreditasi BAN-PDM', options: { bold: true, color: PPT_THEME.emeraldDark } },
        {
          text: `${acc?.peringkat || inst.akreditasi || '-'} ${
            acc?.nilaiAngka ? `(Nilai ${acc.nilaiAngka})` : ''
          } · SK: ${acc?.nomorSk || '-'}`,
        },
      ],
      [
        { text: 'Website Resmi', options: { bold: true, color: PPT_THEME.emeraldDark } },
        websiteHref
          ? {
              text: websiteHref,
              options: {
                color: PPT_THEME.emeraldMid,
                bold: true,
                underline: { style: 'sng' },
                hyperlink: { url: websiteHref, tooltip: 'Kunjungi Website Lembaga' },
              },
            }
          : { text: inst.socialMedia?.website || '-' },
      ],
      [
        { text: 'Email & WhatsApp', options: { bold: true, color: PPT_THEME.emeraldDark } },
        { text: `${inst.email || '-'} · ${inst.socialMedia?.whatsapp || inst.telepon || '-'}` },
      ],
    ];

    slide.addTable(rows, {
      x: 0.38,
      y: 0.98,
      w: 5.55,
      colW: [1.85, 3.7],
      fontFace: 'Plus Jakarta Sans',
      fontSize: 9.2,
      color: PPT_THEME.ink,
      fill: { color: PPT_THEME.white },
      border: { type: 'solid', pt: 0.75, color: PPT_THEME.border },
      margin: [5, 8, 5, 8],
    });

    slide.addShape('rect', {
      x: 6.12,
      y: 0.98,
      w: 3.5,
      h: 4.14,
      fill: { color: PPT_THEME.emeraldDark },
      line: { color: PPT_THEME.gold, width: 1.2 },
    });
    slide.addText('4 KEUNGGULAN UTAMA LEMBAGA', {
      x: 6.3,
      y: 1.15,
      w: 3.14,
      h: 0.32,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 9.5,
      bold: true,
      color: PPT_THEME.gold,
      charSpacing: 1,
    });

    config.keyHighlights.slice(0, 4).forEach((hl, idx) => {
      const boxY = 1.62 + idx * 0.84;
      slide.addShape('rect', {
        x: 6.3,
        y: boxY,
        w: 3.14,
        h: 0.72,
        fill: { color: PPT_THEME.emeraldMid },
        line: { color: PPT_THEME.emeraldBorder, width: 0.5 },
      });
      slide.addText(`${idx + 1}. ${hl}`, {
        x: 6.42,
        y: boxY + 0.04,
        w: 2.9,
        h: 0.64,
        fontFace: 'Plus Jakarta Sans',
        fontSize: 9,
        color: PPT_THEME.white,
        valign: 'middle',
      });
    });
  }

  // =========================================================================
  // SLIDE 4: VISI, MISI & TUJUAN PENDIDIKAN RA
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addStandardSlideChrome(slide, 4, getSlideTitle(config, 3), namaRa, yearLabel);

    const visiText = inst.visi || data.programGoals.visi || 'Visi lembaga belum diisi.';
    const misiList =
      (inst.misi && inst.misi.length > 0 ? inst.misi : data.programGoals.misi) || [];
    const tujuanList = data.programGoals.tujuan || [];

    slide.addShape('rect', {
      x: 0.38,
      y: 0.96,
      w: 9.24,
      h: 1.15,
      fill: { color: PPT_THEME.emeraldDark },
      line: { color: PPT_THEME.gold, width: 1.2 },
    });
    slide.addText('VISI LEMBAGA', {
      x: 0.6,
      y: 1.06,
      w: 8.8,
      h: 0.25,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 9,
      bold: true,
      color: PPT_THEME.gold,
      charSpacing: 1.5,
    });
    slide.addText(`"${visiText}"`, {
      x: 0.6,
      y: 1.32,
      w: 8.8,
      h: 0.72,
      fontFace: 'Georgia',
      fontSize: 13.5,
      italic: true,
      bold: true,
      color: PPT_THEME.white,
      valign: 'middle',
    });

    slide.addShape('rect', {
      x: 0.38,
      y: 2.28,
      w: 4.5,
      h: 2.86,
      fill: { color: PPT_THEME.white },
      line: { color: PPT_THEME.border, width: 1 },
    });
    slide.addText('MISI PENDIDIKAN', {
      x: 0.58,
      y: 2.4,
      w: 4.1,
      h: 0.3,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 10,
      bold: true,
      color: PPT_THEME.emeraldDark,
    });
    const misiFormatted =
      misiList.length > 0
        ? misiList.slice(0, 5).map((m, idx) => `${idx + 1}. ${m}`).join('\n\n')
        : 'Belum ada data misi yang diinput.';
    slide.addText(misiFormatted, {
      x: 0.58,
      y: 2.75,
      w: 4.1,
      h: 2.25,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 9,
      color: PPT_THEME.ink,
      valign: 'top',
    });

    slide.addShape('rect', {
      x: 5.12,
      y: 2.28,
      w: 4.5,
      h: 2.86,
      fill: { color: PPT_THEME.white },
      line: { color: PPT_THEME.border, width: 1 },
    });
    slide.addText('TUJUAN STRATEGIS', {
      x: 5.32,
      y: 2.4,
      w: 4.1,
      h: 0.3,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 10,
      bold: true,
      color: PPT_THEME.goldAmber,
    });
    const tujuanFormatted =
      tujuanList.length > 0
        ? tujuanList.slice(0, 5).map((t, idx) => `${idx + 1}. ${t}`).join('\n\n')
        : 'Membentuk peserta didik usia dini yang berakhlak mulia, cerdas, dan mandiri.';
    slide.addText(tujuanFormatted, {
      x: 5.32,
      y: 2.75,
      w: 4.1,
      h: 2.25,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 9,
      color: PPT_THEME.ink,
      valign: 'top',
    });
  }

  // =========================================================================
  // SLIDE 5: STRUKTUR ORGANISASI & PROFIL PENDIDIK (PTK)
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addStandardSlideChrome(slide, 5, getSlideTitle(config, 4), namaRa, yearLabel);

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

    const kpis = [
      { label: 'TOTAL PENDIDIK & TENDIK', val: `${totalPtk} Orang` },
      { label: 'KUALIFIKASI SARJANA (S-1)', val: `${s1Count} Orang` },
      { label: 'PENDIDIK BERSERTIFIKASI', val: `${certCount} Orang` },
    ];
    kpis.forEach((k, idx) => {
      const kx = 0.38 + idx * 3.12;
      slide.addShape('rect', {
        x: kx,
        y: 0.94,
        w: 2.98,
        h: 0.72,
        fill: { color: idx === 0 ? PPT_THEME.emeraldDark : PPT_THEME.white },
        line: { color: PPT_THEME.emeraldBorder, width: 1 },
      });
      slide.addText(k.label, {
        x: kx + 0.12,
        y: 1.0,
        w: 2.74,
        h: 0.22,
        fontFace: 'Plus Jakarta Sans',
        fontSize: 7.5,
        bold: true,
        color: idx === 0 ? PPT_THEME.gold : PPT_THEME.muted,
      });
      slide.addText(k.val, {
        x: kx + 0.12,
        y: 1.24,
        w: 2.74,
        h: 0.35,
        fontFace: 'Georgia',
        fontSize: 15,
        bold: true,
        color: idx === 0 ? PPT_THEME.white : PPT_THEME.emeraldDark,
      });
    });

    const ptkHeader: PptxGenJS.TableRow = [
      { text: 'No', options: { bold: true, fill: { color: PPT_THEME.emeraldDark }, color: PPT_THEME.white, align: 'center' } },
      { text: 'Nama Pendidik / Tendik', options: { bold: true, fill: { color: PPT_THEME.emeraldDark }, color: PPT_THEME.white } },
      { text: 'Jabatan / Tugas', options: { bold: true, fill: { color: PPT_THEME.emeraldDark }, color: PPT_THEME.white } },
      { text: 'Pendidikan', options: { bold: true, fill: { color: PPT_THEME.emeraldDark }, color: PPT_THEME.white } },
      { text: 'Status', options: { bold: true, fill: { color: PPT_THEME.emeraldDark }, color: PPT_THEME.white } },
    ];
    const ptkRows: PptxGenJS.TableRow[] =
      data.ptkList.length > 0
        ? data.ptkList.slice(0, 7).map((p, idx) => [
            { text: String(idx + 1), options: { align: 'center' } },
            { text: p.nama, options: { bold: true } },
            { text: p.tugas },
            { text: p.pendidikanTerakhir },
            { text: p.statusSertifikasi },
          ])
        : [[{ text: '-', options: { align: 'center' } }, { text: 'Belum ada data PTK' }, { text: '-' }, { text: '-' }, { text: '-' }]];

    slide.addTable([ptkHeader, ...ptkRows], {
      x: 0.38,
      y: 1.82,
      w: 6.1,
      colW: [0.42, 1.75, 1.88, 0.95, 1.1],
      fontFace: 'Plus Jakarta Sans',
      fontSize: 8.5,
      color: PPT_THEME.ink,
      fill: { color: PPT_THEME.white },
      border: { type: 'solid', pt: 0.6, color: PPT_THEME.border },
      margin: [4, 6, 4, 6],
    });

    slide.addShape('rect', {
      x: 6.65,
      y: 1.82,
      w: 2.97,
      h: 3.3,
      fill: { color: PPT_THEME.white },
      line: { color: PPT_THEME.border, width: 1 },
    });
    slide.addText('BAGAN JABATAN INTI', {
      x: 6.8,
      y: 1.94,
      w: 2.67,
      h: 0.28,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 9,
      bold: true,
      color: PPT_THEME.emeraldDark,
    });
    const stText =
      (data.structuralPositions || []).length > 0
        ? data.structuralPositions
            .slice(0, 6)
            .map((s) => `• ${s.jabatan}\n  ${s.nama}`)
            .join('\n\n')
        : 'Belum ada bagan struktur yang diisi.';
    slide.addText(stText, {
      x: 6.8,
      y: 2.28,
      w: 2.67,
      h: 2.74,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 8.2,
      color: PPT_THEME.ink,
      valign: 'top',
    });
  }

  // =========================================================================
  // SLIDE 6: DATA PESERTA DIDIK, TREN ROMBEL & ALUMNI
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addStandardSlideChrome(slide, 6, getSlideTitle(config, 5), namaRa, yearLabel);

    const totalL = data.students.reduce((s, r) => s + (r.lakiLaki || 0), 0);
    const totalP = data.students.reduce((s, r) => s + (r.perempuan || 0), 0);
    const totalStudents = totalL + totalP;
    const totalRombel = data.students.length;

    const kpis = [
      { label: 'TOTAL PESERTA DIDIK', val: `${totalStudents} Anak` },
      { label: 'JUMLAH ROMBONGAN BELAJAR', val: `${totalRombel} Rombel` },
      { label: 'KOMPOSISI L / P', val: `${totalL} L · ${totalP} P` },
      { label: 'KELULUSAN MELANJUTKAN', val: '100% ke MI/SD' },
    ];
    kpis.forEach((k, idx) => {
      const kx = 0.38 + idx * 2.34;
      slide.addShape('rect', {
        x: kx,
        y: 0.94,
        w: 2.22,
        h: 0.74,
        fill: { color: idx === 0 ? PPT_THEME.emeraldDark : PPT_THEME.white },
        line: { color: PPT_THEME.emeraldBorder, width: 1 },
      });
      slide.addText(k.label, {
        x: kx + 0.1,
        y: 1.0,
        w: 2.02,
        h: 0.22,
        fontFace: 'Plus Jakarta Sans',
        fontSize: 7.2,
        bold: true,
        color: idx === 0 ? PPT_THEME.gold : PPT_THEME.muted,
      });
      slide.addText(k.val, {
        x: kx + 0.1,
        y: 1.24,
        w: 2.02,
        h: 0.35,
        fontFace: 'Georgia',
        fontSize: 13.5,
        bold: true,
        color: idx === 0 ? PPT_THEME.white : PPT_THEME.emeraldDark,
      });
    });

    slide.addText('Rincian Santri per Kelompok Usia', {
      x: 0.38,
      y: 1.84,
      w: 4.5,
      h: 0.28,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 10,
      bold: true,
      color: PPT_THEME.emeraldDark,
    });
    const classHeader: PptxGenJS.TableRow = [
      { text: 'Kelompok / Kelas', options: { bold: true, fill: { color: PPT_THEME.emeraldDark }, color: PPT_THEME.white } },
      { text: 'L', options: { bold: true, fill: { color: PPT_THEME.emeraldDark }, color: PPT_THEME.white, align: 'center' } },
      { text: 'P', options: { bold: true, fill: { color: PPT_THEME.emeraldDark }, color: PPT_THEME.white, align: 'center' } },
      { text: 'Total', options: { bold: true, fill: { color: PPT_THEME.emeraldDark }, color: PPT_THEME.white, align: 'center' } },
    ];
    const classRows: PptxGenJS.TableRow[] =
      data.students.length > 0
        ? data.students.map((st) => [
            { text: st.kelas },
            { text: String(st.lakiLaki), options: { align: 'center' } },
            { text: String(st.perempuan), options: { align: 'center' } },
            { text: String(st.lakiLaki + st.perempuan), options: { bold: true, align: 'center' } },
          ])
        : [[{ text: 'Belum ada data rombel' }, { text: '0' }, { text: '0' }, { text: '0' }]];

    slide.addTable([classHeader, ...classRows], {
      x: 0.38,
      y: 2.16,
      w: 4.5,
      colW: [2.4, 0.65, 0.65, 0.8],
      fontFace: 'Plus Jakarta Sans',
      fontSize: 9,
      color: PPT_THEME.ink,
      fill: { color: PPT_THEME.white },
      border: { type: 'solid', pt: 0.75, color: PPT_THEME.border },
      margin: [5, 6, 5, 6],
    });

    slide.addText('Tren Perkembangan Santri & Alumni', {
      x: 5.12,
      y: 1.84,
      w: 4.5,
      h: 0.28,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 10,
      bold: true,
      color: PPT_THEME.goldAmber,
    });
    const trendHeader: PptxGenJS.TableRow = [
      { text: 'Tahun Pelajaran', options: { bold: true, fill: { color: PPT_THEME.emeraldMid }, color: PPT_THEME.white } },
      { text: 'Rombel', options: { bold: true, fill: { color: PPT_THEME.emeraldMid }, color: PPT_THEME.white, align: 'center' } },
      { text: 'Santri', options: { bold: true, fill: { color: PPT_THEME.emeraldMid }, color: PPT_THEME.white, align: 'center' } },
      { text: 'Lulus', options: { bold: true, fill: { color: PPT_THEME.emeraldMid }, color: PPT_THEME.white, align: 'center' } },
    ];
    const trendRows: PptxGenJS.TableRow[] =
      data.studentTrends.length > 0
        ? data.studentTrends.slice(-5).map((t) => {
            const grad = data.graduates.find((g) => g.tahun === t.tahun);
            const gradCount = grad ? grad.melanjutkan : '-';
            return [
              { text: t.tahun },
              { text: String(t.rombel), options: { align: 'center' } },
              { text: String(t.lakiLaki + t.perempuan), options: { bold: true, align: 'center' } },
              { text: String(gradCount), options: { align: 'center' } },
            ];
          })
        : [[{ text: '-' }, { text: '0' }, { text: '0' }, { text: '0' }]];

    slide.addTable([trendHeader, ...trendRows], {
      x: 5.12,
      y: 2.16,
      w: 4.5,
      colW: [1.8, 0.85, 0.95, 0.9],
      fontFace: 'Plus Jakarta Sans',
      fontSize: 9,
      color: PPT_THEME.ink,
      fill: { color: PPT_THEME.white },
      border: { type: 'solid', pt: 0.75, color: PPT_THEME.border },
      margin: [5, 6, 5, 6],
    });
  }

  // =========================================================================
  // SLIDE 7: SARANA PRASARANA & FASILITAS APE INDOOR/OUTDOOR
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addStandardSlideChrome(slide, 7, getSlideTitle(config, 6), namaRa, yearLabel);

    slide.addShape('rect', {
      x: 0.38,
      y: 0.94,
      w: 9.24,
      h: 0.48,
      fill: { color: PPT_THEME.emeraldSoft },
      line: { color: PPT_THEME.emeraldBorder, width: 0.75 },
    });
    slide.addText(
      `Luas Tanah: ${inst.luasTanah || '-'}   ·   Status Kepemilikan: ${inst.statusTanah || '-'}`,
      {
        x: 0.55,
        y: 1.0,
        w: 8.9,
        h: 0.36,
        fontFace: 'Plus Jakarta Sans',
        fontSize: 9.5,
        bold: true,
        color: PPT_THEME.emeraldDark,
        valign: 'middle',
      }
    );

    const bHeader: PptxGenJS.TableRow = [
      { text: 'Ruang / Fasilitas Bangunan', options: { bold: true, fill: { color: PPT_THEME.emeraldDark }, color: PPT_THEME.white } },
      { text: 'Jml', options: { bold: true, fill: { color: PPT_THEME.emeraldDark }, color: PPT_THEME.white, align: 'center' } },
      { text: 'Baik', options: { bold: true, fill: { color: PPT_THEME.emeraldDark }, color: PPT_THEME.white, align: 'center' } },
    ];
    const bRows: PptxGenJS.TableRow[] =
      data.buildings.length > 0
        ? data.buildings.slice(0, 5).map((b) => [
            { text: b.jenisBangunan },
            { text: String(b.jumlahLokal), options: { align: 'center' } },
            { text: String(b.baik), options: { align: 'center' } },
          ])
        : [[{ text: 'Belum ada data bangunan' }, { text: '0' }, { text: '0' }]];

    slide.addTable([bHeader, ...bRows], {
      x: 0.38,
      y: 1.54,
      w: 5.75,
      colW: [4.35, 0.7, 0.7],
      fontFace: 'Plus Jakarta Sans',
      fontSize: 8.5,
      color: PPT_THEME.ink,
      fill: { color: PPT_THEME.white },
      border: { type: 'solid', pt: 0.6, color: PPT_THEME.border },
      margin: [3, 6, 3, 6],
    });

    const apeHeader: PptxGenJS.TableRow = [
      { text: 'Inventaris APE & Media Belajar', options: { bold: true, fill: { color: PPT_THEME.emeraldMid }, color: PPT_THEME.white } },
      { text: 'Kategori', options: { bold: true, fill: { color: PPT_THEME.emeraldMid }, color: PPT_THEME.white } },
      { text: 'Unit', options: { bold: true, fill: { color: PPT_THEME.emeraldMid }, color: PPT_THEME.white, align: 'center' } },
    ];
    const apeRows: PptxGenJS.TableRow[] =
      data.inventory.length > 0
        ? data.inventory.slice(0, 5).map((item) => [
            { text: item.namaBarang },
            { text: item.kategori || 'Umum' },
            { text: String(item.jumlah), options: { align: 'center' } },
          ])
        : [[{ text: 'Belum ada inventaris APE' }, { text: '-' }, { text: '0' }]];

    slide.addTable([apeHeader, ...apeRows], {
      x: 0.38,
      y: 3.45,
      w: 5.75,
      colW: [3.65, 1.4, 0.7],
      fontFace: 'Plus Jakarta Sans',
      fontSize: 8.5,
      color: PPT_THEME.ink,
      fill: { color: PPT_THEME.white },
      border: { type: 'solid', pt: 0.6, color: PPT_THEME.border },
      margin: [3, 6, 3, 6],
    });

    slide.addShape('rect', {
      x: 6.32,
      y: 1.54,
      w: 3.3,
      h: 3.6,
      fill: { color: PPT_THEME.white },
      line: { color: PPT_THEME.border, width: 1 },
    });
    if (buildingPhotoUri) {
      slide.addImage({
        data: buildingPhotoUri,
        x: 6.44,
        y: 1.66,
        w: 3.06,
        h: 2.7,
        sizing: { type: 'cover', w: 3.06, h: 2.7 },
      });
    } else {
      addPlaceholderBox(slide, 6.44, 1.66, 3.06, 2.7, 'Foto Sarpras & APE');
    }
    slide.addText(
      'Fasilitas ruang belajar & area bermain APE ramah anak yang aman, bersih, dan higienis.',
      {
        x: 6.44,
        y: 4.44,
        w: 3.06,
        h: 0.6,
        fontFace: 'Plus Jakarta Sans',
        fontSize: 8.5,
        color: PPT_THEME.muted,
        align: 'center',
        valign: 'middle',
      }
    );
  }

  // =========================================================================
  // SLIDE 8: PROGRAM UNGGULAN, KEMITRAAN MoU & INOVASI KEWIRAUSAHAAN RA
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addStandardSlideChrome(slide, 8, getSlideTitle(config, 7), namaRa, yearLabel);

    const programs = inst.featuredPrograms || [];
    for (let idx = 0; idx < 4; idx++) {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cx = 0.38 + col * 4.72;
      const cy = 0.94 + row * 1.32;
      const prog = programs[idx];

      slide.addShape('rect', {
        x: cx,
        y: cy,
        w: 4.52,
        h: 1.2,
        fill: { color: PPT_THEME.white },
        line: { color: PPT_THEME.emeraldBorder, width: 1 },
      });
      slide.addText(`${idx + 1}. ${prog ? prog.nama : `Program Unggulan ${idx + 1}`}`, {
        x: cx + 0.14,
        y: cy + 0.1,
        w: 4.24,
        h: 0.34,
        fontFace: 'Georgia',
        fontSize: 10.5,
        bold: true,
        color: PPT_THEME.emeraldDark,
      });
      slide.addText(
        prog
          ? `${prog.kategori ? `[${prog.kategori}] ` : ''}${prog.deskripsi}`
          : 'Tambahkan program unggulan lembaga pada panel Edit Cepat.',
        {
          x: cx + 0.14,
          y: cy + 0.45,
          w: 4.24,
          h: 0.68,
          fontFace: 'Plus Jakarta Sans',
          fontSize: 8.5,
          color: PPT_THEME.muted,
          valign: 'top',
        }
      );
    }

    // Bottom Strip: Kemitraan MoU & Inovasi Kewirausahaan RA + Pembiasaan
    slide.addShape('rect', {
      x: 0.38,
      y: 3.64,
      w: 9.24,
      h: 1.5,
      fill: { color: PPT_THEME.emeraldDark },
      line: { color: PPT_THEME.gold, width: 1 },
    });
    slide.addText('KEMITRAAN MoU, INOVASI KEWIRAUSAHAAN & PEMBIASAAN RUTIN RA', {
      x: 0.56,
      y: 3.74,
      w: 8.88,
      h: 0.25,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 8.5,
      bold: true,
      color: PPT_THEME.gold,
      charSpacing: 0.8,
    });

    const mouItems = (config.partnershipHighlights || []).slice(0, 3);
    const habitLines = [
      ...data.activityReports.harian.slice(0, 1).map((h) => `Harian: ${h.namaKegiatan}`),
      ...data.activityReports.mingguan.slice(0, 1).map((m) => `Mingguan: ${m.namaKegiatan}`),
    ];
    const combinedBottom = [...mouItems, ...habitLines];

    slide.addText(
      combinedBottom.length > 0
        ? combinedBottom.map((l) => `• ${l}`).join('\n')
        : '• Kemitraan Puskesmas/Komunitas, Market Day cilik, dan pembiasaan sholat Dhuha serta tahfidz.',
      {
        x: 0.56,
        y: 4.02,
        w: 8.88,
        h: 1.04,
        fontFace: 'Plus Jakarta Sans',
        fontSize: 8.5,
        color: PPT_THEME.white,
        valign: 'top',
      }
    );
  }

  // =========================================================================
  // SLIDE 9: CAPAIAN 5 KOMPONEN PKKM (A–E) SESUAI JUKNIS DIRJEN PENDIS 1111/2019
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addStandardSlideChrome(slide, 9, getSlideTitle(config, 8), namaRa, yearLabel);

    slide.addText(
      'Rangkuman Kinerja Lima Komponen Utama Penilaian Kinerja Kepala RA (Juknis Dirjen Pendis Nomor 1111 Tahun 2019)',
      {
        x: 0.38,
        y: 0.88,
        w: 9.24,
        h: 0.28,
        fontFace: 'Plus Jakarta Sans',
        fontSize: 9,
        italic: true,
        color: PPT_THEME.muted,
      }
    );

    const compList = [
      {
        kode: 'KOMPONEN A',
        detail: ach?.komponenA,
        fallbackTitle: 'Usaha Pengembangan RA',
        fallbackPoints: [
          'Legalitas Izin Operasional & Akreditasi BAN-PDM',
          'Struktur organisasi, SOP layanan & EMIS/Simpatika aktif',
        ],
      },
      {
        kode: 'KOMPONEN B',
        detail: ach?.komponenB,
        fallbackTitle: 'Pelaksanaan Tugas Manajerial',
        fallbackPoints: [
          'RKJM/RKT, Kurikulum Merdeka PIAUD & Kaldik',
          'Manajemen kesiswaan, sarana APE & keuangan BOP transparan',
        ],
      },
      {
        kode: 'KOMPONEN C',
        detail: ach?.komponenC,
        fallbackTitle: 'Pengembangan Kewirausahaan',
        fallbackPoints: [
          'Program Tahfidz, P5-RA & Market Day wirausaha cilik',
          'Kemitraan MoU kesehatan & dukungan komite/yayasan',
        ],
      },
      {
        kode: 'KOMPONEN D',
        detail: ach?.komponenD,
        fallbackTitle: 'Supervisi Guru & Tendik',
        fallbackPoints: [
          'Program supervisi akademik klinis semester ganjil/genap',
          'Observasi KBM, umpan balik & diklat peningkatan kompetensi guru',
        ],
      },
      {
        kode: 'KOMPONEN E',
        detail: ach?.komponenE,
        fallbackTitle: 'Hasil Kinerja & Prestasi RA',
        fallbackPoints: [
          'Mutu kelembagaan terakreditasi & kepuasan wali santri',
          'Raihan prestasi santri, guru & tingkat kelulusan 100%',
        ],
      },
    ];

    compList.forEach((comp, idx) => {
      // Top row: 3 cards (0,1,2), Bottom row: 2 wider cards (3,4)
      const isTop = idx < 3;
      const cx = isTop ? 0.38 + idx * 3.12 : 0.38 + (idx - 3) * 4.7;
      const cy = isTop ? 1.24 : 3.26;
      const cw = isTop ? 2.98 : 4.54;
      const ch = 1.88;

      slide.addShape('rect', {
        x: cx,
        y: cy,
        w: cw,
        h: ch,
        fill: { color: PPT_THEME.white },
        line: { color: PPT_THEME.emeraldBorder, width: 1 },
      });

      slide.addShape('rect', {
        x: cx,
        y: cy,
        w: cw,
        h: 0.32,
        fill: { color: idx === 4 ? PPT_THEME.goldAmber : PPT_THEME.emeraldDark },
        line: { color: PPT_THEME.emeraldDark, width: 0 },
      });

      slide.addText(
        `${comp.kode}: ${comp.detail?.namaKomponen || comp.fallbackTitle}`,
        {
          x: cx + 0.1,
          y: cy + 0.03,
          w: cw - 0.2,
          h: 0.26,
          fontFace: 'Plus Jakarta Sans',
          fontSize: 8.5,
          bold: true,
          color: PPT_THEME.white,
          valign: 'middle',
        }
      );

      const pts =
        comp.detail?.poinPencapaian && comp.detail.poinPencapaian.length > 0
          ? comp.detail.poinPencapaian.slice(0, 3)
          : comp.fallbackPoints;

      slide.addText(pts.map((p) => `• ${p}`).join('\n'), {
        x: cx + 0.12,
        y: cy + 0.38,
        w: cw - 0.24,
        h: ch - 0.46,
        fontFace: 'Plus Jakarta Sans',
        fontSize: isTop ? 8 : 8.4,
        color: PPT_THEME.ink,
        valign: 'top',
      });
    });
  }

  // =========================================================================
  // SLIDE 10: TANTANGAN, ANALISIS SWOT & PROGRAM KE DEPAN (RTL)
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addStandardSlideChrome(slide, 10, getSlideTitle(config, 9), namaRa, yearLabel);

    const swot = ach?.swotRtl;
    const strengths =
      swot?.kekuatan && swot.kekuatan.length > 0
        ? swot.kekuatan
        : ['Pendidik berdedikasi dan berkualifikasi S-1', 'Dukungan aktif Yayasan, Komite & Orang Tua'];
    const challenges =
      swot?.kelemahanKendala && swot.kelemahanKendala.length > 0
        ? swot.kelemahanKendala
        : ['Optimalisasi fasilitas APE & peneduh halaman bermain', 'Penguatan literasi digital orang tua'];
    const opportunities =
      swot?.peluang && swot.peluang.length > 0
        ? swot.peluang
        : ['Pemanfaatan dana BOP & kemitraan lintas instansi', 'Ekspansi layanan portal & PPDB online'];
    const rtlItems =
      swot?.rencanaTindakLanjut && swot.rencanaTindakLanjut.length > 0
        ? swot.rencanaTindakLanjut.map(formatRtlEntry)
        : ['Peningkatan sarana APE tematik & digitalisasi layanan informasi lembaga.'];

    // Left Column (2 stacked cards: Strengths + Opportunities)
    slide.addShape('rect', {
      x: 0.38,
      y: 0.94,
      w: 4.5,
      h: 2.02,
      fill: { color: PPT_THEME.white },
      line: { color: PPT_THEME.emeraldBorder, width: 1 },
    });
    slide.addText('01. KEKUATAN LEMBAGA (STRENGTHS)', {
      x: 0.54,
      y: 1.04,
      w: 4.18,
      h: 0.26,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 9,
      bold: true,
      color: PPT_THEME.emeraldDark,
    });
    slide.addText(strengths.slice(0, 4).map((s) => `• ${s}`).join('\n'), {
      x: 0.54,
      y: 1.34,
      w: 4.18,
      h: 1.54,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 8.5,
      color: PPT_THEME.ink,
      valign: 'top',
    });

    slide.addShape('rect', {
      x: 0.38,
      y: 3.1,
      w: 4.5,
      h: 2.04,
      fill: { color: PPT_THEME.white },
      line: { color: PPT_THEME.border, width: 1 },
    });
    slide.addText('02. PELUANG PENGEMBANGAN (OPPORTUNITIES)', {
      x: 0.54,
      y: 3.2,
      w: 4.18,
      h: 0.26,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 9,
      bold: true,
      color: PPT_THEME.emeraldMid,
    });
    slide.addText(opportunities.slice(0, 4).map((o) => `• ${o}`).join('\n'), {
      x: 0.54,
      y: 3.5,
      w: 4.18,
      h: 1.56,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 8.5,
      color: PPT_THEME.ink,
      valign: 'top',
    });

    // Right Column (2 stacked cards: Challenges/Kendala + Future Programs/RTL)
    slide.addShape('rect', {
      x: 5.1,
      y: 0.94,
      w: 4.52,
      h: 2.02,
      fill: { color: PPT_THEME.roseSoft },
      line: { color: 'FECDD3', width: 1 },
    });
    slide.addText('03. TANTANGAN & KENDALA NYATA SAAT INI', {
      x: 5.26,
      y: 1.04,
      w: 4.2,
      h: 0.26,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 9,
      bold: true,
      color: PPT_THEME.roseText,
    });
    slide.addText(challenges.slice(0, 4).map((c) => `• ${c}`).join('\n'), {
      x: 5.26,
      y: 1.34,
      w: 4.2,
      h: 1.54,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 8.5,
      color: PPT_THEME.ink,
      valign: 'top',
    });

    slide.addShape('rect', {
      x: 5.1,
      y: 3.1,
      w: 4.52,
      h: 2.04,
      fill: { color: PPT_THEME.emeraldDark },
      line: { color: PPT_THEME.gold, width: 1.2 },
    });
    slide.addText('04. PROGRAM LEMBAGA KE DEPAN (RTL JUKNIS)', {
      x: 5.26,
      y: 3.2,
      w: 4.2,
      h: 0.26,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 9,
      bold: true,
      color: PPT_THEME.gold,
    });
    slide.addText(rtlItems.slice(0, 4).map((r, i) => `${i + 1}. ${r}`).join('\n'), {
      x: 5.26,
      y: 3.5,
      w: 4.2,
      h: 1.56,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 8.5,
      color: PPT_THEME.white,
      valign: 'top',
    });
  }

  // =========================================================================
  // SLIDE 11: PRESTASI LEMBAGA, SANTRI & GALERI DOKUMENTASI
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addStandardSlideChrome(slide, 11, getSlideTitle(config, 10), namaRa, yearLabel);

    slide.addShape('rect', {
      x: 0.38,
      y: 0.96,
      w: 3.65,
      h: 4.18,
      fill: { color: PPT_THEME.white },
      line: { color: PPT_THEME.border, width: 1 },
    });
    slide.addText('PRESTASI & PENGHARGAAN', {
      x: 0.54,
      y: 1.1,
      w: 3.33,
      h: 0.28,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 9.5,
      bold: true,
      color: PPT_THEME.emeraldDark,
    });

    const prestasiEntries =
      (ach?.prestasiList || []).length > 0
        ? ach!.prestasiList!.map(
            (pr) => `★ ${pr.namaPrestasi} (${pr.tingkat} · ${pr.tahun}) — ${pr.peraih}`
          )
        : ach?.komponenE?.poinPencapaian || [
            'Belum ada daftar prestasi yang ditambahkan.',
          ];

    slide.addText(prestasiEntries.slice(0, 6).join('\n\n'), {
      x: 0.54,
      y: 1.46,
      w: 3.33,
      h: 3.52,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 8.8,
      color: PPT_THEME.ink,
      valign: 'top',
    });

    for (let idx = 0; idx < 4; idx++) {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const gx = 4.22 + col * 2.75;
      const gy = 0.96 + row * 2.14;
      const item = galleryList[idx];
      const imgData = galleryUris[idx];

      slide.addShape('rect', {
        x: gx,
        y: gy,
        w: 2.65,
        h: 2.04,
        fill: { color: PPT_THEME.white },
        line: { color: PPT_THEME.emeraldBorder, width: 0.9 },
      });

      if (imgData) {
        slide.addImage({
          data: imgData,
          x: gx + 0.08,
          y: gy + 0.08,
          w: 2.49,
          h: 1.44,
          sizing: { type: 'cover', w: 2.49, h: 1.44 },
        });
      } else {
        addPlaceholderBox(slide, gx + 0.08, gy + 0.08, 2.49, 1.44, `Foto Galeri ${idx + 1}`);
      }

      slide.addText(item?.judul || `Dokumentasi ${idx + 1}`, {
        x: gx + 0.08,
        y: gy + 1.56,
        w: 2.49,
        h: 0.42,
        fontFace: 'Plus Jakarta Sans',
        fontSize: 8,
        bold: true,
        color: PPT_THEME.emeraldDark,
        align: 'center',
        valign: 'middle',
      });
    }
  }

  // =========================================================================
  // SLIDE 12: PROMOSI WEBSITE, PORTAL LEMBAGA (LINK AKTIF), PPDB & PENUTUP
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addStandardSlideChrome(slide, 12, getSlideTitle(config, 11), namaRa, yearLabel);

    // Top Left: Digital Promotion Card with Direct Clickable Links
    slide.addShape('rect', {
      x: 0.38,
      y: 0.94,
      w: 5.35,
      h: 2.38,
      fill: { color: PPT_THEME.emeraldDark },
      line: { color: PPT_THEME.gold, width: 1.2 },
    });
    slide.addText(
      (config.websitePromoHeadline || `WEBSITE RESMI & PORTAL DIGITAL ${namaRa}`).toUpperCase(),
      {
        x: 0.56,
        y: 1.04,
        w: 5.0,
        h: 0.28,
        fontFace: 'Plus Jakarta Sans',
        fontSize: 9.5,
        bold: true,
        color: PPT_THEME.gold,
      }
    );
    slide.addText(
      config.websitePromoDescription ||
        'Klik tautan aktif di bawah ini untuk langsung mengunjungi website resmi dan portal layanan digital kami:',
      {
        x: 0.56,
        y: 1.32,
        w: 5.0,
        h: 0.42,
        fontFace: 'Plus Jakarta Sans',
        fontSize: 8.2,
        color: PPT_THEME.emeraldSoft,
      }
    );

    const promoLinks: { label: string; display: string; url: string | null }[] = [
      {
        label: 'Website Resmi',
        display: inst.socialMedia?.website || 'Belum diisi',
        url: websiteHref,
      },
      {
        label: config.portalLabel || 'Portal Digital / Siswa',
        display: config.portalUrl || 'Belum diisi',
        url: portalHref,
      },
      {
        label: 'Pendaftaran PPDB Online',
        display: config.ppdbOnlineUrl || config.ppdbContactPerson,
        url: ppdbHref || waHref,
      },
    ];

    promoLinks.forEach((lk, idx) => {
      const ly = 1.82 + idx * 0.46;
      slide.addShape('rect', {
        x: 0.56,
        y: ly,
        w: 5.0,
        h: 0.39,
        fill: { color: PPT_THEME.emeraldMid },
        line: { color: PPT_THEME.gold, width: 0.6 },
      });
      slide.addText(`${lk.label}: `, {
        x: 0.68,
        y: ly + 0.04,
        w: 1.75,
        h: 0.31,
        fontFace: 'Plus Jakarta Sans',
        fontSize: 8.3,
        bold: true,
        color: PPT_THEME.goldSoft,
        valign: 'middle',
      });
      slide.addText(lk.display, {
        x: 2.42,
        y: ly + 0.04,
        w: 3.04,
        h: 0.31,
        fontFace: 'Plus Jakarta Sans',
        fontSize: 8.5,
        bold: true,
        underline: lk.url ? { style: 'sng' } : undefined,
        color: PPT_THEME.white,
        valign: 'middle',
        hyperlink: lk.url ? { url: lk.url, tooltip: `Buka ${lk.label}` } : undefined,
      });
    });

    // Bottom Left: PPDB Info + Clickable Social/Contact Links
    slide.addShape('rect', {
      x: 0.38,
      y: 3.44,
      w: 5.35,
      h: 1.72,
      fill: { color: PPT_THEME.white },
      line: { color: PPT_THEME.border, width: 1 },
    });
    slide.addText(config.ppdbTitle, {
      x: 0.54,
      y: 3.53,
      w: 5.02,
      h: 0.25,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 9,
      bold: true,
      color: PPT_THEME.emeraldDark,
    });
    slide.addText(
      `${config.ppdbSchedule}\nSyarat: ${config.ppdbRequirements.slice(0, 3).join(' · ')}`,
      {
        x: 0.54,
        y: 3.78,
        w: 5.02,
        h: 0.54,
        fontFace: 'Plus Jakarta Sans',
        fontSize: 8,
        color: PPT_THEME.muted,
        valign: 'top',
      }
    );

    // Clickable Social & Contact Text Runs
    const channelRuns: PptxGenJS.TextProps[] = [];
    const pushRun = (label: string, val: string | undefined, url: string | null) => {
      if (!val || val === '-') return;
      if (channelRuns.length > 0) {
        channelRuns.push({ text: '   ·   ', options: { color: PPT_THEME.subtle } });
      }
      channelRuns.push({
        text: `${label}: ${val}`,
        options: {
          color: url ? PPT_THEME.emeraldMid : PPT_THEME.ink,
          bold: Boolean(url),
          underline: url ? { style: 'sng' } : undefined,
          hyperlink: url ? { url, tooltip: `Buka ${label}` } : undefined,
        },
      });
    };
    pushRun('WA', inst.socialMedia?.whatsapp || inst.telepon, waHref);
    pushRun('Email', inst.socialMedia?.email || inst.email, emailHref);
    pushRun('IG', inst.socialMedia?.instagram, igHref);
    pushRun('YouTube', inst.socialMedia?.youtube, ytHref);
    pushRun('TikTok', inst.socialMedia?.tiktok, ttHref);
    pushRun('FB', inst.socialMedia?.facebook, fbHref);

    slide.addText(
      channelRuns.length > 0
        ? channelRuns
        : [{ text: `Narahubung: ${config.ppdbContactPerson}`, options: { color: PPT_THEME.ink } }],
      {
        x: 0.54,
        y: 4.38,
        w: 5.02,
        h: 0.7,
        fontFace: 'Plus Jakarta Sans',
        fontSize: 8.2,
        valign: 'top',
      }
    );

    // Right Column: Website/Portal Preview + Closing Team Photo + Closing Quote
    slide.addShape('rect', {
      x: 5.9,
      y: 0.94,
      w: 3.72,
      h: 4.22,
      fill: { color: PPT_THEME.white },
      line: { color: PPT_THEME.emeraldBorder, width: 1 },
    });
    const rightHeroImg = closingPhotoUri || websiteShotUri;
    if (rightHeroImg) {
      slide.addImage({
        data: rightHeroImg,
        x: 6.02,
        y: 1.06,
        w: 3.48,
        h: 2.25,
        sizing: { type: 'cover', w: 3.48, h: 2.25 },
      });
    } else {
      addPlaceholderBox(slide, 6.02, 1.06, 3.48, 2.25, 'Foto Kebersamaan / Website RA');
    }

    slide.addText(config.closingTitle, {
      x: 6.02,
      y: 3.4,
      w: 3.48,
      h: 0.44,
      fontFace: 'Georgia',
      fontSize: 10.5,
      bold: true,
      color: PPT_THEME.emeraldDark,
      align: 'center',
    });
    slide.addText(config.closingMessage, {
      x: 6.02,
      y: 3.86,
      w: 3.48,
      h: 1.2,
      fontFace: 'Plus Jakarta Sans',
      fontSize: 8.2,
      color: PPT_THEME.muted,
      align: 'center',
      valign: 'top',
    });
  }

  const cleanSlug =
    namaRa.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'RA';
  const fileName = `Company_Profile_${cleanSlug}.pptx`;
  return { pptx, fileName };
}

/**
 * Generate and download the native 12-slide PowerPoint (.pptx) file in browser.
 */
export async function exportCompanyProfileToPptx(
  data: PpkmData,
  config: CompanyProfilePptConfig
): Promise<string> {
  const { pptx, fileName } = await buildCompanyProfilePptxInstance(data, config);
  await pptx.writeFile({ fileName });
  return fileName;
}

/**
 * Generate the .pptx file as a Uint8Array (for automated verification / testing).
 */
export async function exportCompanyProfileToPptxBuffer(
  data: PpkmData,
  config: CompanyProfilePptConfig
): Promise<Uint8Array> {
  const { pptx } = await buildCompanyProfilePptxInstance(data, config);
  const out = await pptx.write({ outputType: 'uint8array' });
  return out instanceof Uint8Array ? out : new Uint8Array(out as ArrayBuffer);
}
