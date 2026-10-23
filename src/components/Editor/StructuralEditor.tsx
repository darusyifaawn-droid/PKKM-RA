import React, { useState } from 'react';
import { StructuralPosition, PtkItem } from '../../types/ppkm';
import { GitFork, Plus, Trash2, Edit3, Check, RotateCcw, User, Layers, ArrowUpDown } from 'lucide-react';

interface StructuralEditorProps {
  structuralPositions: StructuralPosition[];
  ptkList: PtkItem[];
  onUpdateStructuralPositions: (updated: StructuralPosition[]) => void;
}

export const StructuralEditor: React.FC<StructuralEditorProps> = ({
  structuralPositions,
  ptkList,
  onUpdateStructuralPositions,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');

  const [formState, setFormState] = useState<StructuralPosition>({
    id: '',
    jabatan: '',
    nama: '',
    tingkat: 'Seksi',
    keterangan: '',
    urutan: structuralPositions.length + 1,
  });

  const handleAddNew = () => {
    const newItem: StructuralPosition = {
      id: 'st_' + Date.now(),
      jabatan: 'Koordinator / Sie Baru',
      nama: 'Nama Pejabat / Guru',
      tingkat: 'Seksi',
      keterangan: 'Tupoksi bidang kerja',
      urutan: structuralPositions.length + 1,
    };
    onUpdateStructuralPositions([...structuralPositions, newItem]);
    setFormState(newItem);
    setEditingId(newItem.id);
  };

  const handleStartEdit = (pos: StructuralPosition) => {
    setFormState({ ...pos });
    setEditingId(pos.id);
  };

  const handleSaveEdit = () => {
    if (!formState.jabatan.trim() || !formState.nama.trim()) return;
    const updated = structuralPositions.map((p) => (p.id === formState.id ? formState : p));
    onUpdateStructuralPositions(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus jabatan struktural ini?')) {
      onUpdateStructuralPositions(structuralPositions.filter((p) => p.id !== id));
      if (editingId === id) setEditingId(null);
    }
  };

  const filteredPositions = structuralPositions.filter((p) => {
    if (filterLevel === 'ALL') return true;
    return p.tingkat === filterLevel;
  });

  const pimpinanList = structuralPositions.filter((p) => p.tingkat === 'Pimpinan');
  const manajemenList = structuralPositions.filter((p) => p.tingkat === 'Manajemen');
  const seksiList = structuralPositions.filter((p) => p.tingkat === 'Seksi');
  const guruList = structuralPositions.filter((p) => p.tingkat === 'Guru');
  const stafList = structuralPositions.filter((p) => p.tingkat === 'Staf/Layanan');

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <GitFork className="w-5 h-5 text-emerald-700" />
              <span>Manajemen & Edit Struktur Organisasi Madrasah</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Atur posisi pimpinan, tata usaha, bendahara, seksi madrasah, dan koordinator dewan guru. Perubahan akan otomatis tertera pada bagan cetak A4.
            </p>
          </div>

          <button
            onClick={handleAddNew}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs whitespace-nowrap self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jabatan Struktural</span>
          </button>
        </div>

        {/* Visual Diagram Preview Summary */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200">
          <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block mb-3 text-center">
            Pratinjau Hirarki Bagan Struktur Organisasi
          </span>

          <div className="flex flex-col items-center gap-2 text-xs">
            {/* Level 1: Pimpinan */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {pimpinanList.map((p) => (
                <div key={p.id} className="bg-white border-2 border-emerald-800/80 px-3 py-1.5 rounded-md text-center shadow-xs">
                  <span className="text-[9px] uppercase font-bold text-emerald-800 block">{p.jabatan}</span>
                  <strong className="text-slate-900 text-xs">{p.nama}</strong>
                </div>
              ))}
            </div>

            {pimpinanList.length > 0 && <div className="w-px h-3 bg-slate-300" />}

            {/* Level 2: Manajemen */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {manajemenList.map((p) => (
                <div key={p.id} className="bg-white border border-slate-300 px-3 py-1 rounded-md text-center shadow-xs">
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block">{p.jabatan}</span>
                  <strong className="text-slate-800 text-xs">{p.nama}</strong>
                </div>
              ))}
            </div>

            {manajemenList.length > 0 && <div className="w-px h-3 bg-slate-300" />}

            {/* Level 3: Seksi */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl">
              {seksiList.map((p) => (
                <div key={p.id} className="bg-white border border-slate-200 px-2.5 py-1 rounded-sm text-center text-[11px]">
                  <span className="text-[9px] text-emerald-700 block font-medium">{p.jabatan}</span>
                  <span className="font-semibold text-slate-800">{p.nama}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Level Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 mt-4 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium mr-1 shrink-0">Filter Tingkat:</span>
          {['ALL', 'Pimpinan', 'Manajemen', 'Seksi', 'Guru', 'Staf/Layanan'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-3 py-1 rounded-md font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                filterLevel === lvl
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {lvl === 'ALL' ? 'Semua Jabatan' : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Inline Form if Editing */}
      {editingId && (
        <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-100 mb-4">
            <h3 className="text-xs font-bold text-emerald-900">
              Form Edit Jabatan Struktural
            </h3>
            <span className="text-[11px] text-emerald-700">Simpan untuk memperbarui struktur organisasi</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nama Jabatan Struktural</label>
              <input
                type="text"
                value={formState.jabatan}
                onChange={(e) => setFormState({ ...formState, jabatan: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-semibold"
                placeholder="Contoh: Sie Kurikulum & Pembelajaran"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-medium text-slate-700">Nama Pejabat</label>
                {/* Quick picker from PTK */}
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      setFormState({ ...formState, nama: e.target.value });
                    }
                  }}
                  className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xs px-1 cursor-pointer"
                >
                  <option value="">Pilih dari PTK...</option>
                  {ptkList.map((ptk) => (
                    <option key={ptk.id} value={ptk.nama}>
                      {ptk.nama}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={formState.nama}
                onChange={(e) => setFormState({ ...formState, nama: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                placeholder="Nama pejabat atau dewan guru"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Tingkatan / Level</label>
              <select
                value={formState.tingkat}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    tingkat: e.target.value as any,
                  })
                }
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-hidden"
              >
                <option value="Pimpinan">Pimpinan (Kepala, Komite, Pengawas)</option>
                <option value="Manajemen">Manajemen (TU, Bendahara)</option>
                <option value="Seksi">Seksi (Kurikulum, Kesiswaan, Humas, Sarpras)</option>
                <option value="Guru">Guru / Koordinator Tingkat Kelas</option>
                <option value="Staf/Layanan">Staf / Penjaga / Layanan</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Keterangan / Tupoksi</label>
              <input
                type="text"
                value={formState.keterangan || ''}
                onChange={(e) => setFormState({ ...formState, keterangan: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-hidden"
                placeholder="Deskripsi singkat tugas jabatan..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-emerald-100">
            <button
              onClick={() => setEditingId(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-md cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors cursor-pointer"
            >
              Simpan Jabatan
            </button>
          </div>
        </div>
      )}

      {/* Structural Positions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold">
                <th className="py-2.5 px-3 text-center w-12">No</th>
                <th className="py-2.5 px-4">Nama Jabatan Struktural</th>
                <th className="py-2.5 px-4">Nama Pejabat / Pemegang Jabatan</th>
                <th className="py-2.5 px-3 text-center w-28">Tingkat</th>
                <th className="py-2.5 px-4">Tupoksi / Keterangan</th>
                <th className="py-2.5 px-3 text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPositions.map((pos, index) => (
                <tr key={pos.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 text-center text-slate-500 font-medium tabular-nums">
                    {index + 1}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">
                    {pos.jabatan}
                  </td>
                  <td className="py-2.5 px-4 text-emerald-950 font-semibold">
                    {pos.nama}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-sm font-semibold text-[11px] ${
                        pos.tingkat === 'Pimpinan'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : pos.tingkat === 'Manajemen'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : pos.tingkat === 'Seksi'
                          ? 'bg-purple-50 text-purple-800 border border-purple-200'
                          : pos.tingkat === 'Guru'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {pos.tingkat}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                    {pos.keterangan || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleStartEdit(pos)}
                        className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-sm transition-colors cursor-pointer"
                        title="Edit Jabatan"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(pos.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-colors cursor-pointer"
                        title="Hapus Jabatan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
