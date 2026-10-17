import React, { useState } from 'react';
import { AssessmentIndicator } from '../../types/ppkm';
import { Award, CheckCircle, Plus, Trash2, HelpCircle } from 'lucide-react';

interface AssessmentEditorProps {
  assessmentScores: AssessmentIndicator[];
  onUpdateAssessmentScores: (updated: AssessmentIndicator[]) => void;
}

export const AssessmentEditor: React.FC<AssessmentEditorProps> = ({
  assessmentScores,
  onUpdateAssessmentScores,
}) => {
  const [activeKomponen, setActiveKomponen] = useState<string>('ALL');

  // Skor helper
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
    const newItem: AssessmentIndicator = {
      id: 'as_' + Date.now(),
      komponen: 'UPM',
      komponenLabel: 'Usaha Pengembangan Madrasah',
      nomor: '1.' + (assessmentScores.length + 1),
      indikatorKinerja: 'Indikator kinerja tambahan sesuai instrumen pengawas.',
      buktiFisik: 'Dokumen portofolio pendukung yang telah diverifikasi.',
      skor: 4,
      catatanPenilai: 'Bukti fisik lengkap dan valid.',
    };
    onUpdateAssessmentScores([...assessmentScores, newItem]);
  };

  // Calculations
  const totalItems = assessmentScores.length;
  const totalScore = assessmentScores.reduce((acc, curr) => acc + (curr.skor || 0), 0);
  const avgScore = totalItems > 0 ? totalScore / totalItems : 0;
  const finalGradeScale100 = (avgScore / 4) * 100;

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
              <span>Instrumen & Rekapitulasi Skor Penilaian Kinerja (PPKM)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Standar 5 Komponen Keputusan Dirjen Pendis Kemenag RI: UPM, PTM, PKW, SPV, dan HKM.
            </p>
          </div>

          {/* Grand Score Display */}
          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Nilai Kinerja (NK)</span>
              <div className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                {finalGradeScale100.toFixed(2)}
                <span className="text-xs text-slate-400 font-normal ml-1">/ 100</span>
              </div>
            </div>

            <div className="h-10 w-px bg-slate-200" />

            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Predikat Kinerja</span>
              <span className={`inline-block px-3 py-1 rounded-md text-xs font-bold border ${predicateColor}`}>
                {predicate}
              </span>
            </div>
          </div>
        </div>

        {/* 5 Components filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 text-xs">
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
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap ${
                activeKomponen === tab.id
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={handleAddNewIndicator}
            className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Indikator</span>
          </button>
        </div>
      </div>

      {/* Indicator Assessment List */}
      <div className="space-y-4">
        {filteredItems.map((item, index) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
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

              {/* Score Button Group (1 to 4) */}
              <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200 shrink-0 self-start sm:self-auto">
                {[1, 2, 3, 4].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleScoreChange(item.id, val)}
                    className={`w-8 h-8 rounded-md text-xs font-bold transition-all ${
                      item.skor === val
                        ? val === 4
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : val === 3
                          ? 'bg-blue-600 text-white shadow-xs'
                          : val === 2
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-red-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {val}
                  </button>
                ))}
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
                className="p-1 text-slate-300 hover:text-red-600 shrink-0"
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
