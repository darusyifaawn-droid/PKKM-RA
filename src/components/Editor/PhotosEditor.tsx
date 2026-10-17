import React, { useRef, useState } from 'react';
import { PhotoEvidenceItem } from '../../types/ppkm';
import { Camera, Plus, Trash2, Upload, Calendar, Tag, Image as ImageIcon, Eye } from 'lucide-react';

interface PhotosEditorProps {
  photoEvidences: PhotoEvidenceItem[];
  onUpdatePhotoEvidences: (updated: PhotoEvidenceItem[]) => void;
  onNavigateToPrint: () => void;
}

const CATEGORIES: PhotoEvidenceItem['kategori'][] = [
  'Fasilitas Madrasah',
  'Program Unggulan',
  'Ekstrakurikuler',
  'Prestasi Madrasah',
  'Supervisi & Manajerial',
  'Lainnya',
];

export const PhotosEditor: React.FC<PhotosEditorProps> = ({
  photoEvidences,
  onUpdatePhotoEvidences,
  onNavigateToPrint,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeUploadCategory, setActiveUploadCategory] = useState<PhotoEvidenceItem['kategori']>('Program Unggulan');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMultipleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          const newItem: PhotoEvidenceItem = {
            id: 'photo_' + Date.now() + '_' + index,
            kategori: activeUploadCategory,
            judul: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
            deskripsi: 'Dokumentasi bukti fisik pelaksanaan kegiatan madrasah.',
            tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
            fotoUrl: event.target.result,
          };
          onUpdatePhotoEvidences([...photoEvidences, newItem]);
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

  const filteredPhotos = photoEvidences.filter((p) => {
    if (selectedCategory === 'ALL') return true;
    return p.kategori === selectedCategory;
  });

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      
      {/* Upload Banner Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-700" />
              <span>Manajemen Foto Bukti Fisik & Dokumentasi Kegiatan</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Unggah langsung dokumentasi kegiatan madrasah Anda (bisa banyak foto sekaligus). Sistem otomatis merapikan ukuran dan tata letak cetak A4.
            </p>
          </div>

          <button
            onClick={onNavigateToPrint}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap self-start md:self-auto"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Lihat Hasil Cetak Album A4</span>
          </button>
        </div>

        {/* Upload Zone */}
        <div className="bg-slate-50/80 border-2 border-dashed border-emerald-200 rounded-xl p-6 text-center hover:bg-emerald-50/20 transition-colors">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-800">
                Pilih atau Tarik Foto Bahan Kegiatan ke Sini
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dukungan format foto JPG, PNG, atau WEBP (dapat memilih lebih dari 1 file sekaligus).
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-600 font-medium">Kategori default:</span>
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
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md shadow-xs transition-colors"
              >
                Pilih File Foto dari Perangkat
              </button>
            </div>
          </div>
        </div>

        {/* Filter Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 mt-4 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium mr-1 shrink-0">Filter Kategori:</span>
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
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
                className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Photos Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPhotos.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between"
          >
            {/* Image Preview Container */}
            <div className="relative aspect-video w-full bg-slate-100 overflow-hidden group">
              <img
                src={item.fotoUrl}
                alt={item.judul}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-semibold px-2 py-0.5 rounded-sm">
                {item.kategori}
              </div>
              <button
                onClick={() => handleDeleteItem(item.id)}
                className="absolute top-2 right-2 p-1.5 bg-red-600/90 text-white rounded-sm hover:bg-red-700 transition-colors shadow-xs"
                title="Hapus Foto"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Editable Meta form */}
            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                  Judul Foto / Kegiatan
                </label>
                <input
                  type="text"
                  value={item.judul}
                  onChange={(e) => handleUpdateItem(item.id, 'judul', e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  placeholder="Contoh: Pembiasaan Shalat Dhuha Berjamaah"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                    Kategori Bukti Fisik
                  </label>
                  <select
                    value={item.kategori}
                    onChange={(e) => handleUpdateItem(item.id, 'kategori', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-hidden"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                    Tanggal Pelaksanaan
                  </label>
                  <input
                    type="text"
                    value={item.tanggal || ''}
                    onChange={(e) => handleUpdateItem(item.id, 'tanggal', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md focus:outline-hidden"
                    placeholder="Contoh: 15 September 2026"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                  Keterangan / Deskripsi Resmi (Muncul di Cetak A4)
                </label>
                <textarea
                  rows={2}
                  value={item.deskripsi}
                  onChange={(e) => handleUpdateItem(item.id, 'deskripsi', e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-slate-700 focus:outline-hidden leading-relaxed"
                  placeholder="Tuliskan uraian kegiatan, pihak yang terlibat, dan hasil..."
                />
              </div>
            </div>
          </div>
        ))}

        {filteredPhotos.length === 0 && (
          <div className="col-span-1 md:col-span-2 bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
            <ImageIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">Belum ada foto dalam kategori ini.</p>
            <p className="text-xs mt-1">Gunakan tombol unggah di atas untuk menambahkan foto kegiatan.</p>
          </div>
        )}
      </div>

    </div>
  );
};
