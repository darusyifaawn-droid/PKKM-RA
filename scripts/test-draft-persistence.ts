import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_PPKM_DATA } from '../src/data/defaultPpkmData';
import { buildAutoCompanyProfilePptConfig } from '../src/utils/companyProfilePpt';
import {
  clearPptDraft,
  clearQuickDraft,
  loadPersistedMenu,
  loadPersistedPptUiState,
  loadPersistedQuickStep,
  loadPptDraft,
  loadQuickDraft,
  savePersistedMenu,
  savePersistedPptUiState,
  savePersistedQuickStep,
  savePptDraft,
  saveQuickDraft,
  StorageLike,
} from '../src/utils/draftPersistence';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
}

test('loadPersistedMenu & savePersistedMenu memulihkan menu terakhir saat refresh', () => {
  const storage = createMemoryStorage();
  assert.equal(loadPersistedMenu(storage), 'mode_cepat');

  savePersistedMenu('company_profile_ppt', storage);
  assert.equal(loadPersistedMenu(storage), 'company_profile_ppt');

  savePersistedMenu('laporan_pkkm', storage);
  assert.equal(loadPersistedMenu(storage), 'laporan_pkkm');

  storage.setItem('PKKM_RA_ACTIVE_MENU_V1', 'menu_tidak_valid');
  assert.equal(loadPersistedMenu(storage), 'mode_cepat');
});

test('loadPersistedQuickStep & savePersistedQuickStep mempertahankan langkah 1-4', () => {
  const storage = createMemoryStorage();
  assert.equal(loadPersistedQuickStep(storage), 1);

  savePersistedQuickStep(3, storage);
  assert.equal(loadPersistedQuickStep(storage), 3);

  storage.setItem('PKKM_RA_QUICK_STEP_V1', '99');
  assert.equal(loadPersistedQuickStep(storage), 1);
});

test('loadPersistedPptUiState mempertahankan tab, nomor slide, dan viewMode per lembaga', () => {
  const storage = createMemoryStorage();
  const instId = 'ra-darusyifa-arjawinangun';

  savePersistedPptUiState(
    instId,
    { activeTab: 'ppdb_penutup', activeSlideIndex: 11, viewMode: 'grid' },
    storage
  );

  const restored = loadPersistedPptUiState(instId, storage);
  assert.equal(restored.activeTab, 'ppdb_penutup');
  assert.equal(restored.activeSlideIndex, 11);
  assert.equal(restored.viewMode, 'grid');
});

test('savePptDraft & loadPptDraft menyelamatkan ketikan terakhir PPT meski refresh mendadak', () => {
  const storage = createMemoryStorage();
  const instId = 'ra-darusyifa-arjawinangun';
  const baseCfg = buildAutoCompanyProfilePptConfig(DEFAULT_PPKM_DATA);

  const editedPpkm = {
    ...DEFAULT_PPKM_DATA,
    institution: {
      ...DEFAULT_PPKM_DATA.institution,
      socialMedia: {
        ...(DEFAULT_PPKM_DATA.institution.socialMedia || {
          instagram: '',
          youtube: '',
          facebook: '',
          tiktok: '',
          website: '',
          whatsapp: '',
          email: '',
        }),
        website: 'https://radarusyifa.sch.id',
      },
    },
  };
  const editedCfg = {
    ...baseCfg,
    portalUrl: 'https://portal.radarusyifa.sch.id',
    closingTitle: 'Judul Penutup Baru Tersimpan',
  };

  const saved = savePptDraft(
    {
      institutionId: instId,
      updatedAt: 1700000000000,
      ppkmDraft: editedPpkm,
      pptConfig: editedCfg,
    },
    storage
  );
  assert.equal(saved, true);

  const restored = loadPptDraft(instId, storage);
  assert.ok(restored);
  assert.equal(restored.ppkmDraft.institution.socialMedia?.website, 'https://radarusyifa.sch.id');
  assert.equal(restored.pptConfig.portalUrl, 'https://portal.radarusyifa.sch.id');
  assert.equal(restored.pptConfig.closingTitle, 'Judul Penutup Baru Tersimpan');

  clearPptDraft(instId, storage);
  assert.equal(loadPptDraft(instId, storage), null);
});

test('saveQuickDraft & loadQuickDraft menjaga editan Langkah 1 dan 2 saat refresh', () => {
  const storage = createMemoryStorage();
  const instId = 'ra-darusyifa-arjawinangun';

  saveQuickDraft(
    {
      institutionId: instId,
      updatedAt: 1700000000123,
      evalDraft: {
        ...DEFAULT_PPKM_DATA.evaluators,
        pengawas1Nama: 'Drs. H. Penilai Uji, M.Pd.I',
      },
      instDraft: {
        ...DEFAULT_PPKM_DATA.institution,
        namaLembaga: 'RA DARUSYIFA EDITED',
      },
      principalDraft: DEFAULT_PPKM_DATA.principal,
      yayasanDraft: 'Yayasan Darusyifa Arjawinangun',
    },
    storage
  );

  const restored = loadQuickDraft(instId, storage);
  assert.ok(restored);
  assert.equal(restored.evalDraft.pengawas1Nama, 'Drs. H. Penilai Uji, M.Pd.I');
  assert.equal(restored.instDraft.namaLembaga, 'RA DARUSYIFA EDITED');
  assert.equal(restored.yayasanDraft, 'Yayasan Darusyifa Arjawinangun');

  clearQuickDraft(instId, storage);
  assert.equal(loadQuickDraft(instId, storage), null);
});
