import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  History,
  Link2,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useSaas } from '../../context/SaasContext';
import { EvidenceFileRecord, EvidenceVerificationStatus } from '../../types/saas';
import { isEvidenceLinkedToIndicator } from '../../utils/autoPopulatePkkm';

const STATUS_LABEL: Record<EvidenceVerificationStatus, { text: string; cls: string }> = {
  not_uploaded: { text: 'Belum Diunggah', cls: 'text-slate-500 font-semibold' },
  uploaded: { text: 'Terunggah', cls: 'text-slate-700 font-semibold' },
  pending: { text: 'Menunggu Periksa', cls: 'text-amber-700 font-semibold' },
  needs_revision: { text: 'Perlu Revisi', cls: 'text-red-700 font-semibold' },
  verified: { text: 'Terverifikasi', cls: 'text-emerald-700 font-semibold' },
};

export const EvidenceManagerView: React.FC<{
  preselectedIndicatorId?: string | null;
}> = ({ preselectedIndicatorId }) => {
  const {
    activeIndicators,
    activeRole,
    evidenceFiles,
    uploadEvidence,
    updateEvidenceLinks,
    replaceEvidenceRevision,
    verifyEvidence,
    deleteEvidence,
    setStatusMessage,
  } = useSaas();

  const [selectedIndicator, setSelectedIndicator] = useState<string>(
    preselectedIndicatorId || activeIndicators[0]?.id || '1.1.1'
  );
  const [extraLinkedIds, setExtraLinkedIds] = useState<string[]>([]);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [filterIndicator, setFilterIndicator] = useState<string>('ALL');
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewItem, setPreviewItem] = useState<EvidenceFileRecord | null>(null);
  const [editingLinksItem, setEditingLinksItem] = useState<EvidenceFileRecord | null>(null);
  const [editingLinkIds, setEditingLinkIds] = useState<string[]>([]);
  const [revisionTarget, setRevisionTarget] = useState<EvidenceFileRecord | null>(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAssessor = activeRole === 'PENILAI_1' || activeRole === 'PENILAI_2' || activeRole === 'SUPER_ADMIN';

  const toggleExtraLink = (id: string) => {
    setExtraLinkedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const mergedLinks = Array.from(new Set([selectedIndicator, ...extraLinkedIds]));
      for (const file of Array.from(files)) {
        await uploadEvidence(selectedIndicator, file, description, mergedLinks);
      }
      setDescription('');
      setExtraLinkedIds([]);
    } catch (err: any) {
      setStatusMessage(err?.message || 'Gagal mengunggah bukti fisik.');
    } finally {
      setIsUploading(false);
    }
  };

  const filtered = useMemo(() => {
    if (filterIndicator === 'ALL') return evidenceFiles;
    return evidenceFiles.filter((e) => isEvidenceLinkedToIndicator(e, filterIndicator));
  }, [evidenceFiles, filterIndicator]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSaveLinksModal = async () => {
    if (!editingLinksItem) return;
    const normalized = Array.from(new Set([editingLinksItem.indicatorId, ...editingLinkIds]));
    await updateEvidenceLinks(editingLinksItem.evidenceId, normalized);
    setEditingLinksItem(null);
  };

  const handleSubmitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionTarget || !revisionFile) return;
    try {
      await replaceEvidenceRevision(revisionTarget.evidenceId, revisionFile, revisionNote);
      setRevisionTarget(null);
      setRevisionFile(null);
      setRevisionNote('');
    } catch (err: any) {
      setStatusMessage(err?.message || 'Gagal mengunggah revisi berkas.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Dropzone Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Manajemen Bukti Fisik, Multi-Link &amp; Verifikasi Portofolio
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Unggah berkas nyata (PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, maks. 20 MB/file). Satu dokumen dapat dihubungkan ke beberapa indikator sekaligus tanpa duplikasi file.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            Total: {evidenceFiles.length} berkas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Target Indikator Utama
            </label>
            <select
              value={selectedIndicator}
              onChange={(e) => setSelectedIndicator(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs"
            >
              {activeIndicators.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {ind.id} — {ind.indikatorNama.slice(0, 72)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Keterangan Dokumen
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Scan SK Pembagian Tugas TA 2025/2026"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        </div>

        {/* Multi-Indicator Linker */}
        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/70 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Hubungkan Juga ke Indikator Terkait ({extraLinkedIds.length} tambahan)</span>
            </span>
            <button
              type="button"
              onClick={() => setLinkPickerOpen((v) => !v)}
              className="text-emerald-700 font-semibold hover:underline cursor-pointer"
            >
              {linkPickerOpen ? 'Tutup Daftar' : 'Pilih Multi-Indikator'}
            </button>
          </div>
          {linkPickerOpen && (
            <div className="max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 pt-2 border-t border-slate-200">
              {activeIndicators.map((ind) => {
                const isPrimary = ind.id === selectedIndicator;
                const checked = isPrimary || extraLinkedIds.includes(ind.id);
                return (
                  <label
                    key={ind.id}
                    className="flex items-start gap-1.5 p-1.5 bg-white border border-slate-200 rounded-md cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      disabled={isPrimary}
                      checked={checked}
                      onChange={() => toggleExtraLink(ind.id)}
                      className="mt-0.5 accent-emerald-700"
                    />
                    <span className="text-[11px] text-slate-700 truncate">
                      <strong className="font-mono">{ind.id}</strong> {ind.indikatorNama}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-emerald-600 bg-emerald-50/70'
              : 'border-slate-300 bg-slate-50/50 hover:border-emerald-500'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <Upload className="w-7 h-7 text-emerald-700 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-800">
            {isUploading
              ? 'Sedang mengunggah & memvalidasi berkas...'
              : 'Tarik & lepas file di sini atau klik untuk memilih beberapa file sekaligus'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Mendukung PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, dan PNG (maks. 20 MB/file)
          </p>
        </div>
      </div>

      {/* Evidence List & Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">Daftar Berkas Bukti Fisik (Format 9)</h2>
          <select
            value={filterIndicator}
            onChange={(e) => setFilterIndicator(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 max-w-xs"
          >
            <option value="ALL">Semua Indikator ({evidenceFiles.length})</option>
            {activeIndicators.map((ind) => (
              <option key={ind.id} value={ind.id}>
                Indikator {ind.id}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            Belum ada bukti fisik pada filter ini. Unggah dokumen pendukung melalui area di atas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 px-3 font-semibold">Indikator Tertaut</th>
                  <th className="py-2.5 px-3 font-semibold">Nama Berkas, Revisi &amp; Keterangan</th>
                  <th className="py-2.5 px-3 font-semibold">Ukuran</th>
                  <th className="py-2.5 px-3 font-semibold">Status Verifikasi</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((ev) => {
                  const fileUrl = ev.downloadUrl || ev.localPreviewUrl || '';
                  const links = ev.linkedIndicatorIds?.length ? ev.linkedIndicatorIds : [ev.indicatorId];
                  const revCount = ev.revisionHistory?.length || 1;
                  const statusMeta = STATUS_LABEL[ev.verificationStatus] || STATUS_LABEL.pending;
                  return (
                    <tr key={ev.evidenceId} className="hover:bg-slate-50 align-top">
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-slate-800">{ev.indicatorId}</div>
                        {links.length > 1 && (
                          <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
                            +{links.filter((x) => x !== ev.indicatorId).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>{ev.fileName}</span>
                          <span className="text-[10px] font-mono text-slate-500">v{revCount}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{ev.description}</p>
                        {ev.verificationNote && (
                          <p className="text-[11px] text-amber-700 mt-0.5">
                            Catatan Penilai: {ev.verificationNote}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {formatBytes(ev.sizeBytes)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isAssessor ? (
                          <select
                            value={ev.verificationStatus}
                            onChange={(e) =>
                              verifyEvidence(
                                ev.evidenceId,
                                e.target.value as EvidenceVerificationStatus,
                                ev.verificationNote || ''
                              )
                            }
                            className="px-2 py-1 border border-slate-200 rounded-md text-xs bg-white"
                          >
                            <option value="uploaded">Terunggah</option>
                            <option value="pending">Menunggu Periksa</option>
                            <option value="verified">Terverifikasi</option>
                            <option value="needs_revision">Perlu Revisi</option>
                            <option value="not_uploaded">Belum Diunggah</option>
                          </select>
                        ) : (
                          <span className={statusMeta.cls}>{statusMeta.text}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLinksItem(ev);
                              setEditingLinkIds(links);
                            }}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 rounded-md hover:bg-slate-100 cursor-pointer"
                            title="Tautkan Multi-Indikator"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRevisionTarget(ev);
                              setRevisionFile(null);
                              setRevisionNote('');
                            }}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 rounded-md hover:bg-slate-100 cursor-pointer"
                            title="Upload Revisi Berkas"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          {fileUrl && (
                            <>
                              <button
                                type="button"
                                onClick={() => setPreviewItem(ev)}
                                className="p-1.5 text-slate-600 hover:text-emerald-700 rounded-md hover:bg-slate-100 cursor-pointer"
                                title="Pratinjau & Riwayat Revisi"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={fileUrl}
                                download={ev.fileName}
                                className="p-1.5 text-slate-600 hover:text-emerald-700 rounded-md hover:bg-slate-100"
                                title="Unduh Berkas"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}
                          {confirmDeleteId === ev.evidenceId ? (
                            <button
                              type="button"
                              onClick={() => {
                                deleteEvidence(ev.evidenceId);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 text-[11px] font-semibold bg-red-600 text-white rounded-md cursor-pointer"
                            >
                              Ya, Hapus
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(ev.evidenceId)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-100 cursor-pointer"
                              title="Hapus Bukti"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Multi-Indicator Link Edit Modal */}
      {editingLinksItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tautkan ke Multi-Indikator</h3>
                <p className="text-xs text-slate-500">{editingLinksItem.fileName}</p>
              </div>
              <button type="button" onClick={() => setEditingLinksItem(null)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
              {activeIndicators.map((ind) => {
                const isPrimary = ind.id === editingLinksItem.indicatorId;
                const checked = isPrimary || editingLinkIds.includes(ind.id);
                return (
                  <label key={ind.id} className="flex items-start gap-2 p-2 border border-slate-200 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={isPrimary}
                      checked={checked}
                      onChange={() =>
                        setEditingLinkIds((prev) =>
                          prev.includes(ind.id) ? prev.filter((x) => x !== ind.id) : [...prev, ind.id]
                        )
                      }
                      className="mt-0.5 accent-emerald-700"
                    />
                    <span className="truncate">
                      <strong className="font-mono">{ind.id}</strong> — {ind.indikatorNama}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingLinksItem(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveLinksModal}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
              >
                Simpan Tautan Indikator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Revisi Modal */}
      {revisionTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmitRevision} className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Upload Revisi Bukti Fisik</h3>
              <button type="button" onClick={() => setRevisionTarget(null)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-600">
              Berkas saat ini: <strong>{revisionTarget.fileName}</strong>
            </p>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Pilih Berkas Pengganti *</label>
              <input
                type="file"
                required
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={(e) => setRevisionFile(e.target.files?.[0] || null)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Catatan Revisi</label>
              <input
                type="text"
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                placeholder="Contoh: Dilengkapi tanda tangan dan stempel resmi"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRevisionTarget(null)} className="px-3.5 py-2 font-semibold bg-slate-100 rounded-lg cursor-pointer">
                Batal
              </button>
              <button type="submit" className="px-4 py-2 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer">
                Simpan Revisi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preview & Revision History Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div className="text-xs">
                <strong className="text-slate-900 block">{previewItem.fileName}</strong>
                <span className="text-slate-500">
                  Indikator {previewItem.indicatorId} · {previewItem.description}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-50 space-y-4">
              <div className="flex items-center justify-center min-h-[300px]">
                {previewItem.mimeType.startsWith('image/') ? (
                  <img
                    src={previewItem.downloadUrl || previewItem.localPreviewUrl}
                    alt={previewItem.fileName}
                    className="max-h-[60vh] object-contain rounded-lg"
                  />
                ) : previewItem.mimeType === 'application/pdf' ? (
                  <iframe
                    src={previewItem.downloadUrl || previewItem.localPreviewUrl}
                    title={previewItem.fileName}
                    className="w-full h-[60vh] border-0 rounded-lg bg-white"
                  />
                ) : (
                  <div className="text-center space-y-3 text-xs text-slate-600">
                    <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto" />
                    <p>Pratinjau langsung hanya tersedia untuk gambar dan PDF. Gunakan tombol Unduh untuk membuka dokumen Office.</p>
                  </div>
                )}
              </div>

              {previewItem.revisionHistory && previewItem.revisionHistory.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
                  <strong className="text-slate-900 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Riwayat Versi Berkas</span>
                  </strong>
                  {previewItem.revisionHistory.map((rev) => (
                    <div key={rev.version} className="flex items-center justify-between text-[11px] text-slate-600 border-t border-slate-100 pt-1">
                      <span>
                        <strong className="font-mono">v{rev.version}</strong> — {rev.fileName} {rev.note ? `(${rev.note})` : ''}
                      </span>
                      <span className="font-mono">{formatBytes(rev.sizeBytes)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
