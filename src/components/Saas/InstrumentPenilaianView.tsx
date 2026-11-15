import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  FilePlus2,
  FolderOpen,
  Search,
  Sparkles,
  Upload,
  Save,
} from 'lucide-react';
import { useSaas } from '../../context/SaasContext';
import { MASTER_COMPONENTS } from '../../data/masterInstrumentV26';
import { MasterIndicatorDef } from '../../types/saas';
import { isEvidenceLinkedToIndicator } from '../../utils/autoPopulatePkkm';

export const InstrumentPenilaianView: React.FC<{
  focusedIndicatorId?: string | null;
  onOpenDocGenerator: (indicator: MasterIndicatorDef) => void;
  onOpenEvidenceUpload: (indicatorId: string) => void;
  onAskAiForIndicator: (indicator: MasterIndicatorDef) => void;
}> = ({ focusedIndicatorId, onOpenDocGenerator, onOpenEvidenceUpload, onAskAiForIndicator }) => {
  const { activeIndicators, responses, saveIndicatorResponse, p1Scores, p2Scores, evidenceFiles } = useSaas();
  const [selectedComp, setSelectedComp] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(focusedIndicatorId || null);
  const [draftNote, setDraftNote] = useState('');
  const [draftChecked, setDraftChecked] = useState<string[]>([]);
  const [draftStatus, setDraftStatus] = useState<'empty' | 'draft' | 'complete'>('draft');

  useEffect(() => {
    if (focusedIndicatorId) {
      setEditingId(focusedIndicatorId);
      const found = activeIndicators.find((i) => i.id === focusedIndicatorId);
      if (found) {
        setSelectedComp(found.komponenCode);
        const existing = responses[focusedIndicatorId];
        setDraftNote(existing?.kepalaNote || '');
        setDraftChecked(existing?.checkedEvidences || []);
        setDraftStatus(existing?.completionStatus || 'draft');
      }
    }
  }, [focusedIndicatorId, activeIndicators, responses]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeIndicators.filter((ind) => {
      if (selectedComp !== 'ALL' && ind.komponenCode !== selectedComp) return false;
      if (!q) return true;
      return (
        ind.id.toLowerCase().includes(q) ||
        ind.indikatorNama.toLowerCase().includes(q) ||
        ind.subKomponenNama.toLowerCase().includes(q) ||
        ind.buktiWajib.some((b) => b.toLowerCase().includes(q))
      );
    });
  }, [activeIndicators, selectedComp, searchQuery]);

  const startEdit = (ind: MasterIndicatorDef) => {
    if (editingId === ind.id) {
      setEditingId(null);
      return;
    }
    const existing = responses[ind.id];
    setEditingId(ind.id);
    setDraftNote(existing?.kepalaNote || '');
    setDraftChecked(existing?.checkedEvidences || []);
    setDraftStatus(existing?.completionStatus || 'draft');
  };

  const toggleEvidenceCheck = (label: string) => {
    setDraftChecked((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const handleSaveIndicator = async (ind: MasterIndicatorDef, markComplete?: boolean) => {
    const status = markComplete ? 'complete' : draftChecked.length === ind.buktiWajib.length ? 'complete' : draftStatus;
    await saveIndicatorResponse(ind.id, ind.komponenCode, {
      kepalaNote: draftNote,
      checkedEvidences: draftChecked,
      completionStatus: status === 'empty' && (draftNote || draftChecked.length > 0) ? 'draft' : status,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Instrumen Resmi PKKM_v.26 untuk RA ({activeIndicators.length} Indikator)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Seluruh 4 komponen dan 25 subkomponen dari instrumen asli. Isi data, cek daftar bukti wajib, buat dokumen otomatis, dan unggah bukti fisik per butir.
            </p>
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode / indikator / bukti..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Component Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 text-xs">
          <button
            type="button"
            onClick={() => setSelectedComp('ALL')}
            className={`px-3 py-1.5 rounded-md font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              selectedComp === 'ALL'
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({activeIndicators.length})
          </button>
          {MASTER_COMPONENTS.map((c) => {
            const count = activeIndicators.filter((i) => i.komponenCode === c.code).length;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => setSelectedComp(c.code)}
                className={`px-3 py-1.5 rounded-md font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  selectedComp === c.code
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {c.nomor}. {c.nama} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Indicators List */}
      <div className="space-y-4">
        {filtered.map((ind) => {
          const resp = responses[ind.id];
          const p1 = p1Scores[ind.id];
          const p2 = p2Scores[ind.id];
          const evCount = evidenceFiles.filter((e) => isEvidenceLinkedToIndicator(e, ind.id)).length;
          const isEditing = editingId === ind.id;

          return (
            <div
              key={ind.id}
              className={`bg-white border rounded-xl p-5 space-y-4 transition-colors ${
                isEditing ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  {/* Metadata Line (Zero-pill discipline) */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-bold text-slate-900">{ind.id}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-emerald-700">
                      {ind.subKomponenKode} {ind.subKomponenNama}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        resp?.completionStatus === 'complete'
                          ? 'text-emerald-700 font-semibold'
                          : resp?.completionStatus === 'draft'
                          ? 'text-amber-700 font-semibold'
                          : 'text-slate-500'
                      }
                    >
                      Status: {resp?.completionStatus === 'complete' ? 'Selesai' : resp?.completionStatus === 'draft' ? 'Draft' : 'Belum Diisi'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {ind.indikatorNomor} {ind.indikatorNama}
                  </h3>
                  <p className="text-xs text-slate-600">
                    <strong className="text-slate-800">Data Yang Diharapkan:</strong> {ind.dataDiharapkan}
                  </p>

                  {/* Required Evidences */}
                  <div className="pt-1">
                    <span className="text-xs font-semibold text-slate-700 block mb-1">
                      Daftar Dokumen / Bukti Fisik Wajib:
                    </span>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-slate-600">
                      {ind.buktiWajib.map((b, idx) => {
                        const checked = resp?.checkedEvidences?.includes(b);
                        return (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className={checked ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                              {checked ? '[✓]' : '[ ]'}
                            </span>
                            <span>{b}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {resp?.kepalaNote && !isEditing && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                      <strong className="text-slate-900">Catatan Kepala RA:</strong> {resp.kepalaNote}
                    </div>
                  )}
                </div>

                {/* Right Side: Dual Scores Summary & Action Buttons */}
                <div className="flex flex-col gap-3 shrink-0 lg:w-64">
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Bukti</span>
                      <strong className="font-mono tabular-nums text-slate-900">{evCount}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Penilai 1</span>
                      <strong className="font-mono tabular-nums text-emerald-700">
                        {p1?.score ?? '-'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Penilai 2</span>
                      <strong className="font-mono tabular-nums text-emerald-700">
                        {p2?.score ?? '-'}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => startEdit(ind)}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>{isEditing ? 'Tutup Form' : 'Isi Data'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenDocGenerator(ind)}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <FilePlus2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Buat Dokumen</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenEvidenceUpload(ind.id)}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Upload Bukti</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAskAiForIndicator(ind)}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Panduan AI</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Edit Drawer */}
              {isEditing && (
                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">
                      Checklist Kesiapan Bukti Fisik (Centang dokumen yang sudah tersedia):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ind.buktiWajib.map((label) => (
                        <label
                          key={label}
                          className="flex items-start gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 cursor-pointer hover:bg-slate-100"
                        >
                          <input
                            type="checkbox"
                            checked={draftChecked.includes(label)}
                            onChange={() => toggleEvidenceCheck(label)}
                            className="mt-0.5 accent-emerald-700"
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 block">
                      Catatan & Deskripsi Implementasi Riil Kepala RA
                    </label>
                    <textarea
                      rows={3}
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      placeholder="Tuliskan deskripsi pelaksanaan kegiatan riil, nomor arsip penyimpanan fisik, atau keterangan pendukung..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-600">Status Indikator:</span>
                      <select
                        value={draftStatus}
                        onChange={(e) => setDraftStatus(e.target.value as 'empty' | 'draft' | 'complete')}
                        className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      >
                        <option value="empty">Belum Diisi</option>
                        <option value="draft">Draft</option>
                        <option value="complete">Selesai / Siap Dinilai</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveIndicator(ind, false)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Simpan Draft</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveIndicator(ind, true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Simpan & Tandai Selesai</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
