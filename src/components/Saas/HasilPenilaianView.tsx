import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Lock,
  Printer,
  Unlock,
  X,
} from 'lucide-react';
import { useSaas } from '../../context/SaasContext';
import { computeAssessorSummary, getPredikatKemenag } from '../../utils/pkkmScoring';

export const HasilPenilaianView: React.FC<{
  onOpenPrintFormat: () => void;
}> = ({ onOpenPrintFormat }) => {
  const {
    activeRole,
    activeInstitution,
    activePeriod,
    activeIndicators,
    p1Scores,
    p2Scores,
    p1Note,
    p2Note,
    unlockAssessorScore,
  } = useSaas();

  const [unlockTarget, setUnlockTarget] = useState<'PENILAI_1' | 'PENILAI_2' | null>(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const s1 = computeAssessorSummary('PENILAI_1', p1Scores, activeIndicators);
  const s2 = computeAssessorSummary('PENILAI_2', p2Scores, activeIndicators);

  const handleConfirmUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockTarget) return;
    if (unlockReason.trim().length < 5) {
      setUnlockError('Alasan pembukaan kunci wajib diisi minimal 5 karakter.');
      return;
    }
    try {
      await unlockAssessorScore(unlockTarget, unlockReason.trim());
      setUnlockTarget(null);
      setUnlockReason('');
      setUnlockError('');
    } catch (err: any) {
      setUnlockError(err?.message || 'Gagal membuka kunci penilaian.');
    }
  };

  const renderResultCard = (
    role: 'PENILAI_1' | 'PENILAI_2',
    summary: ReturnType<typeof computeAssessorSummary>,
    isFinalized: boolean,
    noteText: string
  ) => {
    const evalInfo = activeInstitution.profileData.evaluators;
    const isP1 = role === 'PENILAI_1';
    const assessorName = isP1 ? evalInfo.pengawas1Nama : evalInfo.pengawas2Nama;
    const assessorNip = isP1 ? evalInfo.pengawas1Nip : evalInfo.pengawas2Nip;
    const assessorPangkat = isP1
      ? evalInfo.pengawas1PangkatGol || '-'
      : evalInfo.pengawas2PangkatGol || '-';
    const assessorUnit = isP1
      ? evalInfo.pengawas1UnitKerja || `Kemenag ${activeInstitution.profileData.institution.kotaKab}`
      : evalInfo.pengawas2UnitKerja || `Pokjawasmad ${activeInstitution.profileData.institution.kotaKab}`;
    const pred = getPredikatKemenag(summary.nilaiKinerja);

    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-semibold text-emerald-700 block">
              {isP1 ? 'Format 5 · Hasil Penilaian Penilai 1' : 'Format 6 · Hasil Penilaian Penilai 2'}
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              Berita Hasil Penilaian Kinerja ({isP1 ? 'Penilai 1' : 'Penilai 2'})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {isFinalized ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                <Lock className="w-3.5 h-3.5" />
                <span>Difinalisasi</span>
              </span>
            ) : (
              <span className="text-xs font-semibold text-amber-700">Masih Draft</span>
            )}

            {isFinalized && activeRole === 'SUPER_ADMIN' && (
              <button
                type="button"
                onClick={() => {
                  setUnlockTarget(role);
                  setUnlockReason('');
                  setUnlockError('');
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Buka Kunci</span>
              </button>
            )}
          </div>
        </div>

        {/* Excel Incomplete Warning Banner */}
        {summary.incompleteWarning && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block">{summary.incompleteWarning}</strong>
              <span className="text-amber-800 tabular-nums">
                Terisi {summary.scoredIndicators} dari {summary.totalIndicators} indikator ({summary.unscoredIndicators} butir belum dinilai). Nilai resmi &amp; predikat baru final setelah 100% butir dinilai.
              </span>
            </div>
          </div>
        )}

        {/* Official Statement Header */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
          <p className="text-slate-700">
            Yang bertanda tangan di bawah ini selaku <strong>{isP1 ? 'Penilai 1' : 'Penilai 2'}</strong>:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800">
            <div>
              <span className="text-slate-500 block text-[11px]">Nama Penilai</span>
              <strong>{assessorName || '[Belum diisi]'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">NIP / Pangkat Golongan</span>
              <span className="font-mono">{assessorNip || '-'} · {assessorPangkat}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Unit Kerja</span>
              <span>{assessorUnit}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Kepala RA Dinilai</span>
              <strong>{activeInstitution.profileData.principal.namaLengkap || '[Belum diisi]'}</strong>
            </div>
          </div>
        </div>

        {/* 4 Component Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse border border-slate-200 tabular-nums">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-2.5 px-3 border-r border-slate-200 w-10 text-center">No</th>
                <th className="py-2.5 px-3 border-r border-slate-200">Komponen Tugas Utama</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-right">Butir Dinilai</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-right">Skor Perolehan</th>
                <th className="py-2.5 px-3 text-right">Capaian (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {summary.components.map((c) => (
                <tr key={c.komponenCode}>
                  <td className="py-2.5 px-3 border-r border-slate-200 text-center font-mono">
                    {c.komponenNomor}
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-200 font-semibold text-slate-900">
                    {c.komponenNama}
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono">
                    {c.scoredCount}/{c.indicatorCount}
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono">
                    {c.rawScore} / {c.maxScore}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                    {c.nilaiSkala100.toFixed(2)}%
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold">
                <td className="py-2.5 px-3 border-r border-slate-200" />
                <td className="py-2.5 px-3 border-r border-slate-200">Jumlah Skor &amp; Nilai Kinerja (0–100)</td>
                <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono">
                  {summary.scoredIndicators}/{summary.totalIndicators}
                </td>
                <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono">
                  {summary.jumlahSkor} / {summary.maxSkorTotal}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                  {summary.isComplete ? `${summary.nilaiKinerja.toFixed(2)} (${pred.predikat})` : 'Belum Final'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Recommendation Box */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
          <strong className="text-slate-900 block">Catatan / Rekomendasi Resmi {isP1 ? 'Penilai 1' : 'Penilai 2'}:</strong>
          <p className="text-slate-600">{noteText || 'Belum ada catatan rekomendasi.'}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-700" />
            <span>Hasil Penilaian Penilai 1 &amp; Penilai 2 (Terpisah)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeInstitution.name} · {activePeriod.yearLabel} · Format 5 (Hasil Penilai 1) dan Format 6 (Hasil Penilai 2) sesuai workbook PKKM_v.26.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenPrintFormat}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Format 5 &amp; 6 A4</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {renderResultCard('PENILAI_1', s1, activePeriod.p1Finalized, p1Note?.recommendation || '')}
        {renderResultCard('PENILAI_2', s2, activePeriod.p2Finalized, p2Note?.recommendation || '')}
      </div>

      {/* Super Admin Unlock Modal with Mandatory Audit Reason */}
      {unlockTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmUnlock}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Buka Kunci Penilaian {unlockTarget === 'PENILAI_1' ? 'Penilai 1' : 'Penilai 2'}
              </h3>
              <button
                type="button"
                onClick={() => setUnlockTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Aksi ini membuka kembali finalisasi nilai agar dapat direvisi dan dicatat permanen ke dalam Audit Log &amp; Riwayat Perubahan Skor.
            </p>
            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-800 block">Alasan Pembukaan Kunci (Wajib):</label>
              <textarea
                rows={3}
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="Contoh: Revisi verifikasi bukti fisik indikator 2.3.1 atas permohonan penilai."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
              {unlockError && <p className="text-red-700 font-medium">{unlockError}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUnlockTarget(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Konfirmasi Buka Kunci</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
