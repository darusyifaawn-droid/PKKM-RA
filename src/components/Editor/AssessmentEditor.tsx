import React, { useState } from 'react';
import { AssessmentIndicator } from '../../types/ppkm';
import { Award, CheckCircle, Plus, Trash2, Edit3, Calculator, Sliders, RefreshCw } from 'lucide-react';

interface AssessmentEditorProps {
  assessmentScores: AssessmentIndicator[];
  manualScoreOverride?: number;
  onUpdateAssessmentScores: (updated: AssessmentIndicator[]) => void;
  onUpdateManualScoreOverride: (override: number | undefined) => void;
}

export const AssessmentEditor: React.FC<AssessmentEditorProps> = ({
  assessmentScores,
  manualScoreOverride,
  onUpdateAssessmentScores,
  onUpdateManualScoreOverride,
}) => {
  const [activeKomponen, setActiveKomponen] = useState<string>('ALL');
  const [useManualNk, setUseManualNk] = useState<boolean>(manualScoreOverride !== undefined);

  // Score change handler (accepts direct typed number or button selection)
  const handleScoreChange = (id: string, skor: number) => {
    const updated = assessmentScores.map((item) => (item.id === id ? { ...item, skor } : item));
    onUpdateAssessmentScores(updated);
  };

  const handleNotesChange = (id: string, catatanPenilai: string) => {
    const updated = assessmentScores.map((item) =>
      item.id === id ? { ...item, catatanPenilai } : item
    );
    onUpdateAssessmentScores(updated);
  };

  const handleAddNewIndicator = () => {
    const nextNum = assessmentScores.length + 1;
    const newItem: AssessmentIndicator = {
      id: 'as_' + Date.now(),
      komponen: activeKomponen !== 'ALL' ? (activeKomponen as any) : 'UPM',
      komponenLabel:
        activeKomponen === 'PTM'
          ? 'Pelaksanaan Tugas Manajerial'
          : activeKomponen === 'PKW'
          ? 'Pengembangan Kewirausahaan'
          : activeKomponen === 'SPV'
          ? 'Supervisi kepada Guru & Tendik'
          : activeKomponen === 'HKM'
          ? 'Hasil Kinerja Kepala Madrasah'
          : 'Usaha Pengembangan Madrasah',
      nomor: 'Butir ' + nextNum,
      indikatorKinerja: 'Indikator kinerja baru sesuai instrumen pengawas pembina.',
      buktiFisik: 'Dokumen portofolio pendukung yang telah diverifikasi.',
      skor: 4,
      catatanPenilai: 'Bukti fisik lengkap dan memenuhi kriteria.',
    };
    onUpdateAssessmentScores([...assessmentScores, newItem]);
  };

  // Calculations
  const totalItems = assessmentScores.length;
  const totalScore = assessmentScores.reduce((acc, curr) => acc + (Number(curr.skor) || 0), 0);
  const calculatedAvgScore = totalItems > 0 ? totalScore / totalItems : 0;
  const calculatedGradeScale100 = (calculatedAvgScore / 4) * 100;

  // Active Final Score (either manually typed or auto-calculated)
  const finalGradeScale100 = useManualNk && manualScoreOverride !== undefined
    ? manualScoreOverride
    : calculatedGradeScale100;

  let predicate = 'Baik';
  let predicateColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (finalGradeScale100 >= 91) {
    predicate = 'Amat Baik (A)';
    predicateColor = 'text-emerald-800 bg-emerald-100 border-emerald-300';
  } else if (finalGradeScale100 >= 76) {
    predicate = 'Baik (B)';
    predicateColor = 'text-blue-800 bg-blue-100 border-blue-300';
  } else if (finalGradeScale100 >= 61) {
    predicate = 'Cukup (C)';
    predicateColor = 'text-amber-800 bg-amber-100 border-amber-300';
  } else if (finalGradeScale100 >= 51) {
    predicate = 'Sedang (D)';
    predicateColor = 'text-orange-800 bg-orange-100 border-orange-300';
  } else {
    predicate = 'Kurang (E)';
    predicateColor = 'text-red-800 bg-red-100 border-red-300';
  }

  // Component breakdown stats
  const komponenList = [
    { code: 'UPM', label: '1. Usaha Pengembangan Madrasah' },
    { code: 'PTM', label: '2. Pelaksanaan Tugas Manajerial' },
    { code: 'PKW', label: '3. Pengembangan Kewirausahaan' },
    { code: 'SPV', label: '4. Supervisi kepada Guru & Tendik' },
    { code: 'HKM', label: '5. Hasil Kinerja Kepala Madrasah' },
  ];

  const komponenStats = komponenList.map((k) => {
    const items = assessmentScores.filter((i) => i.komponen === k.code);
    const count = items.length;
    const sum = items.reduce((acc, curr) => acc + (Number(curr.skor) || 0), 0);
    const avg = count > 0 ? sum / count : 0;
    const score100 = (avg / 4) * 100;
    return { ...k, count, avg, score100 };
  });

  const filteredItems = assessmentScores.filter((item) => {
    if (activeKomponen === 'ALL') return true;
    return item.komponen === activeKomponen;
  });

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      
      {/* Top Score Dashboard */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-700" />
              <span>Instrumen & Rekapitulasi Skor Penilaian Kinerja Kepala Madrasah (PKKM)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Anda dapat <strong>mengetikkan angka nilai sendiri</strong> pada setiap butir indikator atau mengetikkan langsung Nilai Akhir Kinerja (NK). Seluruh instrumen dan berkas cetak akan otomatis terbarui secara langsung.
            </p>
          </div>

          {/* Grand Score Display & Manual Typing Mode */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] text-slate-600 font-semibold">
                  Nilai Kinerja (NK) Akhir:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = !useManualNk;
                    setUseManualNk(nextMode);
                    if (!nextMode) {
                      onUpdateManualScoreOverride(undefined);
                    } else {
                      onUpdateManualScoreOverride(parseFloat(calculatedGradeScale100.toFixed(2)));
                    }
                  }}
                  className="text-[10px] text-emerald-700 hover:underline font-medium cursor-pointer"
                >
                  {useManualNk ? '(Reset Hitung Otomatis)' : '(Ketik Manual Angka NK)'}
                </button>
              </div>

              {useManualNk ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={manualScoreOverride ?? calculatedGradeScale100}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      onUpdateManualScoreOverride(isNaN(val) ? 0 : val);
                    }}
                    className="w-24 px-2 py-1 text-xl font-black text-slate-900 font-mono bg-white border border-emerald-300 rounded-md shadow-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-center"
                  />
                  <span className="text-xs font-bold text-slate-500">/ 100</span>
                </div>
              ) : (
                <div className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                  {calculatedGradeScale100.toFixed(2)}
                  <span className="text-xs text-slate-400 font-normal ml-1">/ 100</span>
                </div>
              )}
            </div>

            <div className="hidden sm:block h-10 w-px bg-slate-200" />

            <div>
              <span className="text-[11px] text-slate-500 font-medium block mb-1">Predikat Kinerja</span>
              <span className={`inline-block px-3 py-1 rounded-md text-xs font-bold border ${predicateColor}`}>
                {predicate}
              </span>
            </div>
          </div>
        </div>

        {/* Component Breakdown Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 mt-4 pt-2">
          {komponenStats.map((k) => (
            <div
              key={k.code}
              onClick={() => setActiveKomponen(k.code)}
              className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                activeKomponen === k.code
                  ? 'bg-emerald-50 border-emerald-300 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-600 mb-0.5">
                <span className="font-bold">{k.code}</span>
                <span className="font-mono text-[10px] text-slate-400">{k.count} butir</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-500">Rata²: <strong>{k.avg.toFixed(2)}</strong></span>
                <span className="text-xs font-mono font-bold text-slate-900">{k.score100.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 5 Components filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 border-t border-slate-100 text-xs">
          {[
            { id: 'ALL', label: 'Semua Komponen' },
            { id: 'UPM', label: '1. Pengembangan Madrasah' },
            { id: 'PTM', label: '2. Tugas Manajerial' },
            { id: 'PKW', label: '3. Kewirausahaan' },
            { id: 'SPV', label: '4. Supervisi Guru & Tendik' },
            { id: 'HKM', label: '5. Hasil Kinerja' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveKomponen(tab.id)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeKomponen === tab.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={handleAddNewIndicator}
            className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Indikator</span>
          </button>
        </div>
      </div>

      {/* Indicator Assessment List with Direct Typing Support */}
      <div className="space-y-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3"
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 text-xs font-bold font-mono">
                    {item.nomor}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    {item.komponenLabel}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 leading-snug">
                  {item.indikatorKinerja}
                </h4>
                <p className="text-[11px] text-slate-500">
                  <strong className="text-slate-700">Bukti Fisik yang Dicek:</strong> {item.buktiFisik}
                </p>
              </div>

              {/* Direct Input & Quick Score Buttons */}
              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200 shrink-0 self-start md:self-auto">
                <div className="text-center">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">
                    Ketik Nilai
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="4"
                    value={item.skor}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      handleScoreChange(item.id, isNaN(val) ? 0 : val);
                    }}
                    className="w-14 px-1.5 py-1 text-sm font-black font-mono text-center text-emerald-950 bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  />
                  <span className="text-[9px] text-slate-400 block font-medium">Skala 1 - 4</span>
                </div>

                <div className="h-9 w-px bg-slate-200" />

                {/* Quick Score Preset Buttons */}
                <div className="text-center">
                  <span className="block text-[9px] font-semibold text-slate-500 uppercase mb-1">
                    Pilihan Cepat
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleScoreChange(item.id, val)}
                        className={`w-7 h-7 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          item.skor === val
                            ? val === 4
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : val === 3
                              ? 'bg-blue-600 text-white shadow-xs'
                              : val === 2
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-red-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Catatan Penilai */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">Catatan Penilai:</span>
              <input
                type="text"
                value={item.catatanPenilai}
                onChange={(e) => handleNotesChange(item.id, e.target.value)}
                className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md focus:outline-hidden text-slate-700 italic"
                placeholder="Tuliskan catatan verifikasi bukti fisik..."
              />
              <button
                onClick={() =>
                  onUpdateAssessmentScores(assessmentScores.filter((i) => i.id !== item.id))
                }
                className="p-1 text-slate-300 hover:text-red-600 shrink-0 cursor-pointer"
                title="Hapus Indikator"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
