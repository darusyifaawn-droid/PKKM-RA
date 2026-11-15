import { AdminDocumentsInfo, PpkmData } from '../types/ppkm';

export const EMPTY_ADMIN_DOCS: AdminDocumentsInfo = {
  namaYayasan: '',
  izinOperasionalNomor: '',
  suratPernyataanNomor: '',
  suratPernyataanTanggal: '',
  suratTugasNomor: '',
  suratTugasTanggal: '',
  suratTugasPemberi: '',
  skPanitiaNomor: '',
  skPanitiaTanggal: '',
  beritaAcaraNomor: '',
  beritaAcaraHari: '',
  beritaAcaraTanggal: '',
  beritaAcaraWaktu: '',
  beritaAcaraTempat: '',
  beritaAcaraCatatan: '',
};

/**
 * Clean factory for new RA tenants (non-Darusyifa).
 * Never injects sample names, fake SK numbers, fake dates, fake scores, or dummy photos.
 */
export function createCleanPpkmData(payload: {
  name: string;
  nsm: string;
  npsn: string;
  kepalaNama: string;
  alamat?: string;
  kecamatan?: string;
  kotaKab?: string;
  provinsi?: string;
  email?: string;
  tahunPelajaran?: string;
  periodePenilaian?: string;
}): PpkmData {
  const cleanName = payload.name.trim().toUpperCase();
  return {
    institution: {
      namaLembaga: cleanName,
      status: 'Swasta',
      nsm: payload.nsm.trim(),
      npsm: payload.npsn.trim(),
      npsn: payload.npsn.trim(),
      akreditasi: '',
      alamat: payload.alamat?.trim() || '',
      desaKelurahan: '',
      kecamatan: payload.kecamatan?.trim() || '',
      kotaKab: payload.kotaKab?.trim() || '',
      provinsi: payload.provinsi?.trim() || '',
      kodePos: '',
      tahunBerdiri: '',
      telepon: '',
      telpFax: '',
      email: payload.email?.trim() || '',
      tahunPelajaran: payload.tahunPelajaran || '2026/2027',
      periodePenilaian: payload.periodePenilaian || '01 Januari 2026 s/d 31 Desember 2026',
      luasTanah: '',
      statusTanah: '',
      logoUrl: '',
      logoKemenagUrl: '/src/assets/images/kemenag_logo_seal_1792239796040.jpg',
      fotoMadrasahUrl: '',
      fotoBersamaUrl: '',
      fotoSupervisiUrl: '',
      fotoTropiUrl: '',
      visi: '',
      misi: [],
      motto: '',
      sambutanKepala: '',
      socialMedia: {
        instagram: '',
        youtube: '',
        facebook: '',
        tiktok: '',
        website: '',
        whatsapp: '',
        email: payload.email?.trim() || '',
      },
      accreditationDetail: {
        peringkat: '',
        nilaiAngka: '',
        nomorSk: '',
        lembagaAkreditasi: '',
        tahunAkreditasi: '',
        masaBerlaku: '',
        sertifikatUrl: '',
      },
      featuredPrograms: [],
    },
    principal: {
      namaLengkap: payload.kepalaNama.trim(),
      gelar: '',
      nip: '',
      noSeriKarpeg: '',
      pangkatGol: '',
      nuptk: '',
      npk: '',
      nrg: '',
      tempatTanggalLahir: '',
      jenisKelamin: 'Perempuan',
      pendidikanTerakhir: '',
      programKeahlian: 'Guru Kelas RA',
      statusPegawai: '',
      jabatan: 'Kepala RA',
      tmtJabatan: '',
      masaKerjaTahun: '',
      masaKerjaBulan: '',
      unitKerja: '',
      fotoUrl: '',
    },
    evaluators: {
      pengawas1Nama: '',
      pengawas1Nip: '',
      pengawas1PangkatGol: '',
      pengawas1Jabatan: '',
      pengawas1UnitKerja: '',
      pengawas2Nama: '',
      pengawas2Nip: '',
      pengawas2PangkatGol: '',
      pengawas2Jabatan: '',
      pengawas2UnitKerja: '',
      komiteNama: '',
      kasiPenmadNama: '',
      kasiPenmadNip: '',
      skPenugasanNomor: '',
      skPenugasanTanggal: '',
      skPenugasanBerlakuSampai: '31 Desember 2026',
      tanggalPenilaian: '',
      tempatPenilaian: '',
    },
    ptkList: [],
    structuralPositions: [],
    students: [],
    studentTrends: [],
    graduates: [],
    parentDemographics: {
      pekerjaan: { pns: 0, tniPolri: 0, taniBuruh: 0, dagangWiraswasta: 0, lainnya: 0 },
      pendidikan: { s1Plus: 0, d1D4: 0, sma: 0, smpSd: 0 },
      penghasilan: { kurang1Juta: 0, satuSd3Juta: 0, lebih3Juta: 0 },
    },
    buildings: [],
    inventory: [],
    programGoals: {
      visi: '',
      misi: [],
      tujuan: [],
      indikator: [],
      tujuanProgramKerja: [],
      landasanHukum: [],
      ruangLingkup: [],
    },
    activityReports: {
      harian: [],
      mingguan: [],
      bulanan: [],
      semesteran: [],
      tahunan: [],
    },
    photoEvidences: [],
    assessmentScores: [],
    adminDocs: { ...EMPTY_ADMIN_DOCS },
  };
}
