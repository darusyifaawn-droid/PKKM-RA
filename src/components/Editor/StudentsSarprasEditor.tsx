import React, { useState, useRef } from 'react';
import {
  StudentClassData,
  StudentTrendData,
  GraduateData,
  ParentDemographics,
  BuildingCondition,
  FacilityInventory,
  InstitutionProfile,
} from '../../types/ppkm';
import { 
  GraduationCap, 
  Landmark, 
  Plus, 
  Trash2, 
  Upload, 
  Globe, 
  Calendar, 
  Laptop, 
  Eye, 
  Image as ImageIcon, 
  Sparkles, 
  CheckCircle2 
} from 'lucide-react';

interface StudentsSarprasEditorProps {
  students: StudentClassData[];
  studentTrends: StudentTrendData[];
  graduates: GraduateData[];
  parentDemographics: ParentDemographics;
  buildings: BuildingCondition[];
  inventory: FacilityInventory[];
  institution?: InstitutionProfile;
  onUpdateStudents: (updated: StudentClassData[]) => void;
  onUpdateStudentTrends: (updated: StudentTrendData[]) => void;
  onUpdateGraduates: (updated: GraduateData[]) => void;
  onUpdateParentDemographics: (updated: ParentDemographics) => void;
  onUpdateBuildings: (updated: BuildingCondition[]) => void;
  onUpdateInventory: (updated: FacilityInventory[]) => void;
  onUpdateInstitution?: (updated: Partial<InstitutionProfile>) => void;
}

export const StudentsSarprasEditor: React.FC<StudentsSarprasEditorProps> = ({
  students,
  studentTrends,
  graduates,
  parentDemographics,
  buildings,
  inventory,
  institution,
  onUpdateStudents,
  onUpdateStudentTrends,
  onUpdateGraduates,
  onUpdateParentDemographics,
  onUpdateBuildings,
  onUpdateInventory,
  onUpdateInstitution,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'students' | 'sarpras' | 'digital_kaldik'>('sarpras');

  const websiteInputRef = useRef<HTMLInputElement>(null);
  const portalInputRef = useRef<HTMLInputElement>(null);
  const kaldikInputRef = useRef<HTMLInputElement>(null);

  // Helper for generic file upload to base64
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

  // Student calculations
  const totalL = students.reduce((acc, curr) => acc + (Number(curr.lakiLaki) || 0), 0);
  const totalP = students.reduce((acc, curr) => acc + (Number(curr.perempuan) || 0), 0);
  const totalStudents = totalL + totalP;

  // Buildings summary
  const totalLokal = buildings.reduce((acc, curr) => acc + (Number(curr.jumlahLokal) || 0), 0);
  const totalBaik = buildings.reduce((acc, curr) => acc + (Number(curr.baik) || 0), 0);
  const totalRusakRingan = buildings.reduce((acc, curr) => acc + (Number(curr.rusakRingan) || 0), 0);
  const totalRusakBerat = buildings.reduce((acc, curr) => acc + (Number(curr.rusakBerat) || 0), 0);

  // Student Class update helper
  const handleStudentChange = (index: number, field: 'lakiLaki' | 'perempuan' | 'kelas', value: string) => {
    const next = [...students];
    if (field === 'kelas') {
      next[index].kelas = value;
    } else {
      next[index][field] = parseInt(value, 10) || 0;
    }
    onUpdateStudents(next);
  };

  const handleAddClass = () => {
    onUpdateStudents([...students, { kelas: 'Kelompok Baru / Kelas', lakiLaki: 10, perempuan: 10 }]);
  };

  const handleRemoveClass = (index: number) => {
    onUpdateStudents(students.filter((_, i) => i !== index));
  };

  // Building condition update helper
  const handleBuildingChange = (index: number, field: keyof BuildingCondition, val: string | number) => {
    const next = [...buildings];
    if (field === 'jenisBangunan' || field === 'fotoUrl' || field === 'keterangan') {
      (next[index] as any)[field] = String(val);
    } else {
      (next[index][field] as number) = Number(val) || 0;
      next[index].jumlahLokal = (next[index].baik || 0) + (next[index].rusakRingan || 0) + (next[index].rusakBerat || 0);
    }
    onUpdateBuildings(next);
  };

  const handleAddBuilding = () => {
    onUpdateBuildings([
      ...buildings,
      {
        id: 'b_' + Date.now(),
        jenisBangunan: 'Ruang / Fasilitas Baru',
        jumlahLokal: 1,
        baik: 1,
        rusakRingan: 0,
        rusakBerat: 0,
      },
    ]);
  };

  // Inventory update helper
  const handleInventoryChange = (index: number, field: keyof FacilityInventory, val: string | number) => {
    const next = [...inventory];
    if (field === 'namaBarang' || field === 'fotoUrl' || field === 'kategori') {
      (next[index] as any)[field] = String(val);
    } else {
      (next[index][field] as number) = Number(val) || 0;
      next[index].jumlah = (next[index].baik || 0) + (next[index].rusakRingan || 0) + (next[index].rusakBerat || 0);
    }
    onUpdateInventory(next);
  };

  const handleAddInventory = () => {
    onUpdateInventory([
      ...inventory,
      {
        id: 'inv_' + Date.now(),
        namaBarang: 'Sarana / APE Baru',
        baik: 1,
        rusakRingan: 0,
        rusakBerat: 0,
        jumlah: 1,
        kategori: 'APE Indoor',
      },
    ]);
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      
      {/* Sub-tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-xl border border-slate-200 p-2 shadow-xs gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('sarpras')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === 'sarpras'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>1. Sarpras, APE & Fasilitas</span>
          </button>

          <button
            onClick={() => setActiveSubTab('digital_kaldik')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === 'digital_kaldik'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <Globe className="w-4 h-4 text-emerald-700" />
            <span>2. Website, Portal & KALDIK</span>
          </button>

          <button
            onClick={() => setActiveSubTab('students')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === 'students'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>3. Siswa (Kelompok/Kelas) & Demografi</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium px-2 hidden md:inline">
          {activeSubTab === 'sarpras' && `${totalLokal} Lokal Bangunan / Sarpras`}
          {activeSubTab === 'digital_kaldik' && 'Dokumen Digital & Kaldik Siap Tayang'}
          {activeSubTab === 'students' && `${totalStudents} Siswa (${students.length} Rombel)`}
        </span>
      </div>

      {/* ============================================================== */}
      {/* SUBTAB 1: KONDISI GEDUNG & SARPRAS (DENGAN UPLOAD FOTO)       */}
      {/* ============================================================== */}
      {activeSubTab === 'sarpras' && (
        <div className="space-y-6">
          
          {/* Banner Upload Foto Sarpras */}
          <div className="bg-emerald-950 text-white p-4 sm:p-5 rounded-2xl border border-emerald-800 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Foto Sarana Prasarana & APE Unggulan</span>
              </span>
              <h3 className="text-sm sm:text-base font-bold">
                Unggah Foto Fasilitas untuk Ditayangkan di Slide PPT & Dokumen A4
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl">
                Setiap foto sarpras (taman bermain, APE indoor/outdoor, ruang kelas, musholla) yang Anda unggah akan otomatis ditampilkan pada Slide 3 & Slide 5 presentasi, serta pada portofolio cetak.
              </p>
            </div>
          </div>

          {/* Galeri Visual Foto Sarpras Terkini */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-emerald-700" />
              <span>Galeri Foto Fasilitas & Alat Permainan Edukatif (APE)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {buildings.filter(b => b.fotoUrl).slice(0, 3).map((b, idx) => (
                <div key={b.id || idx} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col">
                  <div className="aspect-16/9 w-full bg-slate-200 relative overflow-hidden group">
                    <img 
                      src={b.fotoUrl} 
                      alt={b.jenisBangunan} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                    />
                    <div className="absolute top-2 left-2 bg-emerald-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                      {b.jenisBangunan}
                    </div>
                  </div>
                  <div className="p-3 text-xs flex-1 flex flex-col justify-between">
                    <p className="text-slate-600 line-clamp-2">{b.keterangan || 'Sarana prasarana penunjang kegiatan belajar madrasah.'}</p>
                    <label className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-200 rounded-lg font-medium text-[11px] cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <span>Ganti Foto</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, (url) => {
                          const idx = buildings.findIndex(item => item.id === b.id);
                          if (idx !== -1) handleBuildingChange(idx, 'fotoUrl', url);
                        })}
                      />
                    </label>
                  </div>
                </div>
              ))}

              {/* Upload Item APE Card */}
              <div className="border-2 border-dashed border-emerald-300 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-emerald-50/40 hover:bg-emerald-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">Unggah Foto APE / Sarpras Baru</h4>
                <p className="text-[11px] text-slate-500 mt-1 mb-3">Foto APE indoor/outdoor, ruang sentra, atau gedung</p>
                <label className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Pilih File Foto</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleFileUpload(e, (url) => {
                      onUpdateBuildings([
                        ...buildings,
                        {
                          id: 'b_' + Date.now(),
                          jenisBangunan: 'Fasilitas / APE Baru',
                          jumlahLokal: 1,
                          baik: 1,
                          rusakRingan: 0,
                          rusakBerat: 0,
                          fotoUrl: url,
                          keterangan: 'Fasilitas sarana prasarana baru madrasah/RA.'
                        }
                      ]);
                    })}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Tabel Gedung dan Bangunan */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Keadaan Gedung, Ruang Sentra dan Fasilitas
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Input jumlah lokal, kondisi fisik, serta unggah file foto untuk masing-masing ruangan.
                </p>
              </div>
              <button
                onClick={handleAddBuilding}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Fasilitas</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold">
                    <th className="py-2.5 px-3 text-center w-12">No</th>
                    <th className="py-2.5 px-3">Fasilitas / Ruangan</th>
                    <th className="py-2.5 px-3 text-center w-28">Foto Fasilitas</th>
                    <th className="py-2.5 px-3 text-center">Jumlah</th>
                    <th className="py-2.5 px-3 text-center text-emerald-700">Baik</th>
                    <th className="py-2.5 px-3 text-center text-amber-700">Rusak Ringan</th>
                    <th className="py-2.5 px-3 text-center text-red-700">Rusak Berat</th>
                    <th className="py-2.5 px-3 text-center w-12">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {buildings.map((b, index) => (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 text-center text-slate-500 tabular-nums">{index + 1}</td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={b.jenisBangunan}
                          onChange={(e) => handleBuildingChange(index, 'jenisBangunan', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-full font-medium"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {b.fotoUrl ? (
                            <div className="relative group w-8 h-8 rounded-md overflow-hidden border border-slate-300">
                              <img src={b.fotoUrl} alt="Foto" className="w-full h-full object-cover" />
                            </div>
                          ) : null}
                          <label className="p-1 px-2 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-300 cursor-pointer whitespace-nowrap">
                            <span>{b.fotoUrl ? 'Ganti' : 'Upload'}</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handleFileUpload(e, (url) => handleBuildingChange(index, 'fotoUrl', url))}
                            />
                          </label>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold tabular-nums">
                        {(Number(b.baik) || 0) + (Number(b.rusakRingan) || 0) + (Number(b.rusakBerat) || 0)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          value={b.baik}
                          onChange={(e) => handleBuildingChange(index, 'baik', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-14 text-center font-mono text-emerald-700"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          value={b.rusakRingan}
                          onChange={(e) => handleBuildingChange(index, 'rusakRingan', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-14 text-center font-mono text-amber-700"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          value={b.rusakBerat}
                          onChange={(e) => handleBuildingChange(index, 'rusakBerat', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-14 text-center font-mono text-red-700"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => onUpdateBuildings(buildings.filter((item) => item.id !== b.id))}
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold border-t border-slate-300">
                    <td colSpan={3} className="py-2 px-4 text-center">TOTAL LOKAL & FASILITAS</td>
                    <td className="py-2 px-3 text-center font-mono tabular-nums">{totalLokal}</td>
                    <td className="py-2 px-3 text-center font-mono text-emerald-800 tabular-nums">{totalBaik}</td>
                    <td className="py-2 px-3 text-center font-mono text-amber-800 tabular-nums">{totalRusakRingan}</td>
                    <td className="py-2 px-3 text-center font-mono text-red-800 tabular-nums">{totalRusakBerat}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Inventaris Alat Permainan Edukatif (APE) & Perlengkapan Belajar */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Daftar Alat Permainan Edukatif (APE Indoor/Outdoor) & Sarana Pembelajaran
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  APE balok, puzzle, perosotan, ayunan, meja sentra, infocus, dan sarana kreativitas santri.
                </p>
              </div>
              <button
                onClick={handleAddInventory}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah APE / Sarana</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold">
                    <th className="py-2.5 px-3 text-center w-12">No</th>
                    <th className="py-2.5 px-3">Nama Alat / Sarana APE</th>
                    <th className="py-2.5 px-3 text-center w-28">Kategori</th>
                    <th className="py-2.5 px-3 text-center text-emerald-700">Baik</th>
                    <th className="py-2.5 px-3 text-center text-amber-700">Rusak Ringan</th>
                    <th className="py-2.5 px-3 text-center text-red-700">Rusak Berat</th>
                    <th className="py-2.5 px-3 text-center font-bold">Total Unit</th>
                    <th className="py-2.5 px-3 text-center w-12">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventory.map((inv, index) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 text-center text-slate-500 tabular-nums">{index + 1}</td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={inv.namaBarang}
                          onChange={(e) => handleInventoryChange(index, 'namaBarang', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-full font-medium"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <select
                          value={inv.kategori || 'Umum'}
                          onChange={(e) => handleInventoryChange(index, 'kategori', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md text-[11px] bg-white font-medium"
                        >
                          <option value="APE Indoor">APE Indoor</option>
                          <option value="APE Outdoor">APE Outdoor</option>
                          <option value="Kelas">Kelas</option>
                          <option value="IT / Media">IT / Media</option>
                          <option value="Umum">Umum</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          value={inv.baik}
                          onChange={(e) => handleInventoryChange(index, 'baik', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-14 text-center font-mono text-emerald-700"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          value={inv.rusakRingan}
                          onChange={(e) => handleInventoryChange(index, 'rusakRingan', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-14 text-center font-mono text-amber-700"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          value={inv.rusakBerat}
                          onChange={(e) => handleInventoryChange(index, 'rusakBerat', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-14 text-center font-mono text-red-700"
                        />
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900 font-mono tabular-nums">
                        {(Number(inv.baik) || 0) + (Number(inv.rusakRingan) || 0) + (Number(inv.rusakBerat) || 0)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => onUpdateInventory(inventory.filter((item) => item.id !== inv.id))}
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* SUBTAB 2: WEBSITE, PORTAL SISWA & KALDIK (USER REQUEST)        */}
      {/* ============================================================== */}
      {activeSubTab === 'digital_kaldik' && (
        <div className="space-y-6">

          {/* Section 1: Beranda Website & Portal Siswa */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-700" />
                  <span>Tangkapan Layar Beranda Website & Portal Siswa Madrasah</span>
                </h3>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
                  Tampil di Slide 4 PPT (Komponen A)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Unggah foto tangkapan layar beranda website resmi dan portal siswa/wali murid untuk membuktikan implementasi digitalisasi madrasah.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card 1: Beranda Website */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center text-center">
                <span className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Foto Beranda Website Madrasah</span>
                </span>
                <span className="text-[11px] text-slate-500 mb-3">Tampilan antarmuka beranda website portal & PPDB</span>

                <div className="w-full aspect-16/9 rounded-lg bg-white border border-slate-300 overflow-hidden mb-3 shadow-xs relative flex items-center justify-center group">
                  {institution?.websiteScreenshotUrl ? (
                    <img
                      src={institution.websiteScreenshotUrl}
                      alt="Beranda Website"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <Globe className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <span className="text-xs text-slate-400">Belum ada screenshot website</span>
                    </div>
                  )}
                </div>

                <input
                  ref={websiteInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleFileUpload(e, (url) =>
                      onUpdateInstitution?.({ websiteScreenshotUrl: url })
                    )
                  }
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => websiteInputRef.current?.click()}
                    className="px-3.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah Screenshot Website</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Portal Siswa & Wali Murid */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center text-center">
                <span className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Foto Portal Siswa & Wali Murid / LMS</span>
                </span>
                <span className="text-[11px] text-slate-500 mb-3">Tampilan portal absensi, jadwal & buku penghubung</span>

                <div className="w-full aspect-16/9 rounded-lg bg-white border border-slate-300 overflow-hidden mb-3 shadow-xs relative flex items-center justify-center group">
                  {institution?.portalSiswaScreenshotUrl ? (
                    <img
                      src={institution.portalSiswaScreenshotUrl}
                      alt="Portal Siswa"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <Laptop className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <span className="text-xs text-slate-400">Belum ada screenshot portal</span>
                    </div>
                  )}
                </div>

                <input
                  ref={portalInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleFileUpload(e, (url) =>
                      onUpdateInstitution?.({ portalSiswaScreenshotUrl: url })
                    )
                  }
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => portalInputRef.current?.click()}
                    className="px-3.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah Screenshot Portal</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Section 2: KALDIK (Kalender Pendidikan) */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-700" />
                  <span>Dokumen KALDIK (Kalender Pendidikan Madrasah / RA)</span>
                </h3>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
                  Tampil di Slide 5 PPT (Komponen B)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Kalender Pendidikan resmi khusus RA/Madrasah yang disinkronkan dengan Kalender Pendidikan Kemenag setempat untuk Semester Ganjil & Genap.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* Kaldik Scan Preview */}
              <div className="md:col-span-5 border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center text-center">
                <span className="text-xs font-semibold text-slate-700 mb-2">Scan Dokumen KALDIK</span>

                <div className="w-full aspect-4/3 rounded-lg bg-white border border-slate-300 overflow-hidden mb-3 shadow-xs relative flex items-center justify-center">
                  {institution?.kaldikUrl ? (
                    <img
                      src={institution.kaldikUrl}
                      alt="Kalender Pendidikan"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <span className="text-xs text-slate-400">Belum ada scan Kaldik</span>
                    </div>
                  )}
                </div>

                <input
                  ref={kaldikInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleFileUpload(e, (url) =>
                      onUpdateInstitution?.({ kaldikUrl: url })
                    )
                  }
                />

                <button
                  onClick={() => kaldikInputRef.current?.click()}
                  className="px-3.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah Scan Dokumen KALDIK</span>
                </button>
                <span className="text-[11px] text-slate-400 mt-1.5">Format JPG / PNG / PDF Scan</span>
              </div>

              {/* Kaldik Settings & Details */}
              <div className="md:col-span-7 space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tahun Pelajaran KALDIK</label>
                  <input
                    type="text"
                    value={institution?.kaldikTahun || institution?.tahunPelajaran || '2026/2027'}
                    onChange={(e) => onUpdateInstitution?.({ kaldikTahun: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden font-semibold text-slate-900"
                    placeholder="Contoh: Tahun Pelajaran 2026/2027"
                  />
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Kegunaan KALDIK pada Penilaian PKKM:</span>
                  </h4>
                  <ul className="list-disc list-inside text-slate-700 space-y-1 pl-1 leading-relaxed text-[11px]">
                    <li>Bukti perencanaan pelaksanaan pembelajaran anak usia dini/madrasah selama 1 tahun penuh.</li>
                    <li>Dasar penyusunan Program Semester (Prosem), Rencana Pelaksanaan Pembelajaran Mingguan (RPPM), dan RPPH / Modul Ajar.</li>
                    <li>Sinkronisasi jadwal asesmen madrasah, pekan libur semester, dan perayaan hari besar Islam.</li>
                  </ul>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* SUBTAB 3: DATA SISWA & DEMOGRAFI                              */}
      {/* ============================================================== */}
      {activeSubTab === 'students' && (
        <div className="space-y-6">
          
          {/* Tabel Siswa per Rombel */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Data Siswa per Kelompok / Kelas (Tahun Berjalan)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribusi siswa laki-laki dan perempuan per rombel (Kelompok A, B, atau Kelas I-VI).
                </p>
              </div>
              <button
                onClick={handleAddClass}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Rombel</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold">
                    <th className="py-2.5 px-3 text-center w-12">No</th>
                    <th className="py-2.5 px-4">Nama Rombel / Kelompok</th>
                    <th className="py-2.5 px-3 text-center">Laki-Laki</th>
                    <th className="py-2.5 px-3 text-center">Perempuan</th>
                    <th className="py-2.5 px-3 text-center font-bold">Jumlah Total</th>
                    <th className="py-2.5 px-3 text-center w-12">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((cls, index) => (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 text-center text-slate-500 tabular-nums">{index + 1}</td>
                      <td className="py-2 px-4">
                        <input
                          type="text"
                          value={cls.kelas}
                          onChange={(e) => handleStudentChange(index, 'kelas', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-full font-medium"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          value={cls.lakiLaki}
                          onChange={(e) => handleStudentChange(index, 'lakiLaki', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-20 text-center font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          value={cls.perempuan}
                          onChange={(e) => handleStudentChange(index, 'perempuan', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-20 text-center font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900 font-mono tabular-nums">
                        {(Number(cls.lakiLaki) || 0) + (Number(cls.perempuan) || 0)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleRemoveClass(index)}
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold border-t border-slate-300">
                    <td colSpan={2} className="py-2 px-4 text-center">TOTAL KESELURUHAN</td>
                    <td className="py-2 px-3 text-center font-mono tabular-nums">{totalL}</td>
                    <td className="py-2 px-3 text-center font-mono tabular-nums">{totalP}</td>
                    <td className="py-2 px-3 text-center font-mono text-emerald-800 text-sm tabular-nums">{totalStudents}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Perkembangan Siswa 4 Tahun */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
              Perkembangan Jumlah Siswa 4 Tahun Terakhir
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold">
                    <th className="py-2 px-4">Tahun Pelajaran</th>
                    <th className="py-2 px-3 text-center">Laki-Laki</th>
                    <th className="py-2 px-3 text-center">Perempuan</th>
                    <th className="py-2 px-3 text-center">Jumlah Rombel</th>
                    <th className="py-2 px-3 text-center font-bold">Total Siswa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentTrends.map((st, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-4 font-semibold text-slate-800">{st.tahun}</td>
                      <td className="py-2 px-3 text-center font-mono">{st.lakiLaki}</td>
                      <td className="py-2 px-3 text-center font-mono">{st.perempuan}</td>
                      <td className="py-2 px-3 text-center font-mono">{st.rombel}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700">{st.lakiLaki + st.perempuan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
