import { PpkmData } from './ppkm';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN_LEMBAGA'
  | 'KEPALA_RA'
  | 'PENILAI_1'
  | 'PENILAI_2';

export type SaasMenuKey =
  | 'mode_cepat'
  | 'company_profile_ppt'
  | 'dashboard'
  | 'profil_lembaga'
  | 'data_kepala'
  | 'data_guru'
  | 'data_penilai'
  | 'periode_pkkm'
  | 'instrumen_penilaian'
  | 'administrasi_dokumen'
  | 'program_kerja'
  | 'bukti_fisik'
  | 'pemeriksaan_kelengkapan'
  | 'penilaian_1'
  | 'penilaian_2'
  | 'hasil_penilaian'
  | 'rekap_nilai'
  | 'rekomendasi_rtl'
  | 'laporan_pkkm'
  | 'arsip_tahunan'
  | 'audit_log'
  | 'pengaturan'
  | 'ai_assistant';

export interface InstitutionTenant {
  institutionId: string;
  name: string;
  nsm: string;
  npsn: string;
  status: 'active' | 'inactive';
  expiresAt?: string;
  ownerUid: string;
  authorizedUids: string[];
  profileData: PpkmData;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MembershipRecord {
  membershipId: string;
  uid: string;
  institutionId: string;
  displayName: string;
  userEmail: string;
  role: UserRole;
  status: 'active' | 'inactive';
  inviteId?: string;
  authorizedUids?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TeamInvitationRecord {
  inviteId: string;
  institutionId: string;
  institutionName?: string;
  invitedEmail: string;
  displayName: string;
  role: Exclude<UserRole, 'SUPER_ADMIN'>;
  status: 'pending' | 'claimed' | 'revoked';
  invitedBy: string;
  claimedByUid?: string;
  claimedAt?: unknown;
  authorizedUids: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MasterAssessorRecord {
  assessorId: string;
  nama: string;
  nip: string;
  pangkatGol: string;
  jabatan: string;
  unitKerja: string;
  noSk?: string;
  tanggalSk?: string;
  berlakuSampai?: string;
  status: 'active' | 'inactive';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AssessmentPeriodRecord {
  periodId: string;
  institutionId: string;
  yearLabel: string;
  startDate: string;
  endDate: string;
  instrumentVersionId: string;
  status: 'draft' | 'in_progress' | 'finalized' | 'archived';
  p1Finalized: boolean;
  p2Finalized: boolean;
  formulaVerified: boolean;
  lastActiveIndicatorId?: string;
  authorizedUids: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MasterIndicatorDef {
  id: string; // e.g. '1.1.1'
  komponenCode: 'K1' | 'K2' | 'K3' | 'K4';
  komponenNomor: number;
  komponenNama: string;
  subKomponenKode: string; // e.g. '1.1'
  subKomponenNama: string;
  indikatorNomor: string; // e.g. '1.)'
  indikatorNama: string;
  dataDiharapkan: string;
  buktiWajib: string[];
  bobot: number;
}

export interface ExcelSettingSummary {
  detectedSheets: string[];
  indicatorSheetUsed: string;
  settingEntries: { key: string; value: string; formula?: string }[];
  rekapFormulas: { cell: string; label: string; formula: string }[];
  requiresManualVerification: boolean;
}

export interface InstrumentVersionRecord {
  versionId: string;
  versionNumber: string;
  title: string;
  sourceFile: string;
  changelog: string;
  isActive: boolean;
  settingSheetVerified: boolean;
  anomalies?: string[];
  settingSummary?: ExcelSettingSummary;
  indicators: MasterIndicatorDef[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface IndicatorResponseRecord {
  responseId: string;
  institutionId: string;
  periodId: string;
  indicatorId: string;
  komponenCode: string;
  kepalaNote: string;
  completionStatus: 'empty' | 'draft' | 'complete';
  checkedEvidences: string[];
  updatedBy: string;
  authorizedUids: string[];
  updatedAt?: unknown;
}

export interface AssessorScoreRecord {
  institutionId: string;
  periodId: string;
  indicatorId: string;
  assessorId: string;
  assessorRole: 'PENILAI_1' | 'PENILAI_2';
  score: number; // 1..4
  note: string;
  checkedEvidenceIds?: string[];
  status: 'draft' | 'finalized';
  authorizedUids: string[];
  updatedAt?: unknown;
}

export interface AssessorNoteRecord {
  institutionId: string;
  periodId: string;
  assessorId: string;
  assessorRole: 'PENILAI_1' | 'PENILAI_2';
  recommendation: string;
  finalized: boolean;
  authorizedUids: string[];
  updatedAt?: unknown;
}

export interface RecommendationItemRecord {
  recId: string;
  institutionId: string;
  periodId: string;
  sourceRole: 'PENILAI_1' | 'PENILAI_2' | 'GABUNGAN';
  komponenNama: string;
  temuan: string;
  rekomendasi: string;
  rencanaTindakLanjut: string;
  penanggungJawab: string;
  targetWaktu: string;
  status: 'DRAFT' | 'APPROVED';
  authorizedUids: string[];
  updatedAt?: unknown;
}

export interface ScoreHistoryRecord {
  historyId: string;
  institutionId: string;
  periodId: string;
  indicatorId: string;
  assessorRole: 'PENILAI_1' | 'PENILAI_2';
  actorUid: string;
  actorName: string;
  oldScore: number | null;
  newScore: number | null;
  reason: string;
  actionType: 'SCORE_CHANGE' | 'LOCK' | 'UNLOCK';
  authorizedUids: string[];
  createdAt?: unknown;
}

export type DocumentCategory =
  | 'ADMINISTRASI KELEMBAGAAN'
  | 'ADMINISTRASI MANAJERIAL'
  | 'ADMINISTRASI KEWIRAUSAHAAN'
  | 'ADMINISTRASI SUPERVISI'
  | 'ADMINISTRASI PENDUKUNG';

export interface DocumentTemplateDef {
  templateId: string;
  category: DocumentCategory;
  title: string;
  description: string;
  relatedKomponen: string;
}

export interface GeneratedDocRecord {
  docId: string;
  institutionId: string;
  periodId: string;
  templateId?: string;
  category: DocumentCategory | string;
  title: string;
  docNumber: string;
  bodyContent: string;
  status: 'DRAFT' | 'APPROVED';
  createdBy: string;
  authorizedUids: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type EvidenceVerificationStatus =
  | 'not_uploaded'
  | 'uploaded'
  | 'pending'
  | 'needs_revision'
  | 'verified';

export interface EvidenceRevisionEntry {
  version: number;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
  note?: string;
}

export interface EvidenceFileRecord {
  evidenceId: string;
  institutionId: string;
  periodId: string;
  indicatorId: string; // Primary linked indicator for compatibility
  linkedIndicatorIds?: string[]; // Multi-indicator linking without file duplication
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath?: string;
  downloadUrl?: string;
  localPreviewUrl?: string;
  description: string;
  verificationStatus: EvidenceVerificationStatus;
  verificationNote?: string;
  revisionHistory?: EvidenceRevisionEntry[];
  uploadedBy: string;
  authorizedUids: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuditLogRecord {
  logId?: string;
  institutionId: string;
  periodId?: string;
  actorUid: string;
  actorRole: string;
  action: string;
  summary: string;
  authorizedUids: string[];
  createdAt?: unknown;
}
