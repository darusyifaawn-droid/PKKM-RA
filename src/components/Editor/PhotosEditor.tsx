import React, { useRef, useState } from 'react';
import { PhotoEvidenceItem, InstitutionProfile } from '../../types/ppkm';
import { 
  Camera, 
  Plus, 
  Trash2, 
  Upload, 
  Calendar, 
  Tag, 
  Image as ImageIcon, 
  Eye, 
  Trophy, 
  Users, 
  UserCheck, 
  CheckCircle2, 
  Sparkles, 
  Building2, 
  Handshake, 
  Smile, 
  Presentation 
} from 'lucide-react';

interface PhotosEditorProps {
  photoEvidences: PhotoEvidenceItem[];
  institution?: InstitutionProfile;
  onUpdatePhotoEvidences: (updated: PhotoEvidenceItem[]) => void;
  onUpdateInstitution?: (updated: Partial<InstitutionProfile>) => void;
  onNavigateToPrint: () => void;
  onNavigateToPresentation?: () => void;
}

const CATEGORIES: PhotoEvidenceItem['kategori'][] = [
  'Supervisi & Manajerial',
  'Prestasi Madrasah',
  'Fasilitas Madrasah',
  'Program Unggulan',
  'Ekstrakurikuler',
  'Lainnya',
];

export const PhotosEditor: React.FC<PhotosEditorProps> = ({
  photoEvidences,
  institution,
  onUpdatePhotoEvidences,
  onUpdateInstitution,
  onNavigateToPrint,
  onNavigateToPresentation,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeUploadCategory, setActiveUploadCategory] = useState<PhotoEvidenceItem['kategori']>('Program Unggulan');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dedicated refs for quick upload slots
  const supervisiInputRef = useRef<HTMLInputElement>(null);
  const tropiInputRef = useRef<HTMLInputElement>(null);
  const sarprasApeInputRef = useRef<HTMLInputElement>(null);
  const p5raInputRef = useRef<HTMLInputElement>(null);
  const mouInputRef = useRef<HTMLInputElement>(null);
  const closingInputRef = useRef<HTMLInputElement>(null);

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
    if (e.target) e.target.value = '';
  };

  const handleQuickSlotUpload = (
    category: PhotoEvidenceItem['kategori'],
    defaultJudul: string,
    defaultDeskripsi: string,
    dataUrl: string,
    extraCallback?: () => void
  ) => {
    // Check if an item with similar category or title already exists, if so update it, otherwise prepend
    const existingIndex = photoEvidences.findIndex(
      (p) => p.kategori === category && p.judul.toLowerCase().includes(defaultJudul.toLowerCase().slice(0, 8))
    );

    if (existingIndex !== -1) {
      const next = [...photoEvidences];
      next[existingIndex] = {
        ...next[existingIndex],
        fotoUrl: dataUrl,
      };
      onUpdatePhotoEvidences(next);
    } else {
      const newItem: PhotoEvidenceItem = {
        id: 'photo_' + Date.now(),
        kategori: category,
        judul: defaultJudul,
        deskripsi: defaultDeskripsi,
        tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        fotoUrl: dataUrl,
      };
      onUpdatePhotoEvidences([newItem, ...photoEvidences]);
    }

    extraCallback?.();
  };

  const handleMultipleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: PhotoEvidenceItem[] = [];
    let count = 0;

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          newItems.push({
            id: 'photo_' + Date.now() + '_' + index,
            kategori: activeUploadCategory,
            judul: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
            deskripsi: 'Dokumentasi bukti fisik kegiatan madrasah yang diverifikasi untuk PKKM.',
            tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
            fotoUrl: event.target.result,
          });
          count++;
          if (count === files.length) {
            onUpdatePhotoEvidences([...newItems, ...photoEvidences]);
          }
        }
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  const handleUpdateItem = (id: string, field: keyof PhotoEvidenceItem, value: any) => {
    const updated = photoEvidences.map((p) => (p.id === id ? { ...p, [field]: value } : p));
    onUpdatePhotoEvidences(updated);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Hapus foto bukti fisik ini?')) {
      onUpdatePhotoEvidences(photoEvidences.filter((p) => p.id !== id));
    }
  };

  // Find preview images for quick slots
  const supervisiItem = photoEvidences.find((p) => p.kategori === 'Supervisi & Manajerial' || p.judul.toLowerCase().includes('supervisi'));
  const tropiItem = photoEvidences.find((p) => p.kategori === 'Prestasi Madrasah' || p.judul.toLowerCase().includes('juara') || p.judul.toLowerCase().includes('tropi') || p.judul.toLowerCase().includes('piala'));
  const sarprasItem = photoEvidences.find((p) => p.kategori === 'Fasilitas Madrasah' || p.judul.toLowerCase().includes('ape') || p.judul.toLowerCase().includes('bermain'));
  const p5raItem = photoEvidences.find((p) => p.judul.toLowerCase().includes('p5') || p.judul.toLowerCase().includes('market'));
  const mouItem = photoEvidences.find((p) => p.judul.toLowerCase().includes('mou') || p.judul.toLowerCase().includes('puskesmas') || p.judul.toLowerCase().includes('mitra'));

  const filteredPhotos = photoEvidences.filter((p) => {
    if (selectedCategory === 'ALL') return true;
    return p.kategori === selectedCategory;
  });

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      
      {/* ============================================================== */}
      {/* 1. TOP BANNER & QUICK LINKS                                     */}
      {/* ============================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-700" />
              <span>Pusat Unggah Foto Bukti Fisik PKKM & Slide Presentasi</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Setiap foto yang diunggah di sini otomatis <strong>ditayangkan utuh di Slide Presentasi PPT</strong> dan dicetak rapi pada Album Bukti Fisik A4.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {onNavigateToPresentation && (
              <button
                onClick={onNavigateToPresentation}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
              >
                <Presentation className="w-3.5 h-3.5 text-emerald-700" />
                <span>Buka Slide PPT</span>
              </button>
            )}
            <button
              onClick={onNavigateToPrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Album Cetak A4</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. DEDICATED SLOTS: BUKTI WAJIB YANG DITANYAKAN PENILAI       */}
        {/* ============================================================== */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Slot Unggah Foto Bukti Wajib PKKM (Otomatis Masuk PPT & Laporan)</span>
            </span>
            <span className="text-[11px] text-emerald-700 font-medium">Klik tombol "Unggah" pada masing-masing kebutuhan</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            
            {/* Slot A: Supervisi Kelas */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 hover:bg-white hover:border-emerald-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>1. Dok. Supervisi Kelas</span>
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-900">
                    Slide 14 & 17
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">Foto Kepala RA saat supervisi & mengamati guru mengajar di kelas</p>
                <div className="h-28 w-full rounded-lg bg-white border border-slate-200 overflow-hidden mb-2 flex items-center justify-center p-1">
                  <img
                    src={supervisiItem?.fotoUrl || institution?.fotoSupervisiUrl || "/src/assets/images/foto_kegiatan_3_1792427238258.jpg"}
                    alt="Supervisi Kelas"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
              <div>
                <input
                  ref={supervisiInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleFileUpload(e, (url) => {
                      handleQuickSlotUpload(
                        'Supervisi & Manajerial',
                        'Dokumentasi Supervisi Pembelajaran di Kelas',
                        'Kepala RA melaksanakan observasi supervisi klinis pembelajaran guru di kelas.',
                        url,
                        () => onUpdateInstitution?.({ fotoSupervisiUrl: url })
                      );
                    })
                  }
                />
                <button
                  onClick={() => supervisiInputRef.current?.click()}
                  className="w-full py-1 px-2 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-md flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Upload className="w-3 h-3 text-emerald-700" />
                  <span>Unggah Foto Supervisi</span>
                </button>
              </div>
            </div>

            {/* Slot B: Tropi & Lomba */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 hover:bg-white hover:border-emerald-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-600" />
                    <span>2. Foto Tropi / Lomba</span>
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-900">
                    Slide 19
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">Piala kejuaraan siswa (Tahfidz, mewarnai) atau prestasi guru</p>
                <div className="h-28 w-full rounded-lg bg-white border border-slate-200 overflow-hidden mb-2 flex items-center justify-center p-1">
                  <img
                    src={tropiItem?.fotoUrl || institution?.fotoTropiUrl || "/src/assets/images/foto_kegiatan_4_1792427248962.jpg"}
                    alt="Tropi & Lomba"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
              <div>
                <input
                  ref={tropiInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleFileUpload(e, (url) => {
                      handleQuickSlotUpload(
                        'Prestasi Madrasah',
                        'Dokumentasi Tropi & Prestasi Lomba Siswa/Guru',
                        'Piala kejuaraan dan penghargaan perlombaan tingkat kecamatan, kabupaten dan provinsi.',
                        url,
                        () => onUpdateInstitution?.({ fotoTropiUrl: url })
                      );
                    })
                  }
                />
                <button
                  onClick={() => tropiInputRef.current?.click()}
                  className="w-full py-1 px-2 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-md flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Upload className="w-3 h-3 text-emerald-700" />
                  <span>Unggah Foto Tropi / Lomba</span>
                </button>
              </div>
            </div>

            {/* Slot C: Fasilitas Bermain & APE */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 hover:bg-white hover:border-emerald-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Smile className="w-3.5 h-3.5 text-teal-600" />
                    <span>3. Sarpras & APE Bermain</span>
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-teal-100 text-teal-900">
                    Slide 7 & 8
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">Arena bermain outdoor, ayunan, perosotan, atau sentra balok</p>
                <div className="h-28 w-full rounded-lg bg-white border border-slate-200 overflow-hidden mb-2 flex items-center justify-center p-1">
                  <img
                    src={sarprasItem?.fotoUrl || "/src/assets/images/sarpras_ape_bermain_1792723675926.jpg"}
                    alt="Sarpras APE"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
              <div>
                <input
                  ref={sarprasApeInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleFileUpload(e, (url) => {
                      handleQuickSlotUpload(
                        'Fasilitas Madrasah',
                        'Fasilitas Bermain Ramah Anak & APE Edukatif',
                        'Sarana prasarana arena bermain ramah anak indoor & outdoor berstandar PAUD/RA.',
                        url
                      );
                    })
                  }
                />
                <button
                  onClick={() => sarprasApeInputRef.current?.click()}
                  className="w-full py-1 px-2 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-md flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Upload className="w-3 h-3 text-emerald-700" />
                  <span>Unggah Foto APE Bermain</span>
                </button>
              </div>
            </div>

            {/* Slot D: Kegiatan P5-RA & Market Day */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 hover:bg-white hover:border-emerald-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>4. P5-RA / Market Day</span>
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-purple-100 text-purple-900">
                    Slide 15
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">Projek Pelajar Rahmatan Lil Alamin, market day cilik anak</p>
                <div className="h-28 w-full rounded-lg bg-white border border-slate-200 overflow-hidden mb-2 flex items-center justify-center p-1">
                  <img
                    src={p5raItem?.fotoUrl || "/src/assets/images/foto_kegiatan_1_1792427218693.jpg"}
                    alt="P5-RA"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
              <div>
                <input
                  ref={p5raInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleFileUpload(e, (url) => {
                      handleQuickSlotUpload(
                        'Program Unggulan',
                        'Kegiatan Projek P5-RA & Market Day Anak Usia Dini',
                        'Edukasi kemandirian, gotong royong, dan kewirausahaan sejak usia dini.',
                        url
                      );
                    })
                  }
                />
                <button
                  onClick={() => p5raInputRef.current?.click()}
                  className="w-full py-1 px-2 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-md flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Upload className="w-3 h-3 text-emerald-700" />
                  <span>Unggah Foto P5-RA / Market Day</span>
                </button>
              </div>
            </div>

            {/* Slot E: MoU & Kemitraan */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 hover:bg-white hover:border-emerald-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Handshake className="w-3.5 h-3.5 text-blue-600" />
                    <span>5. MoU / Kemitraan</span>
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-blue-100 text-blue-900">
                    Slide 16
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">Kerja sama Puskesmas (pemeriksaan kesehatan gigi/gizi), Polsek/Lembaga</p>
                <div className="h-28 w-full rounded-lg bg-white border border-slate-200 overflow-hidden mb-2 flex items-center justify-center p-1">
                  <img
                    src={mouItem?.fotoUrl || "/src/assets/images/foto_kegiatan_2_1792427228800.jpg"}
                    alt="Kemitraan MoU"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
              <div>
                <input
                  ref={mouInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleFileUpload(e, (url) => {
                      handleQuickSlotUpload(
                        'Program Unggulan',
                        'Kerja Sama Kemitraan (MoU) dengan Puskesmas & Instansi',
                        'Pemeriksaan rutin kesehatan anak, tumbuh kembang gizi, dan sosialisasi parenting.',
                        url
                      );
                    })
                  }
                />
                <button
                  onClick={() => mouInputRef.current?.click()}
                  className="w-full py-1 px-2 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-md flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Upload className="w-3 h-3 text-emerald-700" />
                  <span>Unggah Foto MoU Kemitraan</span>
                </button>
              </div>
            </div>

            {/* Slot F: Foto Bersama Dewan Guru, Staf & Komite (Penutup) */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 hover:bg-white hover:border-emerald-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-800" />
                    <span>6. Foto Kebersamaan Dewan Guru</span>
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-200 text-emerald-950">
                    Slide Penutup
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">Foto bersama seluruh guru, staf, dan pengurus komite RA</p>
                <div className="h-28 w-full rounded-lg bg-white border border-slate-200 overflow-hidden mb-2 flex items-center justify-center p-1">
                  <img
                    src={institution?.fotoBersamaUrl || "/src/assets/images/foto_guru_komite_1792723695121.jpg"}
                    alt="Foto Bersama Penutup"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
              <div>
                <input
                  ref={closingInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleFileUpload(e, (url) => {
                      onUpdateInstitution?.({ fotoBersamaUrl: url });
                      handleQuickSlotUpload(
                        'Lainnya',
                        'Foto Bersama Seluruh Dewan Guru, Staf & Komite RA',
                        'Dokumentasi resmi kekompakan dan dedikasi keluarga besar madrasah untuk slide penutup.',
                        url
                      );
                    })
                  }
                />
                <button
                  onClick={() => closingInputRef.current?.click()}
                  className="w-full py-1 px-2 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-md flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Upload className="w-3 h-3 text-emerald-700" />
                  <span>Unggah Foto Bersama Penutup</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. MULTI-UPLOAD ZONE FOR ADDITIONAL ACTIVITIES                 */}
        {/* ============================================================== */}
        <div className="bg-slate-50/80 border-2 border-dashed border-emerald-300 rounded-xl p-5 text-center hover:bg-emerald-50/20 transition-colors">
          <div className="max-w-md mx-auto space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>

            <div>
              <p className="text-xs font-bold text-slate-800">
                Unggah Banyak Foto Sekaligus (Multi-Upload)
              </p>
              <p className="text-[11px] text-slate-500">
                Pilih puluhan foto kegiatan madrasah dari HP/Komputer. Seluruh foto yang diunggah akan otomatis dibuatkan slide tersendiri pada presentasi PPT!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-600 font-medium">Kategori:</span>
                <select
                  value={activeUploadCategory}
                  onChange={(e) => setActiveUploadCategory(e.target.value as any)}
                  className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs font-semibold text-emerald-900"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleMultipleFiles}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Pilih Banyak File Foto</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. DAFTAR SEMUA FOTO DOKUMEN & KEGIATAN                       */}
      {/* ============================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">
              Koleksi Foto Kegiatan ({photoEvidences.length} Foto Tersimpan)
            </span>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Tampil di Slide PPT & Album A4
            </span>
          </div>

          {/* Filter Kategori */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                selectedCategory === 'ALL'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({photoEvidences.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = photoEvidences.filter((p) => p.kategori === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid Foto Kegiatan */}
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">Belum ada foto dalam kategori ini</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Silakan gunakan tombol unggah di atas untuk menambahkan foto bukti fisik.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPhotos.map((photo, index) => (
              <div
                key={photo.id}
                className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Foto Container - Uncropped Display */}
                  <div className="h-44 w-full bg-slate-100 border-b border-slate-200 relative flex items-center justify-center p-1.5 group">
                    <img
                      src={photo.fotoUrl}
                      alt={photo.judul}
                      className="max-h-full max-w-full object-contain"
                    />
                    <div className="absolute top-2 left-2 bg-emerald-950/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-sm backdrop-blur-xs">
                      #{index + 1} • {photo.kategori}
                    </div>
                  </div>

                  {/* Field Input Metadata */}
                  <div className="p-3 space-y-2 text-xs">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-0.5">Judul Kegiatan</label>
                      <input
                        type="text"
                        value={photo.judul}
                        onChange={(e) => handleUpdateItem(photo.id, 'judul', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded-md font-semibold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500"
                        placeholder="Contoh: Kegiatan P5-RA Membatik"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-0.5">Kategori</label>
                        <select
                          value={photo.kategori}
                          onChange={(e) => handleUpdateItem(photo.id, 'kategori', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs text-slate-700 font-medium"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-0.5">Tanggal</label>
                        <input
                          type="text"
                          value={photo.tanggal || ''}
                          onChange={(e) => handleUpdateItem(photo.id, 'tanggal', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs text-slate-700 font-mono"
                          placeholder="12 Mei 2026"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-0.5">Keterangan / Uraian</label>
                      <textarea
                        rows={2}
                        value={photo.deskripsi}
                        onChange={(e) => handleUpdateItem(photo.id, 'deskripsi', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded-md text-[11px] text-slate-700 resize-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="Deskripsi bukti fisik untuk tim penilai PKKM..."
                      />
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-3 pt-0 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-emerald-800 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Tampil di Slide PPT</span>
                  </span>

                  <button
                    onClick={() => handleDeleteItem(photo.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Hapus foto ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
