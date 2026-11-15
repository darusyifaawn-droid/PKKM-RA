import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { DEFAULT_PPKM_DATA } from '../src/data/defaultPpkmData';
import { createCleanPpkmData } from '../src/data/cleanPpkmFactory';
import {
  buildAutoCompanyProfilePptConfig,
  exportCompanyProfileToPptxBuffer,
  formatRtlEntry,
  mergeCompanyProfilePptConfig,
  normalizeEmailHref,
  normalizeExternalUrl,
  normalizeSocialUrl,
  normalizeWhatsappUrl,
} from '../src/utils/companyProfilePpt';

test('URL, WhatsApp, Email & Social normalizers produce valid clickable hrefs', () => {
  assert.equal(normalizeExternalUrl('radarusyifa.sch.id'), 'https://radarusyifa.sch.id');
  assert.equal(normalizeExternalUrl('https://portal.ra.id/siswa'), 'https://portal.ra.id/siswa');
  assert.equal(normalizeExternalUrl('-'), null);
  assert.equal(normalizeWhatsappUrl('085224344445'), 'https://wa.me/6285224344445');
  assert.equal(normalizeEmailHref('darusyifa.awn@gmail.com'), 'mailto:darusyifa.awn@gmail.com');
  assert.equal(normalizeSocialUrl('instagram', '@ra_darusyifa'), 'https://instagram.com/ra_darusyifa');
  assert.equal(normalizeSocialUrl('tiktok', '@ra_darusyifa'), 'https://www.tiktok.com/@ra_darusyifa');
});

test('formatRtlEntry handles both string and structured SwotRtlItem', () => {
  assert.equal(formatRtlEntry('Pemasangan kanopi'), 'Pemasangan kanopi');
  assert.equal(
    formatRtlEntry({
      fokusProgram: 'Digitalisasi Portal',
      langkahKonkret: 'Aktifkan PPDB Online',
      targetWaktu: 'Semester Genap',
      penanggungJawab: 'Kepala RA',
    }),
    'Digitalisasi Portal — Aktifkan PPDB Online (Semester Genap) [PJ: Kepala RA]'
  );
});

test('buildAutoCompanyProfilePptConfig populates 12 slides, MoU, and portal URLs', () => {
  const cfg = buildAutoCompanyProfilePptConfig(DEFAULT_PPKM_DATA);
  assert.ok(cfg.coverTagline.includes('Cerdas'));
  assert.ok(cfg.sambutanQuote.includes('Darusyifa'));
  assert.ok((cfg.partnershipHighlights || []).length >= 2);
  assert.ok((cfg.portalUrl || '').includes('radarusyifa-arjawinangun.sch.id/portal'));
  assert.ok((cfg.ppdbOnlineUrl || '').includes('radarusyifa-arjawinangun.sch.id/ppdb'));
  assert.equal(Object.keys(cfg.slideTitles || {}).length, 12);
});

test('buildAutoCompanyProfilePptConfig keeps clean tenant isolated without sample leaks', () => {
  const clean = createCleanPpkmData({
    name: 'RA Al-Ikhlas Mandiri',
    nsm: '101232099999',
    npsn: '69999999',
    kepalaNama: 'Ustadzah Siti Aminah, S.Pd',
    kotaKab: 'Kabupaten Kuningan',
  });
  const cfg = buildAutoCompanyProfilePptConfig(clean);
  assert.ok(cfg.sambutanQuote.includes('RA AL-IKHLAS MANDIRI'));
  assert.ok(!cfg.sambutanQuote.includes('Darusyifa'));
  assert.ok(!cfg.closingMessage.includes('Darusyifa'));
  assert.equal(cfg.portalUrl, '');
});

test('mergeCompanyProfilePptConfig preserves user portal & custom slide overrides', () => {
  const merged = mergeCompanyProfilePptConfig({
    ...DEFAULT_PPKM_DATA,
    companyProfilePpt: {
      coverSubtitle: 'Subjudul Kustom',
      coverTagline: 'Motto Kustom',
      coverPhotoUrl: '',
      sambutanTitle: 'Sambutan Kustom',
      sambutanQuote: 'Kutipan Kustom',
      principalBioHighlight: 'Profil Kustom',
      keyHighlights: ['Unggul 1', 'Unggul 2'],
      partnershipHighlights: ['MoU Puskesmas Baru'],
      portalUrl: 'https://portal.ra-kustom.sch.id',
      portalLabel: 'Portal Wali Santri',
      ppdbTitle: 'PPDB Kustom',
      ppdbSchedule: 'Jadwal Kustom',
      ppdbRequirements: ['Syarat 1'],
      ppdbContactPerson: 'Kontak Kustom',
      closingTitle: 'Penutup Kustom',
      closingMessage: 'Pesan Kustom',
      closingPhotoUrl: '',
      slideTitles: { 9: 'Tantangan & Program Masa Depan' },
    },
  });
  assert.equal(merged.portalUrl, 'https://portal.ra-kustom.sch.id');
  assert.equal(merged.partnershipHighlights?.[0], 'MoU Puskesmas Baru');
  assert.equal(merged.slideTitles?.[9], 'Tantangan & Program Masa Depan');
  assert.equal(merged.slideTitles?.[11], 'Promosi Website, Portal Lembaga, PPDB & Penutup');
});

test('exportCompanyProfileToPptxBuffer builds valid 12-slide PPTX with clickable hyperlinks', async () => {
  const cfg = buildAutoCompanyProfilePptConfig(DEFAULT_PPKM_DATA);
  const bytes = await exportCompanyProfileToPptxBuffer(DEFAULT_PPKM_DATA, cfg);
  assert.ok(bytes.length > 12000, `Expected valid PPTX size > 12KB, got ${bytes.length}`);
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);

  const zip = await JSZip.loadAsync(bytes);
  for (let i = 1; i <= 12; i++) {
    assert.ok(
      zip.file(`ppt/slides/slide${i}.xml`),
      `Missing slide ${i} XML inside generated .pptx`
    );
  }

  // Verify Slide 12 relationships file embeds clickable external hyperlinks for website & portal
  const slide12Rels = await zip.file('ppt/slides/_rels/slide12.xml.rels')?.async('string');
  assert.ok(slide12Rels, 'Expected slide12.xml.rels for hyperlinks');
  assert.ok(
    slide12Rels.includes('https://radarusyifa-arjawinangun.sch.id'),
    'Expected website hyperlink in slide 12 rels'
  );
  assert.ok(
    slide12Rels.includes('https://radarusyifa-arjawinangun.sch.id/portal'),
    'Expected portal hyperlink in slide 12 rels'
  );
});

test('exportCompanyProfileToPptxBuffer works for clean empty tenant without crashing', async () => {
  const clean = createCleanPpkmData({
    name: 'RA Harapan Bangsa',
    nsm: '101232000001',
    npsn: '69900001',
    kepalaNama: 'Nurul Hidayah, S.Pd.I',
  });
  const cfg = buildAutoCompanyProfilePptConfig(clean);
  const bytes = await exportCompanyProfileToPptxBuffer(clean, cfg);
  const zip = await JSZip.loadAsync(bytes);
  assert.ok(zip.file('ppt/slides/slide1.xml'));
  assert.ok(zip.file('ppt/slides/slide12.xml'));
});
