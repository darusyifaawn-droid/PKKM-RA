import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  FieldValue,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  storage,
  testFirestoreConnection,
} from '../firebase';
import { PpkmData } from '../types/ppkm';
import { DEFAULT_PPKM_DATA } from '../data/defaultPpkmData';
import { createCleanPpkmData } from '../data/cleanPpkmFactory';
import { DOCUMENT_TEMPLATES, MASTER_INDICATORS_V26, MASTER_INSTRUMENT_META } from '../data/masterInstrumentV26';
import {
  AssessmentPeriodRecord,
  AssessorNoteRecord,
  AssessorScoreRecord,
  AuditLogRecord,
  EvidenceFileRecord,
  EvidenceVerificationStatus,
  ExcelSettingSummary,
  GeneratedDocRecord,
  IndicatorResponseRecord,
  InstitutionTenant,
  InstrumentVersionRecord,
  MasterAssessorRecord,
  MasterIndicatorDef,
  MembershipRecord,
  RecommendationItemRecord,
  SaasMenuKey,
  ScoreHistoryRecord,
  TeamInvitationRecord,
  UserRole,
} from '../types/saas';
import {
  buildAllGeneratedDocsFromProfile,
  buildAutoIndicatorResponses,
} from '../utils/autoPopulatePkkm';
import { parseInstrumentCsv } from '../utils/csvInstrumentImporter';
import { parseInstrumentUploadFile } from '../utils/excelWorkbookImporter';
import { getComponentCodesForTemplate } from '../utils/manualPkkmImport';
import { distributeTargetScores } from '../utils/pkkmScoring';
import { buildPresetScoresForPeriod, getPresetRawScoreMap } from '../data/presetLampiran2026';
import { EvaluatorProfile, InstitutionProfile, PrincipalProfile } from '../types/ppkm';
import { EMPTY_ADMIN_DOCS } from '../data/cleanPpkmFactory';
import { loadPersistedMenu, savePersistedMenu } from '../utils/draftPersistence';

const SUPER_ADMIN_EMAIL = 'darusyifa.awn@gmail.com';
const LOCAL_SAAS_KEY = 'PKKM_RA_SMART_SAAS_STATE_V3';

function stripUndefinedDeep<T>(val: T): T {
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (val instanceof Date || val instanceof FieldValue) {
    return val;
  }
  if (Array.isArray(val)) {
    return val
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  const proto = Object.getPrototypeOf(val);
  if (proto !== Object.prototype && proto !== null) {
    return val;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
    if (v !== undefined) {
      out[k] = stripUndefinedDeep(v);
    }
  }
  return out as T;
}

const DEFAULT_INSTRUMENT_VERSION: InstrumentVersionRecord = {
  versionId: MASTER_INSTRUMENT_META.versionId,
  versionNumber: MASTER_INSTRUMENT_META.versionNumber,
  title: MASTER_INSTRUMENT_META.title,
  sourceFile: MASTER_INSTRUMENT_META.sourceFile,
  changelog: MASTER_INSTRUMENT_META.changelog,
  isActive: true,
  settingSheetVerified: false,
  anomalies: [
    'Sheet Setting pada file PKKM_v.26 untuk RA.xlsm tidak ikut dalam ekspor CSV; bobot akhir perlu verifikasi Super Admin/Penilai sebelum finalisasi.',
  ],
  indicators: MASTER_INDICATORS_V26,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const SEED_MASTER_ASSESSORS: MasterAssessorRecord[] = [
  {
    assessorId: 'assessor-p1-darusyifa',
    nama: DEFAULT_PPKM_DATA.evaluators.pengawas1Nama,
    nip: DEFAULT_PPKM_DATA.evaluators.pengawas1Nip,
    pangkatGol: DEFAULT_PPKM_DATA.evaluators.pengawas1PangkatGol || 'Pembina Utama Muda / IVc',
    jabatan: DEFAULT_PPKM_DATA.evaluators.pengawas1Jabatan || 'Pengawas Madrasah Utama / Penilai 1',
    unitKerja: DEFAULT_PPKM_DATA.evaluators.pengawas1UnitKerja || 'Kantor Kementerian Agama Kab. Cirebon',
    status: 'active',
  },
  {
    assessorId: 'assessor-p2-darusyifa',
    nama: DEFAULT_PPKM_DATA.evaluators.pengawas2Nama,
    nip: DEFAULT_PPKM_DATA.evaluators.pengawas2Nip,
    pangkatGol: DEFAULT_PPKM_DATA.evaluators.pengawas2PangkatGol || 'Pembina / IVa',
    jabatan: DEFAULT_PPKM_DATA.evaluators.pengawas2Jabatan || 'Pengawas Madrasah / Penilai 2',
    unitKerja: DEFAULT_PPKM_DATA.evaluators.pengawas2UnitKerja || 'Pokjawasmad Kemenag Kab. Cirebon',
    status: 'active',
  },
];

const SEED_INSTITUTIONS: InstitutionTenant[] = [
  {
    institutionId: 'ra-darusyifa-arjawinangun',
    name: 'RA DARUSYIFA ARJAWINANGUN',
    nsm: '101232090066',
    npsn: '69986381',
    status: 'active',
    expiresAt: '2027-12-31',
    ownerUid: 'local-owner',
    authorizedUids: ['local-owner'],
    profileData: DEFAULT_PPKM_DATA,
  },
  {
    institutionId: 'ra-wijaya-kusuma',
    name: 'RA WIJAYA KUSUMA',
    nsm: '101232090081',
    npsn: '69986402',
    status: 'active',
    expiresAt: '2027-12-31',
    ownerUid: 'local-owner',
    authorizedUids: ['local-owner'],
    profileData: createCleanPpkmData({
      name: 'RA WIJAYA KUSUMA',
      nsm: '101232090081',
      npsn: '69986402',
      kepalaNama: 'Hj. Siti Aminah, S.Pd.I',
      alamat: 'Jl. Pahlawan No. 18',
      kecamatan: 'Palimanan',
      kotaKab: 'Kab. Cirebon',
      provinsi: 'Jawa Barat',
      email: 'rawijayakusuma@gmail.com',
    }),
  },
  {
    institutionId: 'ra-miftahul-jannah',
    name: 'RA MIFTAHUL JANNAH',
    nsm: '101232090094',
    npsn: '69986415',
    status: 'active',
    expiresAt: '2027-12-31',
    ownerUid: 'local-owner',
    authorizedUids: ['local-owner'],
    profileData: createCleanPpkmData({
      name: 'RA MIFTAHUL JANNAH',
      nsm: '101232090094',
      npsn: '69986415',
      kepalaNama: 'Ustadzah Nurhayati, M.Pd',
      alamat: 'Jl. Raya Gegesik Km. 3',
      kecamatan: 'Gegesik',
      kotaKab: 'Kab. Cirebon',
      provinsi: 'Jawa Barat',
      email: 'ramiftahuljannah.crb@gmail.com',
    }),
  },
];

const SEED_PERIODS: AssessmentPeriodRecord[] = [
  {
    periodId: 'ra-darusyifa-arjawinangun_2025',
    institutionId: 'ra-darusyifa-arjawinangun',
    yearLabel: 'PKKM 2025',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    instrumentVersionId: MASTER_INSTRUMENT_META.versionId,
    status: 'archived',
    p1Finalized: true,
    p2Finalized: true,
    formulaVerified: true,
    lastActiveIndicatorId: '1.1.1',
    authorizedUids: ['local-owner'],
  },
  {
    periodId: 'ra-darusyifa-arjawinangun_2026',
    institutionId: 'ra-darusyifa-arjawinangun',
    yearLabel: 'PKKM 2026',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    instrumentVersionId: MASTER_INSTRUMENT_META.versionId,
    status: 'in_progress',
    p1Finalized: false,
    p2Finalized: false,
    formulaVerified: false,
    lastActiveIndicatorId: '1.1.1',
    authorizedUids: ['local-owner'],
  },
  {
    periodId: 'ra-wijaya-kusuma_2026',
    institutionId: 'ra-wijaya-kusuma',
    yearLabel: 'PKKM 2026',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    instrumentVersionId: MASTER_INSTRUMENT_META.versionId,
    status: 'in_progress',
    p1Finalized: false,
    p2Finalized: false,
    formulaVerified: false,
    lastActiveIndicatorId: '1.1.1',
    authorizedUids: ['local-owner'],
  },
  {
    periodId: 'ra-miftahul-jannah_2026',
    institutionId: 'ra-miftahul-jannah',
    yearLabel: 'PKKM 2026',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    instrumentVersionId: MASTER_INSTRUMENT_META.versionId,
    status: 'in_progress',
    p1Finalized: false,
    p2Finalized: false,
    formulaVerified: false,
    lastActiveIndicatorId: '1.1.1',
    authorizedUids: ['local-owner'],
  },
];

export interface ApplyTargetsAndSyncParams {
  p1Targets?: Record<'K1' | 'K2' | 'K3' | 'K4', number>;
  p2Targets?: Record<'K1' | 'K2' | 'K3' | 'K4', number>;
  p1RawTargets?: Record<'K1' | 'K2' | 'K3' | 'K4', number>;
  p2RawTargets?: Record<'K1' | 'K2' | 'K3' | 'K4', number>;
  explicitP1Scores?: Record<string, number>;
  explicitP2Scores?: Record<string, number>;
  syncResponsesAndChecklist?: boolean;
  importedTemplateIds?: string[];
  institutionProfilePatch?: {
    institution?: Partial<InstitutionProfile>;
    principal?: Partial<PrincipalProfile>;
    evaluators?: Partial<EvaluatorProfile>;
    namaYayasan?: string;
  };
  reason?: string;
}

export interface NotificationAlert {
  id: string;
  severity: 'info' | 'warning' | 'alert';
  title: string;
  detail: string;
  targetMenu: SaasMenuKey;
}

interface SaasContextValue {
  firebaseUser: User | null;
  authReady: boolean;
  isCloudConnected: boolean;
  isCloudSyncing: boolean;
  hasNoCloudInstitution: boolean;
  isSuperAdminAccount: boolean;
  isDemoRoleSwitcherAllowed: boolean;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  activeMenu: SaasMenuKey;
  setActiveMenu: (menu: SaasMenuKey) => void;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;

  institutions: InstitutionTenant[];
  activeInstitution: InstitutionTenant;
  setActiveInstitutionId: (instId: string) => void;
  createInstitution: (payload: { name: string; nsm: string; npsn: string; kepalaNama: string }) => Promise<void>;
  toggleInstitutionStatus: (instId: string) => Promise<void>;
  updateActiveInstitutionData: (
    updater: (prev: PpkmData) => PpkmData,
    options?: { skipHeavyDocSync?: boolean; quiet?: boolean }
  ) => Promise<void>;

  periods: AssessmentPeriodRecord[];
  activePeriod: AssessmentPeriodRecord;
  setActivePeriodId: (periodId: string) => void;
  createPeriod: (yearLabel: string, startDate: string, endDate: string) => Promise<void>;
  updatePeriodMeta: (periodId: string, patch: Partial<AssessmentPeriodRecord>) => Promise<void>;

  instrumentVersions: InstrumentVersionRecord[];
  activeInstrumentVersion: InstrumentVersionRecord;
  activeIndicators: MasterIndicatorDef[];
  importInstrumentFromCsv: (
    csvText: string,
    meta: {
      versionNumber: string;
      title: string;
      sourceFile: string;
      changelog: string;
      settingSheetVerified: boolean;
      activateImmediately?: boolean;
    }
  ) => Promise<{ anomalies: string[]; count: number; versionId: string }>;
  importInstrumentFromFile: (
    file: File,
    meta: {
      versionNumber: string;
      title: string;
      changelog: string;
      settingSheetVerified: boolean;
      activateImmediately?: boolean;
    }
  ) => Promise<{ anomalies: string[]; count: number; versionId: string; settingSummary?: ExcelSettingSummary }>;
  activateInstrumentVersion: (versionId: string) => Promise<void>;
  toggleSettingSheetVerified: (versionId: string) => Promise<void>;

  masterAssessors: MasterAssessorRecord[];
  saveMasterAssessor: (assessor: Omit<MasterAssessorRecord, 'assessorId'> & { assessorId?: string }) => Promise<void>;
  deleteMasterAssessor: (assessorId: string) => Promise<void>;

  responses: Record<string, IndicatorResponseRecord>;
  saveIndicatorResponse: (
    indicatorId: string,
    komponenCode: string,
    patch: Partial<IndicatorResponseRecord>
  ) => Promise<void>;

  p1Scores: Record<string, AssessorScoreRecord>;
  p2Scores: Record<string, AssessorScoreRecord>;
  saveAssessorScore: (
    assessorRole: 'PENILAI_1' | 'PENILAI_2',
    indicatorId: string,
    score: number,
    note: string,
    checkedEvidenceIds?: string[],
    reason?: string
  ) => Promise<void>;
  saveAssessorScoresBatch: (
    updates: Array<{
      assessorRole: 'PENILAI_1' | 'PENILAI_2';
      indicatorId: string;
      score: number;
      note?: string;
    }>,
    reason?: string
  ) => Promise<number>;
  applyTargetsAndSyncAll: (
    params: ApplyTargetsAndSyncParams
  ) => Promise<{ savedScores: number; updatedResponses: number; approvedDocs: number }>;
  loadAttachmentPreset2026: () => Promise<void>;
  setChecklistDocStatus: (docId: string, nextStatus: 'DRAFT' | 'APPROVED') => Promise<void>;
  syncChecklistDocsFromScores: (mode: 'AUTO' | 'ALL_APPROVED' | 'ALL_DRAFT') => Promise<number>;
  unlockAssessorScore: (
    assessorRole: 'PENILAI_1' | 'PENILAI_2',
    reason: string
  ) => Promise<void>;

  p1Note: AssessorNoteRecord | null;
  p2Note: AssessorNoteRecord | null;
  saveAssessorSummaryNote: (
    assessorRole: 'PENILAI_1' | 'PENILAI_2',
    recommendation: string,
    finalize?: boolean
  ) => Promise<void>;

  recommendations: RecommendationItemRecord[];
  saveRecommendation: (
    item: Omit<RecommendationItemRecord, 'recId' | 'institutionId' | 'periodId' | 'authorizedUids'> & { recId?: string }
  ) => Promise<void>;
  deleteRecommendation: (recId: string) => Promise<void>;
  generateRecommendationsFromAssessors: () => Promise<number>;

  scoreHistory: ScoreHistoryRecord[];

  evidenceFiles: EvidenceFileRecord[];
  uploadEvidence: (
    indicatorId: string,
    file: File,
    description: string,
    linkedIndicatorIds?: string[]
  ) => Promise<void>;
  updateEvidenceLinks: (evidenceId: string, linkedIndicatorIds: string[]) => Promise<void>;
  replaceEvidenceRevision: (evidenceId: string, file: File, revisionNote: string) => Promise<void>;
  verifyEvidence: (
    evidenceId: string,
    verificationStatus: EvidenceVerificationStatus,
    verificationNote: string
  ) => Promise<void>;
  deleteEvidence: (evidenceId: string) => Promise<void>;

  generatedDocs: GeneratedDocRecord[];
  saveGeneratedDoc: (docInput: Omit<GeneratedDocRecord, 'authorizedUids' | 'createdBy'>) => Promise<void>;
  deleteGeneratedDoc: (docId: string) => Promise<void>;

  memberships: MembershipRecord[];
  teamInvitations: TeamInvitationRecord[];
  addTeamMember: (email: string, displayName: string, role: UserRole) => Promise<void>;
  revokeTeamInvitation: (inviteId: string) => Promise<void>;

  auditLogs: AuditLogRecord[];
  notifications: NotificationAlert[];
  statusMessage: string;
  setStatusMessage: (msg: string) => void;
  autoSyncAllNow: (forceOverwrite?: boolean) => Promise<{ docsCount: number; indicatorsDone: number }>;
  pendingQuickPrint: boolean;
  setPendingQuickPrint: (v: boolean) => void;
  resetLocalToDefault: () => void;
}

const SaasContext = createContext<SaasContextValue | null>(null);

interface PersistedLocalStore {
  activeInstitutionId: string;
  activePeriodId: string;
  activeRole: UserRole;
  institutions: InstitutionTenant[];
  periods: AssessmentPeriodRecord[];
  instrumentVersions: InstrumentVersionRecord[];
  masterAssessors: MasterAssessorRecord[];
  responses: Record<string, Record<string, IndicatorResponseRecord>>;
  p1Scores: Record<string, Record<string, AssessorScoreRecord>>;
  p2Scores: Record<string, Record<string, AssessorScoreRecord>>;
  p1Notes: Record<string, AssessorNoteRecord>;
  p2Notes: Record<string, AssessorNoteRecord>;
  recommendations: RecommendationItemRecord[];
  scoreHistory: ScoreHistoryRecord[];
  evidenceFiles: EvidenceFileRecord[];
  generatedDocs: GeneratedDocRecord[];
  memberships: MembershipRecord[];
  teamInvitations: TeamInvitationRecord[];
  auditLogs: AuditLogRecord[];
}

function hydrateMissingAutoArtifacts(base: PersistedLocalStore): PersistedLocalStore {
  let generatedDocs = [...(base.generatedDocs || [])];
  const responses = { ...(base.responses || {}) };

  for (const period of base.periods) {
    const inst = base.institutions.find((i) => i.institutionId === period.institutionId);
    if (!inst) continue;

    // Only auto-hydrate full artifacts for Darusyifa preset or institutions that have backing data;
    // clean tenants get blank DRAFT docs only when generated, keeping indicator status accurate ('empty' when no data).
    const existingPeriodDocs = generatedDocs.filter(
      (d) => d.institutionId === inst.institutionId && d.periodId === period.periodId
    );
    if (existingPeriodDocs.length === 0) {
      const autoDocs = buildAllGeneratedDocsFromProfile(
        inst.institutionId,
        period.periodId,
        inst.profileData,
        period.yearLabel,
        'system-auto',
        []
      );
      generatedDocs = [...generatedDocs, ...autoDocs];
    }

    const existingPeriodResponses = responses[period.periodId] || {};
    if (Object.keys(existingPeriodResponses).length === 0) {
      const periodEv = (base.evidenceFiles || []).filter(
        (e) => e.institutionId === inst.institutionId && e.periodId === period.periodId
      );
      responses[period.periodId] = buildAutoIndicatorResponses(
        inst.institutionId,
        period.periodId,
        inst.profileData,
        periodEv,
        'system-auto',
        {}
      );
    }
  }

  const p1Scores = { ...(base.p1Scores || {}) };
  const p2Scores = { ...(base.p2Scores || {}) };

  const darusyifaPeriodId = 'ra-darusyifa-arjawinangun_2026';
  const darusyifaInst = base.institutions.find((i) => i.institutionId === 'ra-darusyifa-arjawinangun');
  if (
    darusyifaInst &&
    Object.keys(p1Scores[darusyifaPeriodId] || {}).length === 0 &&
    Object.keys(p2Scores[darusyifaPeriodId] || {}).length === 0
  ) {
    const presetScores = buildPresetScoresForPeriod(
      'ra-darusyifa-arjawinangun',
      darusyifaPeriodId,
      'system-preset',
      darusyifaInst.authorizedUids || ['local-owner']
    );
    p1Scores[darusyifaPeriodId] = presetScores.p1Scores;
    p2Scores[darusyifaPeriodId] = presetScores.p2Scores;
  }

  return {
    ...base,
    instrumentVersions: base.instrumentVersions?.length
      ? base.instrumentVersions
      : [DEFAULT_INSTRUMENT_VERSION],
    masterAssessors: base.masterAssessors?.length
      ? base.masterAssessors
      : SEED_MASTER_ASSESSORS,
    recommendations: base.recommendations || [],
    scoreHistory: base.scoreHistory || [],
    teamInvitations: base.teamInvitations || [],
    generatedDocs,
    responses,
    p1Scores,
    p2Scores,
  };
}

function loadInitialStore(): PersistedLocalStore {
  try {
    const raw = localStorage.getItem(LOCAL_SAAS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedLocalStore;
      if (parsed.institutions?.length) {
        return hydrateMissingAutoArtifacts(parsed);
      }
    }
  } catch {
    // fallback to seed
  }
  return hydrateMissingAutoArtifacts({
    activeInstitutionId: SEED_INSTITUTIONS[0].institutionId,
    activePeriodId: 'ra-darusyifa-arjawinangun_2026',
    activeRole: 'KEPALA_RA',
    institutions: SEED_INSTITUTIONS,
    periods: SEED_PERIODS,
    instrumentVersions: [DEFAULT_INSTRUMENT_VERSION],
    masterAssessors: SEED_MASTER_ASSESSORS,
    responses: {},
    p1Scores: {},
    p2Scores: {},
    p1Notes: {},
    p2Notes: {},
    recommendations: [],
    scoreHistory: [],
    evidenceFiles: [],
    generatedDocs: [],
    memberships: [
      {
        membershipId: 'local-owner_ra-darusyifa-arjawinangun',
        uid: 'local-owner',
        institutionId: 'ra-darusyifa-arjawinangun',
        displayName: 'Gian Dwi Wahyuni, S.H',
        userEmail: SUPER_ADMIN_EMAIL,
        role: 'KEPALA_RA',
        status: 'active',
      },
    ],
    teamInvitations: [],
    auditLogs: [
      {
        logId: 'init-log-1',
        institutionId: 'ra-darusyifa-arjawinangun',
        periodId: 'ra-darusyifa-arjawinangun_2026',
        actorUid: 'system',
        actorRole: 'SUPER_ADMIN',
        action: 'SYSTEM_INIT',
        summary: 'Master Instrumen PKKM_v.26 untuk RA (96 Indikator), 27 dokumen otomatis, dan preset RA Darusyifa Arjawinangun dimuat.',
        authorizedUids: ['local-owner'],
        createdAt: new Date().toISOString(),
      },
    ],
  });
}

const EMPTY_CLOUD_INSTITUTION: InstitutionTenant = {
  institutionId: 'onboarding-ra',
  name: 'Belum Ada Lembaga RA',
  nsm: '-',
  npsn: '-',
  status: 'active',
  expiresAt: '2027-12-31',
  ownerUid: '',
  authorizedUids: [],
  profileData: createCleanPpkmData({
    name: 'Lembaga RA Baru',
    nsm: '-',
    npsn: '-',
    kepalaNama: 'Kepala RA',
  }),
};

const EMPTY_CLOUD_PERIOD: AssessmentPeriodRecord = {
  periodId: 'onboarding-ra_2026',
  institutionId: 'onboarding-ra',
  yearLabel: 'PKKM 2026',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  instrumentVersionId: MASTER_INSTRUMENT_META.versionId,
  status: 'draft',
  p1Finalized: false,
  p2Finalized: false,
  formulaVerified: false,
  lastActiveIndicatorId: '1.1.1',
  authorizedUids: [],
};

export const SaasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [store, setStore] = useState<PersistedLocalStore>(loadInitialStore);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudInstitutionsLoaded, setCloudInstitutionsLoaded] = useState(false);
  const [activeMenu, setActiveMenuState] = useState<SaasMenuKey>(loadPersistedMenu);
  const [statusMessage, setStatusMessage] = useState('');
  const [pendingQuickPrint, setPendingQuickPrint] = useState(false);

  const bootstrappedUidRef = useRef<string | null>(null);
  const storeRef = useRef(store);
  storeRef.current = store;

  const setActiveMenu = (menu: SaasMenuKey) => {
    savePersistedMenu(menu);
    setActiveMenuState(menu);
  };

  const isCloudUser = Boolean(firebaseUser && firebaseUser.emailVerified);
  const isSuperAdminAccount = Boolean(
    isCloudUser && firebaseUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL
  );
  // Simulasi Role allowed ONLY in unauthenticated local preview OR for verified Super Admin
  const isDemoRoleSwitcherAllowed = !isCloudUser || isSuperAdminAccount;

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_SAAS_KEY, JSON.stringify(store));
    } catch (e) {
      console.warn('Local cache quota warning:', e);
    }
  }, [store]);

  useEffect(() => {
    testFirestoreConnection().then(setIsCloudConnected);

    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      setCloudInstitutionsLoaded(false);

      if (user && user.emailVerified) {
        const isSuper = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
        const userEmailLower = (user.email || '').toLowerCase();
        setIsCloudSyncing(true);

        try {
          const safeDisplayName = (
            user.displayName ||
            user.email?.split('@')[0] ||
            'Pengguna RA'
          ).slice(0, 160);
          const safeActiveInst = (store.activeInstitutionId || 'onboarding-ra').slice(0, 128);
          const safePhotoUrl = (user.photoURL || '').slice(0, 1000);

          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              uid: user.uid,
              displayName: safeDisplayName,
              activeInstitutionId: safeActiveInst,
              globalRole: 'USER',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else {
            await updateDoc(userRef, {
              displayName: (user.displayName || snap.data()?.displayName || safeDisplayName).slice(0, 160),
              updatedAt: serverTimestamp(),
            });
          }

          await setDoc(
            doc(db, 'users', user.uid, 'private', 'info'),
            {
              uid: user.uid,
              email: userEmailLower.slice(0, 200),
              photoUrl: safePhotoUrl,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          // 1. Auto-claim any pending email invitations for this verified Google account
          if (userEmailLower) {
            try {
              const invQ = query(
                collection(db, 'teamInvitations'),
                where('invitedEmail', '==', userEmailLower),
                where('status', '==', 'pending')
              );
              const invSnap = await getDocs(invQ);
              for (const invDoc of invSnap.docs) {
                const inv = invDoc.data() as TeamInvitationRecord;
                await updateDoc(doc(db, 'teamInvitations', inv.inviteId), {
                  status: 'claimed',
                  claimedByUid: user.uid,
                  claimedAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
                const memId = `${user.uid}_${inv.institutionId}`;
                await setDoc(doc(db, 'memberships', memId), {
                  membershipId: memId,
                  uid: user.uid,
                  institutionId: inv.institutionId,
                  displayName: user.displayName || inv.displayName,
                  userEmail: userEmailLower,
                  role: inv.role,
                  status: 'active',
                  inviteId: inv.inviteId,
                  authorizedUids: Array.from(new Set([...(inv.authorizedUids || []), user.uid])),
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
                await updateDoc(doc(db, 'institutions', inv.institutionId), {
                  authorizedUids: arrayUnion(user.uid),
                  updatedAt: serverTimestamp(),
                });
                // Also grant access on active institution periods
                const candidatePeriod = doc(db, 'assessmentPeriods', `${inv.institutionId}_2026`);
                const pSnap = await getDoc(candidatePeriod);
                if (pSnap.exists()) {
                  await updateDoc(candidatePeriod, {
                    authorizedUids: arrayUnion(user.uid),
                    updatedAt: serverTimestamp(),
                  });
                }
                setStatusMessage(`Undangan keanggotaan ${inv.role.replace('_', ' ')} berhasil diaktifkan otomatis.`);
              }
            } catch (claimErr) {
              console.warn('Invitation claim check notice:', claimErr);
            }
          }

          // 2. Super Admin Idempotent Auto-Bootstrap for RA Darusyifa Arjawinangun + Master Data
          if (isSuper && bootstrappedUidRef.current !== user.uid) {
            bootstrappedUidRef.current = user.uid;
            setStore((prev) => ({ ...prev, activeRole: 'SUPER_ADMIN' }));

            let currentBootPath = 'institutions/ra-darusyifa-arjawinangun';
            try {
              const instId = 'ra-darusyifa-arjawinangun';
              const darusyifaRef = doc(db, 'institutions', instId);
              const darusyifaSnap = await getDoc(darusyifaRef);

              // Seed Master Instrument v.26 if not yet in cloud
              currentBootPath = `masterInstruments/${DEFAULT_INSTRUMENT_VERSION.versionId}`;
              const masterInstRef = doc(db, 'masterInstruments', DEFAULT_INSTRUMENT_VERSION.versionId);
              const masterInstSnap = await getDoc(masterInstRef);
              if (!masterInstSnap.exists()) {
                await setDoc(
                  masterInstRef,
                  stripUndefinedDeep({
                    versionId: DEFAULT_INSTRUMENT_VERSION.versionId,
                    versionNumber: DEFAULT_INSTRUMENT_VERSION.versionNumber.slice(0, 32),
                    title: DEFAULT_INSTRUMENT_VERSION.title.slice(0, 200),
                    sourceFile: DEFAULT_INSTRUMENT_VERSION.sourceFile.slice(0, 200),
                    changelog: DEFAULT_INSTRUMENT_VERSION.changelog.slice(0, 2000),
                    isActive: DEFAULT_INSTRUMENT_VERSION.isActive,
                    settingSheetVerified: DEFAULT_INSTRUMENT_VERSION.settingSheetVerified,
                    anomalies: (DEFAULT_INSTRUMENT_VERSION.anomalies || []).slice(0, 200),
                    indicators: DEFAULT_INSTRUMENT_VERSION.indicators.slice(0, 200),
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  })
                );
              }

              // Seed Master Assessors if missing
              for (const assessor of SEED_MASTER_ASSESSORS) {
                currentBootPath = `masterAssessors/${assessor.assessorId}`;
                const aRef = doc(db, 'masterAssessors', assessor.assessorId);
                const aSnap = await getDoc(aRef);
                if (!aSnap.exists()) {
                  await setDoc(
                    aRef,
                    stripUndefinedDeep({
                      ...assessor,
                      createdAt: serverTimestamp(),
                      updatedAt: serverTimestamp(),
                    })
                  );
                }
              }

              // Auto-sync RA Darusyifa Arjawinangun on Super Admin first cloud login (preserve any local edits)
              if (!darusyifaSnap.exists()) {
                const localDarusyifa =
                  storeRef.current.institutions.find((i) => i.institutionId === instId) ||
                  SEED_INSTITUTIONS[0];
                const cloudAuthUids = [user.uid];
                currentBootPath = `institutions/${instId}`;
                await setDoc(
                  darusyifaRef,
                  stripUndefinedDeep({
                    ...localDarusyifa,
                    ownerUid: user.uid,
                    authorizedUids: cloudAuthUids,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  })
                );

                currentBootPath = `memberships/${user.uid}_${instId}`;
                await setDoc(doc(db, 'memberships', `${user.uid}_${instId}`), {
                  membershipId: `${user.uid}_${instId}`,
                  uid: user.uid,
                  institutionId: instId,
                  displayName: (user.displayName || 'Super Admin RA Darusyifa').slice(0, 160),
                  userEmail: userEmailLower.slice(0, 200),
                  role: 'SUPER_ADMIN',
                  status: 'active',
                  authorizedUids: cloudAuthUids,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });

                const darusyifaPeriods = SEED_PERIODS.filter((p) => p.institutionId === instId);
                for (const period of darusyifaPeriods) {
                  currentBootPath = `assessmentPeriods/${period.periodId}`;
                  await setDoc(
                    doc(db, 'assessmentPeriods', period.periodId),
                    stripUndefinedDeep({
                      ...period,
                      authorizedUids: cloudAuthUids,
                      createdAt: serverTimestamp(),
                      updatedAt: serverTimestamp(),
                    })
                  );
                }

                // Batch upload auto-generated 27 docs and 96 responses for active 2026 period
                const activeP = darusyifaPeriods[1] || darusyifaPeriods[0];
                if (activeP) {
                  currentBootPath = `generatedDocuments_indicatorResponses/${activeP.periodId}`;
                  const autoDocs = buildAllGeneratedDocsFromProfile(
                    instId,
                    activeP.periodId,
                    localDarusyifa.profileData,
                    activeP.yearLabel,
                    user.uid,
                    []
                  );
                  const autoResps = buildAutoIndicatorResponses(
                    instId,
                    activeP.periodId,
                    localDarusyifa.profileData,
                    [],
                    user.uid,
                    {}
                  );

                  const presetScores = buildPresetScoresForPeriod(
                    instId,
                    activeP.periodId,
                    user.uid,
                    cloudAuthUids
                  );

                  const batch = writeBatch(db);
                  for (const d of autoDocs) {
                    batch.set(
                      doc(db, 'generatedDocuments', d.docId),
                      stripUndefinedDeep({
                        ...d,
                        createdBy: user.uid,
                        authorizedUids: cloudAuthUids,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                      })
                    );
                  }
                  for (const r of Object.values(autoResps)) {
                    batch.set(
                      doc(db, 'indicatorResponses', r.responseId),
                      stripUndefinedDeep({
                        ...r,
                        updatedBy: user.uid,
                        authorizedUids: cloudAuthUids,
                        updatedAt: serverTimestamp(),
                      })
                    );
                  }
                  for (const sc of [...Object.values(presetScores.p1Scores), ...Object.values(presetScores.p2Scores)]) {
                    const scoreDocId = `${activeP.periodId}_${sc.assessorRole}_${sc.indicatorId}`.replace(
                      /[^a-zA-Z0-9_-]/g,
                      '_'
                    );
                    batch.set(
                      doc(db, 'assessmentScores', scoreDocId),
                      stripUndefinedDeep({
                        ...sc,
                        updatedAt: serverTimestamp(),
                      })
                    );
                  }
                  await batch.commit();
                }

                setStatusMessage(
                  'Preset RA Darusyifa Arjawinangun, Master Penilai & Instrumen v.26 otomatis tersinkron ke Cloud Firestore.'
                );
              }
            } catch (bootErr) {
              handleFirestoreError(bootErr, OperationType.WRITE, currentBootPath);
            }
          }
        } catch (err) {
          console.warn('Cloud user bootstrap notice:', err);
        } finally {
          setIsCloudSyncing(false);
        }
      }
    });
    return () => unsub();
  }, []);

  // Global / User-scoped Real-Time Cloud Listeners
  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified) return;

    const uid = firebaseUser.uid;
    const isSuper = firebaseUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

    const instQuery = isSuper
      ? query(collection(db, 'institutions'), limit(50))
      : query(collection(db, 'institutions'), where('authorizedUids', 'array-contains', uid));

    const unsubInst = onSnapshot(
      instQuery,
      (snapshot) => {
        const cloudInstitutions = snapshot.docs.map((d) => d.data() as InstitutionTenant);
        setCloudInstitutionsLoaded(true);
        setStore((prev) => {
          if (isSuper) {
            const merged = [...cloudInstitutions];
            for (const localInst of prev.institutions) {
              if (!merged.find((m) => m.institutionId === localInst.institutionId)) {
                merged.push(localInst);
              }
            }
            return { ...prev, institutions: merged };
          }
          // Non-Super Admin strictly sees ONLY cloud institutions they belong to (zero cross-tenant leak)
          const validActive = cloudInstitutions.some((i) => i.institutionId === prev.activeInstitutionId)
            ? prev.activeInstitutionId
            : cloudInstitutions[0]?.institutionId || 'onboarding-ra';
          return {
            ...prev,
            institutions: cloudInstitutions,
            activeInstitutionId: validActive,
          };
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'institutions')
    );

    const periodQuery = isSuper
      ? query(collection(db, 'assessmentPeriods'), limit(100))
      : query(collection(db, 'assessmentPeriods'), where('authorizedUids', 'array-contains', uid));

    const unsubPeriods = onSnapshot(
      periodQuery,
      (snapshot) => {
        const cloudPeriods = snapshot.docs.map((d) => d.data() as AssessmentPeriodRecord);
        setStore((prev) => {
          if (isSuper) {
            const merged = [...cloudPeriods];
            for (const lp of prev.periods) {
              if (!merged.find((m) => m.periodId === lp.periodId)) {
                merged.push(lp);
              }
            }
            return { ...prev, periods: merged };
          }
          const validActivePeriod = cloudPeriods.some((p) => p.periodId === prev.activePeriodId)
            ? prev.activePeriodId
            : cloudPeriods[0]?.periodId || 'onboarding-ra_2026';
          return {
            ...prev,
            periods: cloudPeriods,
            activePeriodId: validActivePeriod,
          };
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'assessmentPeriods')
    );

    const memQuery = isSuper
      ? query(collection(db, 'memberships'), limit(200))
      : query(collection(db, 'memberships'), where('uid', '==', uid));

    const unsubMemberships = onSnapshot(
      memQuery,
      (snapshot) => {
        const cloudMemberships = snapshot.docs.map((d) => d.data() as MembershipRecord);
        setStore((prev) => ({
          ...prev,
          memberships: cloudMemberships,
        }));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'memberships')
    );

    const invQuery = isSuper
      ? query(collection(db, 'teamInvitations'), limit(100))
      : query(collection(db, 'teamInvitations'), where('authorizedUids', 'array-contains', uid));

    const unsubInvites = onSnapshot(
      invQuery,
      (snapshot) => {
        const cloudInvites = snapshot.docs.map((d) => d.data() as TeamInvitationRecord);
        setStore((prev) => ({
          ...prev,
          teamInvitations: cloudInvites,
        }));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'teamInvitations')
    );

    const assessorQuery = isSuper
      ? query(collection(db, 'masterAssessors'), limit(200))
      : query(collection(db, 'masterAssessors'), where('status', '==', 'active'));

    const unsubAssessors = onSnapshot(
      assessorQuery,
      (snapshot) => {
        if (snapshot.empty) return;
        const cloudAssessors = snapshot.docs.map((d) => d.data() as MasterAssessorRecord);
        setStore((prev) => ({
          ...prev,
          masterAssessors: cloudAssessors,
        }));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'masterAssessors')
    );

    const instrumentQuery = isSuper
      ? query(collection(db, 'masterInstruments'), limit(30))
      : query(collection(db, 'masterInstruments'), where('isActive', 'in', [true, false]), limit(30));
    const unsubInstruments = onSnapshot(
      instrumentQuery,
      (snapshot) => {
        if (snapshot.empty) return;
        const cloudVersions = snapshot.docs.map((d) => {
          const data = d.data() as InstrumentVersionRecord;
          return {
            ...data,
            indicators: data.indicators?.length ? data.indicators : MASTER_INDICATORS_V26,
          };
        });
        setStore((prev) => ({
          ...prev,
          instrumentVersions: cloudVersions,
        }));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'masterInstruments')
    );

    return () => {
      unsubInst();
      unsubPeriods();
      unsubMemberships();
      unsubInvites();
      unsubAssessors();
      unsubInstruments();
    };
  }, [authReady, firebaseUser]);

  // Period & Institution Scoped Real-Time Listeners
  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified) return;
    const periodId = store.activePeriodId;
    const instId = store.activeInstitutionId;
    if (!periodId || periodId === 'onboarding-ra_2026' || !instId || instId === 'onboarding-ra') {
      return;
    }

    const uid = firebaseUser.uid;
    const isSuper = firebaseUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

    const scopedPeriodQuery = (colName: string) =>
      isSuper
        ? query(collection(db, colName), where('periodId', '==', periodId))
        : query(
            collection(db, colName),
            where('authorizedUids', 'array-contains', uid),
            where('periodId', '==', periodId)
          );

    const unsubResponses = onSnapshot(
      scopedPeriodQuery('indicatorResponses'),
      (snapshot) => {
        if (snapshot.empty) return;
        const map: Record<string, IndicatorResponseRecord> = {};
        snapshot.docs.forEach((d) => {
          const r = d.data() as IndicatorResponseRecord;
          map[r.indicatorId] = r;
        });
        setStore((prev) => ({
          ...prev,
          responses: {
            ...prev.responses,
            [periodId]: { ...(prev.responses[periodId] || {}), ...map },
          },
        }));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'indicatorResponses')
    );

    const unsubScores = onSnapshot(
      scopedPeriodQuery('assessmentScores'),
      (snapshot) => {
        const p1: Record<string, AssessorScoreRecord> = {};
        const p2: Record<string, AssessorScoreRecord> = {};
        snapshot.docs.forEach((d) => {
          const sc = d.data() as AssessorScoreRecord;
          if (sc.assessorRole === 'PENILAI_1') p1[sc.indicatorId] = sc;
          if (sc.assessorRole === 'PENILAI_2') p2[sc.indicatorId] = sc;
        });
        setStore((prev) => ({
          ...prev,
          p1Scores: { ...prev.p1Scores, [periodId]: p1 },
          p2Scores: { ...prev.p2Scores, [periodId]: p2 },
        }));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'assessmentScores')
    );

    const unsubNotes = onSnapshot(
      scopedPeriodQuery('assessmentNotes'),
      (snapshot) => {
        let nextP1: AssessorNoteRecord | undefined;
        let nextP2: AssessorNoteRecord | undefined;
        snapshot.docs.forEach((d) => {
          const n = d.data() as AssessorNoteRecord;
          if (n.assessorRole === 'PENILAI_1') nextP1 = n;
          if (n.assessorRole === 'PENILAI_2') nextP2 = n;
        });
        setStore((prev) => ({
          ...prev,
          p1Notes: nextP1 ? { ...prev.p1Notes, [periodId]: nextP1 } : prev.p1Notes,
          p2Notes: nextP2 ? { ...prev.p2Notes, [periodId]: nextP2 } : prev.p2Notes,
        }));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'assessmentNotes')
    );

    const unsubRecs = onSnapshot(
      scopedPeriodQuery('recommendations'),
      (snapshot) => {
        const cloudRecs = snapshot.docs.map((d) => d.data() as RecommendationItemRecord);
        setStore((prev) => {
          const others = prev.recommendations.filter((r) => r.periodId !== periodId);
          return { ...prev, recommendations: [...cloudRecs, ...others] };
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'recommendations')
    );

    const unsubHistory = onSnapshot(
      scopedPeriodQuery('scoreHistory'),
      (snapshot) => {
        const cloudHistory = snapshot.docs.map((d) => d.data() as ScoreHistoryRecord);
        setStore((prev) => {
          const others = prev.scoreHistory.filter((h) => h.periodId !== periodId);
          return { ...prev, scoreHistory: [...cloudHistory, ...others] };
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'scoreHistory')
    );

    const unsubEvidence = onSnapshot(
      scopedPeriodQuery('evidenceFiles'),
      (snapshot) => {
        const cloudEv = snapshot.docs.map((d) => d.data() as EvidenceFileRecord);
        setStore((prev) => {
          const others = prev.evidenceFiles.filter((e) => e.periodId !== periodId);
          return { ...prev, evidenceFiles: [...cloudEv, ...others] };
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'evidenceFiles')
    );

    const unsubDocs = onSnapshot(
      scopedPeriodQuery('generatedDocuments'),
      (snapshot) => {
        if (snapshot.empty) return;
        const cloudDocs = snapshot.docs.map((d) => d.data() as GeneratedDocRecord);
        setStore((prev) => {
          const others = prev.generatedDocs.filter((d) => d.periodId !== periodId);
          return { ...prev, generatedDocs: [...cloudDocs, ...others] };
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'generatedDocuments')
    );

    const logsQuery = isSuper
      ? query(collection(db, 'auditLogs'), where('institutionId', '==', instId), limit(100))
      : query(
          collection(db, 'auditLogs'),
          where('authorizedUids', 'array-contains', uid),
          where('institutionId', '==', instId),
          limit(100)
        );

    const unsubLogs = onSnapshot(
      logsQuery,
      (snapshot) => {
        const cloudLogs = snapshot.docs.map((d) => d.data() as AuditLogRecord);
        setStore((prev) => {
          const others = prev.auditLogs.filter((l) => l.institutionId !== instId);
          return { ...prev, auditLogs: [...cloudLogs, ...others].slice(0, 200) };
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
    );

    return () => {
      unsubResponses();
      unsubScores();
      unsubNotes();
      unsubRecs();
      unsubHistory();
      unsubEvidence();
      unsubDocs();
      unsubLogs();
    };
  }, [authReady, firebaseUser, store.activePeriodId, store.activeInstitutionId]);

  const hasNoCloudInstitution = Boolean(
    isCloudUser && !isSuperAdminAccount && cloudInstitutionsLoaded && store.institutions.length === 0
  );

  // Enforce locked role from Firestore membership whenever logged in as non-Super Admin
  useEffect(() => {
    if (!isCloudUser || !firebaseUser) return;
    if (isSuperAdminAccount) return;

    const matchingMembership = store.memberships.find(
      (m) =>
        m.uid === firebaseUser.uid &&
        m.institutionId === store.activeInstitutionId &&
        m.status === 'active'
    );
    const fallbackMembership = store.memberships.find(
      (m) => m.uid === firebaseUser.uid && m.status === 'active'
    );
    const lockedRole: UserRole =
      matchingMembership?.role || fallbackMembership?.role || 'KEPALA_RA';

    if (store.activeRole !== lockedRole) {
      setStore((prev) => ({ ...prev, activeRole: lockedRole }));
    }
  }, [isCloudUser, isSuperAdminAccount, firebaseUser, store.memberships, store.activeInstitutionId, store.activeRole]);

  const activeInstitution = useMemo(
    () =>
      store.institutions.find((i) => i.institutionId === store.activeInstitutionId) ||
      store.institutions[0] ||
      EMPTY_CLOUD_INSTITUTION,
    [store.institutions, store.activeInstitutionId]
  );

  const institutionPeriods = useMemo(
    () => store.periods.filter((p) => p.institutionId === activeInstitution.institutionId),
    [store.periods, activeInstitution.institutionId]
  );

  const activePeriod = useMemo(
    () =>
      institutionPeriods.find((p) => p.periodId === store.activePeriodId) ||
      institutionPeriods[institutionPeriods.length - 1] ||
      EMPTY_CLOUD_PERIOD,
    [institutionPeriods, store.activePeriodId]
  );

  const activeInstrumentVersion = useMemo(
    () =>
      store.instrumentVersions.find((v) => v.versionId === activePeriod.instrumentVersionId) ||
      store.instrumentVersions.find((v) => v.isActive) ||
      DEFAULT_INSTRUMENT_VERSION,
    [store.instrumentVersions, activePeriod.instrumentVersionId]
  );

  const activeIndicators = useMemo(
    () =>
      activeInstrumentVersion.indicators?.length
        ? activeInstrumentVersion.indicators
        : MASTER_INDICATORS_V26,
    [activeInstrumentVersion]
  );

  const getSafeAuthorizedUids = (): string[] => {
    if (activeInstitution.authorizedUids.length > 0) {
      return activeInstitution.authorizedUids;
    }
    return [firebaseUser?.uid || 'local-owner'];
  };

  const appendAuditLog = async (action: string, summary: string) => {
    const uid = firebaseUser?.uid || 'local-owner';
    const logEntry: AuditLogRecord = {
      logId: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      institutionId: activeInstitution.institutionId,
      periodId: activePeriod.periodId,
      actorUid: uid,
      actorRole: store.activeRole,
      action,
      summary,
      authorizedUids: getSafeAuthorizedUids(),
      createdAt: new Date().toISOString(),
    };
    setStore((prev) => ({
      ...prev,
      auditLogs: [logEntry, ...prev.auditLogs].slice(0, 200),
    }));

    if (isCloudUser && activeInstitution.institutionId !== 'onboarding-ra') {
      try {
        await setDoc(
          doc(db, 'auditLogs', logEntry.logId!),
          stripUndefinedDeep({
            ...logEntry,
            createdAt: serverTimestamp(),
          })
        );
      } catch (err) {
        console.warn('Audit log cloud write deferred:', err);
      }
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setStatusMessage('Login Google berhasil terhubung dengan Firebase Authentication.');
    } catch (error: any) {
      setStatusMessage(`Login dibatalkan atau gagal: ${error?.message || 'Coba ulangi'}`);
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
    bootstrappedUidRef.current = null;
    setStore(loadInitialStore());
    setStatusMessage('Berhasil keluar dari sesi akun cloud.');
  };

  const setActiveRole = (role: UserRole) => {
    if (!isDemoRoleSwitcherAllowed) {
      setStatusMessage('Peran akun terkunci sesuai keanggotaan Google Anda di lembaga RA.');
      return;
    }
    setStore((prev) => ({ ...prev, activeRole: role }));
    setStatusMessage(`Mode peran aktif dialihkan ke: ${role.replace('_', ' ')}`);
  };

  const setActiveInstitutionId = (instId: string) => {
    const periodsForInst = store.periods.filter((p) => p.institutionId === instId);
    const nextPeriod = periodsForInst[periodsForInst.length - 1]?.periodId || `${instId}_2026`;
    setStore((prev) => ({
      ...prev,
      activeInstitutionId: instId,
      activePeriodId: nextPeriod,
    }));
  };

  const createInstitution = async (payload: {
    name: string;
    nsm: string;
    npsn: string;
    kepalaNama: string;
  }) => {
    const slug =
      payload.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'ra-baru';
    const institutionId = `${slug}-${Date.now().toString(36)}`;
    const uid = firebaseUser?.uid || 'local-owner';
    const creatorRole: UserRole = isSuperAdminAccount ? 'SUPER_ADMIN' : 'ADMIN_LEMBAGA';
    const authUids = [uid];

    const cleanProfile = createCleanPpkmData({
      name: payload.name,
      nsm: payload.nsm,
      npsn: payload.npsn,
      kepalaNama: payload.kepalaNama,
    });

    const newInst: InstitutionTenant = {
      institutionId,
      name: cleanProfile.institution.namaLembaga,
      nsm: payload.nsm,
      npsn: payload.npsn,
      status: 'active',
      expiresAt: '2027-12-31',
      ownerUid: uid,
      authorizedUids: authUids,
      profileData: cleanProfile,
    };

    const newPeriod: AssessmentPeriodRecord = {
      periodId: `${institutionId}_2026`,
      institutionId,
      yearLabel: 'PKKM 2026',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      instrumentVersionId: activeInstrumentVersion.versionId,
      status: 'in_progress',
      p1Finalized: false,
      p2Finalized: false,
      formulaVerified: false,
      lastActiveIndicatorId: '1.1.1',
      authorizedUids: authUids,
    };

    const autoDocs = buildAllGeneratedDocsFromProfile(
      institutionId,
      newPeriod.periodId,
      newInst.profileData,
      newPeriod.yearLabel,
      uid,
      []
    ).map((d) => ({ ...d, authorizedUids: authUids }));

    const autoResponses = buildAutoIndicatorResponses(
      institutionId,
      newPeriod.periodId,
      newInst.profileData,
      [],
      uid,
      {}
    );
    for (const key of Object.keys(autoResponses)) {
      autoResponses[key] = { ...autoResponses[key], authorizedUids: authUids };
    }

    setStore((prev) => ({
      ...prev,
      institutions: [...prev.institutions, newInst],
      periods: [...prev.periods, newPeriod],
      generatedDocs: [...prev.generatedDocs, ...autoDocs],
      responses: {
        ...prev.responses,
        [newPeriod.periodId]: autoResponses,
      },
      activeInstitutionId: institutionId,
      activePeriodId: newPeriod.periodId,
    }));

    if (isCloudUser && firebaseUser) {
      try {
        await setDoc(
          doc(db, 'institutions', institutionId),
          stripUndefinedDeep({
            ...newInst,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );
        await setDoc(
          doc(db, 'memberships', `${uid}_${institutionId}`),
          stripUndefinedDeep({
            membershipId: `${uid}_${institutionId}`,
            uid,
            institutionId,
            displayName: firebaseUser.displayName || payload.kepalaNama,
            userEmail: (firebaseUser.email || '').toLowerCase(),
            role: creatorRole,
            status: 'active',
            authorizedUids: authUids,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );
        await setDoc(
          doc(db, 'assessmentPeriods', newPeriod.periodId),
          stripUndefinedDeep({
            ...newPeriod,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );

        const batch = writeBatch(db);
        for (const d of autoDocs) {
          batch.set(
            doc(db, 'generatedDocuments', d.docId),
            stripUndefinedDeep({
              ...d,
              createdBy: uid,
              authorizedUids: authUids,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          );
        }
        for (const r of Object.values(autoResponses)) {
          batch.set(
            doc(db, 'indicatorResponses', r.responseId),
            stripUndefinedDeep({
              ...r,
              updatedBy: uid,
              authorizedUids: authUids,
              updatedAt: serverTimestamp(),
            })
          );
        }
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `institutions/${institutionId}`);
      }
    }
    await appendAuditLog('INSTITUTION_CREATE', `Lembaga baru ditambahkan bersih (tanpa data contoh): ${newInst.name}`);
    setStatusMessage(`Lembaga baru ${newInst.name} dibuat bersih dan siap diisi.`);
  };

  const toggleInstitutionStatus = async (instId: string) => {
    const target = store.institutions.find((i) => i.institutionId === instId);
    const nextStatus = target?.status === 'active' ? 'inactive' : 'active';
    setStore((prev) => ({
      ...prev,
      institutions: prev.institutions.map((i) =>
        i.institutionId === instId ? { ...i, status: nextStatus } : i
      ),
    }));
    if (isCloudUser) {
      try {
        await updateDoc(doc(db, 'institutions', instId), {
          status: nextStatus,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `institutions/${instId}`);
      }
    }
    await appendAuditLog('INSTITUTION_STATUS', `Status akses lembaga ${instId} diperbarui ke ${nextStatus}.`);
  };

  const updateActiveInstitutionData = async (
    updater: (prev: PpkmData) => PpkmData,
    options?: { skipHeavyDocSync?: boolean; quiet?: boolean }
  ) => {
    if (activeInstitution.institutionId === 'onboarding-ra') return;
    let nextInst: InstitutionTenant | null = null;
    let syncedDocsToPersist: GeneratedDocRecord[] = [];
    let syncedResponsesToPersist: IndicatorResponseRecord[] = [];
    const uid = firebaseUser?.uid || 'local-owner';
    const authUids = getSafeAuthorizedUids();

    setStore((prev) => {
      const currentPeriod =
        prev.periods.find((p) => p.periodId === prev.activePeriodId) || activePeriod;
      const updatedList = prev.institutions.map((inst) => {
        if (inst.institutionId !== activeInstitution.institutionId) return inst;
        const nextProfile = updater(inst.profileData);
        nextInst = {
          ...inst,
          name: nextProfile.institution.namaLembaga,
          nsm: nextProfile.institution.nsm,
          npsn: nextProfile.institution.npsn || nextProfile.institution.npsm,
          profileData: nextProfile,
        };
        return nextInst;
      });

      if (!nextInst) {
        return { ...prev, institutions: updatedList };
      }

      const targetProfile = (nextInst as InstitutionTenant).profileData;
      const otherDocs = prev.generatedDocs.filter(
        (d) => !(d.institutionId === activeInstitution.institutionId && d.periodId === currentPeriod.periodId)
      );
      syncedDocsToPersist = buildAllGeneratedDocsFromProfile(
        activeInstitution.institutionId,
        currentPeriod.periodId,
        targetProfile,
        currentPeriod.yearLabel,
        uid,
        prev.generatedDocs,
        false
      ).map((d) => ({ ...d, authorizedUids: authUids }));

      const currentEv = prev.evidenceFiles.filter(
        (e) => e.institutionId === activeInstitution.institutionId && e.periodId === currentPeriod.periodId
      );
      const syncedResponses = buildAutoIndicatorResponses(
        activeInstitution.institutionId,
        currentPeriod.periodId,
        targetProfile,
        currentEv,
        uid,
        prev.responses[currentPeriod.periodId] || {},
        false
      );
      for (const k of Object.keys(syncedResponses)) {
        syncedResponses[k] = { ...syncedResponses[k], authorizedUids: authUids };
      }
      syncedResponsesToPersist = Object.values(syncedResponses);

      return {
        ...prev,
        institutions: updatedList,
        generatedDocs: [...syncedDocsToPersist, ...otherDocs],
        responses: {
          ...prev.responses,
          [currentPeriod.periodId]: syncedResponses,
        },
      };
    });

    if (isCloudUser && firebaseUser && nextInst) {
      const instRef = doc(db, 'institutions', activeInstitution.institutionId);
      try {
        const snap = await getDoc(instRef);
        const target = nextInst as InstitutionTenant;
        if (snap.exists()) {
          await updateDoc(
            instRef,
            stripUndefinedDeep({
              name: target.name,
              nsm: target.nsm,
              npsn: target.npsn,
              profileData: target.profileData,
              updatedAt: serverTimestamp(),
            })
          );
        } else if (isSuperAdminAccount) {
          await setDoc(
            instRef,
            stripUndefinedDeep({
              ...target,
              ownerUid: firebaseUser.uid,
              authorizedUids: Array.from(new Set([firebaseUser.uid, ...target.authorizedUids])),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          );
        }

        if (!options?.skipHeavyDocSync) {
          const pSnap = await getDoc(doc(db, 'assessmentPeriods', activePeriod.periodId));
          if (pSnap.exists() && syncedDocsToPersist.length > 0) {
            const existingDocsQ = isSuperAdminAccount
              ? query(collection(db, 'generatedDocuments'), where('periodId', '==', activePeriod.periodId))
              : query(
                  collection(db, 'generatedDocuments'),
                  where('authorizedUids', 'array-contains', firebaseUser.uid),
                  where('periodId', '==', activePeriod.periodId)
                );
            const existingDocsSnap = await getDocs(existingDocsQ);
            const existingDocIds = new Set(existingDocsSnap.docs.map((item) => item.id));

            let batch = writeBatch(db);
            let opCount = 0;
            const flushBatch = async (force = false) => {
              if (opCount >= 350 || (force && opCount > 0)) {
                await batch.commit();
                batch = writeBatch(db);
                opCount = 0;
              }
            };

            for (const d of syncedDocsToPersist) {
              const docRef = doc(db, 'generatedDocuments', d.docId);
              if (existingDocIds.has(d.docId)) {
                batch.update(
                  docRef,
                  stripUndefinedDeep({
                    title: d.title.slice(0, 250),
                    docNumber: (d.docNumber || '').slice(0, 120),
                    bodyContent: d.bodyContent.slice(0, 40000),
                    status: d.status,
                    updatedAt: serverTimestamp(),
                  })
                );
              } else {
                batch.set(
                  docRef,
                  stripUndefinedDeep({
                    ...d,
                    createdBy: uid,
                    authorizedUids: authUids,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  })
                );
              }
              opCount += 1;
              await flushBatch(false);
            }
            for (const r of syncedResponsesToPersist) {
              batch.set(
                doc(db, 'indicatorResponses', r.responseId),
                stripUndefinedDeep({
                  ...r,
                  updatedBy: uid,
                  authorizedUids: authUids,
                  updatedAt: serverTimestamp(),
                })
              );
              opCount += 1;
              await flushBatch(false);
            }
            await flushBatch(true);
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `institutions/${activeInstitution.institutionId}`);
      }
    }
    if (!options?.quiet) {
      setStatusMessage('Data lembaga, dokumen administrasi & indikator tersinkron otomatis.');
    }
  };

  const setActivePeriodId = (periodId: string) => {
    setStore((prev) => ({ ...prev, activePeriodId: periodId }));
  };

  const createPeriod = async (yearLabel: string, startDate: string, endDate: string) => {
    const cleanYear = yearLabel.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const periodId = `${activeInstitution.institutionId}_${cleanYear}_${Date.now().toString(36)}`;
    const uid = firebaseUser?.uid || 'local-owner';
    const authUids = getSafeAuthorizedUids();
    const newPeriod: AssessmentPeriodRecord = {
      periodId,
      institutionId: activeInstitution.institutionId,
      yearLabel,
      startDate,
      endDate,
      instrumentVersionId: activeInstrumentVersion.versionId,
      status: 'in_progress',
      p1Finalized: false,
      p2Finalized: false,
      formulaVerified: false,
      lastActiveIndicatorId: '1.1.1',
      authorizedUids: authUids,
    };

    const autoDocs = buildAllGeneratedDocsFromProfile(
      activeInstitution.institutionId,
      periodId,
      activeInstitution.profileData,
      yearLabel,
      uid,
      []
    ).map((d) => ({ ...d, authorizedUids: authUids }));
    const autoResponses = buildAutoIndicatorResponses(
      activeInstitution.institutionId,
      periodId,
      activeInstitution.profileData,
      [],
      uid,
      {}
    );
    for (const k of Object.keys(autoResponses)) {
      autoResponses[k] = { ...autoResponses[k], authorizedUids: authUids };
    }

    setStore((prev) => ({
      ...prev,
      periods: [...prev.periods, newPeriod],
      generatedDocs: [...prev.generatedDocs, ...autoDocs],
      responses: {
        ...prev.responses,
        [periodId]: autoResponses,
      },
      activePeriodId: periodId,
    }));

    if (isCloudUser) {
      try {
        await setDoc(
          doc(db, 'assessmentPeriods', periodId),
          stripUndefinedDeep({
            ...newPeriod,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );
        const batch = writeBatch(db);
        for (const d of autoDocs) {
          batch.set(
            doc(db, 'generatedDocuments', d.docId),
            stripUndefinedDeep({
              ...d,
              createdBy: uid,
              authorizedUids: authUids,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          );
        }
        for (const r of Object.values(autoResponses)) {
          batch.set(
            doc(db, 'indicatorResponses', r.responseId),
            stripUndefinedDeep({
              ...r,
              updatedBy: uid,
              authorizedUids: authUids,
              updatedAt: serverTimestamp(),
            })
          );
        }
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `assessmentPeriods/${periodId}`);
      }
    }

    await appendAuditLog('PERIOD_CREATE', `Periode baru dibuat: ${yearLabel}`);
    setStatusMessage(`Periode ${yearLabel} aktif & berkas administrasi disiapkan.`);
  };

  const updatePeriodMeta = async (periodId: string, patch: Partial<AssessmentPeriodRecord>) => {
    setStore((prev) => ({
      ...prev,
      periods: prev.periods.map((p) => (p.periodId === periodId ? { ...p, ...patch } : p)),
    }));
    if (isCloudUser) {
      try {
        const refDoc = doc(db, 'assessmentPeriods', periodId);
        const snap = await getDoc(refDoc);
        if (snap.exists()) {
          await updateDoc(refDoc, stripUndefinedDeep({ ...patch, updatedAt: serverTimestamp() }));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `assessmentPeriods/${periodId}`);
      }
    }
    await appendAuditLog('PERIOD_UPDATE', `Pembaruan metadata periode ${periodId}`);
  };

  const persistNewInstrumentVersion = async (payload: {
    versionNumber: string;
    title: string;
    sourceFile: string;
    changelog: string;
    settingSheetVerified: boolean;
    activateImmediately?: boolean;
    indicators: MasterIndicatorDef[];
    anomalies: string[];
    settingSummary?: ExcelSettingSummary;
  }): Promise<{ anomalies: string[]; count: number; versionId: string; settingSummary?: ExcelSettingSummary }> => {
    const versionId = `inst_${payload.versionNumber.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();
    const shouldActivate = Boolean(payload.activateImmediately);

    const newVersion: InstrumentVersionRecord = {
      versionId: versionId.slice(0, 128),
      versionNumber: payload.versionNumber.trim().slice(0, 32),
      title: payload.title.trim().slice(0, 200),
      sourceFile: (payload.sourceFile.trim() || 'import.xlsx').slice(0, 200),
      changelog: (
        payload.changelog.trim() || `Impor ${payload.indicators.length} indikator dari Excel/CSV.`
      ).slice(0, 2000),
      isActive: shouldActivate,
      settingSheetVerified: payload.settingSheetVerified,
      anomalies: payload.anomalies.slice(0, 200),
      settingSummary: payload.settingSummary,
      indicators: payload.indicators.slice(0, 200),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const previousVersions = store.instrumentVersions;

    setStore((prev) => ({
      ...prev,
      instrumentVersions: [
        newVersion,
        ...prev.instrumentVersions.map((v) => (shouldActivate ? { ...v, isActive: false } : v)),
      ],
      periods: shouldActivate
        ? prev.periods.map((p) =>
            p.periodId === activePeriod.periodId ? { ...p, instrumentVersionId: versionId } : p
          )
        : prev.periods,
    }));

    if (isCloudUser && isSuperAdminAccount) {
      try {
        await setDoc(
          doc(db, 'masterInstruments', versionId),
          stripUndefinedDeep({
            ...newVersion,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );
        if (shouldActivate) {
          for (const oldVer of previousVersions) {
            if (oldVer.isActive) {
              const oldRef = doc(db, 'masterInstruments', oldVer.versionId);
              const oldSnap = await getDoc(oldRef);
              if (oldSnap.exists()) {
                await updateDoc(oldRef, { isActive: false, updatedAt: serverTimestamp() });
              }
            }
          }
          const periodRef = doc(db, 'assessmentPeriods', activePeriod.periodId);
          const pSnap = await getDoc(periodRef);
          if (pSnap.exists()) {
            await updateDoc(periodRef, {
              instrumentVersionId: versionId,
              updatedAt: serverTimestamp(),
            });
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `masterInstruments/${versionId}`);
      }
    }

    await appendAuditLog(
      'INSTRUMENT_IMPORT',
      `Impor versi instrumen ${newVersion.versionNumber} dari ${newVersion.sourceFile} (${payload.indicators.length} indikator, ${payload.anomalies.length} catatan verifikasi).`
    );
    setStatusMessage(`Versi instrumen ${newVersion.versionNumber} tersimpan (${payload.indicators.length} indikator).`);

    return {
      anomalies: payload.anomalies,
      count: payload.indicators.length,
      versionId,
      settingSummary: payload.settingSummary,
    };
  };

  const importInstrumentFromCsv = async (
    csvText: string,
    meta: {
      versionNumber: string;
      title: string;
      sourceFile: string;
      changelog: string;
      settingSheetVerified: boolean;
      activateImmediately?: boolean;
    }
  ) => {
    if (store.activeRole !== 'SUPER_ADMIN') {
      throw new Error('Hanya Super Admin yang berhak mengimpor Master Instrumen CSV.');
    }
    const parsed = parseInstrumentCsv(csvText);
    if (parsed.indicators.length === 0) {
      throw new Error(parsed.anomalies[0] || 'Tidak ada indikator valid pada CSV.');
    }
    const res = await persistNewInstrumentVersion({
      versionNumber: meta.versionNumber,
      title: meta.title,
      sourceFile: meta.sourceFile,
      changelog: meta.changelog,
      settingSheetVerified: meta.settingSheetVerified,
      activateImmediately: meta.activateImmediately,
      indicators: parsed.indicators,
      anomalies: parsed.anomalies,
    });
    return { anomalies: res.anomalies, count: res.count, versionId: res.versionId };
  };

  const importInstrumentFromFile = async (
    file: File,
    meta: {
      versionNumber: string;
      title: string;
      changelog: string;
      settingSheetVerified: boolean;
      activateImmediately?: boolean;
    }
  ) => {
    if (store.activeRole !== 'SUPER_ADMIN') {
      throw new Error('Hanya Super Admin yang berhak mengimpor Master Instrumen Excel/CSV.');
    }
    const parsed = await parseInstrumentUploadFile(file);
    if (parsed.indicators.length === 0) {
      throw new Error(parsed.anomalies[0] || 'Tidak ada indikator valid pada file yang diunggah.');
    }
    const effectiveVerified =
      meta.settingSheetVerified && !parsed.settingSummary?.requiresManualVerification;
    return persistNewInstrumentVersion({
      versionNumber: meta.versionNumber,
      title: meta.title,
      sourceFile: file.name,
      changelog: meta.changelog,
      settingSheetVerified: effectiveVerified,
      activateImmediately: meta.activateImmediately,
      indicators: parsed.indicators,
      anomalies: parsed.anomalies,
      settingSummary: parsed.settingSummary,
    });
  };

  const activateInstrumentVersion = async (versionId: string) => {
    if (store.activeRole !== 'SUPER_ADMIN') return;
    const prevVersions = store.instrumentVersions;
    setStore((prev) => ({
      ...prev,
      instrumentVersions: prev.instrumentVersions.map((v) => ({
        ...v,
        isActive: v.versionId === versionId,
        updatedAt: v.versionId === versionId ? new Date().toISOString() : v.updatedAt,
      })),
      periods: prev.periods.map((p) =>
        p.periodId === activePeriod.periodId ? { ...p, instrumentVersionId: versionId } : p
      ),
    }));

    if (isCloudUser && isSuperAdminAccount) {
      try {
        for (const v of prevVersions) {
          const refDoc = doc(db, 'masterInstruments', v.versionId);
          const snap = await getDoc(refDoc);
          if (snap.exists()) {
            await updateDoc(refDoc, {
              isActive: v.versionId === versionId,
              updatedAt: serverTimestamp(),
            });
          }
        }
        const periodRef = doc(db, 'assessmentPeriods', activePeriod.periodId);
        const pSnap = await getDoc(periodRef);
        if (pSnap.exists()) {
          await updateDoc(periodRef, {
            instrumentVersionId: versionId,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `masterInstruments/${versionId}`);
      }
    }
    await appendAuditLog('INSTRUMENT_ACTIVATE', `Mengaktifkan versi instrumen ${versionId}.`);
    setStatusMessage(`Versi instrumen ${versionId} diaktifkan.`);
  };

  const toggleSettingSheetVerified = async (versionId: string) => {
    const target = store.instrumentVersions.find((v) => v.versionId === versionId);
    const nextVal = !target?.settingSheetVerified;
    setStore((prev) => ({
      ...prev,
      instrumentVersions: prev.instrumentVersions.map((v) =>
        v.versionId === versionId
          ? { ...v, settingSheetVerified: nextVal, updatedAt: new Date().toISOString() }
          : v
      ),
    }));
    if (isCloudUser && isSuperAdminAccount) {
      try {
        const refDoc = doc(db, 'masterInstruments', versionId);
        const snap = await getDoc(refDoc);
        if (snap.exists()) {
          await updateDoc(refDoc, {
            settingSheetVerified: nextVal,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `masterInstruments/${versionId}`);
      }
    }
    await appendAuditLog('INSTRUMENT_SETTING_VERIFY', `Toggle verifikasi sheet Setting pada versi ${versionId}.`);
  };

  const saveMasterAssessor = async (
    assessor: Omit<MasterAssessorRecord, 'assessorId'> & { assessorId?: string }
  ) => {
    const id = assessor.assessorId || `assessor_${Date.now().toString(36)}`;
    const record: MasterAssessorRecord = {
      ...assessor,
      assessorId: id,
      updatedAt: new Date().toISOString(),
    };
    setStore((prev) => {
      const exists = prev.masterAssessors.some((a) => a.assessorId === id);
      return {
        ...prev,
        masterAssessors: exists
          ? prev.masterAssessors.map((a) => (a.assessorId === id ? record : a))
          : [record, ...prev.masterAssessors],
      };
    });
    if (isCloudUser && isSuperAdminAccount) {
      try {
        await setDoc(
          doc(db, 'masterAssessors', id),
          stripUndefinedDeep({
            ...record,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `masterAssessors/${id}`);
      }
    }
    await appendAuditLog('MASTER_ASSESSOR_SAVE', `Menyimpan data master penilai: ${record.nama}.`);
    setStatusMessage(`Master penilai "${record.nama}" disimpan.`);
  };

  const deleteMasterAssessor = async (assessorId: string) => {
    setStore((prev) => ({
      ...prev,
      masterAssessors: prev.masterAssessors.filter((a) => a.assessorId !== assessorId),
    }));
    if (isCloudUser && isSuperAdminAccount) {
      try {
        await deleteDoc(doc(db, 'masterAssessors', assessorId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `masterAssessors/${assessorId}`);
      }
    }
    await appendAuditLog('MASTER_ASSESSOR_DELETE', `Menghapus master penilai ${assessorId}.`);
  };

  const responses = store.responses[activePeriod.periodId] || {};

  const saveIndicatorResponse = async (
    indicatorId: string,
    komponenCode: string,
    patch: Partial<IndicatorResponseRecord>
  ) => {
    const uid = firebaseUser?.uid || 'local-owner';
    const responseId = `${activeInstitution.institutionId}_${activePeriod.periodId}_${indicatorId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const authUids = getSafeAuthorizedUids();
    const current = responses[indicatorId] || {
      responseId,
      institutionId: activeInstitution.institutionId,
      periodId: activePeriod.periodId,
      indicatorId,
      komponenCode,
      kepalaNote: '',
      completionStatus: 'empty' as const,
      checkedEvidences: [],
      updatedBy: uid,
      authorizedUids: authUids,
    };
    const nextRec: IndicatorResponseRecord = {
      ...current,
      ...patch,
      responseId,
      authorizedUids: authUids,
      updatedBy: uid,
      updatedAt: new Date().toISOString(),
    };

    setStore((prev) => ({
      ...prev,
      periods: prev.periods.map((p) =>
        p.periodId === activePeriod.periodId ? { ...p, lastActiveIndicatorId: indicatorId } : p
      ),
      responses: {
        ...prev.responses,
        [activePeriod.periodId]: {
          ...(prev.responses[activePeriod.periodId] || {}),
          [indicatorId]: nextRec,
        },
      },
    }));

    if (isCloudUser && activeInstitution.institutionId !== 'onboarding-ra') {
      try {
        await setDoc(
          doc(db, 'indicatorResponses', responseId),
          stripUndefinedDeep({
            ...nextRec,
            updatedAt: serverTimestamp(),
          }),
          { merge: true }
        );
        const periodRef = doc(db, 'assessmentPeriods', activePeriod.periodId);
        const pSnap = await getDoc(periodRef);
        if (pSnap.exists()) {
          await updateDoc(periodRef, {
            lastActiveIndicatorId: indicatorId,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `indicatorResponses/${responseId}`);
      }
    }

    setStatusMessage(`Indikator ${indicatorId} disimpan.`);
  };

  const p1Scores = store.p1Scores[activePeriod.periodId] || {};
  const p2Scores = store.p2Scores[activePeriod.periodId] || {};

  const saveAssessorScore = async (
    assessorRole: 'PENILAI_1' | 'PENILAI_2',
    indicatorId: string,
    score: number,
    note: string,
    checkedEvidenceIds?: string[],
    reason = 'Penilaian / pembaruan skor indikator'
  ) => {
    if (assessorRole === 'PENILAI_1' && activePeriod.p1Finalized && store.activeRole !== 'SUPER_ADMIN') {
      setStatusMessage('Penilaian Penilai 1 sudah dikunci/difinalisasi.');
      return;
    }
    if (assessorRole === 'PENILAI_2' && activePeriod.p2Finalized && store.activeRole !== 'SUPER_ADMIN') {
      setStatusMessage('Penilaian Penilai 2 sudah dikunci/difinalisasi.');
      return;
    }

    const clamped = Math.min(4, Math.max(1, Math.round(score)));
    const uid = firebaseUser?.uid || `local_${assessorRole}`;
    const authUids = getSafeAuthorizedUids();
    const currentMap = assessorRole === 'PENILAI_1' ? p1Scores : p2Scores;
    const prevScoreRec = currentMap[indicatorId];
    const oldScore = prevScoreRec ? prevScoreRec.score : null;

    const record: AssessorScoreRecord = {
      institutionId: activeInstitution.institutionId,
      periodId: activePeriod.periodId,
      indicatorId,
      assessorId: uid,
      assessorRole,
      score: clamped,
      note,
      checkedEvidenceIds: checkedEvidenceIds !== undefined ? checkedEvidenceIds : prevScoreRec?.checkedEvidenceIds || [],
      status: 'draft',
      authorizedUids: authUids,
      updatedAt: new Date().toISOString(),
    };

    const historyEntry: ScoreHistoryRecord | null =
      oldScore !== clamped
        ? {
            historyId: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            institutionId: activeInstitution.institutionId,
            periodId: activePeriod.periodId,
            indicatorId,
            assessorRole,
            actorUid: uid,
            actorName: firebaseUser?.displayName || assessorRole.replace('_', ' '),
            oldScore,
            newScore: clamped,
            reason,
            actionType: 'SCORE_CHANGE',
            authorizedUids: authUids,
            createdAt: new Date().toISOString(),
          }
        : null;

    setStore((prev) => {
      const nextHistory = historyEntry
        ? [historyEntry, ...(prev.scoreHistory || [])].slice(0, 500)
        : prev.scoreHistory || [];

      if (assessorRole === 'PENILAI_1') {
        return {
          ...prev,
          scoreHistory: nextHistory,
          p1Scores: {
            ...prev.p1Scores,
            [activePeriod.periodId]: {
              ...(prev.p1Scores[activePeriod.periodId] || {}),
              [indicatorId]: record,
            },
          },
        };
      }
      return {
        ...prev,
        scoreHistory: nextHistory,
        p2Scores: {
          ...prev.p2Scores,
          [activePeriod.periodId]: {
            ...(prev.p2Scores[activePeriod.periodId] || {}),
            [indicatorId]: record,
          },
        },
      };
    });

    if (isCloudUser && activeInstitution.institutionId !== 'onboarding-ra') {
      const scoreDocId = `${activePeriod.periodId}_${assessorRole}_${indicatorId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      try {
        await setDoc(
          doc(db, 'assessmentScores', scoreDocId),
          stripUndefinedDeep({
            ...record,
            updatedAt: serverTimestamp(),
          })
        );
        if (historyEntry) {
          await setDoc(
            doc(db, 'scoreHistory', historyEntry.historyId),
            stripUndefinedDeep({
              ...historyEntry,
              createdAt: serverTimestamp(),
            })
          );
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `assessmentScores/${scoreDocId}`);
      }
    }

    setStatusMessage(`Skor ${assessorRole} untuk ${indicatorId} (${clamped}) tersimpan.`);
  };

  const saveAssessorScoresBatch = async (
    updates: Array<{
      assessorRole: 'PENILAI_1' | 'PENILAI_2';
      indicatorId: string;
      score: number;
      note?: string;
    }>,
    reason = 'Pengisian otomatis / massal Mode Cepat ala Excel'
  ): Promise<number> => {
    if (updates.length === 0) return 0;

    if (activePeriod.status === 'archived' && store.activeRole !== 'SUPER_ADMIN') {
      setStatusMessage('Periode sudah diarsipkan dan tidak dapat diubah.');
      return 0;
    }

    const canEditRole = (role: 'PENILAI_1' | 'PENILAI_2') => {
      if (store.activeRole === 'SUPER_ADMIN') return true;
      if (role === 'PENILAI_1') {
        if (activePeriod.p1Finalized) return false;
        return !isCloudUser || store.activeRole === 'PENILAI_1';
      }
      if (activePeriod.p2Finalized) return false;
      return !isCloudUser || store.activeRole === 'PENILAI_2';
    };

    const allowedUpdates = updates.filter((u) => canEditRole(u.assessorRole));
    if (allowedUpdates.length === 0) {
      setStatusMessage('Tidak ada perubahan nilai yang dapat disimpan (peran penilai terkunci atau sudah difinalisasi).');
      return 0;
    }

    const uid = firebaseUser?.uid || `local_${store.activeRole}`;
    const authUids = getSafeAuthorizedUids();
    const nowIso = new Date().toISOString();
    const scoreWrites: { docId: string; rec: AssessorScoreRecord }[] = [];
    const historyEntries: ScoreHistoryRecord[] = [];
    const nextP1Map: Record<string, AssessorScoreRecord> = { ...p1Scores };
    const nextP2Map: Record<string, AssessorScoreRecord> = { ...p2Scores };

    for (const item of allowedUpdates) {
      const clamped = Math.min(4, Math.max(1, Math.round(item.score)));
      const targetMap = item.assessorRole === 'PENILAI_1' ? nextP1Map : nextP2Map;
      const prevRec = targetMap[item.indicatorId];
      const oldScore = prevRec ? prevRec.score : null;

      const record: AssessorScoreRecord = {
        institutionId: activeInstitution.institutionId,
        periodId: activePeriod.periodId,
        indicatorId: item.indicatorId,
        assessorId: uid,
        assessorRole: item.assessorRole,
        score: clamped,
        note: item.note !== undefined ? item.note : prevRec?.note || '',
        checkedEvidenceIds: prevRec?.checkedEvidenceIds || [],
        status: 'draft',
        authorizedUids: authUids,
        updatedAt: nowIso,
      };

      targetMap[item.indicatorId] = record;
      const scoreDocId = `${activePeriod.periodId}_${item.assessorRole}_${item.indicatorId}`.replace(
        /[^a-zA-Z0-9_-]/g,
        '_'
      );
      scoreWrites.push({ docId: scoreDocId, rec: record });

      if (oldScore !== clamped) {
        historyEntries.push({
          historyId: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${scoreWrites.length}`,
          institutionId: activeInstitution.institutionId,
          periodId: activePeriod.periodId,
          indicatorId: item.indicatorId,
          assessorRole: item.assessorRole,
          actorUid: uid,
          actorName: firebaseUser?.displayName || store.activeRole.replace('_', ' '),
          oldScore,
          newScore: clamped,
          reason,
          actionType: 'SCORE_CHANGE',
          authorizedUids: authUids,
          createdAt: nowIso,
        });
      }
    }

    setStore((prev) => ({
      ...prev,
      scoreHistory: [...historyEntries.reverse(), ...(prev.scoreHistory || [])].slice(0, 500),
      p1Scores: {
        ...prev.p1Scores,
        [activePeriod.periodId]: nextP1Map,
      },
      p2Scores: {
        ...prev.p2Scores,
        [activePeriod.periodId]: nextP2Map,
      },
    }));

    if (isCloudUser && activeInstitution.institutionId !== 'onboarding-ra') {
      try {
        let activeBatch = writeBatch(db);
        let opCount = 0;

        const flushBatchIfNeeded = async (force = false) => {
          if (opCount >= 350 || (force && opCount > 0)) {
            await activeBatch.commit();
            activeBatch = writeBatch(db);
            opCount = 0;
          }
        };

        for (const sw of scoreWrites) {
          activeBatch.set(
            doc(db, 'assessmentScores', sw.docId),
            stripUndefinedDeep({
              ...sw.rec,
              updatedAt: serverTimestamp(),
            })
          );
          opCount += 1;
          await flushBatchIfNeeded(false);
        }

        for (const hist of historyEntries) {
          activeBatch.set(
            doc(db, 'scoreHistory', hist.historyId),
            stripUndefinedDeep({
              ...hist,
              createdAt: serverTimestamp(),
            })
          );
          opCount += 1;
          await flushBatchIfNeeded(false);
        }

        await flushBatchIfNeeded(true);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `assessmentScores/batch_${activePeriod.periodId}`);
      }
    }

    await appendAuditLog(
      'ASSESSMENT_BATCH_SCORE',
      `Menyimpan ${scoreWrites.length} skor indikator sekaligus (${reason}).`
    );
    setStatusMessage(`${scoreWrites.length} skor indikator berhasil disimpan & disinkronkan.`);
    return scoreWrites.length;
  };

  const applyTargetsAndSyncAll = async (
    params: ApplyTargetsAndSyncParams
  ): Promise<{ savedScores: number; updatedResponses: number; approvedDocs: number }> => {
    if (activePeriod.status === 'archived' && store.activeRole !== 'SUPER_ADMIN') {
      setStatusMessage('Periode sudah diarsipkan dan tidak dapat diubah.');
      return { savedScores: 0, updatedResponses: 0, approvedDocs: 0 };
    }

    const canEditRole = (role: 'PENILAI_1' | 'PENILAI_2') => {
      if (store.activeRole === 'SUPER_ADMIN') return true;
      if (role === 'PENILAI_1') {
        if (activePeriod.p1Finalized) return false;
        return !isCloudUser || store.activeRole === 'PENILAI_1';
      }
      if (activePeriod.p2Finalized) return false;
      return !isCloudUser || store.activeRole === 'PENILAI_2';
    };

    const uid = firebaseUser?.uid || `local_${store.activeRole}`;
    const authUids = getSafeAuthorizedUids();
    const nowIso = new Date().toISOString();
    const syncAll = params.syncResponsesAndChecklist !== false;
    const reason = params.reason || 'Edit target nilai Rekap & sinkronisasi otomatis 96 butir + ceklis berkas';

    // 1. Resolve updated profile if imported metadata patch supplied
    let updatedProfile = activeInstitution.profileData;
    if (params.institutionProfilePatch) {
      const p = params.institutionProfilePatch;
      updatedProfile = {
        ...updatedProfile,
        institution: p.institution
          ? { ...updatedProfile.institution, ...p.institution }
          : updatedProfile.institution,
        principal: p.principal
          ? { ...updatedProfile.principal, ...p.principal }
          : updatedProfile.principal,
        evaluators: p.evaluators
          ? { ...updatedProfile.evaluators, ...p.evaluators }
          : updatedProfile.evaluators,
        adminDocs: p.namaYayasan
          ? { ...(updatedProfile.adminDocs || EMPTY_ADMIN_DOCS), namaYayasan: p.namaYayasan }
          : updatedProfile.adminDocs,
      };
    }

    // 2. Compute desired indicator scores for P1 and P2
    const nextP1Map: Record<string, AssessorScoreRecord> = { ...p1Scores };
    const nextP2Map: Record<string, AssessorScoreRecord> = { ...p2Scores };
    const scoreWrites: { docId: string; rec: AssessorScoreRecord }[] = [];
    const historyEntries: ScoreHistoryRecord[] = [];

    const applyRoleScores = (
      role: 'PENILAI_1' | 'PENILAI_2',
      targets: Record<'K1' | 'K2' | 'K3' | 'K4', number> | undefined,
      rawTargets: Record<'K1' | 'K2' | 'K3' | 'K4', number> | undefined,
      explicit: Record<string, number> | undefined,
      targetMap: Record<string, AssessorScoreRecord>
    ) => {
      if (!canEditRole(role)) return;
      if (!targets && !rawTargets && (!explicit || Object.keys(explicit).length === 0)) return;

      const distributed = rawTargets
        ? distributeTargetScores({ mode: 'by_raw_component', rawTargets }, activeIndicators)
        : targets
        ? distributeTargetScores({ mode: 'by_component', targets }, activeIndicators)
        : {};

      for (const ind of activeIndicators) {
        const rawCandidate = explicit?.[ind.id] ?? distributed[ind.id];
        if (rawCandidate === undefined) continue;
        const clamped = Math.min(4, Math.max(1, Math.round(rawCandidate)));
        const prevRec = targetMap[ind.id];
        const oldScore = prevRec ? prevRec.score : null;

        const record: AssessorScoreRecord = {
          institutionId: activeInstitution.institutionId,
          periodId: activePeriod.periodId,
          indicatorId: ind.id,
          assessorId: uid,
          assessorRole: role,
          score: clamped,
          note: prevRec?.note || '',
          checkedEvidenceIds: prevRec?.checkedEvidenceIds || [],
          status: 'draft',
          authorizedUids: authUids,
          updatedAt: nowIso,
        };
        targetMap[ind.id] = record;

        const scoreDocId = `${activePeriod.periodId}_${role}_${ind.id}`.replace(
          /[^a-zA-Z0-9_-]/g,
          '_'
        );
        scoreWrites.push({ docId: scoreDocId, rec: record });

        if (oldScore !== clamped) {
          historyEntries.push({
            historyId: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${scoreWrites.length}`,
            institutionId: activeInstitution.institutionId,
            periodId: activePeriod.periodId,
            indicatorId: ind.id,
            assessorRole: role,
            actorUid: uid,
            actorName: firebaseUser?.displayName || store.activeRole.replace('_', ' '),
            oldScore,
            newScore: clamped,
            reason,
            actionType: 'SCORE_CHANGE',
            authorizedUids: authUids,
            createdAt: nowIso,
          });
        }
      }
    };

    applyRoleScores('PENILAI_1', params.p1Targets, params.p1RawTargets, params.explicitP1Scores, nextP1Map);
    applyRoleScores('PENILAI_2', params.p2Targets, params.p2RawTargets, params.explicitP2Scores, nextP2Map);

    // 3. Optionally synchronize 96 indicatorResponses & 27 generatedDocuments checklist
    let syncedResponsesMap: Record<string, IndicatorResponseRecord> = { ...responses };
    let syncedDocsToPersist: GeneratedDocRecord[] = [];
    let updatedResponsesCount = 0;
    let approvedDocsCount = 0;

    if (syncAll) {
      const baseAutoResponses = buildAutoIndicatorResponses(
        activeInstitution.institutionId,
        activePeriod.periodId,
        updatedProfile,
        evidenceFiles,
        uid,
        responses,
        false
      );

      for (const ind of activeIndicators) {
        const s1 = nextP1Map[ind.id]?.score;
        const s2 = nextP2Map[ind.id]?.score;
        const hasScore = s1 !== undefined || s2 !== undefined;
        const effScore =
          s1 !== undefined && s2 !== undefined
            ? (s1 + s2) / 2
            : s1 !== undefined
            ? s1
            : s2 !== undefined
            ? s2
            : 0;

        const baseRec = baseAutoResponses[ind.id] || {
          responseId: `${activeInstitution.institutionId}_${activePeriod.periodId}_${ind.id}`.replace(
            /[^a-zA-Z0-9_-]/g,
            '_'
          ),
          institutionId: activeInstitution.institutionId,
          periodId: activePeriod.periodId,
          indicatorId: ind.id,
          komponenCode: ind.komponenCode,
          kepalaNote: '',
          completionStatus: 'empty' as const,
          checkedEvidences: [],
          updatedBy: uid,
          authorizedUids: authUids,
          updatedAt: nowIso,
        };

        let completionStatus = baseRec.completionStatus;
        let checkedEvidences = baseRec.checkedEvidences || [];
        let kepalaNote = baseRec.kepalaNote || '';

        if (hasScore) {
          if (effScore >= 3) {
            completionStatus = 'complete';
            checkedEvidences = Array.from(new Set([...checkedEvidences, ...ind.buktiWajib]));
            if (!kepalaNote.trim()) {
              kepalaNote = `Dokumen & bukti fisik ${ind.id} (${ind.buktiWajib.slice(0, 2).join(', ')}) lengkap sesuai capaian skor ${effScore.toFixed(1).replace(/\.0$/, '')}.`;
            }
          } else if (effScore >= 2) {
            completionStatus = 'draft';
            if (checkedEvidences.length === 0 && ind.buktiWajib.length > 0) {
              checkedEvidences = [ind.buktiWajib[0]];
            }
            if (!kepalaNote.trim()) {
              kepalaNote = `Sebagian bukti fisik ${ind.id} telah tersedia dan sedang dilengkapi.`;
            }
          } else {
            completionStatus = checkedEvidences.length > 0 ? 'draft' : 'empty';
          }
          updatedResponsesCount += 1;
        }

        syncedResponsesMap[ind.id] = {
          ...baseRec,
          completionStatus,
          checkedEvidences,
          kepalaNote,
          updatedBy: uid,
          authorizedUids: authUids,
          updatedAt: nowIso,
        };
      }

      // Build/update 27 checklist docs
      const compAvgMap: Record<'K1' | 'K2' | 'K3' | 'K4', number> = { K1: 0, K2: 0, K3: 0, K4: 0 };
      (['K1', 'K2', 'K3', 'K4'] as const).forEach((code) => {
        const compInds = activeIndicators.filter((i) => i.komponenCode === code);
        let sum = 0;
        let cnt = 0;
        for (const ind of compInds) {
          const s1 = nextP1Map[ind.id]?.score;
          const s2 = nextP2Map[ind.id]?.score;
          if (s1 !== undefined || s2 !== undefined) {
            sum += s1 !== undefined && s2 !== undefined ? (s1 + s2) / 2 : (s1 ?? s2 ?? 0);
            cnt += 1;
          }
        }
        compAvgMap[code] = cnt > 0 ? sum / cnt : 0;
      });

      const importedSet = new Set(params.importedTemplateIds || []);
      const baseDocs = buildAllGeneratedDocsFromProfile(
        activeInstitution.institutionId,
        activePeriod.periodId,
        updatedProfile,
        activePeriod.yearLabel,
        uid,
        store.generatedDocs,
        false
      );

      syncedDocsToPersist = baseDocs.map((docItem) => {
        if (!docItem.templateId) {
          return { ...docItem, authorizedUids: authUids };
        }
        const matchedTpl = importedSet.has(docItem.templateId);
        const tplDef = DOCUMENT_TEMPLATES.find((t) => t.templateId === docItem.templateId);
        const tplCompCodes = tplDef ? getComponentCodesForTemplate(tplDef) : ['K1' as const];
        const bestAvg = Math.max(...tplCompCodes.map((c) => compAvgMap[c] || 0));
        const shouldApprove =
          matchedTpl || bestAvg >= 3.0 || docItem.status === 'APPROVED';
        const nextStatus: 'DRAFT' | 'APPROVED' = shouldApprove ? 'APPROVED' : 'DRAFT';
        if (nextStatus === 'APPROVED') approvedDocsCount += 1;

        return {
          ...docItem,
          status: nextStatus,
          authorizedUids: authUids,
          updatedAt: nowIso,
        };
      });
    }

    // 4. Commit local store synchronously
    setStore((prev) => {
      const updatedInstitutions = params.institutionProfilePatch
        ? prev.institutions.map((inst) =>
            inst.institutionId === activeInstitution.institutionId
              ? {
                  ...inst,
                  name: updatedProfile.institution.namaLembaga || inst.name,
                  nsm: updatedProfile.institution.nsm || inst.nsm,
                  npsn: updatedProfile.institution.npsn || updatedProfile.institution.npsm || inst.npsn,
                  profileData: updatedProfile,
                }
              : inst
          )
        : prev.institutions;

      const otherDocs = prev.generatedDocs.filter(
        (d) =>
          !(
            d.institutionId === activeInstitution.institutionId &&
            d.periodId === activePeriod.periodId
          )
      );

      return {
        ...prev,
        institutions: updatedInstitutions,
        scoreHistory: [...historyEntries.reverse(), ...(prev.scoreHistory || [])].slice(0, 500),
        p1Scores: {
          ...prev.p1Scores,
          [activePeriod.periodId]: nextP1Map,
        },
        p2Scores: {
          ...prev.p2Scores,
          [activePeriod.periodId]: nextP2Map,
        },
        responses: syncAll
          ? {
              ...prev.responses,
              [activePeriod.periodId]: syncedResponsesMap,
            }
          : prev.responses,
        generatedDocs: syncAll ? [...syncedDocsToPersist, ...otherDocs] : prev.generatedDocs,
      };
    });

    // 5. Commit Firestore safely in chunked batches (preserving immutable fields!)
    if (isCloudUser && firebaseUser && activeInstitution.institutionId !== 'onboarding-ra') {
      try {
        if (params.institutionProfilePatch) {
          const instRef = doc(db, 'institutions', activeInstitution.institutionId);
          const instSnap = await getDoc(instRef);
          if (instSnap.exists()) {
            await updateDoc(
              instRef,
              stripUndefinedDeep({
                name: (updatedProfile.institution.namaLembaga || activeInstitution.name).slice(0, 200),
                nsm: (updatedProfile.institution.nsm || activeInstitution.nsm).slice(0, 32),
                npsn: (updatedProfile.institution.npsn || activeInstitution.npsn).slice(0, 32),
                profileData: updatedProfile,
                updatedAt: serverTimestamp(),
              })
            );
          }
        }

        let existingDocIds = new Set<string>();
        if (syncAll && syncedDocsToPersist.length > 0) {
          const existingDocsQ = isSuperAdminAccount
            ? query(collection(db, 'generatedDocuments'), where('periodId', '==', activePeriod.periodId))
            : query(
                collection(db, 'generatedDocuments'),
                where('authorizedUids', 'array-contains', firebaseUser.uid),
                where('periodId', '==', activePeriod.periodId)
              );
          const existingDocsSnap = await getDocs(existingDocsQ);
          existingDocIds = new Set(existingDocsSnap.docs.map((item) => item.id));
        }

        let activeBatch = writeBatch(db);
        let opCount = 0;

        const flushBatch = async (force = false) => {
          if (opCount >= 350 || (force && opCount > 0)) {
            await activeBatch.commit();
            activeBatch = writeBatch(db);
            opCount = 0;
          }
        };

        for (const sw of scoreWrites) {
          activeBatch.set(
            doc(db, 'assessmentScores', sw.docId),
            stripUndefinedDeep({
              ...sw.rec,
              updatedAt: serverTimestamp(),
            })
          );
          opCount += 1;
          await flushBatch(false);
        }

        for (const hist of historyEntries) {
          activeBatch.set(
            doc(db, 'scoreHistory', hist.historyId),
            stripUndefinedDeep({
              ...hist,
              createdAt: serverTimestamp(),
            })
          );
          opCount += 1;
          await flushBatch(false);
        }

        if (syncAll) {
          for (const resp of Object.values(syncedResponsesMap)) {
            activeBatch.set(
              doc(db, 'indicatorResponses', resp.responseId),
              stripUndefinedDeep({
                ...resp,
                updatedBy: uid,
                authorizedUids: authUids,
                updatedAt: serverTimestamp(),
              })
            );
            opCount += 1;
            await flushBatch(false);
          }

          for (const d of syncedDocsToPersist) {
            const docRef = doc(db, 'generatedDocuments', d.docId);
            if (existingDocIds.has(d.docId)) {
              activeBatch.update(
                docRef,
                stripUndefinedDeep({
                  title: d.title.slice(0, 250),
                  docNumber: (d.docNumber || '').slice(0, 120),
                  bodyContent: d.bodyContent.slice(0, 40000),
                  status: d.status,
                  updatedAt: serverTimestamp(),
                })
              );
            } else {
              activeBatch.set(
                docRef,
                stripUndefinedDeep({
                  ...d,
                  createdBy: uid,
                  authorizedUids: authUids,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                })
              );
            }
            opCount += 1;
            await flushBatch(false);
          }
        }

        await flushBatch(true);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `applyTargetsAndSync/${activePeriod.periodId}`);
      }
    }

    await appendAuditLog(
      'SYNC_REKAP_96_CHECKLIST',
      `${reason} (${scoreWrites.length} skor, ${updatedResponsesCount} indikator, ${approvedDocsCount} berkas siap).`
    );
    setStatusMessage(
      `Nilai & rincian 96 butir diperbarui (${scoreWrites.length} skor), ${approvedDocsCount}/27 berkas wajib ditandai terkumpul.`
    );
    return {
      savedScores: scoreWrites.length,
      updatedResponses: updatedResponsesCount,
      approvedDocs: approvedDocsCount,
    };
  };

  const loadAttachmentPreset2026 = async () => {
    const p1Explicit = getPresetRawScoreMap('PENILAI_1', activeIndicators);
    const p2Explicit = getPresetRawScoreMap('PENILAI_2', activeIndicators);
    await applyTargetsAndSyncAll({
      explicitP1Scores: p1Explicit,
      explicitP2Scores: p2Explicit,
      syncResponsesAndChecklist: true,
      institutionProfilePatch: {
        institution: DEFAULT_PPKM_DATA.institution,
        principal: DEFAULT_PPKM_DATA.principal,
        evaluators: DEFAULT_PPKM_DATA.evaluators,
        namaYayasan: DEFAULT_PPKM_DATA.adminDocs?.namaYayasan,
      },
      reason: 'Muat Ulang Preset Resmi Lampiran PKKRA 2026 (P1 289 / P2 362 / Nilai 84,77)',
    });
    setStatusMessage(
      'Preset Resmi Lampiran PKKRA 2026 (Gian Dwi Wahyuni, S.H · P1 289 · P2 362 · Nilai 84,77 Baik) siap dicetak!'
    );
  };

  const setChecklistDocStatus = async (docId: string, nextStatus: 'DRAFT' | 'APPROVED') => {
    const uid = firebaseUser?.uid || 'local-owner';
    const authUids = getSafeAuthorizedUids();
    const nowIso = new Date().toISOString();

    let targetDoc: GeneratedDocRecord | null = null;
    setStore((prev) => {
      const existing = prev.generatedDocs.find((d) => d.docId === docId);
      if (existing) {
        targetDoc = { ...existing, status: nextStatus, updatedAt: nowIso };
        return {
          ...prev,
          generatedDocs: prev.generatedDocs.map((d) => (d.docId === docId ? targetDoc! : d)),
        };
      }
      const generatedAll = buildAllGeneratedDocsFromProfile(
        activeInstitution.institutionId,
        activePeriod.periodId,
        activeInstitution.profileData,
        activePeriod.yearLabel,
        uid,
        prev.generatedDocs,
        false
      ).map((d) => ({
        ...d,
        status: d.docId === docId ? nextStatus : d.status,
        authorizedUids: authUids,
      }));
      targetDoc = generatedAll.find((d) => d.docId === docId) || null;
      const otherDocs = prev.generatedDocs.filter(
        (d) => !(d.institutionId === activeInstitution.institutionId && d.periodId === activePeriod.periodId)
      );
      return {
        ...prev,
        generatedDocs: [...generatedAll, ...otherDocs],
      };
    });

    if (isCloudUser && targetDoc && activeInstitution.institutionId !== 'onboarding-ra') {
      try {
        const refDoc = doc(db, 'generatedDocuments', docId);
        const snap = await getDoc(refDoc);
        if (snap.exists()) {
          await updateDoc(refDoc, {
            status: nextStatus,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(
            refDoc,
            stripUndefinedDeep({
              ...(targetDoc as GeneratedDocRecord),
              createdBy: uid,
              authorizedUids: authUids,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          );
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `generatedDocuments/${docId}`);
      }
    }
    setStatusMessage(
      nextStatus === 'APPROVED'
        ? 'Berkas ditandai sudah dikumpulkan / siap.'
        : 'Berkas dikembalikan ke status draft / belum lengkap.'
    );
  };

  const syncChecklistDocsFromScores = async (
    mode: 'AUTO' | 'ALL_APPROVED' | 'ALL_DRAFT'
  ): Promise<number> => {
    const uid = firebaseUser?.uid || 'local-owner';
    const authUids = getSafeAuthorizedUids();
    const nowIso = new Date().toISOString();

    const compAvgMap: Record<'K1' | 'K2' | 'K3' | 'K4', number> = { K1: 0, K2: 0, K3: 0, K4: 0 };
    (['K1', 'K2', 'K3', 'K4'] as const).forEach((code) => {
      const compInds = activeIndicators.filter((i) => i.komponenCode === code);
      let sum = 0;
      let cnt = 0;
      for (const ind of compInds) {
        const s1 = p1Scores[ind.id]?.score;
        const s2 = p2Scores[ind.id]?.score;
        if (s1 !== undefined || s2 !== undefined) {
          sum += s1 !== undefined && s2 !== undefined ? (s1 + s2) / 2 : (s1 ?? s2 ?? 0);
          cnt += 1;
        }
      }
      compAvgMap[code] = cnt > 0 ? sum / cnt : 0;
    });

    const baseDocs = buildAllGeneratedDocsFromProfile(
      activeInstitution.institutionId,
      activePeriod.periodId,
      activeInstitution.profileData,
      activePeriod.yearLabel,
      uid,
      store.generatedDocs,
      mode === 'ALL_DRAFT'
    );

    let approvedCount = 0;
    const nextDocs = baseDocs.map((d) => {
      let nextStatus: 'DRAFT' | 'APPROVED' = d.status;
      if (mode === 'ALL_APPROVED') nextStatus = 'APPROVED';
      else if (mode === 'ALL_DRAFT') nextStatus = 'DRAFT';
      else if (d.templateId) {
        const tplDef = DOCUMENT_TEMPLATES.find((t) => t.templateId === d.templateId);
        const codes = tplDef ? getComponentCodesForTemplate(tplDef) : ['K1' as const];
        const bestAvg = Math.max(...codes.map((c) => compAvgMap[c] || 0));
        if (bestAvg >= 3.0) nextStatus = 'APPROVED';
      }
      if (nextStatus === 'APPROVED') approvedCount += 1;
      return { ...d, status: nextStatus, authorizedUids: authUids, updatedAt: nowIso };
    });

    setStore((prev) => {
      const otherDocs = prev.generatedDocs.filter(
        (d) => !(d.institutionId === activeInstitution.institutionId && d.periodId === activePeriod.periodId)
      );
      return {
        ...prev,
        generatedDocs: [...nextDocs, ...otherDocs],
      };
    });

    if (isCloudUser && firebaseUser && activeInstitution.institutionId !== 'onboarding-ra') {
      try {
        const existingDocsQ = isSuperAdminAccount
          ? query(collection(db, 'generatedDocuments'), where('periodId', '==', activePeriod.periodId))
          : query(
              collection(db, 'generatedDocuments'),
              where('authorizedUids', 'array-contains', firebaseUser.uid),
              where('periodId', '==', activePeriod.periodId)
            );
        const existingDocsSnap = await getDocs(existingDocsQ);
        const existingDocIds = new Set(existingDocsSnap.docs.map((item) => item.id));

        const batch = writeBatch(db);
        for (const d of nextDocs) {
          const docRef = doc(db, 'generatedDocuments', d.docId);
          if (existingDocIds.has(d.docId)) {
            batch.update(docRef, {
              status: d.status,
              updatedAt: serverTimestamp(),
            });
          } else {
            batch.set(
              docRef,
              stripUndefinedDeep({
                ...d,
                createdBy: uid,
                authorizedUids: authUids,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              })
            );
          }
        }
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `generatedDocuments/checklist_${activePeriod.periodId}`);
      }
    }

    await appendAuditLog(
      'CHECKLIST_DOCS_SYNC',
      `Sinkronisasi ceklis berkas dikumpulkan (${mode}): ${approvedCount}/${nextDocs.length} siap.`
    );
    setStatusMessage(`Ceklis berkas diperbarui: ${approvedCount}/${nextDocs.length} berkas siap dikumpulkan.`);
    return approvedCount;
  };

  const unlockAssessorScore = async (
    assessorRole: 'PENILAI_1' | 'PENILAI_2',
    reason: string
  ) => {
    if (store.activeRole !== 'SUPER_ADMIN') {
      throw new Error('Hanya Super Admin yang dapat membuka kunci penilaian yang telah difinalisasi.');
    }
    const cleanReason = reason.trim();
    if (cleanReason.length < 5) {
      throw new Error('Alasan pembukaan kunci wajib diisi minimal 5 karakter untuk audit log.');
    }

    const uid = firebaseUser?.uid || 'local-super-admin';
    const authUids = getSafeAuthorizedUids();
    const historyEntry: ScoreHistoryRecord = {
      historyId: `unlock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      institutionId: activeInstitution.institutionId,
      periodId: activePeriod.periodId,
      indicatorId: 'ALL',
      assessorRole,
      actorUid: uid,
      actorName: firebaseUser?.displayName || 'Super Admin',
      oldScore: null,
      newScore: null,
      reason: cleanReason,
      actionType: 'UNLOCK',
      authorizedUids: authUids,
      createdAt: new Date().toISOString(),
    };

    const patch = assessorRole === 'PENILAI_1' ? { p1Finalized: false } : { p2Finalized: false };

    setStore((prev) => ({
      ...prev,
      periods: prev.periods.map((p) =>
        p.periodId === activePeriod.periodId ? { ...p, ...patch } : p
      ),
      scoreHistory: [historyEntry, ...(prev.scoreHistory || [])].slice(0, 500),
    }));

    if (isCloudUser && activeInstitution.institutionId !== 'onboarding-ra') {
      try {
        await setDoc(
          doc(db, 'scoreHistory', historyEntry.historyId),
          stripUndefinedDeep({
            ...historyEntry,
            createdAt: serverTimestamp(),
          })
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `scoreHistory/${historyEntry.historyId}`);
      }
    }

    await updatePeriodMeta(activePeriod.periodId, patch);
    await appendAuditLog(
      'ASSESSMENT_UNLOCK',
      `Super Admin membuka kunci ${assessorRole} (${activePeriod.yearLabel}). Alasan: ${cleanReason}`
    );
    setStatusMessage(`Kunci penilaian ${assessorRole} dibuka oleh Super Admin.`);
  };

  const p1Note = store.p1Notes[activePeriod.periodId] || null;
  const p2Note = store.p2Notes[activePeriod.periodId] || null;

  const saveAssessorSummaryNote = async (
    assessorRole: 'PENILAI_1' | 'PENILAI_2',
    recommendation: string,
    finalize = false
  ) => {
    const uid = firebaseUser?.uid || `local_${assessorRole}`;
    const authUids = getSafeAuthorizedUids();
    const rec: AssessorNoteRecord = {
      institutionId: activeInstitution.institutionId,
      periodId: activePeriod.periodId,
      assessorId: uid,
      assessorRole,
      recommendation,
      finalized: finalize,
      authorizedUids: authUids,
      updatedAt: new Date().toISOString(),
    };

    const lockHistory: ScoreHistoryRecord | null = finalize
      ? {
          historyId: `lock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          institutionId: activeInstitution.institutionId,
          periodId: activePeriod.periodId,
          indicatorId: 'ALL',
          assessorRole,
          actorUid: uid,
          actorName: firebaseUser?.displayName || assessorRole.replace('_', ' '),
          oldScore: null,
          newScore: null,
          reason: 'Finalisasi & penguncian penilaian oleh penilai',
          actionType: 'LOCK',
          authorizedUids: authUids,
          createdAt: new Date().toISOString(),
        }
      : null;

    setStore((prev) => ({
      ...prev,
      scoreHistory: lockHistory ? [lockHistory, ...(prev.scoreHistory || [])].slice(0, 500) : prev.scoreHistory,
      p1Notes: assessorRole === 'PENILAI_1' ? { ...prev.p1Notes, [activePeriod.periodId]: rec } : prev.p1Notes,
      p2Notes: assessorRole === 'PENILAI_2' ? { ...prev.p2Notes, [activePeriod.periodId]: rec } : prev.p2Notes,
      periods: prev.periods.map((p) =>
        p.periodId === activePeriod.periodId
          ? {
              ...p,
              p1Finalized: assessorRole === 'PENILAI_1' && finalize ? true : p.p1Finalized,
              p2Finalized: assessorRole === 'PENILAI_2' && finalize ? true : p.p2Finalized,
            }
          : p
      ),
    }));

    if (isCloudUser && activeInstitution.institutionId !== 'onboarding-ra') {
      const noteDocId = `${activePeriod.periodId}_${assessorRole}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      try {
        await setDoc(
          doc(db, 'assessmentNotes', noteDocId),
          stripUndefinedDeep({
            ...rec,
            updatedAt: serverTimestamp(),
          })
        );
        if (lockHistory) {
          await setDoc(
            doc(db, 'scoreHistory', lockHistory.historyId),
            stripUndefinedDeep({
              ...lockHistory,
              createdAt: serverTimestamp(),
            })
          );
          const periodRef = doc(db, 'assessmentPeriods', activePeriod.periodId);
          const pSnap = await getDoc(periodRef);
          if (pSnap.exists()) {
            await updateDoc(periodRef, {
              ...(assessorRole === 'PENILAI_1' ? { p1Finalized: true } : { p2Finalized: true }),
              updatedAt: serverTimestamp(),
            });
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `assessmentNotes/${noteDocId}`);
      }
    }

    await appendAuditLog(
      finalize ? 'ASSESSMENT_FINALIZE' : 'ASSESSMENT_NOTE',
      `${assessorRole} ${finalize ? 'mengunci hasil akhir' : 'memperbarui catatan rekomendasi'} untuk ${activePeriod.yearLabel}.`
    );
  };

  const recommendations = useMemo(
    () =>
      (store.recommendations || []).filter(
        (r) =>
          r.institutionId === activeInstitution.institutionId &&
          r.periodId === activePeriod.periodId
      ),
    [store.recommendations, activeInstitution.institutionId, activePeriod.periodId]
  );

  const saveRecommendation = async (
    item: Omit<RecommendationItemRecord, 'recId' | 'institutionId' | 'periodId' | 'authorizedUids'> & {
      recId?: string;
    }
  ) => {
    const recId = item.recId || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const fullRec: RecommendationItemRecord = {
      ...item,
      recId,
      institutionId: activeInstitution.institutionId,
      periodId: activePeriod.periodId,
      authorizedUids: getSafeAuthorizedUids(),
      updatedAt: new Date().toISOString(),
    };

    setStore((prev) => {
      const exists = (prev.recommendations || []).some((r) => r.recId === recId);
      return {
        ...prev,
        recommendations: exists
          ? prev.recommendations.map((r) => (r.recId === recId ? fullRec : r))
          : [fullRec, ...(prev.recommendations || [])],
      };
    });

    if (isCloudUser && activeInstitution.institutionId !== 'onboarding-ra') {
      try {
        await setDoc(
          doc(db, 'recommendations', recId),
          stripUndefinedDeep({
            ...fullRec,
            updatedAt: serverTimestamp(),
          })
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `recommendations/${recId}`);
      }
    }

    await appendAuditLog('RTL_SAVE', `Menyimpan item RTL: ${fullRec.komponenNama} (${fullRec.status}).`);
    setStatusMessage('Rencana tindak lanjut (RTL) tersimpan.');
  };

  const deleteRecommendation = async (recId: string) => {
    setStore((prev) => ({
      ...prev,
      recommendations: (prev.recommendations || []).filter((r) => r.recId !== recId),
    }));
    if (isCloudUser) {
      try {
        await deleteDoc(doc(db, 'recommendations', recId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `recommendations/${recId}`);
      }
    }
    await appendAuditLog('RTL_DELETE', `Menghapus item RTL ${recId}.`);
  };

  const generateRecommendationsFromAssessors = async (): Promise<number> => {
    const candidates: RecommendationItemRecord[] = [];
    const nowIso = new Date().toISOString();
    const authUids = getSafeAuthorizedUids();

    const addFromScores = (
      role: 'PENILAI_1' | 'PENILAI_2',
      scores: Record<string, AssessorScoreRecord>,
      summaryNote: AssessorNoteRecord | null
    ) => {
      if (summaryNote?.recommendation?.trim()) {
        candidates.push({
          recId: `rec_auto_${activePeriod.periodId}_${role}_summary`.replace(/[^a-zA-Z0-9_-]/g, '_'),
          institutionId: activeInstitution.institutionId,
          periodId: activePeriod.periodId,
          sourceRole: role,
          komponenNama: `Catatan Umum ${role === 'PENILAI_1' ? 'Penilai 1' : 'Penilai 2'}`,
          temuan: summaryNote.recommendation.trim(),
          rekomendasi: summaryNote.recommendation.trim(),
          rencanaTindakLanjut: '',
          penanggungJawab: activeInstitution.profileData.principal.namaLengkap || 'Kepala RA',
          targetWaktu: 'Semester Berikutnya',
          status: 'DRAFT',
          authorizedUids: authUids,
          updatedAt: nowIso,
        });
      }
      for (const ind of activeIndicators) {
        const sc = scores[ind.id];
        if (!sc) continue;
        if ((sc.note && sc.note.trim().length > 0) || sc.score <= 2) {
          candidates.push({
            recId: `rec_auto_${activePeriod.periodId}_${role}_${ind.id}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
            institutionId: activeInstitution.institutionId,
            periodId: activePeriod.periodId,
            sourceRole: role,
            komponenNama: `${ind.id} — ${ind.komponenNama}`,
            temuan: sc.note?.trim() || `Skor indikator ${ind.id} = ${sc.score} (perlu penguatan bukti/implementasi).`,
            rekomendasi: sc.note?.trim()
              ? `Tindak lanjuti catatan ${role === 'PENILAI_1' ? 'Penilai 1' : 'Penilai 2'} pada ${ind.id}.`
              : `Lengkapi bukti wajib ${ind.buktiWajib[0] || 'indikator terkait'}.`,
            rencanaTindakLanjut: '',
            penanggungJawab: activeInstitution.profileData.principal.namaLengkap || 'Kepala RA',
            targetWaktu: 'Triwulan I',
            status: 'DRAFT',
            authorizedUids: authUids,
            updatedAt: nowIso,
          });
        }
      }
    };

    addFromScores('PENILAI_1', p1Scores, p1Note);
    addFromScores('PENILAI_2', p2Scores, p2Note);

    if (candidates.length === 0) {
      setStatusMessage('Belum ada catatan temuan atau skor <= 2 dari Penilai 1 / Penilai 2.');
      return 0;
    }

    const existingIds = new Set((store.recommendations || []).map((r) => r.recId));
    const newOnes = candidates.filter((c) => !existingIds.has(c.recId));

    setStore((prev) => ({
      ...prev,
      recommendations: [...newOnes, ...(prev.recommendations || [])],
    }));

    if (isCloudUser && newOnes.length > 0 && activeInstitution.institutionId !== 'onboarding-ra') {
      try {
        const batch = writeBatch(db);
        for (const rec of newOnes) {
          batch.set(
            doc(db, 'recommendations', rec.recId),
            stripUndefinedDeep({
              ...rec,
              updatedAt: serverTimestamp(),
            })
          );
        }
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'recommendations/batch');
      }
    }

    await appendAuditLog(
      'RTL_SYNC_ASSESSORS',
      `Menghimpun ${candidates.length} butir temuan & catatan asli dari Penilai 1 & Penilai 2.`
    );
    setStatusMessage(`${candidates.length} temuan asli Penilai 1 & 2 ditarik ke daftar RTL.`);
    return candidates.length;
  };

  const scoreHistory = useMemo(
    () =>
      (store.scoreHistory || []).filter(
        (h) =>
          store.activeRole === 'SUPER_ADMIN' ||
          (h.institutionId === activeInstitution.institutionId && h.periodId === activePeriod.periodId)
      ),
    [store.scoreHistory, store.activeRole, activeInstitution.institutionId, activePeriod.periodId]
  );

  const evidenceFiles = useMemo(
    () =>
      store.evidenceFiles.filter(
        (e) =>
          e.institutionId === activeInstitution.institutionId &&
          e.periodId === activePeriod.periodId
      ),
    [store.evidenceFiles, activeInstitution.institutionId, activePeriod.periodId]
  );

  const toFirestoreEvidencePayload = (ev: EvidenceFileRecord) => {
    const { localPreviewUrl: _omitPreview, ...cloudFields } = ev;
    return cloudFields;
  };

  const uploadEvidence = async (
    indicatorId: string,
    file: File,
    description: string,
    linkedIndicatorIds?: string[]
  ) => {
    const allowedExt = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExt.includes(ext)) {
      throw new Error('Format file tidak diizinkan. Gunakan PDF, DOC/DOCX, XLS/XLSX, JPG, JPEG, atau PNG.');
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('Ukuran file melebihi batas maksimal 20 MB.');
    }

    const evidenceId = `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const uid = firebaseUser?.uid || 'local-owner';
    const authUids = getSafeAuthorizedUids();
    const storagePath = `evidence/${activeInstitution.institutionId}/${activePeriod.periodId}/${indicatorId}/${evidenceId}_${file.name}`;
    let downloadUrl = '';
    let localPreviewUrl = '';

    if (isCloudUser) {
      try {
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file, { contentType: file.type });
        downloadUrl = await getDownloadURL(storageRef);
      } catch {
        // Fallback to local preview when Storage bucket CORS isn't configured
      }
    }

    if (!downloadUrl) {
      localPreviewUrl = await new Promise<string>((resolve) => {
        if (file.size <= 1.5 * 1024 * 1024) {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.readAsDataURL(file);
        } else {
          resolve(URL.createObjectURL(file));
        }
      });
    }

    const mergedLinks = Array.from(new Set([indicatorId, ...(linkedIndicatorIds || [])]));
    const nowIso = new Date().toISOString();

    const newEvidence: EvidenceFileRecord = {
      evidenceId,
      institutionId: activeInstitution.institutionId,
      periodId: activePeriod.periodId,
      indicatorId,
      linkedIndicatorIds: mergedLinks,
      fileName: file.name,
      mimeType: file.type || `application/${ext}`,
      sizeBytes: file.size,
      storagePath,
      downloadUrl,
      localPreviewUrl,
      description: description || `Bukti fisik indikator ${indicatorId}`,
      verificationStatus: 'uploaded',
      verificationNote: '',
      revisionHistory: [
        {
          version: 1,
          fileName: file.name,
          sizeBytes: file.size,
          uploadedAt: nowIso,
          uploadedBy: uid,
          note: 'Unggahan awal',
        },
      ],
      uploadedBy: uid,
      authorizedUids: authUids,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setStore((prev) => ({
      ...prev,
      evidenceFiles: [newEvidence, ...prev.evidenceFiles],
    }));

    if (isCloudUser && activeInstitution.institutionId !== 'onboarding-ra') {
      try {
        await setDoc(
          doc(db, 'evidenceFiles', evidenceId),
          stripUndefinedDeep({
            ...toFirestoreEvidencePayload(newEvidence),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `evidenceFiles/${evidenceId}`);
      }
    }

    await appendAuditLog(
      'EVIDENCE_UPLOAD',
      `Unggah bukti "${file.name}" ditautkan ke indikator: ${mergedLinks.join(', ')}.`
    );
    setStatusMessage(`Bukti "${file.name}" berhasil diunggah.`);
  };

  const updateEvidenceLinks = async (evidenceId: string, linkedIndicatorIds: string[]) => {
    const cleanLinks = Array.from(new Set(linkedIndicatorIds.filter(Boolean)));
    if (cleanLinks.length === 0) return;
    setStore((prev) => ({
      ...prev,
      evidenceFiles: prev.evidenceFiles.map((e) =>
        e.evidenceId === evidenceId
          ? {
              ...e,
              indicatorId: cleanLinks[0],
              linkedIndicatorIds: cleanLinks,
              updatedAt: new Date().toISOString(),
            }
          : e
      ),
    }));
    if (isCloudUser) {
      try {
        const refDoc = doc(db, 'evidenceFiles', evidenceId);
        const snap = await getDoc(refDoc);
        if (snap.exists()) {
          await updateDoc(refDoc, {
            indicatorId: cleanLinks[0],
            linkedIndicatorIds: cleanLinks,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `evidenceFiles/${evidenceId}`);
      }
    }
    await appendAuditLog('EVIDENCE_RELINK', `Pemetaan indikator bukti ${evidenceId} -> ${cleanLinks.join(', ')}`);
    setStatusMessage('Tautan multi-indikator bukti fisik diperbarui.');
  };

  const replaceEvidenceRevision = async (evidenceId: string, file: File, revisionNote: string) => {
    const allowedExt = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExt.includes(ext)) {
      throw new Error('Format file revisi tidak diizinkan.');
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('Ukuran file melebihi batas maksimal 20 MB.');
    }

    const uid = firebaseUser?.uid || 'local-owner';
    let localPreviewUrl = '';
    if (file.size <= 1.5 * 1024 * 1024) {
      localPreviewUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(file);
      });
    } else {
      localPreviewUrl = URL.createObjectURL(file);
    }

    const nowIso = new Date().toISOString();
    let updatedRec: EvidenceFileRecord | null = null;
    setStore((prev) => ({
      ...prev,
      evidenceFiles: prev.evidenceFiles.map((e) => {
        if (e.evidenceId !== evidenceId) return e;
        const prevHist = e.revisionHistory || [
          {
            version: 1,
            fileName: e.fileName,
            sizeBytes: e.sizeBytes,
            uploadedAt: String(e.createdAt || nowIso),
            uploadedBy: e.uploadedBy,
            note: 'Versi awal',
          },
        ];
        const nextVersion = prevHist.length + 1;
        updatedRec = {
          ...e,
          fileName: file.name,
          mimeType: file.type || `application/${ext}`,
          sizeBytes: file.size,
          localPreviewUrl,
          verificationStatus: 'pending',
          revisionHistory: [
            ...prevHist,
            {
              version: nextVersion,
              fileName: file.name,
              sizeBytes: file.size,
              uploadedAt: nowIso,
              uploadedBy: uid,
              note: revisionNote || `Revisi ke-${nextVersion}`,
            },
          ],
          updatedAt: nowIso,
        };
        return updatedRec;
      }),
    }));

    if (isCloudUser && updatedRec) {
      const recSnapshot = updatedRec as EvidenceFileRecord;
      try {
        const refDoc = doc(db, 'evidenceFiles', evidenceId);
        const snap = await getDoc(refDoc);
        if (snap.exists()) {
          await updateDoc(
            refDoc,
            stripUndefinedDeep({
              fileName: recSnapshot.fileName,
              mimeType: recSnapshot.mimeType,
              sizeBytes: recSnapshot.sizeBytes,
              verificationStatus: recSnapshot.verificationStatus,
              revisionHistory: recSnapshot.revisionHistory,
              updatedAt: serverTimestamp(),
            })
          );
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `evidenceFiles/${evidenceId}`);
      }
    }

    await appendAuditLog('EVIDENCE_REVISION', `Unggah revisi "${file.name}" pada bukti ${evidenceId}.`);
    setStatusMessage(`Revisi berkas "${file.name}" berhasil disimpan.`);
  };

  const verifyEvidence = async (
    evidenceId: string,
    verificationStatus: EvidenceVerificationStatus,
    verificationNote: string
  ) => {
    setStore((prev) => ({
      ...prev,
      evidenceFiles: prev.evidenceFiles.map((e) =>
        e.evidenceId === evidenceId
          ? { ...e, verificationStatus, verificationNote, updatedAt: new Date().toISOString() }
          : e
      ),
    }));
    if (isCloudUser) {
      try {
        const refDoc = doc(db, 'evidenceFiles', evidenceId);
        const snap = await getDoc(refDoc);
        if (snap.exists()) {
          await updateDoc(refDoc, {
            verificationStatus,
            verificationNote,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `evidenceFiles/${evidenceId}`);
      }
    }
    await appendAuditLog('EVIDENCE_VERIFY', `Verifikasi bukti ${evidenceId}: ${verificationStatus}`);
  };

  const deleteEvidence = async (evidenceId: string) => {
    setStore((prev) => ({
      ...prev,
      evidenceFiles: prev.evidenceFiles.filter((e) => e.evidenceId !== evidenceId),
    }));
    if (isCloudUser) {
      try {
        await deleteDoc(doc(db, 'evidenceFiles', evidenceId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `evidenceFiles/${evidenceId}`);
      }
    }
    await appendAuditLog('EVIDENCE_DELETE', `Menghapus bukti fisik ${evidenceId}.`);
  };

  const generatedDocs = useMemo(
    () =>
      store.generatedDocs.filter(
        (d) =>
          d.institutionId === activeInstitution.institutionId &&
          d.periodId === activePeriod.periodId
      ),
    [store.generatedDocs, activeInstitution.institutionId, activePeriod.periodId]
  );

  const saveGeneratedDoc = async (docInput: Omit<GeneratedDocRecord, 'authorizedUids' | 'createdBy'>) => {
    const uid = firebaseUser?.uid || 'local-owner';
    const fullDoc: GeneratedDocRecord = {
      ...docInput,
      createdBy: uid,
      authorizedUids: getSafeAuthorizedUids(),
      createdAt: docInput.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setStore((prev) => {
      const exists = prev.generatedDocs.some((d) => d.docId === fullDoc.docId);
      return {
        ...prev,
        generatedDocs: exists
          ? prev.generatedDocs.map((d) => (d.docId === fullDoc.docId ? fullDoc : d))
          : [fullDoc, ...prev.generatedDocs],
      };
    });
    if (isCloudUser && activeInstitution.institutionId !== 'onboarding-ra') {
      try {
        const refDoc = doc(db, 'generatedDocuments', fullDoc.docId);
        const existingSnap = await getDoc(refDoc);
        if (existingSnap.exists()) {
          await updateDoc(
            refDoc,
            stripUndefinedDeep({
              title: fullDoc.title,
              docNumber: fullDoc.docNumber || '',
              bodyContent: fullDoc.bodyContent,
              status: fullDoc.status,
              updatedAt: serverTimestamp(),
            })
          );
        } else {
          await setDoc(
            refDoc,
            stripUndefinedDeep({
              ...fullDoc,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          );
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `generatedDocuments/${fullDoc.docId}`);
      }
    }
    await appendAuditLog('DOCUMENT_SAVE', `Menyimpan dokumen "${fullDoc.title}" (${fullDoc.status}).`);
    setStatusMessage(`Dokumen "${fullDoc.title}" disimpan (${fullDoc.status}).`);
  };

  const deleteGeneratedDoc = async (docId: string) => {
    setStore((prev) => ({
      ...prev,
      generatedDocs: prev.generatedDocs.filter((d) => d.docId !== docId),
    }));
    if (isCloudUser) {
      try {
        await deleteDoc(doc(db, 'generatedDocuments', docId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `generatedDocuments/${docId}`);
      }
    }
    await appendAuditLog('DOCUMENT_DELETE', `Menghapus dokumen ${docId}.`);
  };

  const addTeamMember = async (email: string, displayName: string, role: UserRole) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setStatusMessage('Format email Google tidak valid.');
      return;
    }
    const safeRole: Exclude<UserRole, 'SUPER_ADMIN'> =
      role === 'SUPER_ADMIN' ? 'ADMIN_LEMBAGA' : role;
    const inviteId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const uid = firebaseUser?.uid || 'local-owner';
    const authUids = getSafeAuthorizedUids();
    const nowIso = new Date().toISOString();

    const newInvite: TeamInvitationRecord = {
      inviteId,
      institutionId: activeInstitution.institutionId,
      institutionName: activeInstitution.name,
      invitedEmail: cleanEmail,
      displayName: displayName.trim(),
      role: safeRole,
      status: 'pending',
      invitedBy: uid,
      authorizedUids: authUids,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setStore((prev) => ({
      ...prev,
      teamInvitations: [newInvite, ...(prev.teamInvitations || [])],
    }));

    if (isCloudUser && activeInstitution.institutionId !== 'onboarding-ra') {
      try {
        await setDoc(
          doc(db, 'teamInvitations', inviteId),
          stripUndefinedDeep({
            ...newInvite,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `teamInvitations/${inviteId}`);
      }
    }

    await appendAuditLog(
      'TEAM_INVITE',
      `Mengundang ${displayName} (${cleanEmail}) sebagai ${safeRole} di ${activeInstitution.name}.`
    );
    setStatusMessage(`Undangan dikirim untuk ${cleanEmail}. Akses otomatis aktif saat login Google.`);
  };

  const revokeTeamInvitation = async (inviteId: string) => {
    setStore((prev) => ({
      ...prev,
      teamInvitations: (prev.teamInvitations || []).map((inv) =>
        inv.inviteId === inviteId ? { ...inv, status: 'revoked', updatedAt: new Date().toISOString() } : inv
      ),
    }));
    if (isCloudUser) {
      try {
        await updateDoc(doc(db, 'teamInvitations', inviteId), {
          status: 'revoked',
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `teamInvitations/${inviteId}`);
      }
    }
    await appendAuditLog('TEAM_INVITE_REVOKE', `Mencabut undangan keanggotaan ${inviteId}.`);
    setStatusMessage('Undangan akses berhasil dicabut.');
  };

  const notifications = useMemo<NotificationAlert[]>(() => {
    const alerts: NotificationAlert[] = [];
    const completedCount = activeIndicators.filter(
      (i) => responses[i.id]?.completionStatus === 'complete'
    ).length;

    if (completedCount < activeIndicators.length) {
      alerts.push({
        id: 'ind-incomplete',
        severity: 'warning',
        title: `${activeIndicators.length - completedCount} Indikator Belum Lengkap`,
        detail: `Progres pengisian mandiri baru mencapai ${completedCount} dari ${activeIndicators.length} indikator ${activeInstrumentVersion.versionNumber}.`,
        targetMenu: 'pemeriksaan_kelengkapan',
      });
    }

    const pendingEv = evidenceFiles.filter(
      (e) => e.verificationStatus === 'pending' || e.verificationStatus === 'uploaded'
    ).length;
    if (evidenceFiles.length === 0) {
      alerts.push({
        id: 'ev-missing',
        severity: 'alert',
        title: 'Bukti Fisik Periode Aktif Belum Diunggah',
        detail: 'Unggah minimal bukti fisik pendukung tiap komponen agar Penilai 1 & 2 dapat memverifikasi.',
        targetMenu: 'bukti_fisik',
      });
    } else if (pendingEv > 0) {
      alerts.push({
        id: 'ev-pending',
        severity: 'info',
        title: `${pendingEv} Bukti Fisik Menunggu Pemeriksaan`,
        detail: 'Penilai 1 & Penilai 2 dapat meninjau dokumen bukti di menu Bukti Fisik.',
        targetMenu: 'bukti_fisik',
      });
    }

    if (!activePeriod.p1Finalized || !activePeriod.p2Finalized) {
      alerts.push({
        id: 'assess-pending',
        severity: 'info',
        title: 'Penilaian Dua Penilai Belum Final',
        detail: `Status kunci: Penilai 1 (${activePeriod.p1Finalized ? 'Final' : 'Proses'}), Penilai 2 (${activePeriod.p2Finalized ? 'Final' : 'Proses'}).`,
        targetMenu: 'hasil_penilaian',
      });
    }

    if (!activePeriod.formulaVerified) {
      alerts.push({
        id: 'formula-check',
        severity: 'warning',
        title: 'Verifikasi Rumus Sheet Setting Excel',
        detail: 'Sheet Setting pada file .xlsm wajib diverifikasi sebelum penguncian resmi.',
        targetMenu: 'rekap_nilai',
      });
    }

    return alerts;
  }, [responses, evidenceFiles, activePeriod, activeIndicators, activeInstrumentVersion.versionNumber]);

  const autoSyncAllNow = async (forceOverwrite = false) => {
    const uid = firebaseUser?.uid || 'local-owner';
    const authUids = getSafeAuthorizedUids();
    let docsCount = 0;
    let indicatorsDone = 0;
    let syncedDocsToPersist: GeneratedDocRecord[] = [];
    let syncedResponsesToPersist: IndicatorResponseRecord[] = [];

    setStore((prev) => {
      const otherDocs = prev.generatedDocs.filter(
        (d) => !(d.institutionId === activeInstitution.institutionId && d.periodId === activePeriod.periodId)
      );
      syncedDocsToPersist = buildAllGeneratedDocsFromProfile(
        activeInstitution.institutionId,
        activePeriod.periodId,
        activeInstitution.profileData,
        activePeriod.yearLabel,
        uid,
        prev.generatedDocs,
        forceOverwrite
      ).map((d) => ({ ...d, authorizedUids: authUids }));
      const syncedResponses = buildAutoIndicatorResponses(
        activeInstitution.institutionId,
        activePeriod.periodId,
        activeInstitution.profileData,
        evidenceFiles,
        uid,
        prev.responses[activePeriod.periodId] || {},
        forceOverwrite
      );
      for (const k of Object.keys(syncedResponses)) {
        syncedResponses[k] = { ...syncedResponses[k], authorizedUids: authUids };
      }
      syncedResponsesToPersist = Object.values(syncedResponses);

      docsCount = syncedDocsToPersist.length;
      indicatorsDone = activeIndicators.filter(
        (i) => syncedResponses[i.id]?.completionStatus === 'complete'
      ).length;

      return {
        ...prev,
        generatedDocs: [...syncedDocsToPersist, ...otherDocs],
        responses: {
          ...prev.responses,
          [activePeriod.periodId]: syncedResponses,
        },
      };
    });

    if (isCloudUser && firebaseUser && activeInstitution.institutionId !== 'onboarding-ra' && syncedDocsToPersist.length > 0) {
      try {
        const existingDocsQ = isSuperAdminAccount
          ? query(collection(db, 'generatedDocuments'), where('periodId', '==', activePeriod.periodId))
          : query(
              collection(db, 'generatedDocuments'),
              where('authorizedUids', 'array-contains', firebaseUser.uid),
              where('periodId', '==', activePeriod.periodId)
            );
        const existingDocsSnap = await getDocs(existingDocsQ);
        const existingDocIds = new Set(existingDocsSnap.docs.map((item) => item.id));

        let batch = writeBatch(db);
        let opCount = 0;
        const flushBatch = async (force = false) => {
          if (opCount >= 350 || (force && opCount > 0)) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
          }
        };

        for (const d of syncedDocsToPersist) {
          const docRef = doc(db, 'generatedDocuments', d.docId);
          if (existingDocIds.has(d.docId)) {
            batch.update(
              docRef,
              stripUndefinedDeep({
                title: d.title.slice(0, 250),
                docNumber: (d.docNumber || '').slice(0, 120),
                bodyContent: d.bodyContent.slice(0, 40000),
                status: d.status,
                updatedAt: serverTimestamp(),
              })
            );
          } else {
            batch.set(
              docRef,
              stripUndefinedDeep({
                ...d,
                createdBy: uid,
                authorizedUids: authUids,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              })
            );
          }
          opCount += 1;
          await flushBatch(false);
        }
        for (const r of syncedResponsesToPersist) {
          batch.set(
            doc(db, 'indicatorResponses', r.responseId),
            stripUndefinedDeep({
              ...r,
              updatedBy: uid,
              authorizedUids: authUids,
              updatedAt: serverTimestamp(),
            })
          );
          opCount += 1;
          await flushBatch(false);
        }
        await flushBatch(true);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `autoSync/${activePeriod.periodId}`);
      }
    }

    await appendAuditLog(
      'AUTO_GENERATE_ALL',
      `Sinkronisasi otomatis ${docsCount} dokumen administrasi dan ${indicatorsDone}/${activeIndicators.length} indikator siap cetak.`
    );
    setStatusMessage(
      `Otomatisasi selesai: ${docsCount} dokumen administrasi & ${indicatorsDone}/${activeIndicators.length} indikator siap cetak.`
    );
    return { docsCount, indicatorsDone };
  };

  const resetLocalToDefault = () => {
    localStorage.removeItem(LOCAL_SAAS_KEY);
    setStore(loadInitialStore());
    setStatusMessage('Data lokal berhasil dikembalikan ke preset default.');
  };

  return (
    <SaasContext.Provider
      value={{
        firebaseUser,
        authReady,
        isCloudConnected,
        isCloudSyncing,
        hasNoCloudInstitution,
        isSuperAdminAccount,
        isDemoRoleSwitcherAllowed,
        activeRole: store.activeRole,
        setActiveRole,
        activeMenu,
        setActiveMenu,
        signInWithGoogle,
        signOutUser,
        institutions: store.institutions,
        activeInstitution,
        setActiveInstitutionId,
        createInstitution,
        toggleInstitutionStatus,
        updateActiveInstitutionData,
        periods: institutionPeriods,
        activePeriod,
        setActivePeriodId,
        createPeriod,
        updatePeriodMeta,
        instrumentVersions: store.instrumentVersions,
        activeInstrumentVersion,
        activeIndicators,
        importInstrumentFromCsv,
        importInstrumentFromFile,
        activateInstrumentVersion,
        toggleSettingSheetVerified,
        masterAssessors: store.masterAssessors,
        saveMasterAssessor,
        deleteMasterAssessor,
        responses,
        saveIndicatorResponse,
        p1Scores,
        p2Scores,
        saveAssessorScore,
        saveAssessorScoresBatch,
        applyTargetsAndSyncAll,
        loadAttachmentPreset2026,
        setChecklistDocStatus,
        syncChecklistDocsFromScores,
        unlockAssessorScore,
        p1Note,
        p2Note,
        saveAssessorSummaryNote,
        recommendations,
        saveRecommendation,
        deleteRecommendation,
        generateRecommendationsFromAssessors,
        scoreHistory,
        evidenceFiles,
        uploadEvidence,
        updateEvidenceLinks,
        replaceEvidenceRevision,
        verifyEvidence,
        deleteEvidence,
        generatedDocs,
        saveGeneratedDoc,
        deleteGeneratedDoc,
        memberships: store.memberships.filter(
          (m) => m.institutionId === activeInstitution.institutionId
        ),
        teamInvitations: (store.teamInvitations || []).filter(
          (inv) => inv.institutionId === activeInstitution.institutionId
        ),
        addTeamMember,
        revokeTeamInvitation,
        auditLogs: store.auditLogs.filter(
          (l) => store.activeRole === 'SUPER_ADMIN' || l.institutionId === activeInstitution.institutionId
        ),
        notifications,
        statusMessage,
        setStatusMessage,
        autoSyncAllNow,
        pendingQuickPrint,
        setPendingQuickPrint,
        resetLocalToDefault,
      }}
    >
      {children}
    </SaasContext.Provider>
  );
};

export function useSaas() {
  const ctx = useContext(SaasContext);
  if (!ctx) {
    throw new Error('useSaas must be used inside SaasProvider');
  }
  return ctx;
}
