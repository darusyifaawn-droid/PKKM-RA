export interface SocialMediaInfo {
  instagram: string;
  youtube: string;
  facebook: string;
  tiktok: string;
  website: string;
  whatsapp: string;
  email: string;
}

export interface AccreditationDetail {
  peringkat: string; // 'A (Unggul)' | 'B (Baik)' | 'C (Cukup)' | 'Terakreditasi B'
  nilaiAngka: string | number; // e.g. '86'
  nomorSk: string; // e.g. '051/BAN-SM/SK/2024'
  lembagaAkreditasi: string; // 'BAN-PDM / BAN-S/M'
  tahunAkreditasi: string; // '2024'
  masaBerlaku: string; // '2024 s/d 2029'
  sertifikatUrl: string; // Scan file / photo URL
}

export interface FeaturedProgram {
  id: string;
  nama: string;
  deskripsi: string;
  kategori?: string;
  iconName?: string;
}

export interface InstitutionProfile {
  namaLembaga: string;
  nama?: string;
  status: string; // 'Negeri' | 'Swasta'
  nsm: string;
  npsm: string;
  npsn?: string;
  akreditasi: string;
  alamat: string;
  desaKelurahan?: string;
  kecamatan: string;
  kotaKab: string;
  provinsi: string;
  kodePos?: string;
  tahunBerdiri?: string;
  telepon: string;
  telpFax?: string;
  email: string;
  tahunPelajaran: string;
  periodePenilaian: string;
  luasTanah: string;
  statusTanah: string;
  logoUrl: string;
  logoKemenagUrl?: string;
  fotoMadrasahUrl: string;
  fotoBersamaUrl?: string;
  fotoSupervisiUrl?: string;
  fotoTropiUrl?: string;
  visi?: string;
  misi?: string[];
  motto?: string;
  sambutanKepala?: string;
  socialMedia?: SocialMediaInfo;
  accreditationDetail?: AccreditationDetail;
  featuredPrograms?: FeaturedProgram[];
  websiteScreenshotUrl?: string;
  portalSiswaScreenshotUrl?: string;
  kaldikUrl?: string;
  kaldikTahun?: string;
  emisSimpatikaScreenshotUrl?: string;
}

export interface PrincipalProfile {
  namaLengkap: string;
  gelar: string;
  nip: string;
  noSeriKarpeg?: string;
  pangkatGol: string;
  pangkatGolongan?: string;
  nuptk: string;
  npk: string;
  nrg?: string;
  tempatTanggalLahir: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  pendidikanTerakhir: string;
  programKeahlian?: string;
  statusPegawai: string;
  jabatan: string;
  tmtJabatan: string;
  masaKerjaTahun?: string;
  masaKerjaBulan?: string;
  unitKerja?: string;
  fotoUrl: string;
}

export interface EvaluatorProfile {
  pengawas1Nama: string;
  pengawas1Nip: string;
  pengawas1PangkatGol?: string;
  pengawas1Jabatan: string;
  pengawas1UnitKerja?: string;
  pengawas2Nama: string;
  pengawas2Nip: string;
  pengawas2PangkatGol?: string;
  pengawas2Jabatan?: string;
  pengawas2UnitKerja?: string;
  komiteNama: string;
  kasiPenmadNama: string;
  kasiPenmadNip: string;
  skPenugasanNomor?: string;
  skPenugasanTanggal?: string;
  skPenugasanBerlakuSampai?: string;
  tanggalPenilaian: string;
  tempatPenilaian: string;
}

export interface PtkItem {
  id: string;
  nama: string;
  nip: string;
  statusPegawai: 'PNS' | 'PPPK' | 'NON PNS';
  tugas: string;
  pendidikanTerakhir: string;
  statusSertifikasi: string; // 'SERTIFIKASI' | 'BELUM SERTIFIKASI' | '-'
}

export interface StudentClassData {
  kelas: string;
  lakiLaki: number;
  perempuan: number;
}

export interface StudentTrendData {
  tahun: string;
  lakiLaki: number;
  perempuan: number;
  rombel: number;
}

export interface GraduateData {
  tahun: string;
  lakiLaki: number;
  perempuan: number;
  melanjutkan: number;
}

export interface ParentDemographics {
  pekerjaan: {
    pns: number;
    tniPolri: number;
    taniBuruh: number;
    dagangWiraswasta: number;
    lainnya: number;
  };
  pendidikan: {
    s1Plus: number;
    d1D4: number;
    sma: number;
    smpSd: number;
  };
  penghasilan: {
    kurang1Juta: number;
    satuSd3Juta: number;
    lebih3Juta: number;
  };
}

export interface BuildingCondition {
  id: string;
  jenisBangunan: string;
  jenisRuang?: string;
  jumlahLokal: number;
  baik: number;
  rusakRingan: number;
  rusakBerat: number;
  fotoUrl?: string;
  keterangan?: string;
}

export interface FacilityInventory {
  id: string;
  namaBarang: string;
  baik: number;
  rusakRingan: number;
  rusakBerat: number;
  jumlah: number;
  fotoUrl?: string;
  kategori?: 'APE Indoor' | 'APE Outdoor' | 'Kelas' | 'IT / Media' | 'Umum';
}

export interface ProgramGoal {
  visi: string;
  misi: string[];
  tujuan: string[];
  indikator: {
    kategori: string;
    uraian: string[];
  }[];
  tujuanProgramKerja: string[];
  landasanHukum: string[];
  ruangLingkup: string[];
}

export interface ProgramActivityItem {
  id: string;
  namaKegiatan: string;
  realisasi: number; // percentage 0 - 100
  kendala: string;
  keterangan: 'Rutin' | 'Unggulan' | 'Berkala';
}

export interface ActivityReports {
  harian: ProgramActivityItem[];
  mingguan: ProgramActivityItem[];
  bulanan: ProgramActivityItem[];
  semesteran: ProgramActivityItem[];
  tahunan: ProgramActivityItem[];
}

export interface PhotoEvidenceItem {
  id: string;
  kategori: 'Fasilitas Madrasah' | 'Program Unggulan' | 'Ekstrakurikuler' | 'Prestasi Madrasah' | 'Supervisi & Manajerial' | 'Lainnya' | string;
  judul: string;
  deskripsi: string;
  tanggal?: string;
  fotoUrl: string;
  url?: string;
  komponenKey?: string;
}

export interface AssessmentIndicator {
  id: string;
  komponen: 'UPM' | 'PTM' | 'PKW' | 'SPV' | 'HKM';
  komponenLabel: string;
  nomor: string;
  indikatorKinerja: string;
  buktiFisik: string;
  skor: number; // 1 - 4
  catatanPenilai: string;
}

export interface StructuralPosition {
  id: string;
  jabatan: string;
  nama: string;
  tingkat: 'Pimpinan' | 'Manajemen' | 'Seksi' | 'Guru' | 'Staf/Layanan';
  keterangan?: string;
  urutan?: number;
}

export interface KomponenDetail {
  kode: string;
  namaKomponen: string;
  judulSlide: string;
  deskripsi: string;
  poinPencapaian: string[];
  fotoUrl?: string;
  fotoKeterangan?: string;
  subBukti?: { label: string; keterangan: string }[];
}

export interface SwotRtlItem {
  fokusProgram: string;
  langkahKonkret: string;
  targetWaktu: string;
  penanggungJawab: string;
}

export interface SwotRtlDetail {
  kekuatan: string[];
  kelemahanKendala: string[];
  kelemahan?: string[];
  peluang: string[];
  ancaman?: string[];
  rencanaTindakLanjut: (string | SwotRtlItem)[];
  fotoUrl?: string;
}

export interface KomponenAchievements {
  komponenA: KomponenDetail; // Usaha Pengembangan RA / Madrasah
  komponenB: KomponenDetail; // Pelaksanaan Tugas Manajerial & Kurikulum / Kaldik
  komponenC: KomponenDetail; // Kewirausahaan & Inovasi (Tahfidz, P5-RA, MoU)
  komponenD: KomponenDetail; // Supervisi Guru & Tendik
  komponenE: KomponenDetail; // Hasil Kinerja & Prestasi
  swotRtl: SwotRtlDetail;
  prestasiList?: { namaPrestasi: string; tingkat: string; tahun: string; peraih: string }[];
  closingStatement?: string;
  fotoPenutupUrl?: string;
  kalimatPenutup?: string;
}

export interface AdminDocumentsInfo {
  namaYayasan: string;
  izinOperasionalNomor: string;
  suratPernyataanNomor: string;
  suratPernyataanTanggal: string;
  suratTugasNomor: string;
  suratTugasTanggal: string;
  suratTugasPemberi: string;
  skPanitiaNomor: string;
  skPanitiaTanggal: string;
  beritaAcaraNomor: string;
  beritaAcaraHari: string;
  beritaAcaraTanggal: string;
  beritaAcaraWaktu: string;
  beritaAcaraTempat: string;
  beritaAcaraCatatan: string;
}

export interface CompanyProfilePptGalleryItem {
  id: string;
  judul: string;
  kategori: string;
  keterangan?: string;
  fotoUrl: string;
}

export interface CompanyProfilePptConfig {
  coverSubtitle: string;
  coverTagline: string;
  coverPhotoUrl: string;
  sambutanTitle: string;
  sambutanQuote: string;
  principalBioHighlight: string;
  keyHighlights: string[];
  partnershipHighlights?: string[];
  portalUrl?: string;
  portalLabel?: string;
  ppdbOnlineUrl?: string;
  websitePromoHeadline?: string;
  websitePromoDescription?: string;
  ppdbTitle: string;
  ppdbSchedule: string;
  ppdbRequirements: string[];
  ppdbContactPerson: string;
  closingTitle: string;
  closingMessage: string;
  closingPhotoUrl: string;
  slideTitles?: Record<number, string>;
  galleryItems?: CompanyProfilePptGalleryItem[];
  lastAutoSyncedAt?: string;
}

export interface PpkmData {
  institution: InstitutionProfile;
  principal: PrincipalProfile;
  evaluators: EvaluatorProfile;
  ptkList: PtkItem[];
  structuralPositions: StructuralPosition[];
  students: StudentClassData[];
  studentTrends: StudentTrendData[];
  graduates: GraduateData[];
  parentDemographics: ParentDemographics;
  buildings: BuildingCondition[];
  inventory: FacilityInventory[];
  programGoals: ProgramGoal;
  activityReports: ActivityReports;
  photoEvidences: PhotoEvidenceItem[];
  assessmentScores: AssessmentIndicator[];
  manualScoreOverride?: number; // Optional manual override for Nilai Kinerja (NK)
  komponenAchievements?: KomponenAchievements;
  adminDocs?: AdminDocumentsInfo;
  companyProfilePpt?: CompanyProfilePptConfig;
}

export type PkkmData = PpkmData;

export type PrintCategory = 
  | 'all'
  | 'cover'
  | 'profile'
  | 'accreditation'
  | 'kaldik'
  | 'digital'
  | 'ptk'
  | 'students_sarpras'
  | 'programs'
  | 'activities'
  | 'photos'
  | 'assessment';
