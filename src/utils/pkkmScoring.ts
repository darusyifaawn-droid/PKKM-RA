import { MASTER_COMPONENTS, MASTER_INDICATORS_V26 } from '../data/masterInstrumentV26';
import { AssessorScoreRecord, MasterIndicatorDef } from '../types/saas';

export const EXCEL_INCOMPLETE_WARNING =
  'CEK KEMBALI INSTRUMEN PENILAIAN, MASIH TERDAPAT POINT YANG BELUM DINILAI !!!';

export interface ComponentScoreSummary {
  komponenCode: 'K1' | 'K2' | 'K3' | 'K4';
  komponenNomor: number;
  komponenNama: string;
  indicatorCount: number;
  scoredCount: number;
  rawScore: number;
  maxScore: number;
  averageScale4: number;
  nilaiSkala100: number;
}

export interface AssessorSummaryResult {
  role: 'PENILAI_1' | 'PENILAI_2';
  components: ComponentScoreSummary[];
  totalIndicators: number;
  scoredIndicators: number;
  unscoredIndicators: number;
  jumlahSkor: number;
  maxSkorTotal: number;
  nilaiKinerja: number; // 0 - 100
  isComplete: boolean;
  incompleteWarning: string | null;
}

export interface DualAssessorRekapResult {
  penilai1: AssessorSummaryResult;
  penilai2: AssessorSummaryResult;
  rataRataKomponen: {
    komponenCode: 'K1' | 'K2' | 'K3' | 'K4';
    komponenNomor: number;
    komponenNama: string;
    indicatorCount: number;
    maxSkor: number;
    p1Skor: number;
    p2Skor: number;
    rataSkor: number;
    p1Nilai100: number;
    p2Nilai100: number;
    rataNilai100: number;
  }[];
  jumlahSkorRataRata: number;
  nilaiKinerjaTahunan: number;
  predikat: string;
  predikatDetail: string;
  isBothComplete: boolean;
  finalNilaiKinerjaTahunan: number | null;
  finalPredikat: string | null;
  finalPredikatDetail: string | null;
  incompleteWarning: string | null;
  formulaVerificationNotice: string;
}

/**
 * Exact Section I Kemenag Predikat Thresholds:
 * - nilai <= 50        -> Kurang
 * - 50 < nilai <= 60   -> Sedang
 * - 60 < nilai <= 75   -> Cukup
 * - 75 < nilai <= 90   -> Baik
 * - 90 < nilai <= 100  -> Amat Baik
 */
export function getPredikatKemenag(nilai: number): { predikat: string; detail: string } {
  const rounded = Math.round(nilai * 100) / 100;
  if (rounded > 90) {
    return { predikat: 'Amat Baik', detail: '90,01 – 100,00 (Amat Baik)' };
  }
  if (rounded > 75) {
    return { predikat: 'Baik', detail: '75,01 – 90,00 (Baik)' };
  }
  if (rounded > 60) {
    return { predikat: 'Cukup', detail: '60,01 – 75,00 (Cukup)' };
  }
  if (rounded > 50) {
    return { predikat: 'Sedang', detail: '50,01 – 60,00 (Sedang)' };
  }
  return { predikat: 'Kurang', detail: '≤ 50,00 (Kurang)' };
}

export function computeAssessorSummary(
  role: 'PENILAI_1' | 'PENILAI_2',
  scoresByIndicator: Record<string, AssessorScoreRecord>,
  indicators: MasterIndicatorDef[] = MASTER_INDICATORS_V26
): AssessorSummaryResult {
  const components: ComponentScoreSummary[] = MASTER_COMPONENTS.map((comp) => {
    const compIndicators = indicators.filter((ind) => ind.komponenCode === comp.code);
    let scoredCount = 0;
    let rawScore = 0;
    for (const ind of compIndicators) {
      const rec = scoresByIndicator[ind.id];
      if (rec && rec.score >= 1 && rec.score <= 4) {
        scoredCount += 1;
        rawScore += rec.score;
      }
    }
    const maxScore = compIndicators.length * 4;
    const averageScale4 = compIndicators.length > 0 ? rawScore / compIndicators.length : 0;
    const nilaiSkala100 = maxScore > 0 ? (rawScore / maxScore) * 100 : 0;

    return {
      komponenCode: comp.code,
      komponenNomor: comp.nomor,
      komponenNama: comp.nama,
      indicatorCount: compIndicators.length,
      scoredCount,
      rawScore,
      maxScore,
      averageScale4,
      nilaiSkala100,
    };
  });

  const totalIndicators = indicators.length;
  const scoredIndicators = components.reduce((s, c) => s + c.scoredCount, 0);
  const jumlahSkor = components.reduce((s, c) => s + c.rawScore, 0);
  const maxSkorTotal = totalIndicators * 4;
  const nilaiKinerja = maxSkorTotal > 0 ? (jumlahSkor / maxSkorTotal) * 100 : 0;
  const isComplete = scoredIndicators === totalIndicators && totalIndicators > 0;

  return {
    role,
    components,
    totalIndicators,
    scoredIndicators,
    unscoredIndicators: totalIndicators - scoredIndicators,
    jumlahSkor,
    maxSkorTotal,
    nilaiKinerja,
    isComplete,
    incompleteWarning: isComplete ? null : EXCEL_INCOMPLETE_WARNING,
  };
}

export function computeDualAssessorRekap(
  p1Scores: Record<string, AssessorScoreRecord>,
  p2Scores: Record<string, AssessorScoreRecord>,
  indicators: MasterIndicatorDef[] = MASTER_INDICATORS_V26
): DualAssessorRekapResult {
  const penilai1 = computeAssessorSummary('PENILAI_1', p1Scores, indicators);
  const penilai2 = computeAssessorSummary('PENILAI_2', p2Scores, indicators);

  const rataRataKomponen = MASTER_COMPONENTS.map((comp, idx) => {
    const c1 = penilai1.components[idx];
    const c2 = penilai2.components[idx];
    return {
      komponenCode: comp.code,
      komponenNomor: comp.nomor,
      komponenNama: comp.nama,
      indicatorCount: c1.indicatorCount,
      maxSkor: c1.maxScore,
      p1Skor: c1.rawScore,
      p2Skor: c2.rawScore,
      rataSkor: (c1.rawScore + c2.rawScore) / 2,
      p1Nilai100: c1.nilaiSkala100,
      p2Nilai100: c2.nilaiSkala100,
      rataNilai100: (c1.nilaiSkala100 + c2.nilaiSkala100) / 2,
    };
  });

  const jumlahSkorRataRata = (penilai1.jumlahSkor + penilai2.jumlahSkor) / 2;
  const nilaiKinerjaTahunan = (penilai1.nilaiKinerja + penilai2.nilaiKinerja) / 2;
  const { predikat, detail } = getPredikatKemenag(nilaiKinerjaTahunan);

  const isBothComplete = penilai1.isComplete && penilai2.isComplete;

  return {
    penilai1,
    penilai2,
    rataRataKomponen,
    jumlahSkorRataRata,
    nilaiKinerjaTahunan,
    predikat,
    predikatDetail: detail,
    isBothComplete,
    finalNilaiKinerjaTahunan: isBothComplete ? nilaiKinerjaTahunan : null,
    finalPredikat: isBothComplete ? predikat : null,
    finalPredikatDetail: isBothComplete ? detail : null,
    incompleteWarning: isBothComplete ? null : EXCEL_INCOMPLETE_WARNING,
    formulaVerificationNotice:
      'PERLU VERIFIKASI EXCEL: Perhitungan menggunakan (Jumlah Skor / 384) × 100 & rata-rata kedua penilai sesuai instrumen 96 butir PKKM_v.26. Pastikan cocok dengan rumus sheet "Setting" pada file .xlsm asli sebelum finalisasi.',
  };
}

export type TargetDistributionInput =
  | { mode: 'uniform_scale'; scale: 1 | 2 | 3 | 4 }
  | { mode: 'overall'; targetPct: number }
  | { mode: 'overall_raw'; targetRawTotal: number }
  | {
      mode: 'by_component';
      targets: Record<'K1' | 'K2' | 'K3' | 'K4', number>;
    }
  | {
      mode: 'by_raw_component';
      rawTargets: Record<'K1' | 'K2' | 'K3' | 'K4', number>;
    };

function distributeSumAcrossCount(targetSum: number, count: number): number[] {
  if (count <= 0) return [];
  const clampedSum = Math.min(count * 4, Math.max(count, Math.round(targetSum)));
  const base = Math.floor(clampedSum / count);
  const rem = clampedSum % count;
  return Array.from({ length: count }, (_, idx) => (idx < rem ? Math.min(4, base + 1) : base));
}

/**
 * Menghasilkan peta skor integer (1..4) untuk seluruh 96 indikator secara deterministik
 * dari target nilai keseluruhan (0..100), target skor mentah (96..384),
 * target per komponen (K1..K4), atau skala seragam 1..4.
 */
export function distributeTargetScores(
  input: TargetDistributionInput,
  indicators: MasterIndicatorDef[] = MASTER_INDICATORS_V26
): Record<string, number> {
  const result: Record<string, number> = {};
  if (indicators.length === 0) return result;

  if (input.mode === 'uniform_scale') {
    const val = Math.min(4, Math.max(1, Math.round(input.scale)));
    for (const ind of indicators) {
      result[ind.id] = val;
    }
    return result;
  }

  const grouped = MASTER_COMPONENTS.map((comp) => ({
    code: comp.code,
    items: indicators.filter((ind) => ind.komponenCode === comp.code),
  }));

  if (input.mode === 'by_component') {
    for (const group of grouped) {
      const pct = Math.min(100, Math.max(0, Number(input.targets[group.code]) || 0));
      const targetRaw = Math.round((pct / 100) * (group.items.length * 4));
      const dist = distributeSumAcrossCount(targetRaw, group.items.length);
      group.items.forEach((ind, idx) => {
        result[ind.id] = dist[idx];
      });
    }
    return result;
  }

  if (input.mode === 'by_raw_component') {
    for (const group of grouped) {
      const targetRaw = Math.round(Number(input.rawTargets[group.code]) || group.items.length);
      const dist = distributeSumAcrossCount(targetRaw, group.items.length);
      group.items.forEach((ind, idx) => {
        result[ind.id] = dist[idx];
      });
    }
    return result;
  }

  // mode === 'overall' or 'overall_raw'
  const totalCount = indicators.length;
  const maxTotal = totalCount * 4;
  const targetGlobalRaw =
    input.mode === 'overall_raw'
      ? Math.min(maxTotal, Math.max(totalCount, Math.round(Number(input.targetRawTotal) || totalCount)))
      : Math.min(
          maxTotal,
          Math.max(totalCount, Math.round(((Math.min(100, Math.max(0, Number(input.targetPct) || 0))) / 100) * maxTotal))
        );

  const ideals = grouped.map((g) => {
    const exact = totalCount > 0 ? (targetGlobalRaw * g.items.length) / totalCount : 0;
    const floored = Math.min(g.items.length * 4, Math.max(g.items.length, Math.floor(exact)));
    return {
      group: g,
      floored,
      frac: exact - Math.floor(exact),
    };
  });

  let currentSum = ideals.reduce((acc, item) => acc + item.floored, 0);
  const byFracDesc = [...ideals].sort((a, b) => b.frac - a.frac);

  while (currentSum < targetGlobalRaw) {
    let progressed = false;
    for (const entry of byFracDesc) {
      if (currentSum >= targetGlobalRaw) break;
      if (entry.floored < entry.group.items.length * 4) {
        entry.floored += 1;
        currentSum += 1;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  while (currentSum > targetGlobalRaw) {
    let progressed = false;
    for (const entry of [...byFracDesc].reverse()) {
      if (currentSum <= targetGlobalRaw) break;
      if (entry.floored > entry.group.items.length) {
        entry.floored -= 1;
        currentSum -= 1;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  for (const entry of ideals) {
    const dist = distributeSumAcrossCount(entry.floored, entry.group.items.length);
    entry.group.items.forEach((ind, idx) => {
      result[ind.id] = dist[idx];
    });
  }

  return result;
}


