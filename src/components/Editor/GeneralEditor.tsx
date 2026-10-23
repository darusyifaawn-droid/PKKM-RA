import React, { useRef } from 'react';
import { InstitutionProfile, PrincipalProfile, EvaluatorProfile, SocialMediaInfo, AccreditationDetail } from '../../types/ppkm';
import { 
  Building2, 
  UserCheck, 
  Shield, 
  Upload, 
  RefreshCw, 
  Share2, 
  ShieldCheck, 
  Award, 
  Globe, 
  Youtube, 
  Instagram, 
  Facebook, 
  Phone, 
  Mail, 
  Sparkles, 
  FileText,
  MessageSquare
} from 'lucide-react';

interface GeneralEditorProps {
  institution: InstitutionProfile;
  principal: PrincipalProfile;
  evaluators: EvaluatorProfile;
  onUpdateInstitution: (updated: Partial<InstitutionProfile>) => void;
  onUpdatePrincipal: (updated: Partial<PrincipalProfile>) => void;
  onUpdateEvaluators: (updated: Partial<EvaluatorProfile>) => void;
}

export const GeneralEditor: React.FC<GeneralEditorProps> = ({
  institution,
  principal,
  evaluators,
  onUpdateInstitution,
  onUpdatePrincipal,
  onUpdateEvaluators,
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const principalPhotoInputRef = useRef<HTMLInputElement>(null);
  const buildingPhotoInputRef = useRef<HTMLInputElement>(null);
  const accreditationCertInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    callback: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        callback(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-6 px-4">
      
      {/* SECTION 1: FOTO & LOGO DOKUMEN RESMI */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-700" />
            <span>Unggah Logo & Foto Identitas Dokumen</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Foto ini akan otomatis diletakkan pada cover resmi, lembar profil, dan berkas cetak A4.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Logo Kemenag / Madrasah */}
          <div className="border border-slate-200 rounded-lg p-4 flex flex-col items-center text-center bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-700 mb-3">Logo Kemenag / Lambang Lembaga</span>
            <div className="w-24 h-24 rounded-lg bg-white border border-slate-200 p-2 flex items-center justify-center overflow-hidden mb-3 shadow-xs">
              <img
                src={institution.logoUrl}
                alt="Logo Lembaga"
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, (url) => onUpdateInstitution({ logoUrl: url }))}
            />
            <button
              onClick={() => logoInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ganti Logo</span>
            </button>
            <span className="text-[11px] text-slate-400 mt-2">Format PNG/JPG/WebP</span>
          </div>

          {/* Foto Resmi Kepala Madrasah */}
          <div className="border border-slate-200 rounded-lg p-4 flex flex-col items-center text-center bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-700 mb-3">Foto Resmi Kepala Madrasah</span>
            <div className="w-24 h-28 rounded-md bg-white border border-slate-200 overflow-hidden mb-3 shadow-xs">
              <img
                src={principal.fotoUrl}
                alt="Foto Kepala Madrasah"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <input
              ref={principalPhotoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, (url) => onUpdatePrincipal({ fotoUrl: url }))}
            />
            <button
              onClick={() => principalPhotoInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ganti Foto Profil</span>
            </button>
            <span className="text-[11px] text-slate-400 mt-2">Ukuran pasfoto formal 3x4 / 4x6</span>
          </div>

          {/* Foto Gedung Madrasah */}
          <div className="border border-slate-200 rounded-lg p-4 flex flex-col items-center text-center bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-700 mb-3">Foto Gedung Utama Madrasah</span>
            <div className="w-36 h-28 rounded-md bg-white border border-slate-200 overflow-hidden mb-3 shadow-xs">
              <img
                src={institution.fotoMadrasahUrl}
                alt="Foto Gedung Madrasah"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <input
              ref={buildingPhotoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, (url) => onUpdateInstitution({ fotoMadrasahUrl: url }))}
            />
            <button
              onClick={() => buildingPhotoInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ganti Foto Gedung</span>
            </button>
            <span className="text-[11px] text-slate-400 mt-2">Tampak depan bangunan utama</span>
          </div>

        </div>
      </section>

      {/* SECTION 2: IDENTITAS KEPALA MADRASAH */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-700" />
            <span>Identitas & Biodata Kepala Madrasah</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Data kepegawaian dan kepemimpinan yang dinilai dalam PKKM.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Nama Lengkap & Gelar</label>
            <input
              type="text"
              value={principal.namaLengkap}
              onChange={(e) => onUpdatePrincipal({ namaLengkap: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="Contoh: Hj. Kuniah, S.Ag"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">NIP (Nomor Induk Pegawai)</label>
            <input
              type="text"
              value={principal.nip}
              onChange={(e) => onUpdatePrincipal({ nip: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="196705061991032005"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Pangkat / Golongan Ruang</label>
            <input
              type="text"
              value={principal.pangkatGol}
              onChange={(e) => onUpdatePrincipal({ pangkatGol: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="Pembina Tk.I / IVc"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Status Kepegawaian</label>
            <input
              type="text"
              value={principal.statusPegawai}
              onChange={(e) => onUpdatePrincipal({ statusPegawai: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="PNS / PPPK / Non PNS"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">NUPTK</label>
            <input
              type="text"
              value={principal.nuptk}
              onChange={(e) => onUpdatePrincipal({ nuptk: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="4838745649300012"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">NPK (Nomor Pendidik Kemenag)</label>
            <input
              type="text"
              value={principal.npk}
              onChange={(e) => onUpdatePrincipal({ npk: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="4670260065061"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Tempat & Tanggal Lahir</label>
            <input
              type="text"
              value={principal.tempatTanggalLahir}
              onChange={(e) => onUpdatePrincipal({ tempatTanggalLahir: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="Cirebon, 06-Mei-1967"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Pendidikan Terakhir</label>
            <input
              type="text"
              value={principal.pendidikanTerakhir}
              onChange={(e) => onUpdatePrincipal({ pendidikanTerakhir: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="S-1 Tarbiyah / S-2 Manajemen Pendidikan"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">TMT Jabatan Kepala Madrasah</label>
            <input
              type="text"
              value={principal.tmtJabatan}
              onChange={(e) => onUpdatePrincipal({ tmtJabatan: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="01 Juli 2022"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Jenis Kelamin</label>
            <select
              value={principal.jenisKelamin}
              onChange={(e) => onUpdatePrincipal({ jenisKelamin: e.target.value as 'Laki-laki' | 'Perempuan' })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="Perempuan">Perempuan</option>
              <option value="Laki-laki">Laki-laki</option>
            </select>
          </div>
        </div>
      </section>

      {/* SECTION 3: PROFIL MADRASAH / LEMBAGA */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-700" />
            <span>Profil Satuan Pendidikan / Madrasah</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Data kelembagaan, legalitas, akreditasi, dan wilayah administrasi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Nama Lembaga Madrasah</label>
            <input
              type="text"
              value={institution.namaLembaga}
              onChange={(e) => onUpdateInstitution({ namaLembaga: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-semibold"
              placeholder="Contoh: MI NEGERI 8 CIREBON"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Status Lembaga</label>
            <select
              value={institution.status}
              onChange={(e) => onUpdateInstitution({ status: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="Negeri">Negeri</option>
              <option value="Swasta">Swasta</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">NSM (Nomor Statistik Madrasah)</label>
            <input
              type="text"
              value={institution.nsm}
              onChange={(e) => onUpdateInstitution({ nsm: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="111132090005"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">NPSM</label>
            <input
              type="text"
              value={institution.npsm}
              onChange={(e) => onUpdateInstitution({ npsm: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="60708649"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Status Akreditasi</label>
            <input
              type="text"
              value={institution.akreditasi}
              onChange={(e) => onUpdateInstitution({ akreditasi: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="B Tahun 2024"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Tahun Pelajaran Berjalan</label>
            <input
              type="text"
              value={institution.tahunPelajaran}
              onChange={(e) => onUpdateInstitution({ tahunPelajaran: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="2026/2027"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Periode Penilaian PKKM</label>
            <input
              type="text"
              value={institution.periodePenilaian}
              onChange={(e) => onUpdateInstitution({ periodePenilaian: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="Tahun 2026 - 2029 (4 Tahunan) atau Tahunan"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Luas Tanah Seluruhnya</label>
            <input
              type="text"
              value={institution.luasTanah}
              onChange={(e) => onUpdateInstitution({ luasTanah: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="1.636 m²"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-medium text-slate-700 mb-1">Status Kepemilikan Tanah</label>
            <input
              type="text"
              value={institution.statusTanah}
              onChange={(e) => onUpdateInstitution({ statusTanah: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="Seluruhnya Bersertifikat a.n. Wakaf dan Kemenag RI"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-medium text-slate-700 mb-1">Alamat Lengkap</label>
            <input
              type="text"
              value={institution.alamat}
              onChange={(e) => onUpdateInstitution({ alamat: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="Jl. Bahagia Desa Kreyo"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Kecamatan</label>
            <input
              type="text"
              value={institution.kecamatan}
              onChange={(e) => onUpdateInstitution({ kecamatan: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="Klangenan"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Kota / Kabupaten & Provinsi</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={institution.kotaKab}
                onChange={(e) => onUpdateInstitution({ kotaKab: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden"
                placeholder="Kab. Cirebon"
              />
              <input
                type="text"
                value={institution.provinsi}
                onChange={(e) => onUpdateInstitution({ provinsi: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden"
                placeholder="Jawa Barat"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
            <input
              type="text"
              value={institution.telepon}
              onChange={(e) => onUpdateInstitution({ telepon: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden font-mono"
              placeholder="081312290690"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Alamat Email Resmi</label>
            <input
              type="email"
              value={institution.email}
              onChange={(e) => onUpdateInstitution({ email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden font-mono"
              placeholder="min_klangenan@yahoo.com"
            />
          </div>
        </div>
      </section>

      {/* SECTION 4: TIM PENILAI & PENGESAHAN */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-700" />
            <span>Tim Penilai (Pengawas Pembina) & Lembar Pengesahan</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Data penilai PKKM dan pejabat Kementerian Agama yang menandatangani berkas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Nama Pengawas Pembina 1 (Penilai Utama)</label>
            <input
              type="text"
              value={evaluators.pengawas1Nama}
              onChange={(e) => onUpdateEvaluators({ pengawas1Nama: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden"
              placeholder="Drs. H. Deni Octaviana, M.Pd.I"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">NIP Pengawas 1</label>
            <input
              type="text"
              value={evaluators.pengawas1Nip}
              onChange={(e) => onUpdateEvaluators({ pengawas1Nip: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono focus:outline-hidden"
              placeholder="197008121995031002"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Nama Pengawas Madrasah 2</label>
            <input
              type="text"
              value={evaluators.pengawas2Nama}
              onChange={(e) => onUpdateEvaluators({ pengawas2Nama: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden"
              placeholder="H. Maksum, S.Ag, M.Pd"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">NIP Pengawas 2</label>
            <input
              type="text"
              value={evaluators.pengawas2Nip}
              onChange={(e) => onUpdateEvaluators({ pengawas2Nip: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono focus:outline-hidden"
              placeholder="197204151998031003"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Nama Ketua Komite Madrasah</label>
            <input
              type="text"
              value={evaluators.komiteNama}
              onChange={(e) => onUpdateEvaluators({ komiteNama: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden"
              placeholder="Drs. H. Kosim"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Kepala Seksi Pendidikan Madrasah (Kasi Penmad)</label>
            <input
              type="text"
              value={evaluators.kasiPenmadNama}
              onChange={(e) => onUpdateEvaluators({ kasiPenmadNama: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden"
              placeholder="Dr. H. Aghits Nihayah, M.Ag"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Tanggal Pelaksanaan Penilaian</label>
            <input
              type="text"
              value={evaluators.tanggalPenilaian}
              onChange={(e) => onUpdateEvaluators({ tanggalPenilaian: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden"
              placeholder="20 Oktober 2026"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Tempat Penandatanganan</label>
            <input
              type="text"
              value={evaluators.tempatPenilaian}
              onChange={(e) => onUpdateEvaluators({ tempatPenilaian: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden"
              placeholder="Klangenan, Cirebon"
            />
          </div>
        </div>
      </section>

      {/* SECTION 5: MEDIA SOSIAL & INFORMASI PUBLIK (USER REQUEST PPT / COMPANY PROFILE) */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-emerald-700" />
              <span>Media Sosial & Saluran Informasi Publik (Company Profile)</span>
            </h2>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
              Tampil di Slide PPT
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Akun media sosial madrasah untuk keperluan Company Profile, publikasi digital, dan slide presentasi akreditasi/PKKM.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1 flex items-center gap-1.5">
              <Instagram className="w-3.5 h-3.5 text-pink-600" />
              <span>Akun Instagram (@username)</span>
            </label>
            <input
              type="text"
              value={institution.socialMedia?.instagram || ''}
              onChange={(e) =>
                onUpdateInstitution({
                  socialMedia: {
                    instagram: e.target.value,
                    youtube: institution.socialMedia?.youtube || '',
                    facebook: institution.socialMedia?.facebook || '',
                    tiktok: institution.socialMedia?.tiktok || '',
                    website: institution.socialMedia?.website || '',
                    whatsapp: institution.socialMedia?.whatsapp || '',
                    email: institution.socialMedia?.email || '',
                  },
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden font-mono"
              placeholder="@min8cirebon_official"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1 flex items-center gap-1.5">
              <Youtube className="w-3.5 h-3.5 text-red-600" />
              <span>Nama / Channel YouTube</span>
            </label>
            <input
              type="text"
              value={institution.socialMedia?.youtube || ''}
              onChange={(e) =>
                onUpdateInstitution({
                  socialMedia: {
                    instagram: institution.socialMedia?.instagram || '',
                    youtube: e.target.value,
                    facebook: institution.socialMedia?.facebook || '',
                    tiktok: institution.socialMedia?.tiktok || '',
                    website: institution.socialMedia?.website || '',
                    whatsapp: institution.socialMedia?.whatsapp || '',
                    email: institution.socialMedia?.email || '',
                  },
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden"
              placeholder="MIN 8 Cirebon TV"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1 flex items-center gap-1.5">
              <Facebook className="w-3.5 h-3.5 text-blue-600" />
              <span>Halaman Facebook</span>
            </label>
            <input
              type="text"
              value={institution.socialMedia?.facebook || ''}
              onChange={(e) =>
                onUpdateInstitution({
                  socialMedia: {
                    instagram: institution.socialMedia?.instagram || '',
                    youtube: institution.socialMedia?.youtube || '',
                    facebook: e.target.value,
                    tiktok: institution.socialMedia?.tiktok || '',
                    website: institution.socialMedia?.website || '',
                    whatsapp: institution.socialMedia?.whatsapp || '',
                    email: institution.socialMedia?.email || '',
                  },
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden"
              placeholder="MI Negeri 8 Cirebon Official"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>Website Resmi / Portal Madrasah</span>
            </label>
            <input
              type="text"
              value={institution.socialMedia?.website || ''}
              onChange={(e) =>
                onUpdateInstitution({
                  socialMedia: {
                    instagram: institution.socialMedia?.instagram || '',
                    youtube: institution.socialMedia?.youtube || '',
                    facebook: institution.socialMedia?.facebook || '',
                    tiktok: institution.socialMedia?.tiktok || '',
                    website: e.target.value,
                    whatsapp: institution.socialMedia?.whatsapp || '',
                    email: institution.socialMedia?.email || '',
                  },
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden font-mono"
              placeholder="https://min8cirebon.sch.id"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-green-600" />
              <span>WhatsApp Humas / Layanan Publik</span>
            </label>
            <input
              type="text"
              value={institution.socialMedia?.whatsapp || ''}
              onChange={(e) =>
                onUpdateInstitution({
                  socialMedia: {
                    instagram: institution.socialMedia?.instagram || '',
                    youtube: institution.socialMedia?.youtube || '',
                    facebook: institution.socialMedia?.facebook || '',
                    tiktok: institution.socialMedia?.tiktok || '',
                    website: institution.socialMedia?.website || '',
                    whatsapp: e.target.value,
                    email: institution.socialMedia?.email || '',
                  },
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden font-mono"
              placeholder="081312290690"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-purple-600" />
              <span>TikTok Madrasah (@username)</span>
            </label>
            <input
              type="text"
              value={institution.socialMedia?.tiktok || ''}
              onChange={(e) =>
                onUpdateInstitution({
                  socialMedia: {
                    instagram: institution.socialMedia?.instagram || '',
                    youtube: institution.socialMedia?.youtube || '',
                    facebook: institution.socialMedia?.facebook || '',
                    tiktok: e.target.value,
                    website: institution.socialMedia?.website || '',
                    whatsapp: institution.socialMedia?.whatsapp || '',
                    email: institution.socialMedia?.email || '',
                  },
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden font-mono"
              placeholder="@min8cirebon"
            />
          </div>
        </div>
      </section>

      {/* SECTION 6: AKREDITASI & UPLOAD SERTIFIKAT (USER REQUEST) */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <span>Sertifikat Akreditasi & Dokumen Legalitas (BAN-PDM / BAN-S/M)</span>
            </h2>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-sm border border-amber-200">
              Dokumen Resmi
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Unggah file foto / scan sertifikat akreditasi madrasah untuk ditampilkan di slide Company Profile dan lampiran portofolio PKKM.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Scan Certificate Upload & Preview */}
          <div className="md:col-span-5 border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center text-center">
            <span className="text-xs font-semibold text-slate-700 mb-2">Scan Sertifikat Akreditasi</span>
            
            <div className="w-full aspect-4/3 rounded-lg bg-white border border-slate-300 overflow-hidden mb-3 shadow-xs relative flex items-center justify-center">
              {institution.accreditationDetail?.sertifikatUrl ? (
                <img
                  src={institution.accreditationDetail.sertifikatUrl}
                  alt="Scan Sertifikat Akreditasi"
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <div className="text-center p-4">
                  <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <span className="text-xs text-slate-400">Belum ada scan sertifikat</span>
                </div>
              )}
            </div>

            <input
              ref={accreditationCertInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                handleFileUpload(e, (url) =>
                  onUpdateInstitution({
                    accreditationDetail: {
                      peringkat: institution.accreditationDetail?.peringkat || 'Terakreditasi B (Baik)',
                      nilaiAngka: institution.accreditationDetail?.nilaiAngka || '86',
                      nomorSk: institution.accreditationDetail?.nomorSk || '051/BAN-SM/SK/2024',
                      lembagaAkreditasi: institution.accreditationDetail?.lembagaAkreditasi || 'Badan Akreditasi Nasional Sekolah/Madrasah (BAN-S/M)',
                      tahunAkreditasi: institution.accreditationDetail?.tahunAkreditasi || '2024',
                      masaBerlaku: institution.accreditationDetail?.masaBerlaku || '2024 s/d 2029',
                      sertifikatUrl: url,
                    },
                  })
                )
              }
            />

            <button
              onClick={() => accreditationCertInputRef.current?.click()}
              className="px-3.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah Scan Sertifikat Akreditasi</span>
            </button>
            <span className="text-[11px] text-slate-400 mt-2">Dukungan format JPG, PNG, atau scan dokumen</span>
          </div>

          {/* Detailed Accreditation Fields */}
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Status / Peringkat Akreditasi</label>
              <input
                type="text"
                value={institution.accreditationDetail?.peringkat || institution.akreditasi || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateInstitution({
                    akreditasi: val,
                    accreditationDetail: {
                      peringkat: val,
                      nilaiAngka: institution.accreditationDetail?.nilaiAngka || '86',
                      nomorSk: institution.accreditationDetail?.nomorSk || '',
                      lembagaAkreditasi: institution.accreditationDetail?.lembagaAkreditasi || 'Badan Akreditasi Nasional Sekolah/Madrasah (BAN-S/M)',
                      tahunAkreditasi: institution.accreditationDetail?.tahunAkreditasi || '2024',
                      masaBerlaku: institution.accreditationDetail?.masaBerlaku || '2024 s/d 2029',
                      sertifikatUrl: institution.accreditationDetail?.sertifikatUrl || '',
                    },
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden"
                placeholder="Terakreditasi B (Baik) / A (Unggul)"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Nilai Angka Akreditasi</label>
              <input
                type="text"
                value={institution.accreditationDetail?.nilaiAngka || ''}
                onChange={(e) =>
                  onUpdateInstitution({
                    accreditationDetail: {
                      peringkat: institution.accreditationDetail?.peringkat || institution.akreditasi || 'Terakreditasi B',
                      nilaiAngka: e.target.value,
                      nomorSk: institution.accreditationDetail?.nomorSk || '',
                      lembagaAkreditasi: institution.accreditationDetail?.lembagaAkreditasi || 'BAN-S/M',
                      tahunAkreditasi: institution.accreditationDetail?.tahunAkreditasi || '2024',
                      masaBerlaku: institution.accreditationDetail?.masaBerlaku || '2024 s/d 2029',
                      sertifikatUrl: institution.accreditationDetail?.sertifikatUrl || '',
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden font-mono"
                placeholder="Contoh: 86 atau 92"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Nomor SK / Sertifikat Akreditasi</label>
              <input
                type="text"
                value={institution.accreditationDetail?.nomorSk || ''}
                onChange={(e) =>
                  onUpdateInstitution({
                    accreditationDetail: {
                      peringkat: institution.accreditationDetail?.peringkat || institution.akreditasi || 'Terakreditasi B',
                      nilaiAngka: institution.accreditationDetail?.nilaiAngka || '86',
                      nomorSk: e.target.value,
                      lembagaAkreditasi: institution.accreditationDetail?.lembagaAkreditasi || 'BAN-S/M',
                      tahunAkreditasi: institution.accreditationDetail?.tahunAkreditasi || '2024',
                      masaBerlaku: institution.accreditationDetail?.masaBerlaku || '2024 s/d 2029',
                      sertifikatUrl: institution.accreditationDetail?.sertifikatUrl || '',
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden font-mono"
                placeholder="051/BAN-SM/SK/2024"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Lembaga Akreditasi</label>
              <input
                type="text"
                value={institution.accreditationDetail?.lembagaAkreditasi || ''}
                onChange={(e) =>
                  onUpdateInstitution({
                    accreditationDetail: {
                      peringkat: institution.accreditationDetail?.peringkat || institution.akreditasi || 'Terakreditasi B',
                      nilaiAngka: institution.accreditationDetail?.nilaiAngka || '86',
                      nomorSk: institution.accreditationDetail?.nomorSk || '',
                      lembagaAkreditasi: e.target.value,
                      tahunAkreditasi: institution.accreditationDetail?.tahunAkreditasi || '2024',
                      masaBerlaku: institution.accreditationDetail?.masaBerlaku || '2024 s/d 2029',
                      sertifikatUrl: institution.accreditationDetail?.sertifikatUrl || '',
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden"
                placeholder="Badan Akreditasi Nasional Sekolah/Madrasah (BAN-S/M)"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Masa Berlaku Akreditasi</label>
              <input
                type="text"
                value={institution.accreditationDetail?.masaBerlaku || ''}
                onChange={(e) =>
                  onUpdateInstitution({
                    accreditationDetail: {
                      peringkat: institution.accreditationDetail?.peringkat || institution.akreditasi || 'Terakreditasi B',
                      nilaiAngka: institution.accreditationDetail?.nilaiAngka || '86',
                      nomorSk: institution.accreditationDetail?.nomorSk || '',
                      lembagaAkreditasi: institution.accreditationDetail?.lembagaAkreditasi || 'BAN-S/M',
                      tahunAkreditasi: institution.accreditationDetail?.tahunAkreditasi || '2024',
                      masaBerlaku: e.target.value,
                      sertifikatUrl: institution.accreditationDetail?.sertifikatUrl || '',
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden"
                placeholder="2024 s/d 2029 (5 Tahun)"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: MOTTO & SAMBUTAN / PRAKATA KEPALA MADRASAH (COMPANY PROFILE SLIDE) */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-700" />
              <span>Motto & Sambutan / Prakata Kepala Madrasah (Slide Pembuka)</span>
            </h2>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
              Slide 1 & 2 PPT
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Motto lembaga dan prakata resmi Kepala Madrasah yang menyambut kedatangan Asesor / Pengawas Pembina dalam presentasi.
          </p>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Motto / Slogan Madrasah</label>
            <input
              type="text"
              value={institution.motto || ''}
              onChange={(e) => onUpdateInstitution({ motto: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden text-slate-800 font-medium"
              placeholder="Contoh: Maju, Bermutu, Mandiri dan Berprestasi Berlandaskan Akhlakul Karimah"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Sambutan / Prakata Kepala Madrasah untuk Presentasi</label>
            <textarea
              rows={3}
              value={institution.sambutanKepala || ''}
              onChange={(e) => onUpdateInstitution({ sambutanKepala: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden text-slate-800 leading-relaxed"
              placeholder="Bismillaahirrohmaanirrohiim. Selamat datang para Asesor, Pengawas Pembina, dan seluruh Tim Penilai Kinerja Kepala Madrasah (PKKM)..."
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Teks ini akan otomatis ditampilkan dengan tata letak kutipan elegan di Slide 2 Presentasi.</span>
          </div>
        </div>
      </section>

    </div>
  );
};
