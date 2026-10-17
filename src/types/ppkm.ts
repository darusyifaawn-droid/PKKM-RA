export interface InstitutionProfile {
  namaLembaga: string;
  status: string; // 'Negeri' | 'Swasta'
  nsm: string;
  npsm: string;
  akreditasi: string;
  alamat: string;
  kecamatan: string;
  kotaKab: string;
  provinsi: string;
  telepon: string;
  email: string;
  tahunPelajaran: string;
  periodePenilaian: string;
  luasTanah: string;
  statusTanah: string;
  logoUrl: string;
  fotoMadrasahUrl: string;
}

export interface PrincipalProfile {
  namaLengkap: string;
  gelar: string;
  nip: string;
  pangkatGol: string;
  nuptk: string;
  npk: string;
  tempatTanggalLahir: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  pendidikanTerakhir: string;
  statusPegawai: string;
  jabatan: string;
  tmtJabatan: string;
  fotoUrl: string;
}

export interface EvaluatorProfile {
  pengawas1Nama: string;
  pengawas1Nip: string;
  pengawas1Jabatan: string;
  pengawas2Nama: string;
  pengawas2Nip: string;
  komiteNama: string;
  kasiPenmadNama: string;
  kasiPenmadNip: string;
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
  jumlahLokal: number;
  baik: number;
  rusakRingan: number;
  rusakBerat: number;
}

export interface FacilityInventory {
  id: string;
  namaBarang: string;
  baik: number;
  rusakRingan: number;
  rusakBerat: number;
  jumlah: number;
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
  kategori: 'Fasilitas Madrasah' | 'Program Unggulan' | 'Ekstrakurikuler' | 'Prestasi Madrasah' | 'Supervisi & Manajerial' | 'Lainnya';
  judul: string;
  deskripsi: string;
  tanggal?: string;
  fotoUrl: string;
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

export interface PpkmData {
  institution: InstitutionProfile;
  principal: PrincipalProfile;
  evaluators: EvaluatorProfile;
  ptkList: PtkItem[];
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
}

export type PrintCategory = 
  | 'all'
  | 'cover'
  | 'profile'
  | 'ptk'
  | 'students_sarpras'
  | 'programs'
  | 'activities'
  | 'photos'
  | 'assessment';
