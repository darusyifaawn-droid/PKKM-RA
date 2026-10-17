import React, { useState } from 'react';
import {
  StudentClassData,
  StudentTrendData,
  GraduateData,
  ParentDemographics,
  BuildingCondition,
  FacilityInventory,
} from '../../types/ppkm';
import { GraduationCap, Landmark, Plus, Trash2, PieChart, ShieldAlert } from 'lucide-react';

interface StudentsSarprasEditorProps {
  students: StudentClassData[];
  studentTrends: StudentTrendData[];
  graduates: GraduateData[];
  parentDemographics: ParentDemographics;
  buildings: BuildingCondition[];
  inventory: FacilityInventory[];
  onUpdateStudents: (updated: StudentClassData[]) => void;
  onUpdateStudentTrends: (updated: StudentTrendData[]) => void;
  onUpdateGraduates: (updated: GraduateData[]) => void;
  onUpdateParentDemographics: (updated: ParentDemographics) => void;
  onUpdateBuildings: (updated: BuildingCondition[]) => void;
  onUpdateInventory: (updated: FacilityInventory[]) => void;
}

export const StudentsSarprasEditor: React.FC<StudentsSarprasEditorProps> = ({
  students,
  studentTrends,
  graduates,
  parentDemographics,
  buildings,
  inventory,
  onUpdateStudents,
  onUpdateStudentTrends,
  onUpdateGraduates,
  onUpdateParentDemographics,
  onUpdateBuildings,
  onUpdateInventory,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'students' | 'sarpras'>('students');

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
    onUpdateStudents([...students, { kelas: 'Kelas Baru', lakiLaki: 10, perempuan: 10 }]);
  };

  const handleRemoveClass = (index: number) => {
    onUpdateStudents(students.filter((_, i) => i !== index));
  };

  // Building condition update helper
  const handleBuildingChange = (index: number, field: keyof BuildingCondition, val: string | number) => {
    const next = [...buildings];
    if (field === 'jenisBangunan') {
      next[index].jenisBangunan = String(val);
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
        jenisBangunan: 'Ruang Baru',
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
    if (field === 'namaBarang') {
      next[index].namaBarang = String(val);
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
        namaBarang: 'Barang Inventaris Baru',
        baik: 1,
        rusakRingan: 0,
        rusakBerat: 0,
        jumlah: 1,
      },
    ]);
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      
      {/* Sub-tab Navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-2 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('students')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'students'
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Data Siswa & Demografi</span>
          </button>

          <button
            onClick={() => setActiveSubTab('sarpras')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'sarpras'
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Kondisi Gedung & Sarpras (BMN)</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium px-3 hidden sm:inline">
          {activeSubTab === 'students' ? `Total: ${totalStudents} Siswa (${students.length} Rombel)` : `Total: ${totalLokal} Lokal Bangunan`}
        </span>
      </div>

      {/* VIEW 1: DATA SISWA & DEMOGRAFI */}
      {activeSubTab === 'students' && (
        <div className="space-y-6">
          
          {/* Tabel Siswa per Rombel */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Data Siswa per Kelas / Rombongan Belajar (Tahun Berjalan)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribusi siswa laki-laki dan perempuan per rombel.
                </p>
              </div>
              <button
                onClick={handleAddClass}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kelas</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold">
                    <th className="py-2.5 px-3 text-center w-12">No</th>
                    <th className="py-2.5 px-4">Nama Kelas / Rombel</th>
                    <th className="py-2.5 px-3 text-center">Laki - Laki</th>
                    <th className="py-2.5 px-3 text-center">Perempuan</th>
                    <th className="py-2.5 px-3 text-center font-bold">Jumlah</th>
                    <th className="py-2.5 px-3 text-center w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 text-center text-slate-500 font-medium tabular-nums">
                        {index + 1}
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="text"
                          value={item.kelas}
                          onChange={(e) => handleStudentChange(index, 'kelas', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-36 font-medium text-slate-800"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          value={item.lakiLaki}
                          onChange={(e) => handleStudentChange(index, 'lakiLaki', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-20 text-center font-mono tabular-nums"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          value={item.perempuan}
                          onChange={(e) => handleStudentChange(index, 'perempuan', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-20 text-center font-mono tabular-nums"
                        />
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900 font-mono tabular-nums">
                        {(Number(item.lakiLaki) || 0) + (Number(item.perempuan) || 0)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleRemoveClass(index)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-emerald-50/60 font-bold text-emerald-950 border-t-2 border-emerald-200">
                    <td colSpan={2} className="py-2.5 px-4 text-center">
                      JUMLAH TOTAL SISWA
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono tabular-nums">{totalL}</td>
                    <td className="py-2.5 px-3 text-center font-mono tabular-nums">{totalP}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-800 font-mono text-sm tabular-nums">
                      {totalStudents}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Perkembangan Siswa 4 Tahun & Kelulusan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Tabel Perkembangan Siswa 4 Tahun */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
                Tabel Perkembangan Siswa (4 Tahun Terakhir)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="py-2 px-2 text-center">Tahun</th>
                      <th className="py-2 px-2 text-center">L</th>
                      <th className="py-2 px-2 text-center">P</th>
                      <th className="py-2 px-2 text-center font-bold">Total</th>
                      <th className="py-2 px-2 text-center">Rombel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentTrends.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-1.5 px-2 text-center font-medium">{t.tahun}</td>
                        <td className="py-1.5 px-2 text-center font-mono tabular-nums">{t.lakiLaki}</td>
                        <td className="py-1.5 px-2 text-center font-mono tabular-nums">{t.perempuan}</td>
                        <td className="py-1.5 px-2 text-center font-bold font-mono tabular-nums">
                          {t.lakiLaki + t.perempuan}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono tabular-nums">{t.rombel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabel Data Kelulusan */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
                Tabel Data Kelulusan & Melanjutkan (100%)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="py-2 px-2 text-center">Tahun</th>
                      <th className="py-2 px-2 text-center">L</th>
                      <th className="py-2 px-2 text-center">P</th>
                      <th className="py-2 px-2 text-center font-bold">Lulusan</th>
                      <th className="py-2 px-2 text-center text-emerald-700">Melanjutkan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {graduates.map((g, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-1.5 px-2 text-center font-medium">{g.tahun}</td>
                        <td className="py-1.5 px-2 text-center font-mono tabular-nums">{g.lakiLaki}</td>
                        <td className="py-1.5 px-2 text-center font-mono tabular-nums">{g.perempuan}</td>
                        <td className="py-1.5 px-2 text-center font-bold font-mono tabular-nums">
                          {g.lakiLaki + g.perempuan}
                        </td>
                        <td className="py-1.5 px-2 text-center font-semibold text-emerald-700 font-mono tabular-nums">
                          {g.melanjutkan} (100%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Latar Belakang Orang Tua Siswa */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-700" />
              <span>Demografi Latar Belakang Orang Tua Siswa</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              
              {/* Pekerjaan */}
              <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-3">1. Pekerjaan Orang Tua</span>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">PNS</span>
                    <input
                      type="number"
                      value={parentDemographics.pekerjaan.pns}
                      onChange={(e) =>
                        onUpdateParentDemographics({
                          ...parentDemographics,
                          pekerjaan: { ...parentDemographics.pekerjaan, pns: Number(e.target.value) || 0 },
                        })
                      }
                      className="w-16 px-2 py-0.5 border border-slate-300 rounded-sm text-center font-mono"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">TNI / POLRI</span>
                    <input
                      type="number"
                      value={parentDemographics.pekerjaan.tniPolri}
                      onChange={(e) =>
                        onUpdateParentDemographics({
                          ...parentDemographics,
                          pekerjaan: { ...parentDemographics.pekerjaan, tniPolri: Number(e.target.value) || 0 },
                        })
                      }
                      className="w-16 px-2 py-0.5 border border-slate-300 rounded-sm text-center font-mono"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Petani / Buruh</span>
                    <input
                      type="number"
                      value={parentDemographics.pekerjaan.taniBuruh}
                      onChange={(e) =>
                        onUpdateParentDemographics({
                          ...parentDemographics,
                          pekerjaan: { ...parentDemographics.pekerjaan, taniBuruh: Number(e.target.value) || 0 },
                        })
                      }
                      className="w-16 px-2 py-0.5 border border-slate-300 rounded-sm text-center font-mono"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Pedagang / Wiraswasta</span>
                    <input
                      type="number"
                      value={parentDemographics.pekerjaan.dagangWiraswasta}
                      onChange={(e) =>
                        onUpdateParentDemographics({
                          ...parentDemographics,
                          pekerjaan: { ...parentDemographics.pekerjaan, dagangWiraswasta: Number(e.target.value) || 0 },
                        })
                      }
                      className="w-16 px-2 py-0.5 border border-slate-300 rounded-sm text-center font-mono"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Lainnya</span>
                    <input
                      type="number"
                      value={parentDemographics.pekerjaan.lainnya}
                      onChange={(e) =>
                        onUpdateParentDemographics({
                          ...parentDemographics,
                          pekerjaan: { ...parentDemographics.pekerjaan, lainnya: Number(e.target.value) || 0 },
                        })
                      }
                      className="w-16 px-2 py-0.5 border border-slate-300 rounded-sm text-center font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Pendidikan */}
              <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-3">2. Pendidikan Orang Tua</span>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">≥ S1 (Sarjana/Pasca)</span>
                    <input
                      type="number"
                      value={parentDemographics.pendidikan.s1Plus}
                      onChange={(e) =>
                        onUpdateParentDemographics({
                          ...parentDemographics,
                          pendidikan: { ...parentDemographics.pendidikan, s1Plus: Number(e.target.value) || 0 },
                        })
                      }
                      className="w-16 px-2 py-0.5 border border-slate-300 rounded-sm text-center font-mono"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">SMA / MA Sederajat</span>
                    <input
                      type="number"
                      value={parentDemographics.pendidikan.sma}
                      onChange={(e) =>
                        onUpdateParentDemographics({
                          ...parentDemographics,
                          pendidikan: { ...parentDemographics.pendidikan, sma: Number(e.target.value) || 0 },
                        })
                      }
                      className="w-16 px-2 py-0.5 border border-slate-300 rounded-sm text-center font-mono"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">≤ SMP / MTs / SD</span>
                    <input
                      type="number"
                      value={parentDemographics.pendidikan.smpSd}
                      onChange={(e) =>
                        onUpdateParentDemographics({
                          ...parentDemographics,
                          pendidikan: { ...parentDemographics.pendidikan, smpSd: Number(e.target.value) || 0 },
                        })
                      }
                      className="w-16 px-2 py-0.5 border border-slate-300 rounded-sm text-center font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Penghasilan */}
              <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-3">3. Penghasilan Bulanan</span>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">≤ Rp 1.000.000,-</span>
                    <input
                      type="number"
                      value={parentDemographics.penghasilan.kurang1Juta}
                      onChange={(e) =>
                        onUpdateParentDemographics({
                          ...parentDemographics,
                          penghasilan: { ...parentDemographics.penghasilan, kurang1Juta: Number(e.target.value) || 0 },
                        })
                      }
                      className="w-16 px-2 py-0.5 border border-slate-300 rounded-sm text-center font-mono"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Rp 1 jt - Rp 3 jt</span>
                    <input
                      type="number"
                      value={parentDemographics.penghasilan.satuSd3Juta}
                      onChange={(e) =>
                        onUpdateParentDemographics({
                          ...parentDemographics,
                          penghasilan: { ...parentDemographics.penghasilan, satuSd3Juta: Number(e.target.value) || 0 },
                        })
                      }
                      className="w-16 px-2 py-0.5 border border-slate-300 rounded-sm text-center font-mono"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">&gt; Rp 3.000.000,-</span>
                    <input
                      type="number"
                      value={parentDemographics.penghasilan.lebih3Juta}
                      onChange={(e) =>
                        onUpdateParentDemographics({
                          ...parentDemographics,
                          penghasilan: { ...parentDemographics.penghasilan, lebih3Juta: Number(e.target.value) || 0 },
                        })
                      }
                      className="w-16 px-2 py-0.5 border border-slate-300 rounded-sm text-center font-mono"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* VIEW 2: KONDISI GEDUNG & SARPRAS */}
      {activeSubTab === 'sarpras' && (
        <div className="space-y-6">
          
          {/* Kondisi Gedung & Bangunan */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Keadaan Gedung dan Bangunan Madrasah
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Jumlah lokal dan tingkat kelayakan kondisi fisik (Baik, Rusak Ringan, Rusak Berat).
                </p>
              </div>
              <button
                onClick={handleAddBuilding}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Bangunan</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold">
                    <th className="py-2.5 px-3 text-center w-12">No</th>
                    <th className="py-2.5 px-4">Jenis Bangunan / Ruang</th>
                    <th className="py-2.5 px-3 text-center">Jumlah Lokal</th>
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
                      <td className="py-2 px-4">
                        <input
                          type="text"
                          value={b.jenisBangunan}
                          onChange={(e) => handleBuildingChange(index, 'jenisBangunan', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-full font-medium"
                        />
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold tabular-nums">
                        {(Number(b.baik) || 0) + (Number(b.rusakRingan) || 0) + (Number(b.rusakBerat) || 0)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          value={b.baik}
                          onChange={(e) => handleBuildingChange(index, 'baik', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-16 text-center font-mono text-emerald-700"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          value={b.rusakRingan}
                          onChange={(e) => handleBuildingChange(index, 'rusakRingan', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-16 text-center font-mono text-amber-700"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          value={b.rusakBerat}
                          onChange={(e) => handleBuildingChange(index, 'rusakBerat', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-16 text-center font-mono text-red-700"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => onUpdateBuildings(buildings.filter((item) => item.id !== b.id))}
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold border-t border-slate-300">
                    <td colSpan={2} className="py-2 px-4 text-center">
                      TOTAL LOKAL
                    </td>
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

          {/* Inventaris Sarana dan Prasarana (BMN) */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Daftar Sarana, Perlengkapan Belajar & Inventaris BMN
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Meja, kursi, buku, proyektor, laptop, sound system, marawis, drumband, dan sarana lainnya.
                </p>
              </div>
              <button
                onClick={handleAddInventory}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Inventaris</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold">
                    <th className="py-2.5 px-3 text-center w-12">No</th>
                    <th className="py-2.5 px-4">Nama Sarana / Alat Pembelajaran</th>
                    <th className="py-2.5 px-3 text-center text-emerald-700">Kondisi Baik</th>
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
                      <td className="py-2 px-4">
                        <input
                          type="text"
                          value={inv.namaBarang}
                          onChange={(e) => handleInventoryChange(index, 'namaBarang', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-full font-medium"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          value={inv.baik}
                          onChange={(e) => handleInventoryChange(index, 'baik', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-16 text-center font-mono text-emerald-700"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          value={inv.rusakRingan}
                          onChange={(e) => handleInventoryChange(index, 'rusakRingan', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-16 text-center font-mono text-amber-700"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          value={inv.rusakBerat}
                          onChange={(e) => handleInventoryChange(index, 'rusakBerat', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-md w-16 text-center font-mono text-red-700"
                        />
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900 font-mono tabular-nums">
                        {(Number(inv.baik) || 0) + (Number(inv.rusakRingan) || 0) + (Number(inv.rusakBerat) || 0)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => onUpdateInventory(inventory.filter((item) => item.id !== inv.id))}
                          className="p-1 text-slate-400 hover:text-red-600"
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

    </div>
  );
};
