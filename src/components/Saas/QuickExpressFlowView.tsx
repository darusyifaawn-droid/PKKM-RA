import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  CheckSquare,
  ClipboardCheck,
  Copy,
  FileSpreadsheet,
  FileUp,
  Lock,
  Presentation,
  Printer,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Square,
  Upload,
  UserCheck,
  Wand2,
} from 'lucide-react';
import { useSaas } from '../../context/SaasContext';
import { DOCUMENT_TEMPLATES, MASTER_COMPONENTS } from '../../data/masterInstrumentV26';
import { EMPTY_ADMIN_DOCS } from '../../data/cleanPpkmFactory';
import {
  computeDualAssessorRekap,
  distributeTargetScores,
  getPredikatKemenag,
} from '../../utils/pkkmScoring';
import { downloadPkkmAsXlsx } from '../../utils/documentExporters';
import {
  getComponentCodesForTemplate,
  ParsedManualPkkmImport,
  uploadAndParseManualFile,
} from '../../utils/manualPkkmImport';
import { EvaluatorProfile, InstitutionProfile, PrincipalProfile } from '../../types/ppkm';
import { PrintTabKey } from '../Print/PrintView';
import {
  clearQuickDraft,
  formatClockTimeId,
  loadPersistedQuickStep,
  loadQuickDraft,
  QuickStepNumber,
  savePersistedQuickStep,
  saveQuickDraft,
} from '../../utils/draftPersistence';

interface QuickExpressFlowViewProps {
  onOpenPrint: (tab: PrintTabKey, autoPrint?: boolean) => void;
}

type StepNumber = QuickStepNumber;
type GridMode = 'side_by_side' | 'p1_only' | 'p2_only';
type ChecklistFilter = 'ALL' | 'COLLECTED' | 'PENDING';

const COMP_WEIGHT_COUNTS: Record<'K1' | 'K2' | 'K3' | 'K4', number> = {
  K1: 25,
  K2: 41,
  K3: 19,
  K4: 11,
};

function computeWeightedTargetAverage(targets: Record<'K1' | 'K2' | 'K3' | 'K4', number>): number {
  const sum =
    targets.K1 * COMP_WEIGHT_COUNTS.K1 +
    targets.K2 * COMP_WEIGHT_COUNTS.K2 +
    targets.K3 * COMP_WEIGHT_COUNTS.K3 +
    targets.K4 * COMP_WEIGHT_COUNTS.K4;
  return sum / 96;
}

export const QuickExpressFlowView: React.FC<QuickExpressFlowViewProps> = ({ onOpenPrint }) => {
  const {
    firebaseUser,
    activeInstitution,
    activePeriod,
    activeIndicators,
    activeRole,
    isDemoRoleSwitcherAllowed,
    masterAssessors,
    updateActiveInstitutionData,
    responses,
    p1Scores,
    p2Scores,
    p1Note,
    p2Note,
    evidenceFiles,
    generatedDocs,
    recommendations,
    saveAssessorScore,
    saveAssessorScoresBatch,
    applyTargetsAndSyncAll,
    setChecklistDocStatus,
    syncChecklistDocsFromScores,
    saveAssessorSummaryNote,
    autoSyncAllNow,
    loadAttachmentPreset2026,
    setActiveMenu,
  } = useSaas();

  const instId = activeInstitution.institutionId;
  const profileData = activeInstitution.profileData;
  const isCloudLoggedIn = Boolean(firebaseUser && firebaseUser.emailVerified);

  const initialQuickBundle = useMemo(() => {
    const recovered = loadQuickDraft(instId);
    if (recovered) {
      return {
        evalDraft: recovered.evalDraft,
        instDraft: recovered.instDraft,
        principalDraft: recovered.principalDraft,
        yayasanDraft: recovered.yayasanDraft,
        hadDraft: true,
      };
    }
    return {
      evalDraft: profileData.evaluators,
      instDraft: profileData.institution,
      principalDraft: profileData.principal,
      yayasanDraft: profileData.adminDocs?.namaYayasan || '',
      hadDraft: false,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [step, setStepState] = useState<StepNumber>(loadPersistedQuickStep);
  const setStep = (next: StepNumber) => {
    savePersistedQuickStep(next);
    setStepState(next);
  };
  const [savingStep, setSavingStep] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState(false);

  // Local editable buffers for Step 1 (Evaluators) & Step 2 (Institution + Principal + Cover)
  const [evalDraft, setEvalDraft] = useState<EvaluatorProfile>(initialQuickBundle.evalDraft);
  const [instDraft, setInstDraft] = useState<InstitutionProfile>(initialQuickBundle.instDraft);
  const [principalDraft, setPrincipalDraft] = useState<PrincipalProfile>(initialQuickBundle.principalDraft);
  const [yayasanDraft, setYayasanDraft] = useState<string>(initialQuickBundle.yayasanDraft);
  const [quickAutoSaveState, setQuickAutoSaveState] = useState<'saved' | 'pending' | 'saving' | 'error'>(
    initialQuickBundle.hadDraft ? 'pending' : 'saved'
  );
  const [quickSavedTime, setQuickSavedTime] = useState<string>('');

  const quickHydratedInstRef = useRef<string>(instId);
  const quickLastCommittedRef = useRef<string>(
    JSON.stringify({
      evaluators: profileData.evaluators,
      institution: profileData.institution,
      principal: profileData.principal,
      namaYayasan: profileData.adminDocs?.namaYayasan || '',
    })
  );
  const quickLastEditAtRef = useRef<number>(initialQuickBundle.hadDraft ? Date.now() : 0);
  const quickDirtyRef = useRef<boolean>(initialQuickBundle.hadDraft);
  const quickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quickLatestRef = useRef({
    instId,
    evalDraft,
    instDraft,
    principalDraft,
    yayasanDraft,
  });
  quickLatestRef.current = { instId, evalDraft, instDraft, principalDraft, yayasanDraft };

  // Manual Import Excel/PDF panel state
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importingFile, setImportingFile] = useState(false);
  const [importError, setImportError] = useState('');
  const [parsedImport, setParsedImport] = useState<ParsedManualPkkmImport | null>(null);
  const [importSyncAll, setImportSyncAll] = useState(true);
  const [applyingImport, setApplyingImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Inline editable Rekap/Komponen P1 & P2 target values (25-100% or raw score 96-384)
  const [targetInputMode, setTargetInputMode] = useState<'pct' | 'raw'>('raw');
  const [p1CompTargets, setP1CompTargets] = useState<Record<'K1' | 'K2' | 'K3' | 'K4', number>>({
    K1: 78,
    K2: 74,
    K3: 74,
    K4: 75,
  });
  const [p2CompTargets, setP2CompTargets] = useState<Record<'K1' | 'K2' | 'K3' | 'K4', number>>({
    K1: 93,
    K2: 96,
    K3: 96,
    K4: 86,
  });
  const [p1RawTargets, setP1RawTargets] = useState<Record<'K1' | 'K2' | 'K3' | 'K4', number>>({
    K1: 78,
    K2: 122,
    K3: 56,
    K4: 33,
  });
  const [p2RawTargets, setP2RawTargets] = useState<Record<'K1' | 'K2' | 'K3' | 'K4', number>>({
    K1: 93,
    K2: 158,
    K3: 73,
    K4: 38,
  });
  const [syncEvidenceAndDocsOnApply, setSyncEvidenceAndDocsOnApply] = useState(true);
  const [applyingBatch, setApplyingBatch] = useState(false);

  // Step 3 grid controls
  const [gridMode, setGridMode] = useState<GridMode>('side_by_side');
  const [komponenFilter, setKomponenFilter] = useState<'ALL' | 'K1' | 'K2' | 'K3' | 'K4'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Step 4 checklist & recommendations
  const [checklistFilter, setChecklistFilter] = useState<ChecklistFilter>('ALL');
  const [checklistSearch, setChecklistSearch] = useState('');
  const [syncingChecklist, setSyncingChecklist] = useState(false);
  const [p1RecText, setP1RecText] = useState(p1Note?.recommendation || '');
  const [p2RecText, setP2RecText] = useState(p2Note?.recommendation || '');
  const [syncingBundle, setSyncingBundle] = useState(false);

  useEffect(() => {
    const prof = activeInstitution.profileData;
    const incomingJson = JSON.stringify({
      evaluators: prof.evaluators,
      institution: prof.institution,
      principal: prof.principal,
      namaYayasan: prof.adminDocs?.namaYayasan || '',
    });

    if (quickHydratedInstRef.current !== instId) {
      if (quickTimerRef.current) {
        clearTimeout(quickTimerRef.current);
        quickTimerRef.current = null;
      }
      quickHydratedInstRef.current = instId;
      const recovered = loadQuickDraft(instId);
      quickLastCommittedRef.current = incomingJson;
      if (recovered) {
        setEvalDraft(recovered.evalDraft);
        setInstDraft(recovered.instDraft);
        setPrincipalDraft(recovered.principalDraft);
        setYayasanDraft(recovered.yayasanDraft);
        quickDirtyRef.current = true;
        quickLastEditAtRef.current = Date.now();
        setQuickAutoSaveState('pending');
      } else {
        setEvalDraft(prof.evaluators);
        setInstDraft(prof.institution);
        setPrincipalDraft(prof.principal);
        setYayasanDraft(prof.adminDocs?.namaYayasan || '');
        quickDirtyRef.current = false;
        setQuickAutoSaveState('saved');
      }
      return;
    }

    if (
      quickDirtyRef.current ||
      Date.now() - quickLastEditAtRef.current < 2500 ||
      Boolean(loadQuickDraft(instId))
    ) {
      return;
    }

    if (incomingJson !== quickLastCommittedRef.current) {
      quickLastCommittedRef.current = incomingJson;
      setEvalDraft(prof.evaluators);
      setInstDraft(prof.institution);
      setPrincipalDraft(prof.principal);
      setYayasanDraft(prof.adminDocs?.namaYayasan || '');
    }
  }, [instId, activeInstitution.profileData]);

  const commitQuickDraft = async (
    targetInstId: string,
    payload: {
      evalDraft: EvaluatorProfile;
      instDraft: InstitutionProfile;
      principalDraft: PrincipalProfile;
      yayasanDraft: string;
    },
    fullSync = false
  ) => {
    if (targetInstId === 'onboarding-ra') return;
    setQuickAutoSaveState('saving');
    const committedJson = JSON.stringify({
      evaluators: payload.evalDraft,
      institution: payload.instDraft,
      principal: payload.principalDraft,
      namaYayasan: payload.yayasanDraft,
    });
    try {
      await updateActiveInstitutionData(
        (prev) => ({
          ...prev,
          evaluators: { ...prev.evaluators, ...payload.evalDraft },
          institution: { ...prev.institution, ...payload.instDraft },
          principal: { ...prev.principal, ...payload.principalDraft },
          adminDocs: {
            ...(prev.adminDocs || EMPTY_ADMIN_DOCS),
            namaYayasan: payload.yayasanDraft,
          },
        }),
        { skipHeavyDocSync: !fullSync, quiet: !fullSync }
      );
      quickLastCommittedRef.current = committedJson;
      const latestJson = JSON.stringify({
        evaluators: quickLatestRef.current.evalDraft,
        institution: quickLatestRef.current.instDraft,
        principal: quickLatestRef.current.principalDraft,
        namaYayasan: quickLatestRef.current.yayasanDraft,
      });
      if (latestJson === committedJson) {
        clearQuickDraft(targetInstId);
        quickDirtyRef.current = false;
        setQuickAutoSaveState('saved');
      }
      setQuickSavedTime(formatClockTimeId());
    } catch {
      setQuickAutoSaveState('error');
    }
  };

  useEffect(() => {
    const currentJson = JSON.stringify({
      evaluators: evalDraft,
      institution: instDraft,
      principal: principalDraft,
      namaYayasan: yayasanDraft,
    });
    if (currentJson === quickLastCommittedRef.current) {
      return;
    }

    quickDirtyRef.current = true;
    quickLastEditAtRef.current = Date.now();
    setQuickAutoSaveState('pending');
    saveQuickDraft({
      institutionId: instId,
      updatedAt: Date.now(),
      evalDraft,
      instDraft,
      principalDraft,
      yayasanDraft,
    });

    if (quickTimerRef.current) {
      clearTimeout(quickTimerRef.current);
    }
    const scheduledInstId = instId;
    const payloadSnapshot = { evalDraft, instDraft, principalDraft, yayasanDraft };
    quickTimerRef.current = setTimeout(() => {
      quickTimerRef.current = null;
      void commitQuickDraft(scheduledInstId, payloadSnapshot, false);
    }, 750);

    return () => {
      if (quickTimerRef.current) {
        clearTimeout(quickTimerRef.current);
        quickTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instId, evalDraft, instDraft, principalDraft, yayasanDraft]);

  useEffect(() => {
    const flushQuick = () => {
      if (!quickDirtyRef.current) return;
      const cur = quickLatestRef.current;
      saveQuickDraft({
        institutionId: cur.instId,
        updatedAt: Date.now(),
        evalDraft: cur.evalDraft,
        instDraft: cur.instDraft,
        principalDraft: cur.principalDraft,
        yayasanDraft: cur.yayasanDraft,
      });
      if (quickTimerRef.current) {
        clearTimeout(quickTimerRef.current);
        quickTimerRef.current = null;
      }
      void commitQuickDraft(
        cur.instId,
        {
          evalDraft: cur.evalDraft,
          instDraft: cur.instDraft,
          principalDraft: cur.principalDraft,
          yayasanDraft: cur.yayasanDraft,
        },
        false
      );
    };

    const onVis = () => {
      if (document.visibilityState === 'hidden') flushQuick();
    };
    window.addEventListener('pagehide', flushQuick);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', flushQuick);
      document.removeEventListener('visibilitychange', onVis);
      flushQuick();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setP1RecText(p1Note?.recommendation || '');
  }, [p1Note?.recommendation]);

  useEffect(() => {
    setP2RecText(p2Note?.recommendation || '');
  }, [p2Note?.recommendation]);

  const isArchived = activePeriod.status === 'archived' && activeRole !== 'SUPER_ADMIN';
  const canEditP1 =
    !isArchived &&
    (!activePeriod.p1Finalized || activeRole === 'SUPER_ADMIN') &&
    (isDemoRoleSwitcherAllowed || activeRole === 'PENILAI_1');
  const canEditP2 =
    !isArchived &&
    (!activePeriod.p2Finalized || activeRole === 'SUPER_ADMIN') &&
    (isDemoRoleSwitcherAllowed || activeRole === 'PENILAI_2');

  useEffect(() => {
    if (!canEditP1 && canEditP2) {
      setGridMode('p2_only');
    } else if (canEditP1 && !canEditP2) {
      setGridMode('p1_only');
    }
  }, [canEditP1, canEditP2]);

  const rekap = useMemo(
    () => computeDualAssessorRekap(p1Scores, p2Scores, activeIndicators),
    [p1Scores, p2Scores, activeIndicators]
  );

  // Keep inline target inputs initialized cleanly when scores exist for the active period
  useEffect(() => {
    if (rekap.penilai1.scoredIndicators > 0) {
      setP1CompTargets({
        K1: Math.round(rekap.rataRataKomponen[0]?.p1Nilai100 || 78),
        K2: Math.round(rekap.rataRataKomponen[1]?.p1Nilai100 || 74),
        K3: Math.round(rekap.rataRataKomponen[2]?.p1Nilai100 || 74),
        K4: Math.round(rekap.rataRataKomponen[3]?.p1Nilai100 || 75),
      });
      setP1RawTargets({
        K1: rekap.rataRataKomponen[0]?.p1Skor ?? 78,
        K2: rekap.rataRataKomponen[1]?.p1Skor ?? 122,
        K3: rekap.rataRataKomponen[2]?.p1Skor ?? 56,
        K4: rekap.rataRataKomponen[3]?.p1Skor ?? 33,
      });
    }
    if (rekap.penilai2.scoredIndicators > 0) {
      setP2CompTargets({
        K1: Math.round(rekap.rataRataKomponen[0]?.p2Nilai100 || 93),
        K2: Math.round(rekap.rataRataKomponen[1]?.p2Nilai100 || 96),
        K3: Math.round(rekap.rataRataKomponen[2]?.p2Nilai100 || 96),
        K4: Math.round(rekap.rataRataKomponen[3]?.p2Nilai100 || 86),
      });
      setP2RawTargets({
        K1: rekap.rataRataKomponen[0]?.p2Skor ?? 93,
        K2: rekap.rataRataKomponen[1]?.p2Skor ?? 158,
        K3: rekap.rataRataKomponen[2]?.p2Skor ?? 73,
        K4: rekap.rataRataKomponen[3]?.p2Skor ?? 38,
      });
    }
  }, [
    activePeriod.periodId,
    rekap.penilai1.scoredIndicators,
    rekap.penilai1.jumlahSkor,
    rekap.penilai2.scoredIndicators,
    rekap.penilai2.jumlahSkor,
  ]);

  // Live preview projection from inline Rekap P1 & P2 target inputs
  const liveProjection = useMemo(() => {
    const p1Dist =
      targetInputMode === 'raw'
        ? distributeTargetScores({ mode: 'by_raw_component', rawTargets: p1RawTargets }, activeIndicators)
        : distributeTargetScores({ mode: 'by_component', targets: p1CompTargets }, activeIndicators);
    const p2Dist =
      targetInputMode === 'raw'
        ? distributeTargetScores({ mode: 'by_raw_component', rawTargets: p2RawTargets }, activeIndicators)
        : distributeTargetScores({ mode: 'by_component', targets: p2CompTargets }, activeIndicators);

    const byComp = MASTER_COMPONENTS.map((comp) => {
      const compInds = activeIndicators.filter((i) => i.komponenCode === comp.code);
      const maxSkor = compInds.length * 4;
      const p1Skor = compInds.reduce((s, i) => s + (p1Dist[i.id] || 4), 0);
      const p2Skor = compInds.reduce((s, i) => s + (p2Dist[i.id] || 4), 0);
      const rataSkor = (p1Skor + p2Skor) / 2;
      const p1Pct = maxSkor > 0 ? (p1Skor / maxSkor) * 100 : 0;
      const p2Pct = maxSkor > 0 ? (p2Skor / maxSkor) * 100 : 0;
      const rataPct = (p1Pct + p2Pct) / 2;
      return {
        code: comp.code,
        nomor: comp.nomor,
        nama: comp.nama,
        maxSkor,
        p1Skor,
        p2Skor,
        rataSkor,
        p1Pct,
        p2Pct,
        rataPct,
      };
    });

    const totalMax = activeIndicators.length * 4;
    const totalP1Skor = byComp.reduce((s, c) => s + c.p1Skor, 0);
    const totalP2Skor = byComp.reduce((s, c) => s + c.p2Skor, 0);
    const totalP1Nilai = totalMax > 0 ? (totalP1Skor / totalMax) * 100 : 0;
    const totalP2Nilai = totalMax > 0 ? (totalP2Skor / totalMax) * 100 : 0;
    const finalNilai = (totalP1Nilai + totalP2Nilai) / 2;
    const finalPred = getPredikatKemenag(finalNilai);

    return {
      byComp,
      totalMax,
      totalP1Skor,
      totalP2Skor,
      totalP1Nilai,
      totalP2Nilai,
      finalNilai,
      finalPred,
    };
  }, [targetInputMode, p1CompTargets, p2CompTargets, p1RawTargets, p2RawTargets, activeIndicators]);

  const filteredIndicators = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeIndicators.filter((ind) => {
      if (komponenFilter !== 'ALL' && ind.komponenCode !== komponenFilter) return false;
      if (!q) return true;
      return (
        ind.id.toLowerCase().includes(q) ||
        ind.indikatorNama.toLowerCase().includes(q) ||
        ind.subKomponenNama.toLowerCase().includes(q) ||
        ind.buktiWajib.some((b) => b.toLowerCase().includes(q))
      );
    });
  }, [activeIndicators, komponenFilter, searchQuery]);

  // Checklist 27 documents mapped with status
  const checklistItems = useMemo(() => {
    const docByTpl = new Map(generatedDocs.map((d) => [d.templateId, d]));
    return DOCUMENT_TEMPLATES.map((tpl, index) => {
      const docId = `auto_${activePeriod.periodId}_${tpl.templateId}`;
      const existing = docByTpl.get(tpl.templateId) || generatedDocs.find((d) => d.docId === docId);
      const isCollected = existing?.status === 'APPROVED';
      const compCodes = getComponentCodesForTemplate(tpl);
      return {
        index: index + 1,
        docId: existing?.docId || docId,
        tpl,
        isCollected,
        docNumber: existing?.docNumber || '',
        compCodes,
      };
    });
  }, [generatedDocs, activePeriod.periodId]);

  const collectedDocsCount = checklistItems.filter((item) => item.isCollected).length;
  const completedIndicatorsCount = activeIndicators.filter(
    (ind) => responses[ind.id]?.completionStatus === 'complete'
  ).length;

  const filteredChecklistItems = useMemo(() => {
    const q = checklistSearch.trim().toLowerCase();
    return checklistItems.filter((item) => {
      if (checklistFilter === 'COLLECTED' && !item.isCollected) return false;
      if (checklistFilter === 'PENDING' && item.isCollected) return false;
      if (!q) return true;
      return (
        item.tpl.title.toLowerCase().includes(q) ||
        item.tpl.category.toLowerCase().includes(q) ||
        item.tpl.relatedKomponen.toLowerCase().includes(q)
      );
    });
  }, [checklistItems, checklistFilter, checklistSearch]);

  const step1Complete = Boolean(evalDraft.pengawas1Nama.trim() && evalDraft.pengawas2Nama.trim());
  const step2Complete = Boolean(instDraft.namaLembaga.trim() && principalDraft.namaLengkap.trim());
  const step3Complete = rekap.isBothComplete;

  const handleSelectMasterAssessor = (slot: 1 | 2, assessorId: string) => {
    const picked = masterAssessors.find((a) => a.assessorId === assessorId);
    if (!picked) return;
    if (slot === 1) {
      setEvalDraft((prev) => ({
        ...prev,
        pengawas1Nama: picked.nama,
        pengawas1Nip: picked.nip,
        pengawas1PangkatGol: picked.pangkatGol,
        pengawas1Jabatan: picked.jabatan,
        pengawas1UnitKerja: picked.unitKerja,
      }));
    } else {
      setEvalDraft((prev) => ({
        ...prev,
        pengawas2Nama: picked.nama,
        pengawas2Nip: picked.nip,
        pengawas2PangkatGol: picked.pangkatGol,
        pengawas2Jabatan: picked.jabatan,
        pengawas2UnitKerja: picked.unitKerja,
      }));
    }
  };

  const handleSaveStep1 = async (goNext: boolean) => {
    if (quickTimerRef.current) {
      clearTimeout(quickTimerRef.current);
      quickTimerRef.current = null;
    }
    setSavingStep(true);
    try {
      await commitQuickDraft(
        instId,
        { evalDraft, instDraft, principalDraft, yayasanDraft },
        true
      );
      if (goNext) setStep(2);
    } finally {
      setSavingStep(false);
    }
  };

  const handleSaveStep2 = async (goNext: boolean) => {
    if (quickTimerRef.current) {
      clearTimeout(quickTimerRef.current);
      quickTimerRef.current = null;
    }
    setSavingStep(true);
    try {
      await commitQuickDraft(
        instId,
        { evalDraft, instDraft, principalDraft, yayasanDraft },
        true
      );
      if (goNext) setStep(3);
    } finally {
      setSavingStep(false);
    }
  };

  const handleManualFileSelected = async (file: File | null | undefined) => {
    if (!file) return;
    setImportingFile(true);
    setImportError('');
    try {
      const idToken = firebaseUser ? await firebaseUser.getIdToken() : null;
      const result = await uploadAndParseManualFile(file, idToken, activeIndicators);
      setParsedImport(result);
    } catch (err: any) {
      setImportError(err?.message || 'Gagal membaca berkas Excel/PDF yang dipilih.');
      setParsedImport(null);
    } finally {
      setImportingFile(false);
    }
  };

  const handleApplyParsedImport = async () => {
    if (!parsedImport) return;
    setApplyingImport(true);
    try {
      // Build component targets from parsed targets or parsed overall fallback
      const nextP1Targets: Record<'K1' | 'K2' | 'K3' | 'K4', number> = {
        K1: parsedImport.componentTargetsP1.K1 ?? parsedImport.overallTargetP1 ?? p1CompTargets.K1,
        K2: parsedImport.componentTargetsP1.K2 ?? parsedImport.overallTargetP1 ?? p1CompTargets.K2,
        K3: parsedImport.componentTargetsP1.K3 ?? parsedImport.overallTargetP1 ?? p1CompTargets.K3,
        K4: parsedImport.componentTargetsP1.K4 ?? parsedImport.overallTargetP1 ?? p1CompTargets.K4,
      };
      const nextP2Targets: Record<'K1' | 'K2' | 'K3' | 'K4', number> = {
        K1:
          parsedImport.componentTargetsP2.K1 ??
          parsedImport.overallTargetP2 ??
          parsedImport.componentTargetsP1.K1 ??
          p2CompTargets.K1,
        K2:
          parsedImport.componentTargetsP2.K2 ??
          parsedImport.overallTargetP2 ??
          parsedImport.componentTargetsP1.K2 ??
          p2CompTargets.K2,
        K3:
          parsedImport.componentTargetsP2.K3 ??
          parsedImport.overallTargetP2 ??
          parsedImport.componentTargetsP1.K3 ??
          p2CompTargets.K3,
        K4:
          parsedImport.componentTargetsP2.K4 ??
          parsedImport.overallTargetP2 ??
          parsedImport.componentTargetsP1.K4 ??
          p2CompTargets.K4,
      };

      const hasExplicitP1 = Object.keys(parsedImport.p1Scores).length > 0;
      const hasExplicitP2 = Object.keys(parsedImport.p2Scores).length > 0;
      const hasTargetsP1 =
        Object.keys(parsedImport.componentTargetsP1).length > 0 ||
        parsedImport.overallTargetP1 !== undefined;
      const hasTargetsP2 =
        Object.keys(parsedImport.componentTargetsP2).length > 0 ||
        parsedImport.overallTargetP2 !== undefined;

      await applyTargetsAndSyncAll({
        p1Targets: canEditP1 && (hasTargetsP1 || hasExplicitP1) ? nextP1Targets : undefined,
        p2Targets: canEditP2 && (hasTargetsP2 || hasExplicitP2) ? nextP2Targets : undefined,
        explicitP1Scores: canEditP1 && hasExplicitP1 ? parsedImport.p1Scores : undefined,
        explicitP2Scores: canEditP2 && hasExplicitP2 ? parsedImport.p2Scores : undefined,
        syncResponsesAndChecklist: importSyncAll,
        importedTemplateIds: parsedImport.matchedTemplateIds,
        institutionProfilePatch: {
          institution: parsedImport.institutionPatch,
          principal: parsedImport.principalPatch,
          evaluators: parsedImport.evaluatorsPatch,
          namaYayasan: parsedImport.yayasanName,
        },
        reason: `Impor berkas manual "${parsedImport.fileName}"`,
      });

      setP1CompTargets(nextP1Targets);
      setP2CompTargets(nextP2Targets);
      setShowImportPanel(false);
    } finally {
      setApplyingImport(false);
    }
  };

  const handleTotalTargetChange = (role: 'P1' | 'P2', nextTotalRaw: number) => {
    const clamped = Math.min(100, Math.max(25, Math.round(nextTotalRaw)));
    const nextMap = { K1: clamped, K2: clamped, K3: clamped, K4: clamped };
    if (role === 'P1') setP1CompTargets(nextMap);
    else setP2CompTargets(nextMap);
  };

  const handleRawTotalChange = (role: 'P1' | 'P2', nextRawTotal: number) => {
    const clampedTotal = Math.min(384, Math.max(96, Math.round(nextRawTotal)));
    const dist = distributeTargetScores({ mode: 'overall_raw', targetRawTotal: clampedTotal }, activeIndicators);
    const sumByComp = (code: 'K1' | 'K2' | 'K3' | 'K4') =>
      activeIndicators
        .filter((ind) => ind.komponenCode === code)
        .reduce((s, ind) => s + (dist[ind.id] || 1), 0);
    const nextRawMap: Record<'K1' | 'K2' | 'K3' | 'K4', number> = {
      K1: sumByComp('K1'),
      K2: sumByComp('K2'),
      K3: sumByComp('K3'),
      K4: sumByComp('K4'),
    };
    if (role === 'P1') setP1RawTargets(nextRawMap);
    else setP2RawTargets(nextRawMap);
  };

  const handleApplyInlineRekapTargets = async () => {
    setApplyingBatch(true);
    try {
      if (targetInputMode === 'raw') {
        await applyTargetsAndSyncAll({
          p1RawTargets: canEditP1 ? p1RawTargets : undefined,
          p2RawTargets: canEditP2 ? p2RawTargets : undefined,
          syncResponsesAndChecklist: syncEvidenceAndDocsOnApply,
          reason: `Input otomatis Skor Langsung P1 (${liveProjection.totalP1Skor}/384) & P2 (${liveProjection.totalP2Skor}/384)`,
        });
      } else {
        await applyTargetsAndSyncAll({
          p1Targets: canEditP1 ? p1CompTargets : undefined,
          p2Targets: canEditP2 ? p2CompTargets : undefined,
          syncResponsesAndChecklist: syncEvidenceAndDocsOnApply,
          reason: `Edit langsung Rekap P1 (${liveProjection.totalP1Nilai.toFixed(1)}%) & P2 (${liveProjection.totalP2Nilai.toFixed(1)}%)`,
        });
      }
    } finally {
      setApplyingBatch(false);
    }
  };

  const handleApplyUniformQuickScale = async (scale: 1 | 2 | 3 | 4) => {
    const pct = scale * 25;
    const uniformTargets = { K1: pct, K2: pct, K3: pct, K4: pct };
    const uniformRaw = {
      K1: COMP_WEIGHT_COUNTS.K1 * scale,
      K2: COMP_WEIGHT_COUNTS.K2 * scale,
      K3: COMP_WEIGHT_COUNTS.K3 * scale,
      K4: COMP_WEIGHT_COUNTS.K4 * scale,
    };
    if (canEditP1) {
      setP1CompTargets(uniformTargets);
      setP1RawTargets(uniformRaw);
    }
    if (canEditP2) {
      setP2CompTargets(uniformTargets);
      setP2RawTargets(uniformRaw);
    }

    setApplyingBatch(true);
    try {
      await applyTargetsAndSyncAll({
        p1Targets: canEditP1 ? uniformTargets : undefined,
        p2Targets: canEditP2 ? uniformTargets : undefined,
        syncResponsesAndChecklist: syncEvidenceAndDocsOnApply,
        reason: `Isi seragam skala ${scale} (${pct}%) untuk 96 indikator`,
      });
    } finally {
      setApplyingBatch(false);
    }
  };

  const handleLoadLampiranPreset = async () => {
    setLoadingPreset(true);
    try {
      await loadAttachmentPreset2026();
      setTargetInputMode('raw');
    } finally {
      setLoadingPreset(false);
    }
  };

  const handleCopyP1ToP2 = async () => {
    if (!canEditP2) return;
    setApplyingBatch(true);
    try {
      const updates: Array<{
        assessorRole: 'PENILAI_1' | 'PENILAI_2';
        indicatorId: string;
        score: number;
        note?: string;
      }> = [];
      for (const ind of activeIndicators) {
        const sc = p1Scores[ind.id];
        if (sc && sc.score >= 1 && sc.score <= 4) {
          updates.push({
            assessorRole: 'PENILAI_2',
            indicatorId: ind.id,
            score: sc.score,
            note: sc.note,
          });
        }
      }
      if (updates.length > 0) {
        await saveAssessorScoresBatch(updates, 'Salin rincian skor Penilai 1 ke Penilai 2');
        setP2CompTargets({ ...p1CompTargets });
      }
    } finally {
      setApplyingBatch(false);
    }
  };

  const handleSyncChecklist = async (mode: 'AUTO' | 'ALL_APPROVED' | 'ALL_DRAFT') => {
    setSyncingChecklist(true);
    try {
      await syncChecklistDocsFromScores(mode);
    } finally {
      setSyncingChecklist(false);
    }
  };

  const handlePrepareAndPrint = async (tab: PrintTabKey, autoPrint: boolean) => {
    setSyncingBundle(true);
    try {
      if (canEditP1 && p1RecText.trim() && p1RecText !== (p1Note?.recommendation || '')) {
        await saveAssessorSummaryNote('PENILAI_1', p1RecText.trim(), false);
      }
      if (canEditP2 && p2RecText.trim() && p2RecText !== (p2Note?.recommendation || '')) {
        await saveAssessorSummaryNote('PENILAI_2', p2RecText.trim(), false);
      }
      await autoSyncAllNow(false);
      onOpenPrint(tab, autoPrint);
    } finally {
      setSyncingBundle(false);
    }
  };

  const renderScoreButtons = (
    indId: string,
    role: 'PENILAI_1' | 'PENILAI_2',
    currentScore: number | undefined,
    editable: boolean
  ) => (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4].map((val) => {
        const selected = currentScore === val;
        return (
          <button
            key={val}
            type="button"
            disabled={!editable}
            onClick={() =>
              saveAssessorScore(
                role,
                indId,
                val,
                (role === 'PENILAI_1' ? p1Scores[indId]?.note : p2Scores[indId]?.note) || '',
                undefined,
                'Klik cepat Mode Cepat 4 Langkah'
              )
            }
            className={`w-7 h-7 rounded-md text-xs font-mono font-bold border transition-colors ${
              selected
                ? role === 'PENILAI_1'
                  ? 'bg-emerald-700 text-white border-emerald-800'
                  : 'bg-sky-700 text-white border-sky-800'
                : editable
                ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
          >
            {val}
          </button>
        );
      })}
    </div>
  );

  // Shared Inline Editable Rekap & Komponen Table (P1 & P2 terpisah) used in Step 3 and Step 4
  const renderInlineEditableRekapPanel = (compactTitle?: string) => {
    const p1TotalInput = Math.round(computeWeightedTargetAverage(p1CompTargets));
    const p2TotalInput = Math.round(computeWeightedTargetAverage(p2CompTargets));
    const p1TotalRawInput =
      p1RawTargets.K1 + p1RawTargets.K2 + p1RawTargets.K3 + p1RawTargets.K4;
    const p2TotalRawInput =
      p2RawTargets.K1 + p2RawTargets.K2 + p2RawTargets.K3 + p2RawTargets.K4;

    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{compactTitle || 'Edit Langsung Nilai Target P1 & P2 di Tabel Rekap / Komponen'}</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Ketik langsung target <strong>Skor P1/P2 (96–384)</strong> atau <strong>Persentase (%)</strong> per komponen K1–K4 / Total. Seluruh 96 indikator (tanda V), Hasil P1/P2, bukti fisik, dan ceklis 27 berkas terupdate otomatis.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setTargetInputMode('raw')}
                className={`px-2.5 py-1.5 rounded-md font-semibold cursor-pointer whitespace-nowrap ${
                  targetInputMode === 'raw'
                    ? 'bg-white text-emerald-900 border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Skor Langsung (96–384)
              </button>
              <button
                type="button"
                onClick={() => setTargetInputMode('pct')}
                className={`px-2.5 py-1.5 rounded-md font-semibold cursor-pointer whitespace-nowrap ${
                  targetInputMode === 'pct'
                    ? 'bg-white text-emerald-900 border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Nilai Persen (25–100%)
              </button>
            </div>

            {canEditP2 && rekap.penilai1.scoredIndicators > 0 && (
              <button
                type="button"
                disabled={applyingBatch}
                onClick={handleCopyP1ToP2}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Salin P1 ke P2</span>
              </button>
            )}
            <button
              type="button"
              disabled={applyingBatch || (!canEditP1 && !canEditP2)}
              onClick={handleApplyInlineRekapTargets}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#064e3b] hover:bg-[#043927] border border-[#d4af37]/35 disabled:opacity-50 rounded-lg cursor-pointer whitespace-nowrap shrink-0 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#f3d46b]" />
              <span>{applyingBatch ? 'Menyimpan...' : 'Terapkan & Update 96 Butir'}</span>
            </button>
          </div>
        </div>

        {/* Inline Editable Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs border-collapse tabular-nums">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <th className="py-2.5 px-3 w-10 text-center border-r border-slate-200">No</th>
                <th className="py-2.5 px-3 border-r border-slate-200">Komponen Penilaian (96 Indikator)</th>
                <th className="py-2.5 px-3 w-40 text-center border-r border-slate-200 bg-emerald-50/50 text-emerald-950">
                  {targetInputMode === 'raw' ? 'Input Skor P1' : 'Target Nilai P1 (%)'}
                </th>
                <th className="py-2.5 px-3 w-24 text-right border-r border-slate-200">Proyeksi P1</th>
                <th className="py-2.5 px-3 w-40 text-center border-r border-slate-200 bg-sky-50/50 text-sky-950">
                  {targetInputMode === 'raw' ? 'Input Skor P2' : 'Target Nilai P2 (%)'}
                </th>
                <th className="py-2.5 px-3 w-24 text-right border-r border-slate-200">Proyeksi P2</th>
                <th className="py-2.5 px-3 w-28 text-right">Rata-rata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {liveProjection.byComp.map((row) => {
                const minCompRaw = COMP_WEIGHT_COUNTS[row.code];
                const maxCompRaw = row.maxSkor;
                return (
                  <tr key={row.code} className="hover:bg-slate-50/60">
                    <td className="py-2 px-3 text-center font-mono text-slate-600 border-r border-slate-200">
                      {row.nomor}.
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200">
                      <span className="font-semibold text-slate-900">{row.nama}</span>
                      <span className="block text-[11px] text-slate-500">
                        {minCompRaw} indikator · Rentang skor {minCompRaw}–{maxCompRaw}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center border-r border-slate-200 bg-emerald-50/20">
                      {targetInputMode === 'raw' ? (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min={minCompRaw}
                            max={maxCompRaw}
                            step={1}
                            disabled={!canEditP1}
                            aria-label={`Skor P1 ${row.code}`}
                            value={p1RawTargets[row.code]}
                            onChange={(e) => {
                              const v = Math.min(maxCompRaw, Math.max(minCompRaw, Math.round(Number(e.target.value) || minCompRaw)));
                              setP1RawTargets((prev) => ({ ...prev, [row.code]: v }));
                            }}
                            className="w-20 px-2 py-1 text-right font-mono font-bold bg-white border border-slate-300 rounded-md focus:border-emerald-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                          />
                          <span className="text-slate-500 font-mono text-[11px]">/{maxCompRaw}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min={25}
                            max={100}
                            step={1}
                            disabled={!canEditP1}
                            aria-label={`Target P1 ${row.code}`}
                            value={p1CompTargets[row.code]}
                            onChange={(e) => {
                              const v = Math.min(100, Math.max(25, Number(e.target.value) || 25));
                              setP1CompTargets((prev) => ({ ...prev, [row.code]: v }));
                            }}
                            className="w-20 px-2 py-1 text-right font-mono font-bold bg-white border border-slate-300 rounded-md focus:border-emerald-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                          />
                          <span className="text-slate-500 font-mono">%</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700 border-r border-slate-200">
                      {row.p1Skor}/{row.maxSkor}
                      <span className="block text-[10px] text-emerald-700 font-semibold">
                        {row.p1Pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center border-r border-slate-200 bg-sky-50/20">
                      {targetInputMode === 'raw' ? (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min={minCompRaw}
                            max={maxCompRaw}
                            step={1}
                            disabled={!canEditP2}
                            aria-label={`Skor P2 ${row.code}`}
                            value={p2RawTargets[row.code]}
                            onChange={(e) => {
                              const v = Math.min(maxCompRaw, Math.max(minCompRaw, Math.round(Number(e.target.value) || minCompRaw)));
                              setP2RawTargets((prev) => ({ ...prev, [row.code]: v }));
                            }}
                            className="w-20 px-2 py-1 text-right font-mono font-bold bg-white border border-slate-300 rounded-md focus:border-sky-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                          />
                          <span className="text-slate-500 font-mono text-[11px]">/{maxCompRaw}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min={25}
                            max={100}
                            step={1}
                            disabled={!canEditP2}
                            aria-label={`Target P2 ${row.code}`}
                            value={p2CompTargets[row.code]}
                            onChange={(e) => {
                              const v = Math.min(100, Math.max(25, Number(e.target.value) || 25));
                              setP2CompTargets((prev) => ({ ...prev, [row.code]: v }));
                            }}
                            className="w-20 px-2 py-1 text-right font-mono font-bold bg-white border border-slate-300 rounded-md focus:border-sky-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                          />
                          <span className="text-slate-500 font-mono">%</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700 border-r border-slate-200">
                      {row.p2Skor}/{row.maxSkor}
                      <span className="block text-[10px] text-sky-700 font-semibold">
                        {row.p2Pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {row.rataPct.toFixed(2)}
                      <span className="block text-[10px] font-normal text-slate-500">
                        Skor {row.rataSkor.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {/* Total Nilai Kinerja Tahunan Row (also directly editable!) */}
              <tr className="bg-slate-100/80 font-bold text-slate-900">
                <td className="py-2.5 px-3 border-r border-slate-200" />
                <td className="py-2.5 px-3 border-r border-slate-200">
                  {targetInputMode === 'raw'
                    ? 'Total Skor P1 & P2 (Ketik Misal 289 / 362 untuk Auto-Bagi K1–K4)'
                    : 'Nilai Kinerja Tahunan (Ketik Total % untuk Set Semua K1–K4)'}
                  <span className="block text-[11px] font-normal text-slate-600">
                    Tersimpan Saat Ini: P1 {rekap.penilai1.jumlahSkor}/384 ({rekap.penilai1.nilaiKinerja.toFixed(2)}) · P2 {rekap.penilai2.jumlahSkor}/384 ({rekap.penilai2.nilaiKinerja.toFixed(2)})
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center border-r border-slate-200 bg-emerald-50/70">
                  {targetInputMode === 'raw' ? (
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="number"
                        min={96}
                        max={384}
                        step={1}
                        disabled={!canEditP1}
                        aria-label="Target Total Skor P1"
                        value={p1TotalRawInput}
                        onChange={(e) => handleRawTotalChange('P1', Number(e.target.value) || 96)}
                        className="w-20 px-2 py-1 text-right font-mono font-bold bg-white border border-emerald-400 rounded-md focus:outline-none disabled:bg-slate-100"
                      />
                      <span className="text-slate-600 font-mono text-[11px]">/384</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="number"
                        min={25}
                        max={100}
                        step={1}
                        disabled={!canEditP1}
                        aria-label="Target Total P1"
                        value={p1TotalInput}
                        onChange={(e) => handleTotalTargetChange('P1', Number(e.target.value) || 25)}
                        className="w-20 px-2 py-1 text-right font-mono font-bold bg-white border border-emerald-400 rounded-md focus:outline-none disabled:bg-slate-100"
                      />
                      <span className="text-slate-600 font-mono">%</span>
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200">
                  {liveProjection.totalP1Skor}/{liveProjection.totalMax}
                  <span className="block text-[11px] text-emerald-800">
                    {liveProjection.totalP1Nilai.toFixed(2)}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center border-r border-slate-200 bg-sky-50/70">
                  {targetInputMode === 'raw' ? (
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="number"
                        min={96}
                        max={384}
                        step={1}
                        disabled={!canEditP2}
                        aria-label="Target Total Skor P2"
                        value={p2TotalRawInput}
                        onChange={(e) => handleRawTotalChange('P2', Number(e.target.value) || 96)}
                        className="w-20 px-2 py-1 text-right font-mono font-bold bg-white border border-sky-400 rounded-md focus:outline-none disabled:bg-slate-100"
                      />
                      <span className="text-slate-600 font-mono text-[11px]">/384</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="number"
                        min={25}
                        max={100}
                        step={1}
                        disabled={!canEditP2}
                        aria-label="Target Total P2"
                        value={p2TotalInput}
                        onChange={(e) => handleTotalTargetChange('P2', Number(e.target.value) || 25)}
                        className="w-20 px-2 py-1 text-right font-mono font-bold bg-white border border-sky-400 rounded-md focus:outline-none disabled:bg-slate-100"
                      />
                      <span className="text-slate-600 font-mono">%</span>
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200">
                  {liveProjection.totalP2Skor}/{liveProjection.totalMax}
                  <span className="block text-[11px] text-sky-800">
                    {liveProjection.totalP2Nilai.toFixed(2)}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-900">
                  {liveProjection.finalNilai.toFixed(2)}
                  <span className="block text-[11px] font-sans font-bold">
                    {liveProjection.finalPred.predikat}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer options & Uniform 1-4 Quick Fill */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1 text-xs">
          <label className="inline-flex items-center gap-2 text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={syncEvidenceAndDocsOnApply}
              onChange={(e) => setSyncEvidenceAndDocsOnApply(e.target.checked)}
              className="w-4 h-4 accent-emerald-700 rounded cursor-pointer"
            />
            <span>
              Update otomatis status bukti wajib 96 indikator &amp; ceklis 27 berkas wajib dikumpulkan
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 mr-1">Isi seragam 96 butir:</span>
            {([4, 3, 2, 1] as const).map((sc) => (
              <button
                key={sc}
                type="button"
                disabled={applyingBatch || (!canEditP1 && !canEditP2)}
                onClick={() => handleApplyUniformQuickScale(sc)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-md font-mono font-semibold cursor-pointer whitespace-nowrap shrink-0"
              >
                Skor {sc} ({sc * 25}%)
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header & 4-Step Progress Bar */}
      <div className="bg-white border border-[#064e3b]/15 rounded-xl overflow-hidden shadow-xs">
        <div className="h-1 bg-gradient-to-r from-[#064e3b] via-[#d4af37] to-[#064e3b]" />
        <div className="p-5 sm:p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide">
              <span className="text-[#9a7414]">Pusat Kontrol Utama PKKM v.26</span>
              <span className="text-[#d4af37]" aria-hidden="true">·</span>
              <span className="text-[#047857] font-medium">Input Otomatis &amp; Ceklis Berkas</span>
            </div>
            <h1 className="font-display text-2xl sm:text-[26px] font-bold tracking-tight text-[#064e3b] leading-snug text-balance">
              Panel Admin Input Otomatis 96 Butir &amp; Alur Kerja Cepat
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-4xl">
              Kelola data tim penilai, identitas lembaga, target nilai P1 &amp; P2, serta rekapitulasi seluruh 96 indikator penilaian kinerja secara terpadu dan efisien.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-[#064e3b]/10">
            <button
              type="button"
              disabled={loadingPreset}
              onClick={handleLoadLampiranPreset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#064e3b] bg-[#f1f6f3] hover:bg-[#e4efe8] border border-[#064e3b]/25 rounded-lg cursor-pointer whitespace-nowrap shadow-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#047857] ${loadingPreset ? 'animate-spin' : ''}`} />
              <span>{loadingPreset ? 'Memuat Preset...' : 'Muat Preset Lampiran 2026 (289 / 362)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowImportPanel((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border cursor-pointer whitespace-nowrap shadow-xs transition-colors ${
                showImportPanel
                  ? 'bg-[#f1f6f3] text-[#064e3b] border-[#064e3b]'
                  : 'bg-white text-slate-800 border-slate-300 hover:border-[#064e3b]/40 hover:bg-[#f7f8f5]'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-[#064e3b]" />
              <span>Impor Excel / PDF Manual</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMenu('company_profile_ppt')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#6b4f09] bg-[#fdf8e8] hover:bg-[#f7ecc6] border border-[#d4af37]/75 rounded-lg cursor-pointer whitespace-nowrap shadow-xs transition-colors"
            >
              <Presentation className="w-3.5 h-3.5 text-[#9a7414]" />
              <span>Company Profile PPT (12 Slide)</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrepareAndPrint('paket_excel_lengkap', false)}
              disabled={syncingBundle}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#064e3b] hover:bg-[#043927] border border-[#d4af37]/40 disabled:opacity-60 rounded-lg cursor-pointer whitespace-nowrap shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-[#f3d46b]" />
              <span>Pratinjau &amp; Cetak 53 Halaman</span>
            </button>
          </div>

          {/* 4-Step Nav Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 pt-2 border-t border-[#064e3b]/10">
            {[
              {
                num: 1 as StepNumber,
                title: '1. Data Penilai (P1 & P2)',
                sub: step1Complete
                  ? `${evalDraft.pengawas1Nama} · ${evalDraft.pengawas2Nama}`
                  : 'Pilih / isi Penilai 1 & Penilai 2',
                done: step1Complete,
              },
              {
                num: 2 as StepNumber,
                title: '2. Kepala RA & Cover',
                sub: step2Complete
                  ? `${instDraft.namaLembaga} · ${principalDraft.namaLengkap}`
                  : 'Isi lembaga, Kepala RA & sampul',
                done: step2Complete,
              },
              {
                num: 3 as StepNumber,
                title: '3. Edit Nilai & 96 Butir',
                sub: `P1: ${rekap.penilai1.scoredIndicators}/96 · P2: ${rekap.penilai2.scoredIndicators}/96`,
                done: step3Complete,
              },
              {
                num: 4 as StepNumber,
                title: '4. Rekap, Ceklis Berkas & Cetak',
                sub: `${collectedDocsCount}/27 berkas · ${
                  rekap.isBothComplete && rekap.finalNilaiKinerjaTahunan !== null
                    ? `Nilai ${rekap.finalNilaiKinerjaTahunan.toFixed(2)}`
                    : 'Rekap & Cetak A4'
                }`,
                done: rekap.isBothComplete && collectedDocsCount >= 20,
              },
            ].map((item) => {
              const active = step === item.num;
              return (
                <button
                  key={item.num}
                  type="button"
                  onClick={() => setStep(item.num)}
                  className={`text-left p-3 rounded-lg border transition-colors duration-150 cursor-pointer ${
                    active
                      ? 'bg-[#fdfaf0] border-[#b48a1e] ring-1 ring-[#d4af37]/35'
                      : 'bg-[#f7f8f5]/75 border-slate-200 hover:border-[#064e3b]/35 hover:bg-[#f1f5f2]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold ${active ? 'text-[#064e3b]' : 'text-slate-900'}`}>
                      {item.title}
                    </span>
                    {item.done && (
                      <CheckCircle2
                        className={`w-4 h-4 shrink-0 ${active ? 'text-[#9a7414]' : 'text-[#047857]'}`}
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 truncate mt-1 tabular-nums">{item.sub}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* PANEL IMPOR BERKAS MANUAL (EXCEL .xlsm/.xlsx/.csv & PDF)     */}
      {/* ============================================================ */}
      {showImportPanel && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileUp className="w-4 h-4 text-emerald-700" />
                <span>Impor Berkas PKKM Manual (Excel .xlsm / .xlsx / .csv atau PDF)</span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Unggah workbook Excel PKKM atau dokumen PDF rekap/daftar berkas yang sudah Anda isi manual. Sistem akan mengekstrak identitas, skor P1 &amp; P2, serta status ceklis berkas untuk Anda verifikasi sebelum diterapkan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowImportPanel(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer self-start sm:self-auto"
            >
              Tutup Panel
            </button>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) void handleManualFileSelected(dropped);
            }}
            className="border border-dashed border-slate-300 rounded-lg p-5 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="text-xs text-slate-700 space-y-1">
              <strong className="text-sm text-slate-900 block">
                {importingFile
                  ? 'Sedang membaca dan mengekstrak isi berkas...'
                  : 'Pilih atau seret file Excel / PDF ke sini'}
              </strong>
              <p className="text-slate-500">
                Mendukung <span className="font-mono">.xlsm</span>, <span className="font-mono">.xlsx</span>,{' '}
                <span className="font-mono">.xls</span>, <span className="font-mono">.csv</span>, dan{' '}
                <span className="font-mono">.pdf</span> (maks. 15 MB).
              </p>
            </div>
            <div className="shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsm,.xlsx,.xls,.csv,.pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleManualFileSelected(f);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <button
                type="button"
                disabled={importingFile}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{importingFile ? 'Memproses...' : 'Pilih Berkas Excel / PDF'}</span>
              </button>
            </div>
          </div>

          {importError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{importError}</span>
            </div>
          )}

          {parsedImport && (
            <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50/50 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div>
                  <strong className="text-sm text-slate-900 block">
                    Pratinjau Hasil Ekstraksi: {parsedImport.fileName}
                  </strong>
                  <span className="text-[11px] text-slate-600 font-mono">
                    {parsedImport.fileType === 'excel'
                      ? `${parsedImport.detectedSheets.length} sheet terdeteksi`
                      : `${parsedImport.numPages || 1} halaman PDF diekstrak`}
                    {' · '}Skor P1 terbaca: {Object.keys(parsedImport.p1Scores).length}/96
                    {' · '}Skor P2 terbaca: {Object.keys(parsedImport.p2Scores).length}/96
                    {' · '}Ceklis berkas terdeteksi: {parsedImport.matchedTemplateIds.length}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={applyingImport}
                  onClick={handleApplyParsedImport}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{applyingImport ? 'Menerapkan...' : 'Terapkan Hasil Impor'}</span>
                </button>
              </div>

              {parsedImport.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1">
                  <strong className="block">Catatan Verifikasi Manual:</strong>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {parsedImport.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 tabular-nums">
                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">Identitas Terbaca (Perlu Verifikasi)</span>
                  <p className="font-semibold text-slate-900">
                    RA: {parsedImport.institutionPatch.namaLembaga || '(tidak terdeteksi)'}
                  </p>
                  <p className="text-slate-600">
                    Kepala: {parsedImport.principalPatch.namaLengkap || '(tidak terdeteksi)'}
                  </p>
                  <p className="text-slate-600">
                    Penilai 1: {parsedImport.evaluatorsPatch.pengawas1Nama || '(tidak terdeteksi)'}
                  </p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">Target / Skor Terbaca</span>
                  <p className="font-mono text-slate-900">
                    P1: {Object.keys(parsedImport.p1Scores).length} butir ·{' '}
                    {parsedImport.overallTargetP1 !== undefined
                      ? `Total ${parsedImport.overallTargetP1}%`
                      : `K1:${parsedImport.componentTargetsP1.K1 ?? '-'} K2:${parsedImport.componentTargetsP1.K2 ?? '-'} K3:${parsedImport.componentTargetsP1.K3 ?? '-'} K4:${parsedImport.componentTargetsP1.K4 ?? '-'}`}
                  </p>
                  <p className="font-mono text-slate-900">
                    P2: {Object.keys(parsedImport.p2Scores).length} butir ·{' '}
                    {parsedImport.overallTargetP2 !== undefined
                      ? `Total ${parsedImport.overallTargetP2}%`
                      : `K1:${parsedImport.componentTargetsP2.K1 ?? '-'} K2:${parsedImport.componentTargetsP2.K2 ?? '-'} K3:${parsedImport.componentTargetsP2.K3 ?? '-'} K4:${parsedImport.componentTargetsP2.K4 ?? '-'}`}
                  </p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 block">Opsi Sinkronisasi Otomatis</span>
                  <label className="inline-flex items-start gap-2 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importSyncAll}
                      onChange={(e) => setImportSyncAll(e.target.checked)}
                      className="w-4 h-4 accent-emerald-700 mt-0.5"
                    />
                    <span>
                      Centang otomatis kelengkapan 96 indikator &amp; berkas wajib dikumpulkan berdasarkan skor impor
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* LANGKAH 1: DATA PENILAI 1 & PENILAI 2                        */}
      {/* ============================================================ */}
      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-700" />
                <span>Langkah 1 · Data Pengawas / Tim Penilai 1 &amp; Penilai 2</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Setara sheet <strong>Data Penilai 1 &amp; 2</strong> di Excel. Pilih dari Master Penilai atau ketik langsung.
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="font-semibold text-emerald-700">Auto-Save Aktif</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {quickAutoSaveState === 'saving'
                    ? 'Menyimpan ke browser & Cloud...'
                    : quickAutoSaveState === 'pending'
                      ? 'Draft tersimpan di browser · menyinkronkan...'
                      : isCloudLoggedIn
                        ? `Tersimpan otomatis di browser & Cloud${quickSavedTime ? ` pukul ${quickSavedTime}` : ''}`
                        : `Tersimpan otomatis di browser${quickSavedTime ? ` pukul ${quickSavedTime}` : ''}`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={savingStep}
                onClick={() => handleSaveStep1(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan</span>
              </button>
              <button
                type="button"
                disabled={savingStep}
                onClick={() => handleSaveStep1(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#064e3b] hover:bg-[#043927] border border-[#d4af37]/35 rounded-lg cursor-pointer whitespace-nowrap transition-colors"
              >
                <span>{savingStep ? 'Menyimpan...' : 'Simpan & Lanjut Langkah 2'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#f3d46b]" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
            <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50/40">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <strong className="text-sm text-slate-900">Penilai 1 (Ketua Tim / Pengawas Pembina)</strong>
                {masterAssessors.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={(e) => handleSelectMasterAssessor(1, e.target.value)}
                    className="px-2 py-1 text-[11px] bg-white border border-slate-300 rounded-md max-w-[180px]"
                  >
                    <option value="">Isi cepat dari Master...</option>
                    {masterAssessors.map((a) => (
                      <option key={a.assessorId} value={a.assessorId}>
                        {a.nama}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Penilai 1 &amp; Gelar</label>
                  <input
                    type="text"
                    value={evalDraft.pengawas1Nama}
                    onChange={(e) => setEvalDraft((p) => ({ ...p, pengawas1Nama: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">NIP Penilai 1</label>
                    <input
                      type="text"
                      value={evalDraft.pengawas1Nip}
                      onChange={(e) => setEvalDraft((p) => ({ ...p, pengawas1Nip: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Pangkat / Golongan</label>
                    <input
                      type="text"
                      value={evalDraft.pengawas1PangkatGol || ''}
                      onChange={(e) => setEvalDraft((p) => ({ ...p, pengawas1PangkatGol: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jabatan Penilai 1</label>
                  <input
                    type="text"
                    value={evalDraft.pengawas1Jabatan}
                    onChange={(e) => setEvalDraft((p) => ({ ...p, pengawas1Jabatan: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Unit Kerja / Instansi</label>
                  <input
                    type="text"
                    value={evalDraft.pengawas1UnitKerja || ''}
                    onChange={(e) => setEvalDraft((p) => ({ ...p, pengawas1UnitKerja: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50/40">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <strong className="text-sm text-slate-900">Penilai 2 (Anggota Tim Penilai)</strong>
                {masterAssessors.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={(e) => handleSelectMasterAssessor(2, e.target.value)}
                    className="px-2 py-1 text-[11px] bg-white border border-slate-300 rounded-md max-w-[180px]"
                  >
                    <option value="">Isi cepat dari Master...</option>
                    {masterAssessors.map((a) => (
                      <option key={a.assessorId} value={a.assessorId}>
                        {a.nama}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Penilai 2 &amp; Gelar</label>
                  <input
                    type="text"
                    value={evalDraft.pengawas2Nama}
                    onChange={(e) => setEvalDraft((p) => ({ ...p, pengawas2Nama: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">NIP Penilai 2</label>
                    <input
                      type="text"
                      value={evalDraft.pengawas2Nip}
                      onChange={(e) => setEvalDraft((p) => ({ ...p, pengawas2Nip: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Pangkat / Golongan</label>
                    <input
                      type="text"
                      value={evalDraft.pengawas2PangkatGol || ''}
                      onChange={(e) => setEvalDraft((p) => ({ ...p, pengawas2PangkatGol: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jabatan Penilai 2</label>
                  <input
                    type="text"
                    value={evalDraft.pengawas2Jabatan || ''}
                    onChange={(e) => setEvalDraft((p) => ({ ...p, pengawas2Jabatan: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Unit Kerja / Instansi</label>
                  <input
                    type="text"
                    value={evalDraft.pengawas2UnitKerja || ''}
                    onChange={(e) => setEvalDraft((p) => ({ ...p, pengawas2UnitKerja: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs pt-2 border-t border-slate-100">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nomor SK Tim Penilai</label>
              <input
                type="text"
                value={evalDraft.skPenugasanNomor || ''}
                onChange={(e) => setEvalDraft((p) => ({ ...p, skPenugasanNomor: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Tanggal Surat Tugas</label>
              <input
                type="text"
                value={evalDraft.skPenugasanTanggal || ''}
                onChange={(e) => setEvalDraft((p) => ({ ...p, skPenugasanTanggal: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Berlaku Sampai Dengan</label>
              <input
                type="text"
                value={evalDraft.skPenugasanBerlakuSampai || ''}
                onChange={(e) => setEvalDraft((p) => ({ ...p, skPenugasanBerlakuSampai: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Tempat Penilaian</label>
              <input
                type="text"
                value={evalDraft.tempatPenilaian}
                onChange={(e) => setEvalDraft((p) => ({ ...p, tempatPenilaian: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Tanggal Penilaian (Tercetak)</label>
              <input
                type="text"
                value={evalDraft.tanggalPenilaian}
                onChange={(e) => setEvalDraft((p) => ({ ...p, tanggalPenilaian: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* LANGKAH 2: DATA KEPALA RA, LEMBAGA & EDIT COVER              */}
      {/* ============================================================ */}
      {step === 2 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                <span>Langkah 2 · Data Kepala RA, Identitas Lembaga &amp; Edit Cover</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Setara sheet <strong>Data Kamad, Identitas &amp; Cover</strong>. Setiap ubahan langsung memperbarui seluruh sampul dan kop cetak A4.
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="font-semibold text-emerald-700">Auto-Save Aktif</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {quickAutoSaveState === 'saving'
                    ? 'Menyimpan ke browser & Cloud...'
                    : quickAutoSaveState === 'pending'
                      ? 'Draft tersimpan di browser · menyinkronkan...'
                      : isCloudLoggedIn
                        ? `Tersimpan otomatis di browser & Cloud${quickSavedTime ? ` pukul ${quickSavedTime}` : ''}`
                        : `Tersimpan otomatis di browser${quickSavedTime ? ` pukul ${quickSavedTime}` : ''}`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={savingStep}
                onClick={() => handleSaveStep2(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan</span>
              </button>
              <button
                type="button"
                disabled={savingStep}
                onClick={() => handleSaveStep2(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#064e3b] hover:bg-[#043927] border border-[#d4af37]/35 rounded-lg cursor-pointer whitespace-nowrap transition-colors"
              >
                <span>{savingStep ? 'Menyimpan...' : 'Simpan & Lanjut Input Nilai'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#f3d46b]" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 text-xs">
            <div className="xl:col-span-8 space-y-5">
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                  Identitas Satuan RA &amp; Judul Cover
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Nama Lembaga / Satuan RA</label>
                    <input
                      type="text"
                      value={instDraft.namaLembaga}
                      onChange={(e) => setInstDraft((p) => ({ ...p, namaLembaga: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Nama Yayasan / Penyelenggara</label>
                    <input
                      type="text"
                      value={yayasanDraft}
                      onChange={(e) => setYayasanDraft(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Periode Penilaian (Tampil di Cover)</label>
                    <input
                      type="text"
                      value={instDraft.periodePenilaian}
                      onChange={(e) => setInstDraft((p) => ({ ...p, periodePenilaian: e.target.value }))}
                      placeholder="Contoh: Penilaian Tahunan 2026"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tahun Pelajaran</label>
                    <input
                      type="text"
                      value={instDraft.tahunPelajaran}
                      onChange={(e) => setInstDraft((p) => ({ ...p, tahunPelajaran: e.target.value }))}
                      placeholder="2025/2026"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">NSM</label>
                    <input
                      type="text"
                      value={instDraft.nsm}
                      onChange={(e) => setInstDraft((p) => ({ ...p, nsm: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">NPSN</label>
                    <input
                      type="text"
                      value={instDraft.npsn || instDraft.npsm}
                      onChange={(e) =>
                        setInstDraft((p) => ({ ...p, npsn: e.target.value, npsm: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">Alamat Lengkap RA</label>
                    <input
                      type="text"
                      value={instDraft.alamat}
                      onChange={(e) => setInstDraft((p) => ({ ...p, alamat: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Desa / Kelurahan</label>
                    <input
                      type="text"
                      value={instDraft.desaKelurahan || ''}
                      onChange={(e) => setInstDraft((p) => ({ ...p, desaKelurahan: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Kecamatan</label>
                    <input
                      type="text"
                      value={instDraft.kecamatan}
                      onChange={(e) => setInstDraft((p) => ({ ...p, kecamatan: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Kabupaten / Kota</label>
                    <input
                      type="text"
                      value={instDraft.kotaKab}
                      onChange={(e) => setInstDraft((p) => ({ ...p, kotaKab: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">No. Telp / Fax</label>
                    <input
                      type="text"
                      value={instDraft.telpFax || instDraft.telepon || ''}
                      onChange={(e) => setInstDraft((p) => ({ ...p, telpFax: e.target.value, telepon: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                  Identitas Kepala RA Yang Dinilai (Sheet Data Kamad)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Nama Lengkap &amp; Gelar Kepala RA</label>
                    <input
                      type="text"
                      value={principalDraft.namaLengkap}
                      onChange={(e) => setPrincipalDraft((p) => ({ ...p, namaLengkap: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Jenis Kelamin</label>
                    <select
                      value={principalDraft.jenisKelamin || 'Perempuan'}
                      onChange={(e) =>
                        setPrincipalDraft((p) => ({
                          ...p,
                          jenisKelamin: e.target.value === 'Laki-laki' ? 'Laki-laki' : 'Perempuan',
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                    >
                      <option value="Perempuan">Perempuan</option>
                      <option value="Laki-laki">Laki-laki</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">NIP</label>
                    <input
                      type="text"
                      value={principalDraft.nip}
                      onChange={(e) => setPrincipalDraft((p) => ({ ...p, nip: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">No. Seri Karpeg</label>
                    <input
                      type="text"
                      value={principalDraft.noSeriKarpeg || ''}
                      onChange={(e) => setPrincipalDraft((p) => ({ ...p, noSeriKarpeg: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">NUPTK / PegID</label>
                    <input
                      type="text"
                      value={principalDraft.nuptk}
                      onChange={(e) => setPrincipalDraft((p) => ({ ...p, nuptk: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">NRG / NPK</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={principalDraft.nrg || ''}
                        onChange={(e) => setPrincipalDraft((p) => ({ ...p, nrg: e.target.value }))}
                        placeholder="NRG"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                      />
                      <input
                        type="text"
                        value={principalDraft.npk}
                        onChange={(e) => setPrincipalDraft((p) => ({ ...p, npk: e.target.value }))}
                        placeholder="NPK"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Pangkat / Golongan Ruang</label>
                    <input
                      type="text"
                      value={principalDraft.pangkatGol}
                      onChange={(e) => setPrincipalDraft((p) => ({ ...p, pangkatGol: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tempat, Tanggal Lahir</label>
                    <input
                      type="text"
                      value={principalDraft.tempatTanggalLahir}
                      onChange={(e) => setPrincipalDraft((p) => ({ ...p, tempatTanggalLahir: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Pendidikan Terakhir / Spesialisasi</label>
                    <input
                      type="text"
                      value={principalDraft.pendidikanTerakhir}
                      onChange={(e) => setPrincipalDraft((p) => ({ ...p, pendidikanTerakhir: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Program Keahlian / Jabatan</label>
                    <input
                      type="text"
                      value={principalDraft.programKeahlian || ''}
                      onChange={(e) => setPrincipalDraft((p) => ({ ...p, programKeahlian: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">TMT Jabatan Kepala RA</label>
                    <input
                      type="text"
                      value={principalDraft.tmtJabatan}
                      onChange={(e) => setPrincipalDraft((p) => ({ ...p, tmtJabatan: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Masa Kerja Kepala (Thn / Bln)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={principalDraft.masaKerjaTahun || ''}
                        onChange={(e) => setPrincipalDraft((p) => ({ ...p, masaKerjaTahun: e.target.value }))}
                        placeholder="Tahun"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                      />
                      <input
                        type="text"
                        value={principalDraft.masaKerjaBulan || ''}
                        onChange={(e) => setPrincipalDraft((p) => ({ ...p, masaKerjaBulan: e.target.value }))}
                        placeholder="Bulan"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">Unit Kerja</label>
                    <input
                      type="text"
                      value={principalDraft.unitKerja || ''}
                      onChange={(e) => setPrincipalDraft((p) => ({ ...p, unitKerja: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:col-span-4">
              <div className="border-[4px] border-[#008000] rounded-sm p-4 bg-white text-center space-y-3 sticky top-20">
                <p className="text-[10px] font-bold uppercase text-[#008000] border-b border-slate-200 pb-1">
                  Pratinjau Cover Bingkai Hijau (Hal. 1)
                </p>
                <div className="space-y-0.5 py-1">
                  <p className="text-xs font-black uppercase text-slate-900 leading-snug">
                    PENILAIAN KINERJA
                  </p>
                  <p className="text-xs font-black uppercase text-slate-900 leading-snug">
                    KEPALA RAUDHATUL ATHFAL (PKKRA)
                  </p>
                  <p className="text-[11px] font-semibold text-slate-700 mt-1">
                    Periode : {instDraft.periodePenilaian || activePeriod.yearLabel}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-left text-[10.5px] space-y-1">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-600">Nama</span>
                    <strong className="text-slate-900 text-right">{principalDraft.namaLengkap || '-'}</strong>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-600">NIP</span>
                    <span className="font-mono text-right">{principalDraft.nip || '-'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-600">NUPTK / PegID</span>
                    <span className="font-mono text-right">{principalDraft.nuptk || '-'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-600">Tempat Tugas</span>
                    <strong className="text-slate-900 text-right">{instDraft.namaLembaga || '-'}</strong>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-600">Desa / Kec.</span>
                    <span className="text-right">Ds. {instDraft.desaKelurahan || '-'} Kec. {instDraft.kecamatan || '-'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-600">Unit Kerja</span>
                    <span className="text-right">{principalDraft.unitKerja || '-'}</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-2 text-[9.5px] font-bold text-slate-800 uppercase leading-tight">
                  <p>KEMENTERIAN AGAMA REPUBLIK INDONESIA</p>
                  <p>KANTOR {(instDraft.kotaKab || 'KABUPATEN CIREBON').toUpperCase()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* LANGKAH 3: EDIT LANGSUNG REKAP + KLIK CEPAT 96 BUTIR         */}
      {/* ============================================================ */}
      {step === 3 && (
        <div className="space-y-4">
          {(!canEditP1 || !canEditP2) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Pembatasan Hak Akses Penilai:</strong>{' '}
                {!canEditP1 && !canEditP2
                  ? 'Akun atau periode saat ini hanya bersifat lihat (read-only) untuk skor penilai.'
                  : canEditP1
                  ? 'Anda hanya dapat mengisi skor kolom Penilai 1. Kolom Penilai 2 terkunci atau hanya untuk Penilai 2.'
                  : 'Anda hanya dapat mengisi skor kolom Penilai 2. Kolom Penilai 1 terkunci atau hanya untuk Penilai 1.'}
              </div>
            </div>
          )}

          {renderInlineEditableRekapPanel()}

          {/* Grid Input Manual Klik Cepat 96 Indikator */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="inline-flex bg-slate-100 p-1 rounded-lg">
                  {[
                    { id: 'side_by_side' as GridMode, label: 'Berdampingan (P1 & P2)' },
                    { id: 'p1_only' as GridMode, label: 'Penilai 1 Saja' },
                    { id: 'p2_only' as GridMode, label: 'Penilai 2 Saja' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setGridMode(tab.id)}
                      className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                        gridMode === tab.id
                          ? 'bg-white text-slate-900 border border-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="inline-flex bg-slate-100 p-1 rounded-lg">
                  {(['ALL', 'K1', 'K2', 'K3', 'K4'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKomponenFilter(k)}
                      className={`px-2.5 py-1.5 rounded-md font-semibold cursor-pointer ${
                        komponenFilter === k
                          ? 'bg-emerald-700 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {k === 'ALL' ? `Semua (${activeIndicators.length})` : k}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative w-full lg:w-64 text-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kode (1.1.1) / uraian..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse tabular-nums">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <th className="py-2.5 px-3 w-16 font-semibold border-r border-slate-200">Kode</th>
                    <th className="py-2.5 px-3 font-semibold border-r border-slate-200">Indikator Kinerja &amp; Bukti Utama</th>
                    <th className="py-2.5 px-3 w-24 text-center font-semibold border-r border-slate-200">Bukti 96</th>
                    {(gridMode === 'side_by_side' || gridMode === 'p1_only') && (
                      <th className="py-2.5 px-3 w-40 text-center font-semibold border-r border-slate-200">
                        Skor Penilai 1 (1–4)
                      </th>
                    )}
                    {(gridMode === 'side_by_side' || gridMode === 'p2_only') && (
                      <th className="py-2.5 px-3 w-40 text-center font-semibold">
                        Skor Penilai 2 (1–4)
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredIndicators.map((ind) => {
                    const respStatus = responses[ind.id]?.completionStatus || 'empty';
                    return (
                      <tr key={ind.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900 border-r border-slate-200 align-top">
                          {ind.id}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 align-top">
                          <p className="font-medium text-slate-900 leading-snug">{ind.indikatorNama}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            Bukti: {ind.buktiWajib.join('; ')}
                          </p>
                        </td>
                        <td className="py-2 px-3 text-center border-r border-slate-200 align-middle font-mono text-[11px]">
                          <span
                            className={
                              respStatus === 'complete'
                                ? 'text-emerald-800 font-bold'
                                : respStatus === 'draft'
                                ? 'text-amber-700 font-semibold'
                                : 'text-slate-400'
                            }
                          >
                            {respStatus === 'complete' ? 'Lengkap' : respStatus === 'draft' ? 'Sebagian' : 'Kosong'}
                          </span>
                        </td>
                        {(gridMode === 'side_by_side' || gridMode === 'p1_only') && (
                          <td className="py-2 px-3 text-center border-r border-slate-200 align-middle">
                            {renderScoreButtons(ind.id, 'PENILAI_1', p1Scores[ind.id]?.score, canEditP1)}
                          </td>
                        )}
                        {(gridMode === 'side_by_side' || gridMode === 'p2_only') && (
                          <td className="py-2 px-3 text-center align-middle">
                            {renderScoreButtons(ind.id, 'PENILAI_2', p2Scores[ind.id]?.score, canEditP2)}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs tabular-nums">
              <div className="flex flex-wrap items-center gap-4">
                <span>
                  Penilai 1: <strong>{rekap.penilai1.scoredIndicators}/{rekap.penilai1.totalIndicators}</strong> · Skor{' '}
                  <strong className="font-mono text-emerald-800">{rekap.penilai1.jumlahSkor}</strong> ({rekap.penilai1.nilaiKinerja.toFixed(2)})
                </span>
                <span>
                  Penilai 2: <strong>{rekap.penilai2.scoredIndicators}/{rekap.penilai2.totalIndicators}</strong> · Skor{' '}
                  <strong className="font-mono text-sky-800">{rekap.penilai2.jumlahSkor}</strong> ({rekap.penilai2.nilaiKinerja.toFixed(2)})
                </span>
                <span>
                  Bukti Indikator Siap: <strong className="font-mono">{completedIndicatorsCount}/{activeIndicators.length}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Lanjut Langkah 4 (Rekap, Ceklis &amp; Cetak)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* LANGKAH 4: EDIT REKAP, CEKLIS BERKAS & CETAK A4              */}
      {/* ============================================================ */}
      {step === 4 && (
        <div className="space-y-5">
          {/* Header & Primary Export/Print Actions */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-emerald-700" />
                <span>Langkah 4 · Rekap Nilai, Ceklis Berkas Dikumpulkan &amp; Cetak A4</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                {collectedDocsCount}/27 berkas dikumpulkan · {completedIndicatorsCount}/{activeIndicators.length} indikator lengkap · {evidenceFiles.length} file bukti fisik terunggah
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  downloadPkkmAsXlsx(
                    activeInstitution.profileData,
                    p1Scores,
                    p2Scores,
                    activePeriod.yearLabel,
                    activeIndicators,
                    evidenceFiles,
                    recommendations
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Unduh Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                disabled={syncingBundle}
                onClick={() => handlePrepareAndPrint('paket_excel_lengkap', true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#064e3b] hover:bg-[#043927] border border-[#d4af37]/35 disabled:opacity-60 rounded-lg cursor-pointer whitespace-nowrap shrink-0 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-[#f3d46b]" />
                <span>{syncingBundle ? 'Menyiapkan...' : 'Cetak Paket Lengkap 53 Hal (Lampiran PDF)'}</span>
              </button>
            </div>
          </div>

          {rekap.incompleteWarning && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block">{rekap.incompleteWarning}</strong>
                <p className="mt-0.5 tabular-nums">
                  P1: <strong>{rekap.penilai1.scoredIndicators}/{rekap.penilai1.totalIndicators}</strong> · P2:{' '}
                  <strong>{rekap.penilai2.scoredIndicators}/{rekap.penilai2.totalIndicators}</strong>. Anda dapat langsung mengetik nilai P1 &amp; P2 pada tabel Rekap di bawah lalu klik &quot;Terapkan Nilai &amp; Update 96 Butir + Ceklis&quot;.
                </p>
              </div>
            </div>
          )}

          {/* Direct Inline Editable Rekap Table right inside Step 4 too! */}
          {renderInlineEditableRekapPanel('Edit Nilai Target P1 & P2 Langsung di Tabel Rekap')}

          {/* Saved Rekap Hasil Resmi Kemenag Summary */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Hasil Nilai Tersimpan Saat Ini (Sesuai 96 Butir Aktif)
                </h3>
                <p className="text-xs text-slate-500">
                  Diperbarui seketika setiap kali nilai diterapkan atau indikator diubah.
                </p>
              </div>
              <div className="text-right tabular-nums">
                <span className="text-[11px] text-slate-500 block">Nilai Kinerja Tahunan Resmi</span>
                <strong className="text-sm font-mono text-emerald-800">
                  {rekap.isBothComplete && rekap.finalNilaiKinerjaTahunan !== null
                    ? `${rekap.finalNilaiKinerjaTahunan.toFixed(2)} — ${rekap.finalPredikat}`
                    : 'BELUM FINAL (Lengkapi 96 Butir P1 & P2)'}
                </strong>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse tabular-nums">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <th className="py-2 px-3 w-12 text-center border-r border-slate-200">No</th>
                    <th className="py-2 px-3 border-r border-slate-200">Komponen</th>
                    <th className="py-2 px-3 text-right border-r border-slate-200">Skor P1</th>
                    <th className="py-2 px-3 text-right border-r border-slate-200">Skor P2</th>
                    <th className="py-2 px-3 text-right border-r border-slate-200">Rata-rata</th>
                    <th className="py-2 px-3 text-right">Capaian (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rekap.rataRataKomponen.map((row) => (
                    <tr key={row.komponenCode}>
                      <td className="py-2 px-3 text-center font-mono border-r border-slate-200">{row.komponenNomor}.</td>
                      <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200">{row.komponenNama}</td>
                      <td className="py-2 px-3 text-right font-mono border-r border-slate-200">{row.p1Skor}</td>
                      <td className="py-2 px-3 text-right font-mono border-r border-slate-200">{row.p2Skor}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold border-r border-slate-200">{row.rataSkor.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">{row.rataNilai100.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ============================================================ */}
          {/* PANEL CEKLIS BERKAS WAJIB DIKUMPULKAN (27 DOKUMEN PKKRA)     */}
          {/* ============================================================ */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-700" />
                  <span>Ceklis Berkas Wajib Dikumpulkan untuk PKKM (27 Dokumen Administrasi)</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                  Status berkas tercentang otomatis mengikuti nilai komponen atau hasil impor Anda. Klik baris mana saja untuk menandai berkas sudah dikumpulkan.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={syncingChecklist}
                  onClick={() => handleSyncChecklist('AUTO')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sinkron dari Nilai</span>
                </button>
                <button
                  type="button"
                  disabled={syncingChecklist}
                  onClick={() => handleSyncChecklist('ALL_APPROVED')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Tandai Semua Terkumpul</span>
                </button>
                <button
                  type="button"
                  disabled={syncingBundle}
                  onClick={() => handlePrepareAndPrint('format3_kelengkapan', true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Ceklis A4</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="inline-flex bg-slate-100 p-1 rounded-lg self-start">
                {[
                  { id: 'ALL' as ChecklistFilter, label: `Semua (${DOCUMENT_TEMPLATES.length})` },
                  { id: 'COLLECTED' as ChecklistFilter, label: `Terkumpul (${collectedDocsCount})` },
                  { id: 'PENDING' as ChecklistFilter, label: `Belum Lengkap (${DOCUMENT_TEMPLATES.length - collectedDocsCount})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setChecklistFilter(f.id)}
                    className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer whitespace-nowrap ${
                      checklistFilter === f.id
                        ? 'bg-white text-slate-900 border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={checklistSearch}
                  onChange={(e) => setChecklistSearch(e.target.value)}
                  placeholder="Cari nama berkas / komponen..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse tabular-nums">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <th className="py-2 px-3 w-12 text-center border-r border-slate-200">Ceklis</th>
                    <th className="py-2 px-3 w-10 text-center border-r border-slate-200">No</th>
                    <th className="py-2 px-3 border-r border-slate-200">Nama Berkas Wajib Dikumpulkan</th>
                    <th className="py-2 px-3 w-28 text-center border-r border-slate-200">Komponen</th>
                    <th className="py-2 px-3 w-32 text-center">Status Berkas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredChecklistItems.map((item) => (
                    <tr
                      key={item.tpl.templateId}
                      onClick={() =>
                        void setChecklistDocStatus(
                          item.docId,
                          item.isCollected ? 'DRAFT' : 'APPROVED'
                        )
                      }
                      className="hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="py-2 px-3 text-center border-r border-slate-200">
                        {item.isCollected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-700 inline" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 inline" />
                        )}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-slate-500 border-r border-slate-200">
                        {item.index}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200">
                        <strong className="text-slate-900 font-semibold block">{item.tpl.title}</strong>
                        <span className="text-[11px] text-slate-500">
                          {item.tpl.category} · {item.tpl.description}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-slate-700 border-r border-slate-200">
                        {item.compCodes.join(', ')} ({item.tpl.relatedKomponen})
                      </td>
                      <td className="py-2 px-3 text-center font-semibold">
                        <span className={item.isCollected ? 'text-emerald-800' : 'text-amber-700'}>
                          {item.isCollected ? 'Terkumpul / Siap' : 'Belum Lengkap'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Catatan Penilai & Tombol Cetak Per Format */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Catatan / Rekomendasi Penilai 1 (Opsional)</label>
                <textarea
                  rows={2}
                  disabled={!canEditP1}
                  value={p1RecText}
                  onChange={(e) => setP1RecText(e.target.value)}
                  placeholder="Tulis catatan pembinaan dari Penilai 1..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Catatan / Rekomendasi Penilai 2 (Opsional)</label>
                <textarea
                  rows={2}
                  disabled={!canEditP2}
                  value={p2RecText}
                  onChange={(e) => setP2RecText(e.target.value)}
                  placeholder="Tulis catatan pembinaan dari Penilai 2..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                disabled={syncingBundle}
                onClick={() => handlePrepareAndPrint('format4_p1_detail', true)}
                className="flex items-center justify-between p-3.5 border border-slate-200 hover:border-emerald-600 rounded-lg bg-slate-50/70 hover:bg-emerald-50/50 text-left cursor-pointer"
              >
                <div>
                  <strong className="text-slate-900 block">Instrumen P1 (96 Butir)</strong>
                  <span className="text-[11px] text-slate-500">Lembar NilaiPenilai1 + ✓ 1–4</span>
                </div>
                <Printer className="w-4 h-4 text-emerald-700 shrink-0" />
              </button>

              <button
                type="button"
                disabled={syncingBundle}
                onClick={() => handlePrepareAndPrint('format4_p2_detail', true)}
                className="flex items-center justify-between p-3.5 border border-slate-200 hover:border-emerald-600 rounded-lg bg-slate-50/70 hover:bg-emerald-50/50 text-left cursor-pointer"
              >
                <div>
                  <strong className="text-slate-900 block">Instrumen P2 (96 Butir)</strong>
                  <span className="text-[11px] text-slate-500">Lembar NilaiPenilai2 + ✓ 1–4</span>
                </div>
                <Printer className="w-4 h-4 text-emerald-700 shrink-0" />
              </button>

              <button
                type="button"
                disabled={syncingBundle}
                onClick={() => handlePrepareAndPrint('format7_rekap_nilai', true)}
                className="flex items-center justify-between p-3.5 border border-slate-200 hover:border-emerald-600 rounded-lg bg-slate-50/70 hover:bg-emerald-50/50 text-left cursor-pointer"
              >
                <div>
                  <strong className="text-slate-900 block">Rekap Nilai &amp; Pengesahan</strong>
                  <span className="text-[11px] text-slate-500">Sheet Rekap Nilai Resmi</span>
                </div>
                <Check className="w-4 h-4 text-emerald-700 shrink-0" />
              </button>

              <button
                type="button"
                disabled={syncingBundle}
                onClick={() => handlePrepareAndPrint('bundel_lengkap', false)}
                className="flex items-center justify-between p-3.5 border border-slate-200 hover:border-emerald-600 rounded-lg bg-slate-50/70 hover:bg-emerald-50/50 text-left cursor-pointer"
              >
                <div>
                  <strong className="text-slate-900 block">Bundel Bab I–VII &amp; 27 Dok</strong>
                  <span className="text-[11px] text-slate-500">Laporan Lengkap Kemenag</span>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-700 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
