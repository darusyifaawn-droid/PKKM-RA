import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Download,
  FileText,
  Printer,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useSaas } from '../../context/SaasContext';
import { DOCUMENT_TEMPLATES } from '../../data/masterInstrumentV26';
import { DocumentCategory, DocumentTemplateDef, GeneratedDocRecord, MasterIndicatorDef } from '../../types/saas';
import { downloadDocumentAsDocx } from '../../utils/documentExporters';
import { buildTemplateDocumentContent } from '../../utils/autoPopulatePkkm';

const CATEGORIES: DocumentCategory[] = [
  'ADMINISTRASI KELEMBAGAAN',
  'ADMINISTRASI MANAJERIAL',
  'ADMINISTRASI KEWIRAUSAHAAN',
  'ADMINISTRASI SUPERVISI',
  'ADMINISTRASI PENDUKUNG',
];

export const DocumentGeneratorView: React.FC<{
  preselectedIndicator?: MasterIndicatorDef | null;
}> = ({ preselectedIndicator }) => {
  const {
    firebaseUser,
    activeInstitution,
    activePeriod,
    generatedDocs,
    saveGeneratedDoc,
    deleteGeneratedDoc,
    setStatusMessage,
    autoSyncAllNow,
    setActiveMenu,
  } = useSaas();

  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('ADMINISTRASI KELEMBAGAAN');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('ADMINISTRASI KELEMBAGAAN');
  const [bodyContent, setBodyContent] = useState('');
  const [docStatus, setDocStatus] = useState<'DRAFT' | 'APPROVED'>('DRAFT');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const hasUnsavedManualEditRef = React.useRef(false);
  const lastProfileRef = React.useRef(activeInstitution.profileData);

  const profileData = activeInstitution.profileData;
  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (!profileData.institution.nsm || profileData.institution.nsm === '-') missing.push('NSM Lembaga');
    if (!profileData.principal.namaLengkap) missing.push('Nama Kepala RA');
    if (profileData.ptkList.length === 0) missing.push('Daftar Guru & PTK');
    return missing;
  }, [profileData]);

  useEffect(() => {
    const profileChanged = lastProfileRef.current !== profileData;
    lastProfileRef.current = profileData;

    if (preselectedIndicator) {
      hasUnsavedManualEditRef.current = false;
      setSelectedDocId(null);
      setSelectedTemplateId(null);
      setTitle(`Dokumen Pendukung Indikator ${preselectedIndicator.id}: ${preselectedIndicator.indikatorNama.slice(0, 60)}`);
      setDocNumber('[NOMOR DOKUMEN MENYUSUL]');
      setCategory(
        preselectedIndicator.komponenCode === 'K3'
          ? 'ADMINISTRASI KEWIRAUSAHAAN'
          : preselectedIndicator.komponenCode === 'K4'
          ? 'ADMINISTRASI SUPERVISI'
          : 'ADMINISTRASI MANAJERIAL'
      );
      setDocStatus('DRAFT');
      setBodyContent(
        `DOKUMEN PENDUKUNG INDIKATOR ${preselectedIndicator.id}\nKomponen: ${preselectedIndicator.komponenNama}\nSubkomponen: ${preselectedIndicator.subKomponenKode} ${preselectedIndicator.subKomponenNama}\n\nData Yang Diharapkan:\n${preselectedIndicator.dataDiharapkan}\n\nDaftar Bukti Fisik Wajib:\n${preselectedIndicator.buktiWajib.map((b, i) => `${i + 1}. ${b}`).join('\n')}\n\nUraian Pelaksanaan di ${profileData.institution.namaLembaga}:\n[Lengkapi uraian pelaksanaan kegiatan riil dan tanggal kegiatan di sini]`
      );
      return;
    }

    if (hasUnsavedManualEditRef.current && !profileChanged) {
      return;
    }

    const activeDoc =
      (selectedDocId && generatedDocs.find((d) => d.docId === selectedDocId)) ||
      (selectedTemplateId && generatedDocs.find((d) => d.templateId === selectedTemplateId)) ||
      (!title && generatedDocs.length > 0 ? generatedDocs[0] : undefined);

    const activeTplId = selectedTemplateId || activeDoc?.templateId || null;
    const matchedTpl = activeTplId
      ? DOCUMENT_TEMPLATES.find((t) => t.templateId === activeTplId)
      : undefined;

    if (matchedTpl) {
      const fresh = buildTemplateDocumentContent(matchedTpl, profileData, activePeriod.yearLabel);
      setSelectedDocId(activeDoc?.docId || `auto_${activePeriod.periodId}_${matchedTpl.templateId}`);
      setSelectedTemplateId(matchedTpl.templateId);
      setTitle(matchedTpl.title);
      setCategory(matchedTpl.category);
      setDocNumber(fresh.docNumber);
      setBodyContent(fresh.bodyContent);
      setDocStatus(activeDoc?.status || 'DRAFT');
      hasUnsavedManualEditRef.current = false;
    } else if (activeDoc && (!title || profileChanged)) {
      setSelectedDocId(activeDoc.docId);
      setSelectedTemplateId(activeDoc.templateId || null);
      setTitle(activeDoc.title);
      setCategory((activeDoc.category as DocumentCategory) || 'ADMINISTRASI KELEMBAGAAN');
      setDocNumber(activeDoc.docNumber);
      setBodyContent(activeDoc.bodyContent);
      setDocStatus(activeDoc.status);
      hasUnsavedManualEditRef.current = false;
    }
  }, [preselectedIndicator, generatedDocs, profileData, activePeriod.yearLabel, activePeriod.periodId]);

  const handleSelectTemplate = (tpl: DocumentTemplateDef) => {
    hasUnsavedManualEditRef.current = false;
    const existingAuto = generatedDocs.find(
      (d) =>
        d.templateId === tpl.templateId ||
        d.docId === `auto_${activePeriod.periodId}_${tpl.templateId}`
    );
    const generated = buildTemplateDocumentContent(tpl, profileData, activePeriod.yearLabel);
    setSelectedCategory(tpl.category);
    setSelectedTemplateId(tpl.templateId);
    setSelectedDocId(existingAuto?.docId || `auto_${activePeriod.periodId}_${tpl.templateId}`);
    setTitle(tpl.title);
    setCategory(tpl.category);
    setDocNumber(generated.docNumber);
    setDocStatus(existingAuto?.status || 'DRAFT');
    setBodyContent(generated.bodyContent);
  };

  const handleLoadSavedDoc = (doc: GeneratedDocRecord) => {
    hasUnsavedManualEditRef.current = false;
    const matchedTpl = doc.templateId
      ? DOCUMENT_TEMPLATES.find((t) => t.templateId === doc.templateId)
      : undefined;
    if (matchedTpl) {
      const fresh = buildTemplateDocumentContent(matchedTpl, profileData, activePeriod.yearLabel);
      setSelectedDocId(doc.docId);
      setSelectedTemplateId(matchedTpl.templateId);
      setSelectedCategory(matchedTpl.category);
      setTitle(matchedTpl.title);
      setCategory(matchedTpl.category);
      setDocNumber(fresh.docNumber);
      setBodyContent(fresh.bodyContent);
      setDocStatus(doc.status);
      return;
    }
    setSelectedDocId(doc.docId);
    setSelectedTemplateId(doc.templateId || null);
    setTitle(doc.title);
    setCategory((doc.category as DocumentCategory) || 'ADMINISTRASI KELEMBAGAAN');
    setDocNumber(doc.docNumber);
    setBodyContent(doc.bodyContent);
    setDocStatus(doc.status);
  };

  const handleReloadFromMaster = async () => {
    const activeDoc = selectedDocId
      ? generatedDocs.find((d) => d.docId === selectedDocId)
      : undefined;
    const tplId = selectedTemplateId || activeDoc?.templateId;
    const matchedTpl = tplId
      ? DOCUMENT_TEMPLATES.find((t) => t.templateId === tplId)
      : undefined;

    if (matchedTpl) {
      const fresh = buildTemplateDocumentContent(matchedTpl, profileData, activePeriod.yearLabel);
      hasUnsavedManualEditRef.current = false;
      setTitle(matchedTpl.title);
      setCategory(matchedTpl.category);
      setDocNumber(fresh.docNumber);
      setBodyContent(fresh.bodyContent);
      setStatusMessage(`Naskah "${matchedTpl.title}" diperbarui mengikuti Data Master terbaru (${profileData.ptkList.length} PTK).`);
      return;
    }

    await autoSyncAllNow(false);
    setStatusMessage('Seluruh 27 dokumen diperbarui mengikuti Data Master terbaru.');
  };

  const handleGenerateWithAi = async () => {
    if (!title) {
      setStatusMessage('Pilih template atau isi judul dokumen terlebih dahulu.');
      return;
    }
    if (!firebaseUser) {
      setStatusMessage('Silakan masuk Google Cloud pada bilah atas terlebih dahulu untuk menggunakan Asisten AI.');
      return;
    }
    setIsAiGenerating(true);
    try {
      const idToken = await firebaseUser.getIdToken();
      const resp = await fetch('/api/ai/pkkm-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          mode: 'draft_document',
          message: `Judul Dokumen: ${title}. Kategori: ${category}. Periode: ${activePeriod.yearLabel}. Draft awal:\n${bodyContent}`,
          institutionContext: {
            institutionId: activeInstitution.institutionId,
            namaLembaga: profileData.institution.namaLembaga,
            nsm: profileData.institution.nsm,
            npsn: profileData.institution.npsn || profileData.institution.npsm,
            alamat: profileData.institution.alamat,
            kepalaRA: profileData.principal.namaLengkap,
            visi: profileData.programGoals.visi,
            misi: profileData.programGoals.misi,
            jumlahGuru: profileData.ptkList.length,
          },
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Gagal menyusun draft AI.');
      setBodyContent(json.reply);
      setDocStatus('DRAFT');
      hasUnsavedManualEditRef.current = true;
      setStatusMessage('Draft berhasil disusun AI (Status: DRAFT — silakan tinjau sebelum menyetujui).');
    } catch (err: any) {
      setStatusMessage(err?.message || 'Gagal menghubungi AI Assistant.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSave = async (approve = false) => {
    if (!title.trim() || !bodyContent.trim()) {
      setStatusMessage('Judul dan isi dokumen wajib diisi.');
      return;
    }
    const statusToSave: 'DRAFT' | 'APPROVED' = approve ? 'APPROVED' : docStatus;
    const docId =
      selectedDocId ||
      (selectedTemplateId
        ? `auto_${activePeriod.periodId}_${selectedTemplateId}`
        : `doc_${Date.now()}`);
    await saveGeneratedDoc({
      docId,
      institutionId: activeInstitution.institutionId,
      periodId: activePeriod.periodId,
      templateId: selectedTemplateId || undefined,
      category,
      title: title.trim(),
      docNumber: docNumber.trim() || '[NOMOR MENYUSUL]',
      bodyContent,
      status: statusToSave,
    });
    hasUnsavedManualEditRef.current = false;
    setSelectedDocId(docId);
    setDocStatus(statusToSave);
  };

  const handlePrintPreview = () => {
    setPrintPreviewOpen(true);
  };

  const handleTriggerDirectPrint = () => {
    document.body.classList.add('doc-modal-printing');
    const cleanup = () => {
      document.body.classList.remove('doc-modal-printing');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 1000);
    }, 80);
  };

  return (
    <div className="space-y-6">
      {/* Category Selector & Missing Data Check */}
      <div className="bg-white border border-[#064e3b]/15 rounded-xl overflow-hidden shadow-xs">
        <div className="h-1 bg-gradient-to-r from-[#064e3b] via-[#d4af37] to-[#064e3b]" />
        <div className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-xl font-bold text-[#064e3b]">
                Otomatisasi Dokumen Administrasi PKKM (Format A4)
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Pilih jenis dokumen dari 5 kategori. Seluruh naskah (DRAFT &amp; APPROVED) otomatis diperbarui mengikuti Data Master lembaga, Kepala RA, daftar PTK ({profileData.ptkList.length} personil), dan Struktur Organisasi ({(profileData.structuralPositions || []).length} jabatan).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {missingFields.length > 0 && (
                <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  Data belum lengkap: <strong>{missingFields.join(', ')}</strong>
                </div>
              )}
              <button
                type="button"
                onClick={() => autoSyncAllNow(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#064e3b] bg-[#f1f6f3] hover:bg-[#e4efe8] border border-[#064e3b]/25 rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#047857]" />
                <span>Sinkronisasi 27 Berkas</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMenu('laporan_pkkm')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#064e3b] hover:bg-[#043927] border border-[#d4af37]/40 rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-[#f3d46b]" />
                <span>Cetak Semua Berkas A4</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 text-xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-md font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#064e3b] text-[#f3d46b] border border-[#d4af37]/40'
                    : 'bg-[#f1f5f2] text-slate-700 hover:text-[#064e3b]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {DOCUMENT_TEMPLATES.filter((t) => t.category === selectedCategory).map((tpl) => {
              const isSelectedTpl = selectedTemplateId === tpl.templateId;
              return (
                <button
                  key={tpl.templateId}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`text-left p-3.5 rounded-lg border transition-colors space-y-1 cursor-pointer ${
                    isSelectedTpl
                      ? 'border-[#b48a1e] bg-[#fdfaf0] ring-1 ring-[#d4af37]/40'
                      : 'border-slate-200 hover:border-[#064e3b]/45 hover:bg-[#f7f8f5]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#064e3b]">{tpl.title}</span>
                    <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelectedTpl ? 'text-[#9a7414]' : 'text-[#047857]'}`} />
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{tpl.description}</p>
                  <span className="text-[11px] font-mono text-[#047857] block">
                    Indikator {tpl.relatedKomponen}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Document Workbench (Editor + Saved List) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#064e3b]/15 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-[#064e3b]">
                Editor Draft Naskah Dinas ({docStatus})
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                Tersinkron otomatis dari Data Master · {profileData.ptkList.length} PTK · {(profileData.structuralPositions || []).length} Jabatan Struktural
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleReloadFromMaster}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6b4f09] bg-[#fdf8e8] hover:bg-[#f7ecc6] border border-[#d4af37]/70 rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#9a7414]" />
                <span>Muat Ulang Data Master</span>
              </button>
              <button
                type="button"
                onClick={handleGenerateWithAi}
                disabled={isAiGenerating || !title}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#064e3b] bg-[#f1f6f3] hover:bg-[#e4efe8] border border-[#064e3b]/25 rounded-lg disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#047857]" />
                <span>{isAiGenerating ? 'Menyusun Draft...' : 'Sempurnakan via AI'}</span>
              </button>
              <button
                type="button"
                onClick={handlePrintPreview}
                disabled={!bodyContent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak A4</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadDocumentAsDocx(
                    { title: title || 'Dokumen RA', docNumber, category, status: docStatus, bodyContent },
                    profileData
                  )
                }
                disabled={!bodyContent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh DOCX</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Judul Dokumen</label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  hasUnsavedManualEditRef.current = true;
                  setTitle(e.target.value);
                }}
                placeholder="Pilih template di atas atau ketik judul..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#047857]"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nomor Surat / Dokumen Resmi</label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => {
                  hasUnsavedManualEditRef.current = true;
                  setDocNumber(e.target.value);
                }}
                placeholder="Contoh: 012/RA.DSF/SK/XI/2026"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#047857]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Isi Naskah Dokumen (Otomatis Mengikuti Data Master · Dapat disesuaikan)
            </label>
            <textarea
              rows={16}
              value={bodyContent}
              onChange={(e) => {
                hasUnsavedManualEditRef.current = true;
                setBodyContent(e.target.value);
              }}
              placeholder="Pilih salah satu template di atas untuk membuat draft otomatis dari data lembaga Anda..."
              className="w-full px-3.5 py-2.5 text-xs font-mono leading-relaxed border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#047857]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              Simpan sebagai DRAFT
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#064e3b] hover:bg-[#043927] border border-[#d4af37]/35 rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#f3d46b]" />
              <span>Setujui Dokumen (APPROVED)</span>
            </button>
          </div>
        </div>

        {/* Saved Docs Archive for Current Period */}
        <div className="bg-white border border-[#064e3b]/15 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-[#064e3b]">Arsip Dokumen Tersimpan</h2>
            <span className="text-xs text-slate-500 tabular-nums">{generatedDocs.length} berkas</span>
          </div>

          {generatedDocs.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">
              Belum ada dokumen yang disimpan pada periode ini. Pilih template di atas untuk memulai.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-[540px] overflow-y-auto">
              {generatedDocs.map((doc) => (
                <div
                  key={doc.docId}
                  className={`p-3 rounded-lg border text-xs space-y-1.5 transition-colors ${
                    selectedDocId === doc.docId
                      ? 'border-[#b48a1e] bg-[#fdfaf0]'
                      : 'border-slate-200 bg-[#f7f8f5]/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoadSavedDoc(doc)}
                      className="text-left font-bold text-slate-900 hover:text-[#064e3b] cursor-pointer"
                    >
                      {doc.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteGeneratedDoc(doc.docId)}
                      className="text-slate-400 hover:text-red-600 cursor-pointer"
                      title="Hapus Dokumen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{doc.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className={doc.status === 'APPROVED' ? 'text-[#047857] font-semibold' : 'text-[#9a7414] font-semibold'}>
                      {doc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* In-App A4 Print Preview Modal (Zero Popup, portaled to body for clean A4 print) */}
      {printPreviewOpen &&
        createPortal(
          <div className="doc-modal-print-overlay fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="doc-modal-print-frame bg-white border border-slate-200 rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
            <div className="no-print px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
              <div className="text-xs">
                <strong className="text-slate-900 block">Pratinjau Cetak Resmi A4</strong>
                <span className="text-slate-500">{title} · Status: {docStatus}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerDirectPrint}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Simpan PDF (A4)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintPreviewOpen(false)}
                  className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200/70 cursor-pointer"
                  aria-label="Tutup Pratinjau"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100 print:bg-white print:p-0">
              <div
                className="bg-white mx-auto max-w-[210mm] p-10 shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0 text-black"
                style={{ fontFamily: "'Times New Roman', serif", fontSize: '12pt', lineHeight: 1.55 }}
              >
                <div className="text-center pb-3 mb-5" style={{ borderBottom: '3px double #000' }}>
                  <div className="font-bold uppercase tracking-wide text-[11pt]">
                    {profileData.adminDocs?.namaYayasan || 'YAYASAN PENDIDIKAN ISLAM'}
                  </div>
                  <div className="font-bold uppercase text-[14pt] mt-0.5">
                    {profileData.institution.namaLembaga}
                  </div>
                  <div className="text-[10pt]">
                    NSM: {profileData.institution.nsm} · NPSN: {profileData.institution.npsn || profileData.institution.npsm}
                  </div>
                  <div className="text-[10pt]">
                    {profileData.institution.alamat}, Kec. {profileData.institution.kecamatan}, {profileData.institution.kotaKab}
                  </div>
                </div>

                <div className="text-center mb-6">
                  <div className="font-bold uppercase underline text-[12pt]">{title}</div>
                  <div className="text-[10.5pt] mt-0.5">
                    Nomor: {docNumber || '[NOMOR MENYUSUL]'} · Status Naskah: {docStatus}
                  </div>
                </div>

                <div className="whitespace-pre-wrap text-justify text-[11.5pt]">{bodyContent}</div>

                <div className="mt-10 flex justify-end avoid-break">
                  <div className="w-64 text-left text-[11pt]">
                    <div>
                      {profileData.evaluators.tempatPenilaian || profileData.institution.kotaKab},{' '}
                      {profileData.evaluators.tanggalPenilaian || '[Tanggal Penetapan]'}
                    </div>
                    <div>Kepala RA,</div>
                    <div className="h-16" />
                    <div className="font-bold underline">{profileData.principal.namaLengkap}</div>
                    {profileData.principal.nip && profileData.principal.nip !== '-' && (
                      <div>NIP/NUPTK. {profileData.principal.nip}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
          document.body
        )}
    </div>
  );
};
