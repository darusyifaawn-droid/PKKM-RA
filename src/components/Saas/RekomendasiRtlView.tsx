import React, { useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useSaas } from '../../context/SaasContext';
import { MASTER_COMPONENTS } from '../../data/masterInstrumentV26';
import { RecommendationItemRecord } from '../../types/saas';

export const RekomendasiRtlView: React.FC<{
  onOpenPrintRtl: () => void;
}> = ({ onOpenPrintRtl }) => {
  const {
    activeInstitution,
    activePeriod,
    recommendations,
    saveRecommendation,
    deleteRecommendation,
    generateRecommendationsFromAssessors,
  } = useSaas();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [sourceRole, setSourceRole] = useState<'PENILAI_1' | 'PENILAI_2' | 'GABUNGAN'>('GABUNGAN');
  const [komponenNama, setKomponenNama] = useState(MASTER_COMPONENTS[0].nama);
  const [temuan, setTemuan] = useState('');
  const [rekomendasi, setRekomendasi] = useState('');
  const [rencanaTindakLanjut, setRencanaTindakLanjut] = useState('');
  const [penanggungJawab, setPenanggungJawab] = useState(
    `Kepala RA (${activeInstitution.profileData.principal.namaLengkap || 'Kepala RA'})`
  );
  const [targetWaktu, setTargetWaktu] = useState('Semester Berjalan');
  const [status, setStatus] = useState<'DRAFT' | 'APPROVED'>('DRAFT');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const resetForm = () => {
    setEditingId(undefined);
    setSourceRole('GABUNGAN');
    setKomponenNama(MASTER_COMPONENTS[0].nama);
    setTemuan('');
    setRekomendasi('');
    setRencanaTindakLanjut('');
    setPenanggungJawab(`Kepala RA (${activeInstitution.profileData.principal.namaLengkap || 'Kepala RA'})`);
    setTargetWaktu('Semester Berjalan');
    setStatus('DRAFT');
    setFormOpen(false);
  };

  const openEdit = (item: RecommendationItemRecord) => {
    setEditingId(item.recId);
    setSourceRole(item.sourceRole);
    setKomponenNama(item.komponenNama);
    setTemuan(item.temuan);
    setRekomendasi(item.rekomendasi);
    setRencanaTindakLanjut(item.rencanaTindakLanjut);
    setPenanggungJawab(item.penanggungJawab);
    setTargetWaktu(item.targetWaktu);
    setStatus(item.status);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!temuan.trim() || !rekomendasi.trim()) return;
    await saveRecommendation({
      recId: editingId,
      sourceRole,
      komponenNama,
      temuan: temuan.trim(),
      rekomendasi: rekomendasi.trim(),
      rencanaTindakLanjut: rencanaTindakLanjut.trim() || rekomendasi.trim(),
      penanggungJawab: penanggungJawab.trim() || 'Kepala RA',
      targetWaktu: targetWaktu.trim() || 'Semester Berjalan',
      status,
    });
    resetForm();
  };

  const handlePullFromAssessors = async () => {
    const added = await generateRecommendationsFromAssessors();
    if (added === 0) {
      setFeedbackMsg('Tidak ditemukan catatan baru atau skor di bawah 3 dari Penilai 1/Penilai 2 pada periode aktif.');
    } else {
      setFeedbackMsg(`Berhasil menarik ${added} butir rekomendasi/RTL langsung dari skor & catatan Penilai.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-emerald-700 block mb-0.5">
              Format 10 · Rekomendasi Pembinaan &amp; Rencana Tindak Lanjut (RTL)
            </span>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-700" />
              <span>Rekomendasi &amp; Tindak Lanjut PKKM ({recommendations.length} Butir)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeInstitution.name} · {activePeriod.yearLabel} · Hanya bersumber dari catatan riil Penilai 1/Penilai 2 dan input resmi lembaga.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePullFromAssessors}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tarik dari Skor/Catatan P1 &amp; P2</span>
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah RTL</span>
            </button>
            <button
              type="button"
              onClick={onOpenPrintRtl}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Format 10 A4</span>
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-center justify-between">
            <span>{feedbackMsg}</span>
            <button type="button" onClick={() => setFeedbackMsg('')} className="text-slate-400 hover:text-slate-700 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit RTL Form */}
      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-white border border-emerald-500 rounded-xl p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              {editingId ? 'Edit Butir Rekomendasi & RTL' : 'Tambah Butir Rekomendasi & RTL Baru'}
            </h2>
            <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-900 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Sumber Rekomendasi</label>
              <select
                value={sourceRole}
                onChange={(e) => setSourceRole(e.target.value as 'PENILAI_1' | 'PENILAI_2' | 'GABUNGAN')}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="PENILAI_1">Penilai 1</option>
                <option value="PENILAI_2">Penilai 2</option>
                <option value="GABUNGAN">Gabungan Tim Penilai</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Komponen Tugas Utama</label>
              <select
                value={komponenNama}
                onChange={(e) => setKomponenNama(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
              >
                {MASTER_COMPONENTS.map((c) => (
                  <option key={c.code} value={c.nama}>
                    {c.nomor}. {c.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Temuan Penilaian *</label>
              <textarea
                rows={3}
                required
                value={temuan}
                onChange={(e) => setTemuan(e.target.value)}
                placeholder="Catatan temuan dari pemeriksaan bukti fisik..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Rekomendasi Pembinaan *</label>
              <textarea
                rows={3}
                required
                value={rekomendasi}
                onChange={(e) => setRekomendasi(e.target.value)}
                placeholder="Saran perbaikan dari pengawas penilai..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Rencana Tindak Lanjut (RTL)</label>
              <textarea
                rows={3}
                value={rencanaTindakLanjut}
                onChange={(e) => setRencanaTindakLanjut(e.target.value)}
                placeholder="Langkah konkret yang akan dilaksanakan RA..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Penanggung Jawab</label>
              <input
                type="text"
                value={penanggungJawab}
                onChange={(e) => setPenanggungJawab(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Target Waktu</label>
              <input
                type="text"
                value={targetWaktu}
                onChange={(e) => setTargetWaktu(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'APPROVED')}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="DRAFT">Draft</option>
                <option value="APPROVED">Disetujui</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
            >
              Simpan Rekomendasi RTL
            </button>
          </div>
        </form>
      )}

      {/* RTL Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        {recommendations.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 space-y-2">
            <p>Belum ada butir rekomendasi atau RTL pada periode ini.</p>
            <p>Klik &ldquo;Tarik dari Skor/Catatan P1 &amp; P2&rdquo; setelah penilai mengisi catatan atau klik &ldquo;Tambah RTL&rdquo; untuk menyusun tindak lanjut resmi.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-3">Komponen &amp; Sumber</th>
                  <th className="py-2.5 px-3">Temuan &amp; Rekomendasi</th>
                  <th className="py-2.5 px-3">Rencana Tindak Lanjut</th>
                  <th className="py-2.5 px-3">PJ / Target</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recommendations.map((rec, idx) => (
                  <tr key={rec.recId} className="hover:bg-slate-50 align-top">
                    <td className="py-3 px-3 text-center font-mono tabular-nums">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <strong className="text-slate-900 block">{rec.komponenNama}</strong>
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        {rec.sourceRole.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 space-y-1">
                      <p className="text-slate-800"><strong>Temuan:</strong> {rec.temuan}</p>
                      <p className="text-slate-600"><strong>Rekomendasi:</strong> {rec.rekomendasi}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-800">{rec.rencanaTindakLanjut}</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="block font-medium text-slate-900">{rec.penanggungJawab}</span>
                      <span className="text-[11px] text-slate-500">{rec.targetWaktu}</span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() =>
                          saveRecommendation({
                            ...rec,
                            status: rec.status === 'APPROVED' ? 'DRAFT' : 'APPROVED',
                          })
                        }
                        className={`inline-flex items-center gap-1 font-semibold cursor-pointer ${
                          rec.status === 'APPROVED' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{rec.status === 'APPROVED' ? 'Disetujui' : 'Draft'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(rec)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold cursor-pointer"
                      >
                        Edit
                      </button>
                      {confirmDeleteId === rec.recId ? (
                        <button
                          type="button"
                          onClick={() => {
                            deleteRecommendation(rec.recId);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1 bg-red-600 text-white rounded-md font-semibold cursor-pointer"
                        >
                          Ya, Hapus
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(rec.recId)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
