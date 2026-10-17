import React, { useState } from 'react';
import { ProgramGoal, ActivityReports, ProgramActivityItem } from '../../types/ppkm';
import { Target, CheckSquare, Plus, Trash2, Calendar, AlertCircle } from 'lucide-react';

interface ProgramsEditorProps {
  programGoals: ProgramGoal;
  activityReports: ActivityReports;
  onUpdateProgramGoals: (updated: ProgramGoal) => void;
  onUpdateActivityReports: (updated: ActivityReports) => void;
}

export const ProgramsEditor: React.FC<ProgramsEditorProps> = ({
  programGoals,
  activityReports,
  onUpdateProgramGoals,
  onUpdateActivityReports,
}) => {
  const [activeCycle, setActiveCycle] = useState<keyof ActivityReports>('harian');

  // Helper for adding activity item
  const handleAddActivity = (cycle: keyof ActivityReports) => {
    const newItem: ProgramActivityItem = {
      id: `${cycle}_${Date.now()}`,
      namaKegiatan: 'Kegiatan Baru',
      realisasi: 90,
      kendala: 'Disesuaikan dengan jadwal operasional',
      keterangan: 'Rutin',
    };
    onUpdateActivityReports({
      ...activityReports,
      [cycle]: [...activityReports[cycle], newItem],
    });
  };

  const handleUpdateActivity = (
    cycle: keyof ActivityReports,
    index: number,
    field: keyof ProgramActivityItem,
    value: string | number
  ) => {
    const list = [...activityReports[cycle]];
    (list[index] as any)[field] = value;
    onUpdateActivityReports({
      ...activityReports,
      [cycle]: list,
    });
  };

  const handleDeleteActivity = (cycle: keyof ActivityReports, id: string) => {
    onUpdateActivityReports({
      ...activityReports,
      [cycle]: activityReports[cycle].filter((item) => item.id !== id),
    });
  };

  const cycleLabels: Record<keyof ActivityReports, string> = {
    harian: 'A. Kegiatan Harian',
    mingguan: 'B. Kegiatan Mingguan',
    bulanan: 'C. Kegiatan Bulanan',
    semesteran: 'D. Kegiatan Semesteran',
    tahunan: 'E. Kegiatan Tahunan',
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-8">
      
      {/* SECTION 1: VISI, MISI, TUJUAN */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-700" />
            <span>Visi, Misi & Tujuan Madrasah</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Rumusan arah haluan madrasah yang menjadi tolak ukur kepemimpinan kepala madrasah.
          </p>
        </div>

        <div className="space-y-5 text-xs">
          <div>
            <label className="block font-bold text-slate-800 mb-1">Visi Madrasah</label>
            <textarea
              rows={3}
              value={programGoals.visi}
              onChange={(e) => onUpdateProgramGoals({ ...programGoals, visi: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed uppercase"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-bold text-slate-800">Misi Madrasah</label>
              <button
                type="button"
                onClick={() =>
                  onUpdateProgramGoals({
                    ...programGoals,
                    misi: [...programGoals.misi, 'Poin misi baru yang terarah'],
                  })
                }
                className="text-[11px] text-emerald-700 font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Tambah Misi
              </button>
            </div>
            <div className="space-y-2">
              {programGoals.misi.map((m, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="font-semibold text-slate-400 mt-2">{idx + 1}.</span>
                  <textarea
                    rows={2}
                    value={m}
                    onChange={(e) => {
                      const updated = [...programGoals.misi];
                      updated[idx] = e.target.value;
                      onUpdateProgramGoals({ ...programGoals, misi: updated });
                    }}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-hidden"
                  />
                  <button
                    onClick={() => {
                      const updated = programGoals.misi.filter((_, i) => i !== idx);
                      onUpdateProgramGoals({ ...programGoals, misi: updated });
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 mt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-bold text-slate-800">Tujuan Madrasah</label>
              <button
                type="button"
                onClick={() =>
                  onUpdateProgramGoals({
                    ...programGoals,
                    tujuan: [...programGoals.tujuan, 'Tujuan operasional baru'],
                  })
                }
                className="text-[11px] text-emerald-700 font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Tambah Tujuan
              </button>
            </div>
            <div className="space-y-2">
              {programGoals.tujuan.map((t, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="font-semibold text-slate-400 mt-2">{idx + 1}.</span>
                  <input
                    type="text"
                    value={t}
                    onChange={(e) => {
                      const updated = [...programGoals.tujuan];
                      updated[idx] = e.target.value;
                      onUpdateProgramGoals({ ...programGoals, tujuan: updated });
                    }}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-hidden"
                  />
                  <button
                    onClick={() => {
                      const updated = programGoals.tujuan.filter((_, i) => i !== idx);
                      onUpdateProgramGoals({ ...programGoals, tujuan: updated });
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: LAPORAN KETERLAKSANAAN PROGRAM KEGIATAN */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="border-b border-slate-100 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-700" />
              <span>Laporan Program Kegiatan Kepala Madrasah</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Catatan realisasi (%), kendala yang dihadapi, dan status kegiatan rutin/unggulan.
            </p>
          </div>

          <button
            onClick={() => handleAddActivity(activeCycle)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Kegiatan ({activeCycle})</span>
          </button>
        </div>

        {/* Cycle Segmented Control Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-100 rounded-lg mb-5 text-xs">
          {(['harian', 'mingguan', 'bulanan', 'semesteran', 'tahunan'] as (keyof ActivityReports)[]).map((cycle) => (
            <button
              key={cycle}
              onClick={() => setActiveCycle(cycle)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap capitalize ${
                activeCycle === cycle
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cycleLabels[cycle]} ({activityReports[cycle].length})
            </button>
          ))}
        </div>

        {/* Activities Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold">
                <th className="py-2.5 px-3 text-center w-10">No</th>
                <th className="py-2.5 px-4">Nama Program / Kegiatan</th>
                <th className="py-2.5 px-3 text-center w-28">Realisasi (%)</th>
                <th className="py-2.5 px-4">Kendala yang Dihadapi & Solusi</th>
                <th className="py-2.5 px-3 text-center w-28">Keterangan</th>
                <th className="py-2.5 px-3 text-center w-12">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activityReports[activeCycle].map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-2 px-3 text-center text-slate-500 tabular-nums">{index + 1}</td>
                  <td className="py-2 px-4">
                    <textarea
                      rows={2}
                      value={item.namaKegiatan}
                      onChange={(e) =>
                        handleUpdateActivity(activeCycle, index, 'namaKegiatan', e.target.value)
                      }
                      className="w-full px-2 py-1 border border-slate-200 rounded-md font-medium text-slate-800"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.realisasi}
                        onChange={(e) =>
                          handleUpdateActivity(activeCycle, index, 'realisasi', Number(e.target.value) || 0)
                        }
                        className="w-16 px-1.5 py-1 text-center font-mono font-bold border border-slate-200 rounded-md"
                      />
                      <span className="text-slate-500 font-bold">%</span>
                    </div>
                  </td>
                  <td className="py-2 px-4">
                    <textarea
                      rows={2}
                      value={item.kendala}
                      onChange={(e) =>
                        handleUpdateActivity(activeCycle, index, 'kendala', e.target.value)
                      }
                      className="w-full px-2 py-1 border border-slate-200 rounded-md text-slate-600"
                      placeholder="Identifikasi kendala & tindak lanjut..."
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <select
                      value={item.keterangan}
                      onChange={(e) =>
                        handleUpdateActivity(activeCycle, index, 'keterangan', e.target.value)
                      }
                      className={`px-2 py-1 rounded-md text-xs font-semibold border ${
                        item.keterangan === 'Unggulan'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <option value="Rutin">Rutin</option>
                      <option value="Unggulan">Unggulan</option>
                      <option value="Berkala">Berkala</option>
                    </select>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => handleDeleteActivity(activeCycle, item.id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
};
