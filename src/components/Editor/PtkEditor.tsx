import React, { useState } from 'react';
import { PtkItem } from '../../types/ppkm';
import { Plus, Trash2, Edit2, Users, Search, CheckCircle2 } from 'lucide-react';

interface PtkEditorProps {
  ptkList: PtkItem[];
  onUpdatePtkList: (updated: PtkItem[]) => void;
}

export const PtkEditor: React.FC<PtkEditorProps> = ({ ptkList, onUpdatePtkList }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formState, setFormState] = useState<PtkItem>({
    id: '',
    nama: '',
    nip: '',
    statusPegawai: 'PNS',
    tugas: '',
    pendidikanTerakhir: 'S-1',
    statusSertifikasi: 'SERTIFIKASI',
  });

  const handleAddNew = () => {
    const newItem: PtkItem = {
      id: Date.now().toString(),
      nama: 'Guru Baru, S.Pd',
      nip: '-',
      statusPegawai: 'NON PNS',
      tugas: 'Guru Kelas / Mapel',
      pendidikanTerakhir: 'S-1',
      statusSertifikasi: 'BELUM SERTIFIKASI',
    };
    onUpdatePtkList([...ptkList, newItem]);
    setFormState(newItem);
    setIsEditing(newItem.id);
  };

  const handleStartEdit = (item: PtkItem) => {
    setFormState({ ...item });
    setIsEditing(item.id);
  };

  const handleSaveEdit = () => {
    if (!formState.nama.trim()) return;
    const updated = ptkList.map((item) => (item.id === formState.id ? formState : item));
    onUpdatePtkList(updated);
    setIsEditing(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus data PTK ini?')) {
      onUpdatePtkList(ptkList.filter((item) => item.id !== id));
      if (isEditing === id) setIsEditing(null);
    }
  };

  // Metrics
  const totalPtk = ptkList.length;
  const countPns = ptkList.filter((p) => p.statusPegawai === 'PNS').length;
  const countPppk = ptkList.filter((p) => p.statusPegawai === 'PPPK').length;
  const countNonPns = ptkList.filter((p) => p.statusPegawai === 'NON PNS').length;
  const countSertifikasi = ptkList.filter((p) => p.statusSertifikasi === 'SERTIFIKASI').length;

  const filteredList = ptkList.filter((item) => {
    const matchSearch =
      item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tugas.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nip.includes(searchTerm);
    if (!matchSearch) return false;
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'SERTIFIKASI') return item.statusSertifikasi === 'SERTIFIKASI';
    return item.statusPegawai === filterStatus;
  });

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-700" />
              <span>Daftar Pendidik & Tenaga Kependidikan (PTK)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Data guru dan tenaga kependidikan untuk lampiran profil dan penilaian kepemimpinan PPKM.
            </p>
          </div>

          <button
            onClick={handleAddNew}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Guru / Pegawai</span>
          </button>
        </div>

        {/* PTK Summary Stat Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-slate-500 block">Total PTK</span>
            <span className="text-lg font-bold text-slate-900 tabular-nums">{totalPtk}</span>
            <span className="text-[10px] text-slate-400 block">Personil</span>
          </div>
          <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-100">
            <span className="text-emerald-700 block">Guru PNS</span>
            <span className="text-lg font-bold text-emerald-800 tabular-nums">{countPns}</span>
            <span className="text-[10px] text-emerald-600 block">Orang</span>
          </div>
          <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-100">
            <span className="text-blue-700 block">Guru PPPK</span>
            <span className="text-lg font-bold text-blue-800 tabular-nums">{countPppk}</span>
            <span className="text-[10px] text-blue-600 block">Orang</span>
          </div>
          <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-100">
            <span className="text-amber-700 block">Non PNS / Honorer</span>
            <span className="text-lg font-bold text-amber-800 tabular-nums">{countNonPns}</span>
            <span className="text-[10px] text-amber-600 block">Orang</span>
          </div>
          <div className="bg-purple-50/60 p-3 rounded-lg border border-purple-100 col-span-2 sm:col-span-1">
            <span className="text-purple-700 block">Sertifikasi</span>
            <span className="text-lg font-bold text-purple-800 tabular-nums">{countSertifikasi}</span>
            <span className="text-[10px] text-purple-600 block">Pendidik</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama guru, NIP, atau tugas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-slate-100 rounded-lg text-xs">
            {['ALL', 'PNS', 'PPPK', 'NON PNS', 'SERTIFIKASI'].map((key) => (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap font-medium ${
                  filterStatus === key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {key === 'ALL' ? 'Semua' : key}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inline Edit Modal / Drawer if active */}
      {isEditing && (
        <div className="bg-emerald-50/40 border border-emerald-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-100 mb-4">
            <h3 className="text-xs font-bold text-emerald-900">
              Form Edit Data Pendidik & Tenaga Kependidikan
            </h3>
            <span className="text-[11px] text-emerald-700">Simpan perubahan untuk memperbarui berkas</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nama Lengkap & Gelar</label>
              <input
                type="text"
                value={formState.nama}
                onChange={(e) => setFormState({ ...formState, nama: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">NIP (Jika ada / tanda '-')</label>
              <input
                type="text"
                value={formState.nip}
                onChange={(e) => setFormState({ ...formState, nip: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Status Kepegawaian</label>
              <select
                value={formState.statusPegawai}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    statusPegawai: e.target.value as 'PNS' | 'PPPK' | 'NON PNS',
                  })
                }
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-hidden"
              >
                <option value="PNS">PNS</option>
                <option value="PPPK">PPPK</option>
                <option value="NON PNS">NON PNS</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Tugas / Mata Pelajaran / Kelas</label>
              <input
                type="text"
                value={formState.tugas}
                onChange={(e) => setFormState({ ...formState, tugas: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                placeholder="Contoh: Guru Kelas 4 A, Guru SKI, dsb."
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Pendidikan Terakhir</label>
              <input
                type="text"
                value={formState.pendidikanTerakhir}
                onChange={(e) => setFormState({ ...formState, pendidikanTerakhir: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-hidden"
                placeholder="S-1, S-2, SMP, dsb."
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Status Sertifikasi Guru</label>
              <select
                value={formState.statusSertifikasi}
                onChange={(e) => setFormState({ ...formState, statusSertifikasi: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-hidden"
              >
                <option value="SERTIFIKASI">SERTIFIKASI</option>
                <option value="BELUM SERTIFIKASI">BELUM SERTIFIKASI</option>
                <option value="-">- (Non Guru / Tendik)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-emerald-100">
            <button
              onClick={() => setIsEditing(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-md"
            >
              Batal
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors"
            >
              Simpan Data PTK
            </button>
          </div>
        </div>
      )}

      {/* PTK Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold">
                <th className="py-2.5 px-3 text-center w-12">No</th>
                <th className="py-2.5 px-4">Nama Lengkap & NIP</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-4">Tugas / Amanah</th>
                <th className="py-2.5 px-3 text-center">Pendidikan</th>
                <th className="py-2.5 px-3 text-center">Sertifikasi</th>
                <th className="py-2.5 px-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.map((ptk, index) => (
                <tr key={ptk.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 text-center text-slate-500 font-medium tabular-nums">
                    {index + 1}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="font-semibold text-slate-900">{ptk.nama}</div>
                    <div className="text-[11px] text-slate-500 font-mono">NIP: {ptk.nip}</div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-sm font-medium text-[11px] ${
                        ptk.statusPegawai === 'PNS'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : ptk.statusPegawai === 'PPPK'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {ptk.statusPegawai}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-800 font-medium">{ptk.tugas}</td>
                  <td className="py-2.5 px-3 text-center text-slate-700">{ptk.pendidikanTerakhir}</td>
                  <td className="py-2.5 px-3 text-center">
                    {ptk.statusSertifikasi === 'SERTIFIKASI' ? (
                      <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Sertifikasi</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">{ptk.statusSertifikasi}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleStartEdit(ptk)}
                        className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-sm transition-colors"
                        title="Edit PTK"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ptk.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                    Tidak ada data guru atau tenaga kependidikan yang sesuai pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
