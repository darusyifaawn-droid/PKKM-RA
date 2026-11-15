import { MASTER_INDICATORS_V26 } from './masterInstrumentV26';
import { AssessorScoreRecord, MasterIndicatorDef } from '../types/saas';

/**
 * Skor pasti per indikator Penilai 1 & Penilai 2 sesuai dokumen lampiran PDF 53 halaman
 * RA Darusyifa Arjawinangun Tahun 2026:
 * - Penilai 1: K1=78, K2=122, K3=56, K4=33 -> Jumlah Skor=289, Nilai Kinerja=75 (75,26)
 * - Penilai 2: K1=93, K2=158, K3=73, K4=38 -> Jumlah Skor=362, Nilai Kinerja=94 (94,27)
 * - Rekapitulasi: Rata-rata Skor=325,50, Nilai Kinerja Tahunan=84,77 (Baik)
 */
const P1_OVERRIDES: Record<string, number> = {
  '1.2.2': 4,
  '1.2.3': 4,
  '1.2.4': 4,
  '2.10.2': 2,
  '3.4.3': 2,
};

const P2_SCORE_TWO = new Set(['1.1.1']);
const P2_SCORE_THREE = new Set([
  '1.1.3',
  '1.2.1',
  '1.2.3',
  '1.3.1',
  '1.3.2',
  '2.2.2',
  '2.3.2',
  '2.4.1',
  '2.4.4',
  '2.8.2',
  '2.9.3',
  '3.1.4',
  '3.4.1',
  '3.5.3',
  '4.2.3',
  '4.2.4',
  '4.3.1',
  '4.3.2',
  '4.3.3',
  '4.3.4',
]);

export function getPresetRawScoreMap(
  role: 'PENILAI_1' | 'PENILAI_2',
  indicators: MasterIndicatorDef[] = MASTER_INDICATORS_V26
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const ind of indicators) {
    if (role === 'PENILAI_1') {
      out[ind.id] = P1_OVERRIDES[ind.id] ?? 3;
    } else {
      if (P2_SCORE_TWO.has(ind.id)) out[ind.id] = 2;
      else if (P2_SCORE_THREE.has(ind.id)) out[ind.id] = 3;
      else out[ind.id] = 4;
    }
  }
  return out;
}

export function buildPresetScoresForPeriod(
  institutionId: string,
  periodId: string,
  assessorUid: string,
  authorizedUids: string[],
  indicators: MasterIndicatorDef[] = MASTER_INDICATORS_V26
): {
  p1Scores: Record<string, AssessorScoreRecord>;
  p2Scores: Record<string, AssessorScoreRecord>;
} {
  const p1Raw = getPresetRawScoreMap('PENILAI_1', indicators);
  const p2Raw = getPresetRawScoreMap('PENILAI_2', indicators);
  const nowIso = new Date().toISOString();

  const p1Scores: Record<string, AssessorScoreRecord> = {};
  const p2Scores: Record<string, AssessorScoreRecord> = {};

  for (const ind of indicators) {
    p1Scores[ind.id] = {
      institutionId,
      periodId,
      indicatorId: ind.id,
      assessorId: assessorUid,
      assessorRole: 'PENILAI_1',
      score: p1Raw[ind.id] ?? 3,
      note: '',
      checkedEvidenceIds: [],
      status: 'draft',
      authorizedUids,
      updatedAt: nowIso,
    };
    p2Scores[ind.id] = {
      institutionId,
      periodId,
      indicatorId: ind.id,
      assessorId: assessorUid,
      assessorRole: 'PENILAI_2',
      score: p2Raw[ind.id] ?? 4,
      note: '',
      checkedEvidenceIds: [],
      status: 'draft',
      authorizedUids,
      updatedAt: nowIso,
    };
  }

  return { p1Scores, p2Scores };
}
