import React, { useRef } from 'react';
import { InstitutionProfile, PrincipalProfile, EvaluatorProfile } from '../../types/ppkm';
import { Building2, UserCheck, Shield, Upload, RefreshCw } from 'lucide-react';

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
            Data kepegawaian dan kepemimpinan yang dinilai dalam PPKM.
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
            <label className="block font-medium text-slate-700 mb-1">Periode Penilaian PPKM</label>
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
            Data penilai PPKM dan pejabat Kementerian Agama yang menandatangani berkas.
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

    </div>
  );
};
