import React, { useState } from 'react';
import { PpkmData, PrintCategory, PhotoEvidenceItem } from '../../types/ppkm';
import { 
  Printer, 
  ArrowLeft,
  Eye,
  CheckCircle2,
  FileCheck2
} from 'lucide-react';

interface PrintViewProps {
  data: PpkmData;
  onBackToEdit: () => void;
}

export const PrintView: React.FC<PrintViewProps> = ({ data, onBackToEdit }) => {
  const [selectedCategory, setSelectedCategory] = useState<PrintCategory>('all');
  const [photoLayout, setPhotoLayout] = useState<'2_per_page' | '4_per_page'>('2_per_page');

  const handlePrint = () => {
    window.print();
  };

  const {
    institution,
    principal,
    evaluators,
    ptkList,
    students,
    studentTrends,
    graduates,
    parentDemographics,
    buildings,
    inventory,
    programGoals,
    activityReports,
    photoEvidences,
    assessmentScores,
  } = data;

  // Student calculations
  const totalL = students.reduce((acc, curr) => acc + (Number(curr.lakiLaki) || 0), 0);
  const totalP = students.reduce((acc, curr) => acc + (Number(curr.perempuan) || 0), 0);
  const totalStudents = totalL + totalP;

  // Score calculations
  const totalScore = assessmentScores.reduce((acc, curr) => acc + (curr.skor || 0), 0);
  const avgScore = assessmentScores.length > 0 ? totalScore / assessmentScores.length : 0;
  const finalScore100 = (avgScore / 4) * 100;

  let predicate = 'Baik';
  if (finalScore100 >= 91) predicate = 'Amat Baik (A)';
  else if (finalScore100 >= 76) predicate = 'Baik (B)';
  else if (finalScore100 >= 61) predicate = 'Cukup (C)';
  else if (finalScore100 >= 51) predicate = 'Sedang (D)';
  else predicate = 'Kurang (E)';

  // Helper to chunk photo items for exact pagination
  const chunkSize = photoLayout === '2_per_page' ? 2 : 4;
  const photoChunks: PhotoEvidenceItem[][] = [];
  for (let i = 0; i < photoEvidences.length; i += chunkSize) {
    photoChunks.push(photoEvidences.slice(i, i + chunkSize));
  }

  return (
    <div className="min-h-screen bg-slate-200/60 py-6 sm:py-8 font-sans">
      
      {/* ============================================================== */}
      {/* FLOATING ACTION TOOLBAR (Hidden in Print)                      */}
      {/* ============================================================== */}
      <div className="no-print sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-slate-300 shadow-sm py-3 px-4 sm:px-6 mb-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToEdit}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Editor</span>
            </button>

            <div className="h-4 w-px bg-slate-300" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                Pilih Kategori Cetak:
              </span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as PrintCategory)}
                className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 max-w-xs cursor-pointer"
              >
                <option value="all">📦 Semua Dokumen (Bundel Lengkap Siap Jilid A4)</option>
                <option value="cover">1. Sampul / Cover Dokumen Resmi</option>
                <option value="profile">2. Lembar Pengesahan & Profil Lembaga/Kepala</option>
                <option value="ptk">3. Struktur Organisasi & Profil 17 PTK Guru</option>
                <option value="students_sarpras">4. Data Siswa, Kelulusan & Sarpras</option>
                <option value="programs">5. Program Kerja 4 Tahunan & Visi Misi</option>
                <option value="activities">6. Laporan Program Kerja & Kendala</option>
                <option value="photos">7. Album Foto Bukti Fisik Kegiatan</option>
                <option value="assessment">8. Lembar Instrumen & Rekapitulasi Skor</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            {/* Photo layout switch if photos included */}
            {(selectedCategory === 'all' || selectedCategory === 'photos') && (
              <div className="flex items-center gap-1 text-xs border border-slate-300 rounded-md p-0.5 bg-slate-50">
                <button
                  onClick={() => setPhotoLayout('2_per_page')}
                  className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold transition-colors cursor-pointer ${
                    photoLayout === '2_per_page' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  2 Foto / Lembar
                </button>
                <button
                  onClick={() => setPhotoLayout('4_per_page')}
                  className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold transition-colors cursor-pointer ${
                    photoLayout === '4_per_page' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  4 Foto / Lembar
                </button>
              </div>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Cetak PDF (A4)</span>
            </button>
          </div>

        </div>
      </div>

      {/* PRINT PAPER CONTAINER */}
      <div className="print-page-wrapper max-w-[210mm] mx-auto text-black">
        
        {/* ============================================================== */}
        {/* 1. COVER / SAMPUL RESMI PPKM                                   */}
        {/* ============================================================== */}
        {(selectedCategory === 'all' || selectedCategory === 'cover') && (
          <div className="cover-sheet a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] flex flex-col justify-between text-center relative">
            <div className="border-4 border-double border-emerald-950/70 p-5 h-full flex flex-col justify-between text-center">
              
              {/* Kop & Logo Instansi */}
              <div className="space-y-1">
                <p className="text-[10px] sm:text-xs font-bold tracking-widest text-slate-800 uppercase">
                  KEMENTERIAN AGAMA REPUBLIK INDONESIA
                </p>
                <p className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-700 uppercase">
                  KANTOR KEMENTERIAN AGAMA {institution.kotaKab.toUpperCase()}
                </p>
                
                {/* Logo Kemenag / Lembaga Terintegrasi */}
                <div className="py-2.5 flex justify-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center p-1 bg-white">
                    <img
                      src={institution.logoUrl}
                      alt="Logo Lembaga"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>

                <div className="space-y-0.5 pt-1">
                  <h1 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-emerald-950">
                    LAPORAN PENILAIAN KINERJA KEPALA MADRASAH (PPKM)
                  </h1>
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {institution.periodePenilaian}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-600">
                    TAHUN PELAJARAN {institution.tahunPelajaran}
                  </p>
                </div>
              </div>

              {/* Foto Bersanding Rapih (Gedung & Foto Kepala) */}
              <div className="my-2 flex items-center justify-center gap-3">
                <div className="w-40 h-24 rounded-sm border border-slate-300 overflow-hidden bg-slate-50 shadow-xs">
                  <img
                    src={institution.fotoMadrasahUrl}
                    alt="Gedung Madrasah"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="w-20 h-24 rounded-sm border border-slate-300 overflow-hidden bg-slate-50 shadow-xs">
                  <img
                    src={principal.fotoUrl}
                    alt={principal.namaLengkap}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Data Satuan Pendidikan */}
              <div className="space-y-1 py-1">
                <div className="inline-block px-3 py-1 bg-emerald-50 border border-emerald-800/40 text-emerald-950 font-bold text-xs uppercase tracking-wide">
                  IDENTITAS SATUAN PENDIDIKAN
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                  {institution.namaLembaga}
                </h2>
                <p className="text-[10px] text-slate-700 max-w-md mx-auto leading-tight">
                  {institution.alamat}, Kec. {institution.kecamatan}, {institution.kotaKab}, {institution.provinsi}
                </p>
                <p className="text-[10px] text-slate-600 font-mono">
                  NSM: {institution.nsm} · NPSM: {institution.npsm} · Akreditasi: {institution.akreditasi}
                </p>
              </div>

              {/* Identitas Kepala Madrasah & Tim Penilai */}
              <div className="border-t border-slate-200 pt-2 space-y-1 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                    Kepala Madrasah Yang Dinilai:
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-950 underline underline-offset-2">
                    {principal.namaLengkap}
                  </p>
                  <p className="font-mono text-[10px] text-slate-800">
                    NIP. {principal.nip} · {principal.pangkatGol}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-700 pt-1 border-t border-slate-100">
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">Pengawas Penilai 1:</p>
                    <p className="font-bold">{evaluators.pengawas1Nama}</p>
                    <p className="font-mono text-[9px] text-slate-500">NIP. {evaluators.pengawas1Nip}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">Pengawas Penilai 2:</p>
                    <p className="font-bold">{evaluators.pengawas2Nama}</p>
                    <p className="font-mono text-[9px] text-slate-500">NIP. {evaluators.pengawas2Nip}</p>
                  </div>
                </div>
              </div>

              {/* Titimangsa Footer */}
              <div className="text-[10px] font-bold text-slate-700 pt-1 border-t border-slate-300">
                {institution.kotaKab.toUpperCase()} · TAHUN {new Date().getFullYear()}
              </div>

            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. LEMBAR PENGESAHAN RESMI                                     */}
        {/* ============================================================== */}
        {(selectedCategory === 'all' || selectedCategory === 'cover' || selectedCategory === 'profile') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] flex flex-col justify-between">
            <div>
              {/* Kop Surat Dinas Kemenag */}
              <div className="flex items-center gap-3 pb-2 mb-4 border-b-2 border-black">
                <img
                  src={institution.logoUrl}
                  alt="Logo Kemenag"
                  className="w-16 h-16 object-contain shrink-0"
                />
                <div className="text-center flex-1">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-black">
                    KEMENTERIAN AGAMA REPUBLIK INDONESIA
                  </h3>
                  <h4 className="text-[11px] font-bold uppercase text-black">
                    KANTOR KEMENTERIAN AGAMA {institution.kotaKab.toUpperCase()}
                  </h4>
                  <h2 className="text-sm font-extrabold uppercase text-black mt-0.5">
                    {institution.namaLembaga}
                  </h2>
                  <p className="text-[9px] text-black">
                    Alamat: {institution.alamat}, Kec. {institution.kecamatan}, {institution.kotaKab} - {institution.provinsi}
                  </p>
                  <p className="text-[9px] text-black font-mono">
                    Telp: {institution.telepon} · Email: {institution.email}
                  </p>
                </div>
              </div>

              <div className="text-center my-4">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide underline underline-offset-4">
                  LEMBAR PENGESAHAN HASIL PENILAIAN
                </h2>
                <p className="text-[11px] text-black mt-1 font-semibold">
                  PENILAIAN KINERJA KEPALA MADRASAH (PPKM)
                </p>
              </div>

              <div className="text-xs text-black leading-relaxed space-y-2.5">
                <p>
                  Laporan dan Portofolio Penilaian Kinerja Kepala Madrasah (PPKM) pada satuan pendidikan:
                </p>
                
                <table className="w-full my-2 border-none text-xs">
                  <tbody>
                    <tr className="border-none">
                      <td className="w-44 py-1 font-semibold">Nama Lembaga</td>
                      <td className="py-1 font-bold">: {institution.namaLembaga}</td>
                    </tr>
                    <tr className="border-none">
                      <td className="py-1 font-semibold">NSM / NPSM</td>
                      <td className="py-1 font-mono">: {institution.nsm} / {institution.npsm}</td>
                    </tr>
                    <tr className="border-none">
                      <td className="py-1 font-semibold">Nama Kepala Madrasah</td>
                      <td className="py-1 font-bold">: {principal.namaLengkap}</td>
                    </tr>
                    <tr className="border-none">
                      <td className="py-1 font-semibold">NIP</td>
                      <td className="py-1 font-mono">: {principal.nip}</td>
                    </tr>
                    <tr className="border-none">
                      <td className="py-1 font-semibold">Pangkat / Gol. Ruang</td>
                      <td className="py-1">: {principal.pangkatGol}</td>
                    </tr>
                    <tr className="border-none">
                      <td className="py-1 font-semibold">Periode Penilaian</td>
                      <td className="py-1">: {institution.periodePenilaian} (Tahun Pelajaran {institution.tahunPelajaran})</td>
                    </tr>
                  </tbody>
                </table>

                <p className="text-justify leading-relaxed">
                  Telah diperiksa, diverifikasi, dan dinilai secara sah oleh Tim Penilai Pengawas Madrasah Pembina sesuai dengan Petunjuk Teknis Penilaian Kinerja Kepala Madrasah Direktorat Jenderal Pendidikan Islam Kementerian Agama Republik Indonesia.
                </p>
              </div>
            </div>

            {/* Signature Block */}
            <div className="pt-4 text-xs text-black avoid-break">
              <div className="text-right mb-4">
                <p>{evaluators.tempatPenilaian}, {evaluators.tanggalPenilaian}</p>
              </div>

              <div className="grid grid-cols-2 gap-6 text-center mb-6">
                <div>
                  <p className="font-semibold">Kepala Madrasah Yang Dinilai,</p>
                  <div className="h-16" />
                  <p className="font-bold underline">{principal.namaLengkap}</p>
                  <p className="font-mono text-[10px]">NIP. {principal.nip}</p>
                </div>

                <div>
                  <p className="font-semibold">Pengawas Madrasah Penilai Utama,</p>
                  <div className="h-16" />
                  <p className="font-bold underline">{evaluators.pengawas1Nama}</p>
                  <p className="font-mono text-[10px]">NIP. {evaluators.pengawas1Nip}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 text-center border-t border-slate-300 pt-4">
                <div>
                  <p className="font-semibold">Mengetahui,</p>
                  <p className="font-semibold">Ketua Komite Madrasah,</p>
                  <div className="h-16" />
                  <p className="font-bold underline">{evaluators.komiteNama}</p>
                </div>

                <div>
                  <p className="font-semibold">Mengesahkan,</p>
                  <p className="font-semibold">Kepala Seksi Pendidikan Madrasah,</p>
                  <div className="h-16" />
                  <p className="font-bold underline">{evaluators.kasiPenmadNama}</p>
                  <p className="font-mono text-[10px]">NIP. {evaluators.kasiPenmadNip}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. PROFIL KEPALA & PROFIL SATUAN PENDIDIKAN                    */}
        {/* ============================================================== */}
        {(selectedCategory === 'all' || selectedCategory === 'profile') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-4">
            <div className="border-b-2 border-emerald-950 pb-1.5 mb-3">
              <h2 className="text-xs font-bold uppercase text-emerald-950 tracking-wider">
                BAGIAN I: PROFIL KEPALA MADRASAH & IDENTITAS SATUAN PENDIDIKAN
              </h2>
            </div>

            {/* Biodata Kepala Madrasah */}
            <div className="border border-slate-300 p-3 bg-white">
              <h3 className="text-[11px] font-bold uppercase text-slate-900 mb-2 pb-1 border-b border-slate-200">
                A. BIODATA KEPALA MADRASAH
              </h3>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-24 h-32 border border-slate-300 p-1 shrink-0 bg-slate-50 flex items-center justify-center">
                  <img
                    src={principal.fotoUrl}
                    alt={principal.namaLengkap}
                    className="w-full h-full object-cover"
                  />
                </div>

                <table className="w-full text-[11px] border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 font-semibold w-40 text-slate-700">Nama Lengkap</td>
                      <td className="py-1 font-bold text-slate-900">: {principal.namaLengkap}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 font-semibold text-slate-700">Tempat, Tanggal Lahir</td>
                      <td className="py-1 text-slate-800">: {principal.tempatTanggalLahir}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 font-semibold text-slate-700">Jenis Kelamin</td>
                      <td className="py-1 text-slate-800">: {principal.jenisKelamin}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 font-semibold text-slate-700">Pendidikan Terakhir</td>
                      <td className="py-1 text-slate-800">: {principal.pendidikanTerakhir}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 font-semibold text-slate-700">NIP</td>
                      <td className="py-1 font-mono text-slate-900">: {principal.nip}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 font-semibold text-slate-700">Pangkat / Gol. Ruang</td>
                      <td className="py-1 text-slate-800">: {principal.pangkatGol}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 font-semibold text-slate-700">NUPTK / NPK</td>
                      <td className="py-1 font-mono text-slate-800">: {principal.nuptk} / {principal.npk}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 font-semibold text-slate-700">Status Pegawai</td>
                      <td className="py-1 text-slate-800">: {principal.statusPegawai}</td>
                    </tr>
                    <tr>
                      <td className="py-1 font-semibold text-slate-700">Jabatan / TMT</td>
                      <td className="py-1 text-slate-800">: {principal.jabatan} (TMT: {principal.tmtJabatan})</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Identitas Lembaga */}
            <div className="border border-slate-300 p-3 bg-white">
              <h3 className="text-[11px] font-bold uppercase text-slate-900 mb-2 pb-1 border-b border-slate-200">
                B. IDENTITAS SATUAN PENDIDIKAN (MADRASAH)
              </h3>

              <table className="w-full text-[11px] border-collapse">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-semibold w-44 text-slate-700">1. Nama Lembaga</td>
                    <td className="py-1 font-bold text-slate-900">: {institution.namaLembaga}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-semibold text-slate-700">2. Status Lembaga</td>
                    <td className="py-1 text-slate-800">: {institution.status}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-semibold text-slate-700">3. NPSM / NSM</td>
                    <td className="py-1 font-mono text-slate-800">: {institution.npsm} / {institution.nsm}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-semibold text-slate-700">4. Peringkat Akreditasi</td>
                    <td className="py-1 font-semibold text-emerald-800">: {institution.akreditasi}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-semibold text-slate-700">5. Alamat Lengkap</td>
                    <td className="py-1 text-slate-800">: {institution.alamat}, Kec. {institution.kecamatan}, {institution.kotaKab}, {institution.provinsi}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-semibold text-slate-700">6. Kontak & Email</td>
                    <td className="py-1 font-mono text-slate-800">: Telp: {institution.telepon} · {institution.email}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 font-semibold text-slate-700">7. Luas Tanah Seluruhnya</td>
                    <td className="py-1 text-slate-800">: {institution.luasTanah}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold text-slate-700">8. Status Tanah</td>
                    <td className="py-1 text-slate-800">: {institution.statusTanah}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Foto Gedung Tampak Depan */}
            <div className="border border-slate-300 p-2 text-center">
              <p className="text-[10px] font-semibold text-slate-600 mb-1">
                DOKUMENTASI GEDUNG & HALAMAN UTAMA {institution.namaLembaga}
              </p>
              <div className="h-32 w-full max-w-md mx-auto overflow-hidden border border-slate-300">
                <img
                  src={institution.fotoMadrasahUrl}
                  alt="Bangunan Madrasah"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 4. STRUKTUR ORGANISASI & PROFIL 17 PTK GURU / TENDIK           */}
        {/* ============================================================== */}
        {(selectedCategory === 'all' || selectedCategory === 'ptk') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-3">
            <div className="border-b-2 border-emerald-950 pb-1 mb-2">
              <h2 className="text-xs font-bold uppercase text-emerald-950 tracking-wider">
                BAGIAN II: STRUKTUR ORGANISASI & PROFIL PENDIDIK DAN TENAGA KEPENDIDIKAN (PTK)
              </h2>
            </div>

            {/* Bagan Struktur Organisasi Ringkas */}
            <div className="border border-slate-300 p-2.5 bg-slate-50/50">
              <h3 className="text-[10px] font-bold uppercase text-slate-900 text-center mb-1.5">
                BAGAN STRUKTUR ORGANISASI {institution.namaLembaga}
              </h3>
              
              <div className="flex flex-col items-center text-[10px] space-y-1">
                <div className="flex items-center gap-3">
                  <div className="border border-slate-400 bg-white px-2 py-0.5 rounded-xs text-center shadow-xs">
                    <span className="block text-[8px] text-slate-500">KOMITE</span>
                    <strong>{evaluators.komiteNama}</strong>
                  </div>
                  <div className="border-2 border-emerald-800 bg-emerald-50 px-3 py-1 rounded-xs text-center shadow-xs">
                    <span className="block text-[8px] text-emerald-800 font-semibold">KEPALA MADRASAH</span>
                    <strong className="text-emerald-950">{principal.namaLengkap}</strong>
                  </div>
                  <div className="border border-slate-400 bg-white px-2 py-0.5 rounded-xs text-center shadow-xs">
                    <span className="block text-[8px] text-slate-500">PENGAWAS</span>
                    <strong>{evaluators.pengawas1Nama}</strong>
                  </div>
                </div>

                <div className="w-px h-2 bg-slate-400" />

                <div className="flex items-center gap-3 text-[9px]">
                  <div className="border border-slate-300 bg-white px-2 py-0.5 text-center">
                    <span className="block text-[8px] text-slate-500">KEPALA TU</span>
                    <strong>Mufroni, S.Pd</strong>
                  </div>
                  <div className="border border-slate-300 bg-white px-2 py-0.5 text-center">
                    <span className="block text-[8px] text-slate-500">BENDAHARA</span>
                    <strong>Rini Ariyani, S.Pd</strong>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1 text-center text-[8.5px] w-full max-w-md pt-0.5">
                  <div className="border border-slate-300 bg-white p-0.5">Kurikulum: <strong>H. Bahjatul W</strong></div>
                  <div className="border border-slate-300 bg-white p-0.5">Kesiswaan: <strong>Khairun Nisa</strong></div>
                  <div className="border border-slate-300 bg-white p-0.5">Humas: <strong>Wahyu R</strong></div>
                  <div className="border border-slate-300 bg-white p-0.5">Sarpras: <strong>Moh. Royano</strong></div>
                </div>
              </div>
            </div>

            {/* Tabel Profil PTK Lengkap */}
            <div>
              <h3 className="text-[10px] font-bold uppercase text-slate-900 mb-1">
                Daftar Pendidik dan Tenaga Kependidikan ({ptkList.length} Personil)
              </h3>

              <table className="w-full text-[9px] border border-slate-400 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 text-slate-900 font-bold uppercase">
                    <th className="border-r border-slate-400 p-1 text-center w-6">No</th>
                    <th className="border-r border-slate-400 p-1 text-left">Nama / NIP</th>
                    <th className="border-r border-slate-400 p-1 text-center w-14">Status</th>
                    <th className="border-r border-slate-400 p-1 text-left">Tugas / Amanah</th>
                    <th className="border-r border-slate-400 p-1 text-center w-12">Ijazah</th>
                    <th className="p-1 text-center w-20">Sertifikasi</th>
                  </tr>
                </thead>
                <tbody>
                  {ptkList.map((ptk, index) => (
                    <tr key={ptk.id} className="border-b border-slate-300">
                      <td className="border-r border-slate-300 p-0.5 text-center font-mono tabular-nums">{index + 1}</td>
                      <td className="border-r border-slate-300 p-0.5">
                        <strong className="block text-slate-900">{ptk.nama}</strong>
                        <span className="font-mono text-[8px] text-slate-600">NIP. {ptk.nip}</span>
                      </td>
                      <td className="border-r border-slate-300 p-0.5 text-center font-semibold">{ptk.statusPegawai}</td>
                      <td className="border-r border-slate-300 p-0.5 text-slate-800">{ptk.tugas}</td>
                      <td className="border-r border-slate-300 p-0.5 text-center">{ptk.pendidikanTerakhir}</td>
                      <td className="p-0.5 text-center font-medium">
                        {ptk.statusSertifikasi === 'SERTIFIKASI' ? (
                          <span className="text-emerald-800 font-bold">SERTIFIKASI</span>
                        ) : (
                          <span className="text-slate-500">{ptk.statusSertifikasi}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 5. DATA SISWA, KELULUSAN & SARANA PRASARANA                     */}
        {/* ============================================================== */}
        {(selectedCategory === 'all' || selectedCategory === 'students_sarpras') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-3">
            <div className="border-b-2 border-emerald-950 pb-1 mb-2">
              <h2 className="text-xs font-bold uppercase text-emerald-950 tracking-wider">
                BAGIAN III: DATA SISWA, KELULUSAN & KEADAAN SARPRAS (BMN)
              </h2>
            </div>

            {/* Tabel Siswa Berjalan */}
            <div>
              <h3 className="text-[10px] font-bold uppercase text-slate-900 mb-1">
                1. Data Siswa Tahun Pelajaran {institution.tahunPelajaran}
              </h3>
              <table className="w-full text-[9px] border border-slate-400 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 font-bold uppercase">
                    <th className="border-r border-slate-400 p-0.5 text-center w-8">No</th>
                    <th className="border-r border-slate-400 p-0.5 text-left">Kelas / Rombel</th>
                    <th className="border-r border-slate-400 p-0.5 text-center">Laki - Laki</th>
                    <th className="border-r border-slate-400 p-0.5 text-center">Perempuan</th>
                    <th className="p-0.5 text-center font-bold">Jumlah Total</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st, idx) => (
                    <tr key={idx} className="border-b border-slate-300">
                      <td className="border-r border-slate-300 p-0.5 text-center font-mono tabular-nums">{idx + 1}</td>
                      <td className="border-r border-slate-300 p-0.5 font-medium">{st.kelas}</td>
                      <td className="border-r border-slate-300 p-0.5 text-center font-mono tabular-nums">{st.lakiLaki}</td>
                      <td className="border-r border-slate-300 p-0.5 text-center font-mono tabular-nums">{st.perempuan}</td>
                      <td className="p-0.5 text-center font-bold font-mono tabular-nums">{st.lakiLaki + st.perempuan}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold border-t border-slate-400">
                    <td colSpan={2} className="p-1 text-center">TOTAL KESELURUHAN</td>
                    <td className="p-1 text-center font-mono tabular-nums">{totalL}</td>
                    <td className="p-1 text-center font-mono tabular-nums">{totalP}</td>
                    <td className="p-1 text-center font-mono tabular-nums text-emerald-900">{totalStudents} Siswa</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tabel Perkembangan Siswa 4 Tahun & Kelulusan */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <h4 className="text-[9px] font-bold uppercase text-slate-800 mb-0.5">
                  Perkembangan 4 Tahun Terakhir
                </h4>
                <table className="w-full text-[8.5px] border border-slate-400 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 font-bold">
                      <th className="p-0.5 text-center">Tahun</th>
                      <th className="p-0.5 text-center">L</th>
                      <th className="p-0.5 text-center">P</th>
                      <th className="p-0.5 text-center">Jml</th>
                      <th className="p-0.5 text-center">Rombel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentTrends.map((t, i) => (
                      <tr key={i} className="border-b border-slate-300 text-center">
                        <td className="p-0.5 font-medium">{t.tahun}</td>
                        <td className="p-0.5 font-mono tabular-nums">{t.lakiLaki}</td>
                        <td className="p-0.5 font-mono tabular-nums">{t.perempuan}</td>
                        <td className="p-0.5 font-bold font-mono tabular-nums">{t.lakiLaki + t.perempuan}</td>
                        <td className="p-0.5 font-mono tabular-nums">{t.rombel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h4 className="text-[9px] font-bold uppercase text-slate-800 mb-0.5">
                  Tabel Data Kelulusan (100% Lanjut)
                </h4>
                <table className="w-full text-[8.5px] border border-slate-400 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 font-bold">
                      <th className="p-0.5 text-center">Tahun</th>
                      <th className="p-0.5 text-center">L</th>
                      <th className="p-0.5 text-center">P</th>
                      <th className="p-0.5 text-center">Lulus</th>
                      <th className="p-0.5 text-center">Melanjutkan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {graduates.map((g, i) => (
                      <tr key={i} className="border-b border-slate-300 text-center">
                        <td className="p-0.5 font-medium">{g.tahun}</td>
                        <td className="p-0.5 font-mono tabular-nums">{g.lakiLaki}</td>
                        <td className="p-0.5 font-mono tabular-nums">{g.perempuan}</td>
                        <td className="p-0.5 font-bold font-mono tabular-nums">{g.lakiLaki + g.perempuan}</td>
                        <td className="p-0.5 font-bold font-mono tabular-nums text-emerald-800">{g.melanjutkan} (100%)</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Keadaan Gedung & Sarpras */}
            <div>
              <h3 className="text-[10px] font-bold uppercase text-slate-900 mb-1">
                2. Keadaan Gedung dan Bangunan Madrasah
              </h3>
              <table className="w-full text-[8.5px] border border-slate-400 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 font-bold uppercase">
                    <th className="p-0.5 text-center w-6">No</th>
                    <th className="p-0.5 text-left">Jenis Bangunan</th>
                    <th className="p-0.5 text-center w-14">Jml Lokal</th>
                    <th className="p-0.5 text-center w-12">Baik</th>
                    <th className="p-0.5 text-center w-16">Rusak Ringan</th>
                    <th className="p-0.5 text-center w-16">Rusak Berat</th>
                  </tr>
                </thead>
                <tbody>
                  {buildings.map((b, i) => (
                    <tr key={b.id} className="border-b border-slate-300">
                      <td className="p-0.5 text-center font-mono tabular-nums">{i + 1}</td>
                      <td className="p-0.5 font-medium">{b.jenisBangunan}</td>
                      <td className="p-0.5 text-center font-mono font-bold tabular-nums">
                        {b.baik + b.rusakRingan + b.rusakBerat}
                      </td>
                      <td className="p-0.5 text-center font-mono tabular-nums">{b.baik > 0 ? b.baik : '-'}</td>
                      <td className="p-0.5 text-center font-mono tabular-nums">{b.rusakRingan > 0 ? b.rusakRingan : '-'}</td>
                      <td className="p-0.5 text-center font-mono tabular-nums">{b.rusakBerat > 0 ? b.rusakBerat : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Inventaris Pilihan */}
            <div>
              <h3 className="text-[10px] font-bold uppercase text-slate-900 mb-1">
                3. Inventaris Sarana dan Perlengkapan Pembelajaran
              </h3>
              <table className="w-full text-[8.5px] border border-slate-400 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 font-bold uppercase">
                    <th className="p-0.5 text-center w-6">No</th>
                    <th className="p-0.5 text-left">Nama Sarana / Alat</th>
                    <th className="p-0.5 text-center w-12">Baik</th>
                    <th className="p-0.5 text-center w-16">Rusak Ringan</th>
                    <th className="p-0.5 text-center w-16">Rusak Berat</th>
                    <th className="p-0.5 text-center w-14 font-bold">Total Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.slice(0, 8).map((inv, i) => (
                    <tr key={inv.id} className="border-b border-slate-300">
                      <td className="p-0.5 text-center font-mono tabular-nums">{i + 1}</td>
                      <td className="p-0.5 font-medium">{inv.namaBarang}</td>
                      <td className="p-0.5 text-center font-mono tabular-nums">{inv.baik}</td>
                      <td className="p-0.5 text-center font-mono tabular-nums">{inv.rusakRingan}</td>
                      <td className="p-0.5 text-center font-mono tabular-nums">{inv.rusakBerat}</td>
                      <td className="p-0.5 text-center font-mono font-bold tabular-nums">
                        {inv.baik + inv.rusakRingan + inv.rusakBerat}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 6. VISI, MISI, TUJUAN & PROGRAM 4 TAHUNAN                      */}
        {/* ============================================================== */}
        {(selectedCategory === 'all' || selectedCategory === 'programs') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-3">
            <div className="border-b-2 border-emerald-950 pb-1 mb-2">
              <h2 className="text-xs font-bold uppercase text-emerald-950 tracking-wider">
                BAGIAN IV: VISI, MISI, TUJUAN & PROGRAM KERJA 4 TAHUNAN
              </h2>
            </div>

            {/* Visi Misi */}
            <div className="border border-slate-300 p-3 space-y-2">
              <div className="text-center pb-1.5 border-b border-slate-200">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                  VISI MADRASAH
                </span>
                <p className="text-xs font-black text-slate-900 uppercase mt-0.5 leading-snug">
                  "{programGoals.visi}"
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-800 uppercase block mb-1">
                  MISI MADRASAH:
                </span>
                <ol className="list-decimal pl-4 text-[10px] text-slate-800 space-y-0.5">
                  {programGoals.misi.map((m, idx) => (
                    <li key={idx} className="leading-snug">{m}</li>
                  ))}
                </ol>
              </div>

              <div className="pt-1.5 border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-800 uppercase block mb-1">
                  TUJUAN LEMBAGA:
                </span>
                <ul className="list-disc pl-4 text-[10px] text-slate-800 space-y-0.5">
                  {programGoals.tujuan.map((t, idx) => (
                    <li key={idx} className="leading-snug">{t}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Landasan Hukum & Ruang Lingkup 8 SNP */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="border border-slate-300 p-2.5 bg-slate-50/50">
                <h4 className="font-bold text-slate-900 uppercase text-[10px] mb-1 border-b border-slate-200 pb-0.5">
                  Landasan Hukum Kebijakan
                </h4>
                <ul className="list-disc pl-3.5 space-y-0.5 text-slate-800 text-[9px]">
                  {programGoals.landasanHukum.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="border border-slate-300 p-2.5 bg-slate-50/50">
                <h4 className="font-bold text-slate-900 uppercase text-[10px] mb-1 border-b border-slate-200 pb-0.5">
                  Ruang Lingkup 8 SNP
                </h4>
                <ul className="list-disc pl-3.5 space-y-0.5 text-slate-800 text-[9px]">
                  {programGoals.ruangLingkup.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Program 9K & Indikator */}
            <div className="border border-slate-300 p-3">
              <h4 className="font-bold text-slate-900 uppercase text-[10px] mb-1.5">
                Indikator Mutu Karakter & Program 9K Madrasah
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {programGoals.indikator.map((ind, i) => (
                  <div key={i} className="bg-slate-50 p-2 rounded-xs border border-slate-200">
                    <strong className="text-emerald-900 block text-[9.5px] mb-0.5 font-bold">
                      {ind.kategori}
                    </strong>
                    <ul className="list-disc pl-3.5 text-[8.5px] space-y-0.5 text-slate-700">
                      {ind.uraian.map((u, j) => (
                        <li key={j}>{u}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 7. LAPORAN PROGRAM KEGIATAN & EVALUASI KENDALA                 */}
        {/* ============================================================== */}
        {(selectedCategory === 'all' || selectedCategory === 'activities') && (
          <>
            {/* Sheet 1: Harian & Mingguan */}
            <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-3">
              <div className="border-b-2 border-emerald-950 pb-1 mb-2">
                <h2 className="text-xs font-bold uppercase text-emerald-950 tracking-wider">
                  BAGIAN V: LAPORAN PROGRAM KEGIATAN & EVALUASI (HARIAN & MINGGUAN)
                </h2>
              </div>

              <div>
                <h3 className="text-[10px] font-bold uppercase text-slate-900 mb-1">
                  A. Kegiatan Harian Kepala Madrasah
                </h3>
                <table className="w-full text-[9px] border border-slate-400 border-collapse mb-3">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 font-bold uppercase">
                      <th className="p-1 text-center w-6">No</th>
                      <th className="p-1 text-left">Uraian Program / Kegiatan</th>
                      <th className="p-1 text-center w-16">Realisasi</th>
                      <th className="p-1 text-left">Kendala yang Dihadapi & Solusi</th>
                      <th className="p-1 text-center w-16">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityReports.harian.map((act, i) => (
                      <tr key={act.id} className="border-b border-slate-300">
                        <td className="p-0.5 text-center font-mono tabular-nums">{i + 1}</td>
                        <td className="p-0.5 font-medium">{act.namaKegiatan}</td>
                        <td className="p-0.5 text-center font-mono font-bold tabular-nums">{act.realisasi}%</td>
                        <td className="p-0.5 text-slate-700">{act.kendala}</td>
                        <td className="p-0.5 text-center font-semibold text-slate-800">{act.keterangan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="text-[10px] font-bold uppercase text-slate-900 mb-1">
                  B. Kegiatan Mingguan Kepala Madrasah
                </h3>
                <table className="w-full text-[9px] border border-slate-400 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 font-bold uppercase">
                      <th className="p-1 text-center w-6">No</th>
                      <th className="p-1 text-left">Uraian Program / Kegiatan</th>
                      <th className="p-1 text-center w-16">Realisasi</th>
                      <th className="p-1 text-left">Kendala yang Dihadapi & Solusi</th>
                      <th className="p-1 text-center w-16">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityReports.mingguan.map((act, i) => (
                      <tr key={act.id} className="border-b border-slate-300">
                        <td className="p-0.5 text-center font-mono tabular-nums">M-{i + 1}</td>
                        <td className="p-0.5 font-medium">{act.namaKegiatan}</td>
                        <td className="p-0.5 text-center font-mono font-bold tabular-nums">{act.realisasi}%</td>
                        <td className="p-0.5 text-slate-700">{act.kendala}</td>
                        <td className="p-0.5 text-center font-semibold text-slate-800">{act.keterangan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sheet 2: Bulanan, Semesteran & Tahunan */}
            <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-3">
              <div className="border-b-2 border-emerald-950 pb-1 mb-2">
                <h2 className="text-xs font-bold uppercase text-emerald-950 tracking-wider">
                  BAGIAN V: LAPORAN PROGRAM KEGIATAN (BULANAN, SEMESTERAN & TAHUNAN)
                </h2>
              </div>

              <div>
                <h3 className="text-[10px] font-bold uppercase text-slate-900 mb-1">
                  C. Kegiatan Bulanan Kepala Madrasah
                </h3>
                <table className="w-full text-[8.5px] border border-slate-400 border-collapse mb-3">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 font-bold uppercase">
                      <th className="p-1 text-center w-6">No</th>
                      <th className="p-1 text-left">Uraian Program / Kegiatan</th>
                      <th className="p-1 text-center w-16">Realisasi</th>
                      <th className="p-1 text-left">Kendala yang Dihadapi & Solusi</th>
                      <th className="p-1 text-center w-16">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityReports.bulanan.map((act, i) => (
                      <tr key={act.id} className="border-b border-slate-300">
                        <td className="p-0.5 text-center font-mono tabular-nums">B-{i + 1}</td>
                        <td className="p-0.5 font-medium">{act.namaKegiatan}</td>
                        <td className="p-0.5 text-center font-mono font-bold tabular-nums">{act.realisasi}%</td>
                        <td className="p-0.5 text-slate-700">{act.kendala}</td>
                        <td className="p-0.5 text-center font-semibold text-slate-800">{act.keterangan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="text-[10px] font-bold uppercase text-slate-900 mb-1">
                  D. Kegiatan Semesteran & Tahunan
                </h3>
                <table className="w-full text-[8.5px] border border-slate-400 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 font-bold uppercase">
                      <th className="p-1 text-center w-6">No</th>
                      <th className="p-1 text-left">Uraian Program / Kegiatan</th>
                      <th className="p-1 text-center w-16">Realisasi</th>
                      <th className="p-1 text-left">Kendala yang Dihadapi & Solusi</th>
                      <th className="p-1 text-center w-16">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityReports.semesteran.slice(0, 4).map((act, i) => (
                      <tr key={act.id} className="border-b border-slate-300">
                        <td className="p-0.5 text-center font-mono tabular-nums">S-{i + 1}</td>
                        <td className="p-0.5 font-medium">{act.namaKegiatan}</td>
                        <td className="p-0.5 text-center font-mono font-bold tabular-nums">{act.realisasi}%</td>
                        <td className="p-0.5 text-slate-700">{act.kendala}</td>
                        <td className="p-0.5 text-center font-semibold text-slate-800">{act.keterangan}</td>
                      </tr>
                    ))}
                    {activityReports.tahunan.slice(0, 4).map((act, i) => (
                      <tr key={act.id} className="border-b border-slate-300">
                        <td className="p-0.5 text-center font-mono tabular-nums">T-{i + 1}</td>
                        <td className="p-0.5 font-medium">{act.namaKegiatan}</td>
                        <td className="p-0.5 text-center font-mono font-bold tabular-nums">{act.realisasi}%</td>
                        <td className="p-0.5 text-slate-700">{act.kendala}</td>
                        <td className="p-0.5 text-center font-semibold text-slate-800">{act.keterangan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* 8. ALBUM FOTO BUKTI FISIK KEGIATAN (PAGINATED CHUNKS)          */}
        {/* ============================================================== */}
        {(selectedCategory === 'all' || selectedCategory === 'photos') && (
          photoChunks.map((chunk, pageIndex) => (
            <div
              key={pageIndex}
              className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] flex flex-col justify-between"
            >
              <div>
                <div className="border-b-2 border-emerald-950 pb-1 mb-4 flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase text-emerald-950 tracking-wider">
                    BAGIAN VI: ALBUM DOKUMENTASI BUKTI FISIK KEGIATAN (LEMBAR {pageIndex + 1})
                  </h2>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Halaman {pageIndex + 1} dari {photoChunks.length}
                  </span>
                </div>

                {/* 2 Foto per Halaman */}
                {photoLayout === '2_per_page' ? (
                  <div className="space-y-4">
                    {chunk.map((photo, idx) => (
                      <div key={photo.id} className="border border-slate-300 p-3 bg-white avoid-break">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 mb-2">
                          <span className="font-bold text-xs text-slate-900">
                            {pageIndex * 2 + idx + 1}. {photo.judul}
                          </span>
                          <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-xs border border-emerald-200">
                            {photo.kategori}
                          </span>
                        </div>

                        <div className="h-44 sm:h-48 w-full border border-slate-300 overflow-hidden bg-slate-50 mb-2">
                          <img
                            src={photo.fotoUrl}
                            alt={photo.judul}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex items-start justify-between text-xs text-slate-800 pt-0.5">
                          <p className="text-[10px] text-slate-700 flex-1 pr-3 leading-snug">
                            <strong>Keterangan:</strong> {photo.deskripsi}
                          </p>
                          {photo.tanggal && (
                            <span className="text-[9px] text-slate-500 whitespace-nowrap font-mono">
                              Tanggal: {photo.tanggal}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* 4 Foto Grid per Halaman */
                  <div className="grid grid-cols-2 gap-3">
                    {chunk.map((photo, idx) => (
                      <div key={photo.id} className="border border-slate-300 p-2 bg-white avoid-break flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-1 border-b border-slate-200 mb-1">
                            <span className="font-bold text-[10px] text-slate-900 truncate max-w-[150px]">
                              {pageIndex * 4 + idx + 1}. {photo.judul}
                            </span>
                            <span className="text-[8px] font-semibold text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded-xs">
                              {photo.kategori}
                            </span>
                          </div>

                          <div className="h-28 w-full border border-slate-300 overflow-hidden bg-slate-50 mb-1.5">
                            <img
                              src={photo.fotoUrl}
                              alt={photo.judul}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>

                        <div className="text-[9px] text-slate-700">
                          <p className="line-clamp-2 leading-tight">{photo.deskripsi}</p>
                          {photo.tanggal && (
                            <p className="text-[8px] text-slate-400 mt-0.5 font-mono">{photo.tanggal}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Verifikasi Lembar Foto di Bawah */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 avoid-break">
                <span>Dokumentasi Resmi Portofolio Kinerja Kepala Madrasah</span>
                <span className="italic">Diverifikasi oleh Tim Penilai PPKM Kemenag RI</span>
              </div>
            </div>
          ))
        )}

        {/* ============================================================== */}
        {/* 9. INSTRUMEN & REKAPITULASI SKOR PENILAIAN                     */}
        {/* ============================================================== */}
        {(selectedCategory === 'all' || selectedCategory === 'assessment') && (
          <div className="a4-sheet bg-white p-6 md:p-8 border border-slate-300 shadow-md mx-auto mb-8 max-w-[210mm] space-y-4">
            <div className="border-b-2 border-emerald-950 pb-1 mb-2">
              <h2 className="text-xs font-bold uppercase text-emerald-950 tracking-wider">
                BAGIAN VII: INSTRUMEN & REKAPITULASI NILAI KINERJA KEPALA MADRASAH
              </h2>
            </div>

            {/* Score Highlight Banner */}
            <div className="border-2 border-emerald-900 bg-emerald-50/50 p-3 rounded-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-950 uppercase block">
                  NILAI AKHIR KINERJA KEPALA MADRASAH (NK)
                </span>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  Berdasarkan penilaian 5 komponen Keputusan Dirjen Pendis Kemenag RI.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">Skor Akhir</span>
                  <div className="text-xl font-black text-emerald-950 font-mono tabular-nums">
                    {finalScore100.toFixed(2)}
                  </div>
                </div>

                <div className="h-8 w-px bg-emerald-300" />

                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">Predikat</span>
                  <div className="text-xs font-black text-emerald-900 uppercase">
                    {predicate}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabel Butir Instrumen */}
            <div>
              <h3 className="text-[10px] font-bold uppercase text-slate-900 mb-1">
                Rincian Skor per Butir Indikator Kinerja PPKM Kemenag
              </h3>

              <table className="w-full text-[8.5px] border border-slate-400 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 font-bold uppercase">
                    <th className="p-1 text-center w-6">No</th>
                    <th className="p-1 text-left">Komponen & Indikator Kinerja</th>
                    <th className="p-1 text-left">Bukti Fisik Terverifikasi</th>
                    <th className="p-1 text-center w-10">Skor</th>
                    <th className="p-1 text-left">Catatan Verifikator Penilai</th>
                  </tr>
                </thead>
                <tbody>
                  {assessmentScores.map((item) => (
                    <tr key={item.id} className="border-b border-slate-300">
                      <td className="p-0.5 text-center font-mono font-bold tabular-nums">{item.nomor}</td>
                      <td className="p-0.5">
                        <strong className="block text-slate-900">{item.indikatorKinerja}</strong>
                        <span className="text-[7.5px] text-emerald-800 font-semibold">{item.komponenLabel}</span>
                      </td>
                      <td className="p-0.5 text-slate-700">{item.buktiFisik}</td>
                      <td className="p-0.5 text-center font-mono font-black text-[10px] text-slate-900 tabular-nums">
                        {item.skor}
                      </td>
                      <td className="p-0.5 text-slate-600 italic">{item.catatanPenilai}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rekomendasi & Tanda Tangan */}
            <div className="pt-2 text-xs text-black avoid-break">
              <div className="border border-slate-300 p-2.5 mb-4 bg-slate-50 text-[10px]">
                <strong className="block text-slate-900 mb-0.5 font-bold">Rekomendasi Tim Penilai Pengawas Pembina:</strong>
                <p className="text-slate-700 leading-snug">
                  Kepala madrasah telah menunjukkan kinerja kepemimpinan yang sangat baik dan konsisten. Disarankan untuk terus mempertahankan inovasi digitalisasi pembelajaran, mempercepat usulan rehabilitasi perpustakaan, dan memperkuat pemberdayaan seluruh PTK.
                </p>
              </div>

              <div className="text-right mb-2 text-[10px]">
                <p>{evaluators.tempatPenilaian}, {evaluators.tanggalPenilaian}</p>
              </div>

              <div className="grid grid-cols-2 gap-6 text-center text-[10px]">
                <div>
                  <p className="font-semibold">Kepala Madrasah Yang Dinilai,</p>
                  <div className="h-12" />
                  <p className="font-bold underline">{principal.namaLengkap}</p>
                  <p className="font-mono text-[9px]">NIP. {principal.nip}</p>
                </div>

                <div>
                  <p className="font-semibold">Pengawas Madrasah Penilai Utama,</p>
                  <div className="h-12" />
                  <p className="font-bold underline">{evaluators.pengawas1Nama}</p>
                  <p className="font-mono text-[9px]">NIP. {evaluators.pengawas1Nip}</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
