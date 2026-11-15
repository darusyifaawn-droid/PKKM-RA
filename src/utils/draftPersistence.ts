import {
  CompanyProfilePptConfig,
  EvaluatorProfile,
  InstitutionProfile,
  PpkmData,
  PrincipalProfile,
} from '../types/ppkm';
import { SaasMenuKey } from '../types/saas';

export const ACTIVE_MENU_STORAGE_KEY = 'PKKM_RA_ACTIVE_MENU_V1';
export const QUICK_STEP_STORAGE_KEY = 'PKKM_RA_QUICK_STEP_V1';
export const PPT_UI_STORAGE_PREFIX = 'PKKM_RA_PPT_UI_V1_';
export const PPT_DRAFT_STORAGE_PREFIX = 'PKKM_RA_PPT_DRAFT_V1_';
export const QUICK_DRAFT_STORAGE_PREFIX = 'PKKM_RA_QUICK_DRAFT_V1_';

export const ALLOWED_MENU_KEYS: readonly SaasMenuKey[] = [
  'mode_cepat',
  'company_profile_ppt',
  'dashboard',
  'profil_lembaga',
  'data_kepala',
  'data_guru',
  'data_penilai',
  'periode_pkkm',
  'instrumen_penilaian',
  'administrasi_dokumen',
  'program_kerja',
  'bukti_fisik',
  'pemeriksaan_kelengkapan',
  'penilaian_1',
  'penilaian_2',
  'hasil_penilaian',
  'rekap_nilai',
  'rekomendasi_rtl',
  'laporan_pkkm',
  'arsip_tahunan',
  'audit_log',
  'pengaturan',
  'ai_assistant',
];

const ALLOWED_MENU_SET = new Set<string>(ALLOWED_MENU_KEYS);

export type QuickStepNumber = 1 | 2 | 3 | 4;

export type PptQuickEditTab =
  | 'sampul'
  | 'identitas'
  | 'sdm_sarpras'
  | 'tantangan_juknis'
  | 'program_galeri'
  | 'ppdb_penutup';

const ALLOWED_PPT_TABS = new Set<string>([
  'sampul',
  'identitas',
  'sdm_sarpras',
  'tantangan_juknis',
  'program_galeri',
  'ppdb_penutup',
]);

export interface PersistedPptUiState {
  activeTab: PptQuickEditTab;
  activeSlideIndex: number;
  viewMode: 'single' | 'grid';
}

export interface PptDraftEnvelope {
  institutionId: string;
  updatedAt: number;
  ppkmDraft: PpkmData;
  pptConfig: CompanyProfilePptConfig;
}

export interface QuickDraftEnvelope {
  institutionId: string;
  updatedAt: number;
  evalDraft: EvaluatorProfile;
  instDraft: InstitutionProfile;
  principalDraft: PrincipalProfile;
  yayasanDraft: string;
}

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

function resolveStorage(customStorage?: StorageLike | null): StorageLike | null {
  if (customStorage) return customStorage;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function isValidMenuKey(val: unknown): val is SaasMenuKey {
  return typeof val === 'string' && ALLOWED_MENU_SET.has(val);
}

export function loadPersistedMenu(customStorage?: StorageLike | null): SaasMenuKey {
  const storage = resolveStorage(customStorage);
  if (!storage) return 'mode_cepat';
  try {
    const raw = storage.getItem(ACTIVE_MENU_STORAGE_KEY);
    if (isValidMenuKey(raw)) return raw;
  } catch {
    // ignore storage errors
  }
  return 'mode_cepat';
}

export function savePersistedMenu(
  menu: SaasMenuKey,
  customStorage?: StorageLike | null
): void {
  const storage = resolveStorage(customStorage);
  if (!storage) return;
  try {
    storage.setItem(ACTIVE_MENU_STORAGE_KEY, menu);
  } catch {
    // ignore quota errors
  }
}

export function loadPersistedQuickStep(
  customStorage?: StorageLike | null
): QuickStepNumber {
  const storage = resolveStorage(customStorage);
  if (!storage) return 1;
  try {
    const raw = storage.getItem(QUICK_STEP_STORAGE_KEY);
    const num = Number(raw);
    if (num === 1 || num === 2 || num === 3 || num === 4) {
      return num;
    }
  } catch {
    // ignore
  }
  return 1;
}

export function savePersistedQuickStep(
  step: QuickStepNumber,
  customStorage?: StorageLike | null
): void {
  const storage = resolveStorage(customStorage);
  if (!storage) return;
  try {
    storage.setItem(QUICK_STEP_STORAGE_KEY, String(step));
  } catch {
    // ignore
  }
}

export function loadPersistedPptUiState(
  institutionId: string,
  customStorage?: StorageLike | null
): PersistedPptUiState {
  const fallback: PersistedPptUiState = {
    activeTab: 'sampul',
    activeSlideIndex: 0,
    viewMode: 'single',
  };
  const storage = resolveStorage(customStorage);
  if (!storage || !institutionId) return fallback;
  try {
    const raw = storage.getItem(`${PPT_UI_STORAGE_PREFIX}${institutionId}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedPptUiState>;
    const activeTab =
      typeof parsed.activeTab === 'string' && ALLOWED_PPT_TABS.has(parsed.activeTab)
        ? (parsed.activeTab as PptQuickEditTab)
        : 'sampul';
    const rawIndex = Number(parsed.activeSlideIndex);
    const activeSlideIndex =
      Number.isInteger(rawIndex) && rawIndex >= 0 && rawIndex <= 11 ? rawIndex : 0;
    const viewMode = parsed.viewMode === 'grid' ? 'grid' : 'single';
    return { activeTab, activeSlideIndex, viewMode };
  } catch {
    return fallback;
  }
}

export function savePersistedPptUiState(
  institutionId: string,
  state: PersistedPptUiState,
  customStorage?: StorageLike | null
): void {
  const storage = resolveStorage(customStorage);
  if (!storage || !institutionId) return;
  try {
    storage.setItem(`${PPT_UI_STORAGE_PREFIX}${institutionId}`, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function loadPptDraft(
  institutionId: string,
  customStorage?: StorageLike | null
): PptDraftEnvelope | null {
  const storage = resolveStorage(customStorage);
  if (!storage || !institutionId) return null;
  try {
    const raw = storage.getItem(`${PPT_DRAFT_STORAGE_PREFIX}${institutionId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PptDraftEnvelope>;
    if (
      parsed &&
      parsed.institutionId === institutionId &&
      parsed.ppkmDraft &&
      parsed.pptConfig
    ) {
      return {
        institutionId: parsed.institutionId,
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
        ppkmDraft: parsed.ppkmDraft,
        pptConfig: parsed.pptConfig,
      };
    }
  } catch {
    // ignore malformed draft
  }
  return null;
}

export function savePptDraft(
  envelope: PptDraftEnvelope,
  customStorage?: StorageLike | null
): boolean {
  const storage = resolveStorage(customStorage);
  if (!storage || !envelope.institutionId) return false;
  try {
    storage.setItem(
      `${PPT_DRAFT_STORAGE_PREFIX}${envelope.institutionId}`,
      JSON.stringify(envelope)
    );
    return true;
  } catch {
    return false;
  }
}

export function clearPptDraft(
  institutionId: string,
  customStorage?: StorageLike | null
): void {
  const storage = resolveStorage(customStorage);
  if (!storage || !institutionId) return;
  try {
    storage.removeItem(`${PPT_DRAFT_STORAGE_PREFIX}${institutionId}`);
  } catch {
    // ignore
  }
}

export function loadQuickDraft(
  institutionId: string,
  customStorage?: StorageLike | null
): QuickDraftEnvelope | null {
  const storage = resolveStorage(customStorage);
  if (!storage || !institutionId) return null;
  try {
    const raw = storage.getItem(`${QUICK_DRAFT_STORAGE_PREFIX}${institutionId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QuickDraftEnvelope>;
    if (
      parsed &&
      parsed.institutionId === institutionId &&
      parsed.evalDraft &&
      parsed.instDraft &&
      parsed.principalDraft
    ) {
      return {
        institutionId: parsed.institutionId,
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
        evalDraft: parsed.evalDraft,
        instDraft: parsed.instDraft,
        principalDraft: parsed.principalDraft,
        yayasanDraft: typeof parsed.yayasanDraft === 'string' ? parsed.yayasanDraft : '',
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveQuickDraft(
  envelope: QuickDraftEnvelope,
  customStorage?: StorageLike | null
): boolean {
  const storage = resolveStorage(customStorage);
  if (!storage || !envelope.institutionId) return false;
  try {
    storage.setItem(
      `${QUICK_DRAFT_STORAGE_PREFIX}${envelope.institutionId}`,
      JSON.stringify(envelope)
    );
    return true;
  } catch {
    return false;
  }
}

export function clearQuickDraft(
  institutionId: string,
  customStorage?: StorageLike | null
): void {
  const storage = resolveStorage(customStorage);
  if (!storage || !institutionId) return;
  try {
    storage.removeItem(`${QUICK_DRAFT_STORAGE_PREFIX}${institutionId}`);
  } catch {
    // ignore
  }
}

export function formatClockTimeId(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
