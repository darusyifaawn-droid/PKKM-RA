import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Lock, Search, ShieldAlert, Unlock, X } from 'lucide-react';
import { useSaas } from '../../context/SaasContext';
import { MASTER_COMPONENTS, MASTER_INSTRUMENT_META } from '../../data/masterInstrumentV26';
import { computeAssessorSummary } from '../../utils/pkkmScoring';
import { isEvidenceLinkedToIndicator } from '../../utils/autoPopulatePkkm';

export const AssessorScoringView: React.FC<{
  assessorRole: 'PENILAI_1' | 'PENILAI_2';
}> = ({ assessorRole }) => {
  const {
    activeRole,
    activeInstitution,
    activePeriod,
    activeIndicators,
    p1Scores,
    p2Scores,
    saveAssessorScore,
    unlockAssessorScore,
    p1Note,
    p2Note,
    saveAssessorSummaryNote,
    evidenceFiles,
    responses,
  } = useSaas();

  const [selectedComp, setSelectedComp] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const isLocked =
    activePeriod.status === 'archived' ||
    (assessorRole === 'PENILAI_1' ? activePeriod.p1Finalized : activePeriod.p2Finalized);

  // Strict Role Isolation: Penilai 1 cannot edit Penilai 2, and vice versa
  const canEditThisAssessor =
    !isLocked &&
    (activeRole === assessorRole || activeRole === 'SUPER_ADMIN');

  const scoresMap = assessorRole === 'PENILAI_1' ? p1Scores : p2Scores;
  const noteRecord = assessorRole === 'PENILAI_1' ? p1Note : p2Note;
  const [recommendation, setRecommendation] = useState(noteRecord?.recommendation || '');

  const summary = useMemo(
    () => computeAssessorSummary(assessorRole, scoresMap, activeIndicators),
    [assessorRole, scoresMap, activeIndicators]
  );

  const assessorName =
    assessorRole === 'PENILAI_1'
      ? activeInstitution.profileData.evaluators.pengawas1Nama
      : activeInstitution.profileData.evaluators.pengawas2Nama;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeIndicators.filter((ind) => {
      if (selectedComp !== 'ALL' && ind.komponenCode !== selectedComp) return false;
      if (!q) return true;
      return (
        ind.id.toLowerCase().includes(q) ||
        ind.indikatorNama.toLowerCase().includes(q)
      );
    });
  }, [activeIndicators, selectedComp, searchQuery]);

  const toggleEvidenceCheckForScore = (
    indicatorId: string,
    currentScore: number,
    currentNote: string,
    currentChecked: string[],
    evidenceId: string
  ) => {
    const nextChecked = currentChecked.includes(evidenceId)
      ? currentChecked.filter((id) => id !== evidenceId)
      : [...currentChecked, evidenceId];
    saveAssessorScore(assessorRole, indicatorId, currentScore, currentNote, nextChecked);
  };

  const handleConfirmUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockReason.trim().length < 5) {
      setUnlockError('Alasan pembukaan kunci wajib diisi minimal 5 karakter.');
      return;
    }
    await unlockAssessorScore(assessorRole, unlockReason.trim());
    setUnlockModalOpen(false);
    setUnlockReason('');
    setUnlockError('');
  };

  return (
    <div className="space-y-6">
      {/* Header & Summary Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span className="font-semibold text-emerald-700">
                {assessorRole === 'PENILAI_1' ? 'Penilai 1 (Independen)' : 'Penilai 2 (Independen)'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{assessorName || '[Nama Penilai Belum Diisi]'}</span>
              <span aria-hidden="true">·</span>
              <span>{activePeriod.yearLabel}</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900">
              Lembar Penilaian Kinerja Kepala RA — {assessorRole === 'PENILAI_1' ? 'PENILAI 1' : 'PENILAI 2'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Skor Penilai 1 dan Penilai 2 terpisah sepenuhnya. Centang bukti fisik yang telah diperiksa dan pilih skor 1–4.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 shrink-0">
            <div>
              <span className="text-[11px] text-slate-500 block">Jumlah Skor</span>
              <strong className="text-xl font-bold font-mono tabular-nums text-slate-900">
                {summary.jumlahSkor} <span className="text-xs font-normal text-slate-400">/ {summary.maxSkorTotal}</span>
              </strong>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-[11px] text-slate-500 block">Nilai Kinerja</span>
              <strong className="text-xl font-bold font-mono tabular-nums text-emerald-700">
                {summary.nilaiKinerja.toFixed(2)}
              </strong>
            </div>
          </div>
        </div>

        {/* Excel Incomplete Warning */}
        {summary.incompleteWarning && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>{summary.incompleteWarning}</strong> ({summary.scoredIndicators}/{summary.totalIndicators} indikator terisi)
            </span>
          </div>
        )}

        {/* Role & Finalization Warning */}
        {!canEditThisAssessor && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-amber-800">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>
                {isLocked
                  ? `Penilaian ${assessorRole} telah dikunci/difinalisasi.`
                  : `Anda sedang melihat dalam mode baca-saja (peran aktif Anda: ${activeRole.replace('_', ' ')}). Penilaian hanya dapat diubah oleh ${assessorRole.replace('_', ' ')} atau Super Admin.`}
              </span>
            </div>
            {isLocked && activeRole === 'SUPER_ADMIN' && activePeriod.status !== 'archived' && (
              <button
                type="button"
                onClick={() => setUnlockModalOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-amber-300 text-amber-900 font-semibold rounded-md hover:bg-amber-100 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Buka Kunci (Super Admin)</span>
              </button>
            )}
          </div>
        )}

        {/* Scale Rubric Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
          {MASTER_INSTRUMENT_META.skalaKeterangan.map((sk) => (
            <div key={sk.nilai}>
              <strong className="font-mono text-emerald-800">Skor {sk.nilai}:</strong> {sk.label}
            </div>
          ))}
        </div>

        {/* 4 Component Sub-totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {summary.components.map((c) => (
            <div key={c.komponenCode} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="font-semibold text-slate-800 truncate">
                {c.komponenNomor}. {c.komponenNama}
              </div>
              <div className="flex items-baseline justify-between mt-1.5">
                <span className="text-slate-500 tabular-nums">
                  {c.scoredCount}/{c.indicatorCount} butir
                </span>
                <span className="font-mono font-bold tabular-nums text-emerald-800">
                  Skor {c.rawScore}/{c.maxScore}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setSelectedComp('ALL')}
              className={`px-3 py-1.5 rounded-md font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                selectedComp === 'ALL' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Semua ({activeIndicators.length})
            </button>
            {MASTER_COMPONENTS.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => setSelectedComp(c.code)}
                className={`px-3 py-1.5 rounded-md font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedComp === c.code ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Komponen {c.nomor}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari indikator..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50"
            />
          </div>
        </div>
      </div>

      {/* Indicators Scoring Rows */}
      <div className="space-y-3">
        {filtered.map((ind) => {
          const scoreRec = scoresMap[ind.id];
          const evList = evidenceFiles.filter((e) => isEvidenceLinkedToIndicator(e, ind.id));
          const checkedEvidenceIds = scoreRec?.checkedEvidenceIds || [];
          const kepalaResp = responses[ind.id];

          return (
            <div key={ind.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-bold text-slate-900">{ind.id}</span>
                    <span aria-hidden="true">·</span>
                    <span>{ind.subKomponenNama}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{evList.length} bukti unggahan</span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    {ind.indikatorNomor} {ind.indikatorNama}
                  </h3>
                  {kepalaResp?.kepalaNote && (
                    <p className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                      <strong>Catatan Kepala RA:</strong> {kepalaResp.kepalaNote}
                    </p>
                  )}
                  {evList.length > 0 && (
                    <div className="space-y-1 pt-1 text-xs">
                      <span className="text-[11px] font-semibold text-slate-600 block">
                        Centang bukti fisik yang telah diperiksa:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {evList.map((ev) => {
                          const isChecked = checkedEvidenceIds.includes(ev.evidenceId);
                          return (
                            <label
                              key={ev.evidenceId}
                              className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                disabled={!canEditThisAssessor}
                                checked={isChecked}
                                onChange={() =>
                                  toggleEvidenceCheckForScore(
                                    ind.id,
                                    scoreRec?.score || 1,
                                    scoreRec?.note || '',
                                    checkedEvidenceIds,
                                    ev.evidenceId
                                  )
                                }
                                className="accent-emerald-700"
                              />
                              <a
                                href={ev.downloadUrl || ev.localPreviewUrl || '#'}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-emerald-700 hover:underline font-medium"
                              >
                                {ev.fileName}
                              </a>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Score Selector 1-4 */}
                <div className="flex flex-col gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4].map((val) => {
                      const active = scoreRec?.score === val;
                      const rubric = MASTER_INSTRUMENT_META.skalaKeterangan.find((s) => s.nilai === val)?.label;
                      return (
                        <button
                          key={val}
                          type="button"
                          title={rubric}
                          disabled={!canEditThisAssessor}
                          onClick={() =>
                            saveAssessorScore(assessorRole, ind.id, val, scoreRec?.note || '', checkedEvidenceIds)
                          }
                          className={`w-9 h-9 rounded-lg text-xs font-bold tabular-nums transition-colors cursor-pointer disabled:opacity-50 ${
                            active
                              ? 'bg-emerald-700 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    disabled={!canEditThisAssessor}
                    value={scoreRec?.note || ''}
                    onChange={(e) =>
                      saveAssessorScore(
                        assessorRole,
                        ind.id,
                        scoreRec?.score || 1,
                        e.target.value,
                        checkedEvidenceIds
                      )
                    }
                    placeholder="Catatan penilai..."
                    className="w-48 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg disabled:bg-slate-50"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendation & Finalize Box */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          Rekomendasi &amp; Penguncian Hasil {assessorRole === 'PENILAI_1' ? 'Penilai 1' : 'Penilai 2'}
        </h2>
        <textarea
          rows={3}
          disabled={!canEditThisAssessor}
          value={recommendation}
          onChange={(e) => setRecommendation(e.target.value)}
          placeholder="Tuliskan rekomendasi pembinaan resmi untuk Kepala RA..."
          className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-lg disabled:bg-slate-50"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 tabular-nums">
            Progres dinilai: {summary.scoredIndicators} / {summary.totalIndicators} indikator.
            {summary.unscoredIndicators > 0 && (
              <span className="text-amber-700 ml-1">
                Masih terdapat {summary.unscoredIndicators} poin yang belum dinilai.
              </span>
            )}
          </div>
          {canEditThisAssessor && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => saveAssessorSummaryNote(assessorRole, recommendation, false)}
                className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                Simpan Catatan
              </button>
              <button
                type="button"
                disabled={!summary.isComplete}
                onClick={() => setConfirmFinalizeOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Finalisasi &amp; Kunci Nilai</span>
              </button>
            </div>
          )}
          {isLocked && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>Penilaian Sudah Difinalisasi &amp; Dikunci</span>
            </span>
          )}
        </div>
      </div>

      {/* Confirm Finalize Modal */}
      {confirmFinalizeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Finalisasi &amp; Kunci Hasil {assessorRole === 'PENILAI_1' ? 'Penilai 1' : 'Penilai 2'}?
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Setelah dikunci, seluruh {summary.totalIndicators} skor dan catatan tidak dapat diubah lagi oleh penilai kecuali dibuka kembali oleh Super Admin dengan alasan tertulis di Audit Log.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmFinalizeOpen(false)}
                className="px-3.5 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  saveAssessorSummaryNote(assessorRole, recommendation, true);
                  setConfirmFinalizeOpen(false);
                }}
                className="px-4 py-2 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
              >
                Ya, Kunci Nilai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Unlock Modal */}
      {unlockModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmUnlock}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Buka Kunci Penilaian {assessorRole === 'PENILAI_1' ? 'Penilai 1' : 'Penilai 2'}
              </h3>
              <button
                type="button"
                onClick={() => setUnlockModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="font-semibold text-slate-800 block mb-1">Alasan Pembukaan Kunci (Wajib):</label>
              <textarea
                rows={3}
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="Tuliskan alasan resmi pembukaan kunci nilai..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
              {unlockError && <p className="text-red-700 mt-1 font-medium">{unlockError}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUnlockModalOpen(false)}
                className="px-3.5 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
              >
                Buka Kunci Sekarang
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
