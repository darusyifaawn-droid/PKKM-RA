import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { DOCUMENT_TEMPLATES, MASTER_INDICATORS_V26 } from '../src/data/masterInstrumentV26';
import { getPresetRawScoreMap } from '../src/data/presetLampiran2026';
import { AssessorScoreRecord } from '../src/types/saas';
import {
  getComponentCodesForTemplate,
  parseExtractedPdfText,
  parseManualExcelWorkbook,
} from '../src/utils/manualPkkmImport';
import {
  computeAssessorSummary,
  computeDualAssessorRekap,
  distributeTargetScores,
  EXCEL_INCOMPLETE_WARNING,
  getPredikatKemenag,
} from '../src/utils/pkkmScoring';

function makeScores(
  role: 'PENILAI_1' | 'PENILAI_2',
  scoreVal: number,
  count: number = MASTER_INDICATORS_V26.length
): Record<string, AssessorScoreRecord> {
  const out: Record<string, AssessorScoreRecord> = {};
  MASTER_INDICATORS_V26.slice(0, count).forEach((ind) => {
    out[ind.id] = {
      institutionId: 'test-ra',
      periodId: 'test-ra_2026',
      indicatorId: ind.id,
      assessorId: 'tester',
      assessorRole: role,
      score: scoreVal,
      note: '',
      status: 'draft',
      authorizedUids: ['tester'],
    };
  });
  return out;
}

test('Master instrument contains exact 96 indicators (max score 384)', () => {
  assert.equal(MASTER_INDICATORS_V26.length, 96);
  const res = computeAssessorSummary('PENILAI_1', makeScores('PENILAI_1', 4));
  assert.equal(res.maxSkorTotal, 384);
  assert.equal(res.jumlahSkor, 384);
  assert.equal(res.nilaiKinerja, 100);
  assert.equal(res.isComplete, true);
  assert.equal(res.incompleteWarning, null);
});

test('Exact Kemenag predikat boundary thresholds (<=50, 50-60, 60-75, 75-90, >90)', () => {
  assert.equal(getPredikatKemenag(0).predikat, 'Kurang');
  assert.equal(getPredikatKemenag(50).predikat, 'Kurang');
  assert.equal(getPredikatKemenag(50.01).predikat, 'Sedang');
  assert.equal(getPredikatKemenag(60).predikat, 'Sedang');
  assert.equal(getPredikatKemenag(60.01).predikat, 'Cukup');
  assert.equal(getPredikatKemenag(75).predikat, 'Cukup');
  assert.equal(getPredikatKemenag(75.01).predikat, 'Baik');
  assert.equal(getPredikatKemenag(90).predikat, 'Baik');
  assert.equal(getPredikatKemenag(90.01).predikat, 'Amat Baik');
  assert.equal(getPredikatKemenag(100).predikat, 'Amat Baik');
});

test('Dual assessor final score gated until BOTH P1 and P2 score all 96 items', () => {
  const p1Full = makeScores('PENILAI_1', 4, 96);
  const p2Partial = makeScores('PENILAI_2', 4, 95);
  const partialRekap = computeDualAssessorRekap(p1Full, p2Partial);

  assert.equal(partialRekap.penilai1.isComplete, true);
  assert.equal(partialRekap.penilai2.isComplete, false);
  assert.equal(partialRekap.isBothComplete, false);
  assert.equal(partialRekap.finalNilaiKinerjaTahunan, null);
  assert.equal(partialRekap.finalPredikat, null);
  assert.equal(partialRekap.incompleteWarning, EXCEL_INCOMPLETE_WARNING);

  const p2Full = makeScores('PENILAI_2', 3, 96);
  const fullRekap = computeDualAssessorRekap(p1Full, p2Full);
  assert.equal(fullRekap.isBothComplete, true);
  assert.equal(fullRekap.incompleteWarning, null);
  assert.equal(fullRekap.jumlahSkorRataRata, 336);
  assert.equal(fullRekap.finalNilaiKinerjaTahunan, 87.5);
  assert.equal(fullRekap.finalPredikat, 'Baik');
});

test('distributeTargetScores fills exact 96 integer scores (1..4) matching target sums', () => {
  for (const pct of [0, 25, 50, 75, 88.5, 100]) {
    const map = distributeTargetScores({ mode: 'overall', targetPct: pct });
    const values = Object.values(map);
    assert.equal(values.length, 96);
    for (const v of values) {
      assert.ok(Number.isInteger(v) && v >= 1 && v <= 4);
    }
    const sum = values.reduce((a, b) => a + b, 0);
    const expectedSum = Math.min(384, Math.max(96, Math.round((pct / 100) * 384)));
    assert.equal(sum, expectedSum);
  }

  const byComp = distributeTargetScores({
    mode: 'by_component',
    targets: { K1: 100, K2: 75, K3: 50, K4: 25 },
  });
  assert.equal(Object.values(byComp).length, 96);
  const sumK1 = MASTER_INDICATORS_V26.filter((i) => i.komponenCode === 'K1').reduce(
    (a, i) => a + byComp[i.id],
    0
  );
  const sumK2 = MASTER_INDICATORS_V26.filter((i) => i.komponenCode === 'K2').reduce(
    (a, i) => a + byComp[i.id],
    0
  );
  const sumK3 = MASTER_INDICATORS_V26.filter((i) => i.komponenCode === 'K3').reduce(
    (a, i) => a + byComp[i.id],
    0
  );
  const sumK4 = MASTER_INDICATORS_V26.filter((i) => i.komponenCode === 'K4').reduce(
    (a, i) => a + byComp[i.id],
    0
  );
  assert.equal(sumK1, 100);
  assert.equal(sumK2, 123);
  assert.equal(sumK3, 38);
  assert.equal(sumK4, 11);
});

test('parseManualExcelWorkbook extracts metadata, checkmark grid P1/P2 scores, and checklist items', () => {
  const wb = XLSX.utils.book_new();
  const identSheet = XLSX.utils.aoa_to_sheet([
    ['Nama Madrasah / RA', 'RA HARAPAN BANGSA'],
    ['NSM', '101232090123'],
    ['Nama Kepala RA', 'Ustadzah Fatimah, S.Pd'],
    ['Nama Penilai 1', 'Drs. H. Ahmad'],
    ['Nama Penilai 2', 'Hj. Aminah, M.Pd'],
  ]);
  XLSX.utils.book_append_sheet(wb, identSheet, 'Identitas');

  const p1Sheet = XLSX.utils.aoa_to_sheet([
    ['Kode', 'Indikator', '1', '2', '3', '4'],
    ['1.1.1', 'Struktur organisasi', '', '', '', '✓'],
    ['2.1.1', 'RKJM dan RKT', '', '', '✓', ''],
  ]);
  XLSX.utils.book_append_sheet(wb, p1Sheet, 'NilaiPenilai1');

  const p2Sheet = XLSX.utils.aoa_to_sheet([
    ['Kode', 'Indikator', 'Skor'],
    ['1.1.1', 'Struktur organisasi', 3],
    ['2.1.1', 'RKJM dan RKT', 4],
  ]);
  XLSX.utils.book_append_sheet(wb, p2Sheet, 'NilaiPenilai2');

  const checklistSheet = XLSX.utils.aoa_to_sheet([
    ['No', 'Berkas Wajib', 'Status'],
    [1, 'SK Pembagian Tugas Guru dan Tendik', 'Lengkap'],
    [2, 'Program Supervisi Akademik Kepala RA', 'Terkumpul'],
  ]);
  XLSX.utils.book_append_sheet(wb, checklistSheet, 'Kelengkapan');

  const u8 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const parsed = parseManualExcelWorkbook(u8, 'PKKM_Manual_Test.xlsx');

  assert.equal(parsed.institutionPatch.namaLembaga, 'RA HARAPAN BANGSA');
  assert.equal(parsed.institutionPatch.nsm, '101232090123');
  assert.equal(parsed.principalPatch.namaLengkap, 'Ustadzah Fatimah, S.Pd');
  assert.equal(parsed.p1Scores['1.1.1'], 4);
  assert.equal(parsed.p1Scores['2.1.1'], 3);
  assert.equal(parsed.p2Scores['1.1.1'], 3);
  assert.equal(parsed.p2Scores['2.1.1'], 4);
  assert.ok(parsed.matchedTemplateIds.includes('kel-sk-tugas'));
  assert.ok(parsed.matchedTemplateIds.includes('spv-program'));
});

test('parseExtractedPdfText extracts indicator scores, component targets, and checklist items', () => {
  const sampleText = `
    Nama Madrasah : RA DARUSYIFA ARJAWINANGUN
    NSM : 101232090066
    Nama Kepala RA : Dewi Rahmawati, S.Pd
    1.1.1 Mampu mengembangkan struktur organisasi P1: 4 P2: 4
    1.1.2 Menempatkan personalia 3 4
    Komponen 1 Usaha Pengembangan 92.5% 90%
    Komponen 2 Pelaksanaan Tugas Manajerial 88% 86%
    Nilai Kinerja Tahunan 89.5% 88.0%
    [✓] SK Pembagian Tugas Guru dan Tendik Lengkap
    [✓] Penetapan Kalender Pendidikan RA Ada
  `;
  const parsed = parseExtractedPdfText(sampleText, 'rekap_pkkm_manual.pdf', MASTER_INDICATORS_V26, 2);
  assert.equal(parsed.institutionPatch.namaLembaga, 'RA DARUSYIFA ARJAWINANGUN');
  assert.equal(parsed.p1Scores['1.1.1'], 4);
  assert.equal(parsed.p2Scores['1.1.1'], 4);
  assert.equal(parsed.p1Scores['1.1.2'], 3);
  assert.equal(parsed.p2Scores['1.1.2'], 4);
  assert.equal(parsed.componentTargetsP1.K1, 92.5);
  assert.equal(parsed.componentTargetsP2.K1, 90);
  assert.equal(parsed.overallTargetP1, 89.5);
  assert.ok(parsed.matchedTemplateIds.includes('kel-sk-tugas'));
  assert.ok(parsed.matchedTemplateIds.includes('kel-kaldik'));
});

test('All 27 DOCUMENT_TEMPLATES resolve to valid component codes K1..K4', () => {
  assert.equal(DOCUMENT_TEMPLATES.length, 27);
  for (const tpl of DOCUMENT_TEMPLATES) {
    const codes = getComponentCodesForTemplate(tpl);
    assert.ok(codes.length >= 1);
    for (const c of codes) {
      assert.ok(['K1', 'K2', 'K3', 'K4'].includes(c));
    }
  }
});

test('Preset Lampiran 2026 produces exact PDF scores P1=289 (78,122,56,33) and P2=362 (93,158,73,38) -> 84.77 Baik', () => {
  const p1Raw = getPresetRawScoreMap('PENILAI_1', MASTER_INDICATORS_V26);
  const p2Raw = getPresetRawScoreMap('PENILAI_2', MASTER_INDICATORS_V26);

  const p1Recs: Record<string, AssessorScoreRecord> = {};
  const p2Recs: Record<string, AssessorScoreRecord> = {};
  for (const ind of MASTER_INDICATORS_V26) {
    p1Recs[ind.id] = {
      institutionId: 'ra-darusyifa-arjawinangun',
      periodId: 'ra-darusyifa-arjawinangun_2026',
      indicatorId: ind.id,
      assessorId: 'preset-p1',
      assessorRole: 'PENILAI_1',
      score: p1Raw[ind.id],
      note: '',
      status: 'finalized',
      authorizedUids: ['tester'],
    };
    p2Recs[ind.id] = {
      institutionId: 'ra-darusyifa-arjawinangun',
      periodId: 'ra-darusyifa-arjawinangun_2026',
      indicatorId: ind.id,
      assessorId: 'preset-p2',
      assessorRole: 'PENILAI_2',
      score: p2Raw[ind.id],
      note: '',
      status: 'finalized',
      authorizedUids: ['tester'],
    };
  }

  const rekap = computeDualAssessorRekap(p1Recs, p2Recs, MASTER_INDICATORS_V26);
  assert.equal(rekap.penilai1.jumlahSkor, 289);
  assert.deepEqual(
    rekap.penilai1.components.map((c) => c.rawScore),
    [78, 122, 56, 33]
  );
  assert.equal(Math.round(rekap.penilai1.nilaiKinerja), 75);

  assert.equal(rekap.penilai2.jumlahSkor, 362);
  assert.deepEqual(
    rekap.penilai2.components.map((c) => c.rawScore),
    [93, 158, 73, 38]
  );
  assert.equal(Math.round(rekap.penilai2.nilaiKinerja), 94);

  assert.equal(rekap.jumlahSkorRataRata, 325.5);
  assert.ok(rekap.finalNilaiKinerjaTahunan !== null);
  assert.equal(rekap.finalNilaiKinerjaTahunan.toFixed(2), '84.77');
  assert.equal(rekap.finalPredikat, 'Baik');
});

test('distributeTargetScores supports overall_raw and by_raw_component exact totals', () => {
  const dist289 = distributeTargetScores({ mode: 'overall_raw', targetRawTotal: 289 });
  assert.equal(Object.keys(dist289).length, 96);
  assert.equal(
    Object.values(dist289).reduce((a, b) => a + b, 0),
    289
  );

  const distByComp = distributeTargetScores({
    mode: 'by_raw_component',
    rawTargets: { K1: 93, K2: 158, K3: 73, K4: 38 },
  });
  assert.equal(
    Object.values(distByComp).reduce((a, b) => a + b, 0),
    362
  );
  const sumComp = (code: 'K1' | 'K2' | 'K3' | 'K4') =>
    MASTER_INDICATORS_V26.filter((i) => i.komponenCode === code).reduce(
      (s, i) => s + distByComp[i.id],
      0
    );
  assert.equal(sumComp('K1'), 93);
  assert.equal(sumComp('K2'), 158);
  assert.equal(sumComp('K3'), 73);
  assert.equal(sumComp('K4'), 38);
});


