import assert from 'node:assert/strict';
import test from 'node:test';
import { EMPTY_ADMIN_DOCS } from '../src/data/cleanPpkmFactory';
import { DEFAULT_PPKM_DATA } from '../src/data/defaultPpkmData';
import { DOCUMENT_TEMPLATES } from '../src/data/masterInstrumentV26';
import { PpkmData, PtkItem } from '../src/types/ppkm';
import {
  buildAllGeneratedDocsFromProfile,
  syncStructuralPositionsWithMasterData,
} from '../src/utils/autoPopulatePkkm';

function cloneDefaultData(): PpkmData {
  return JSON.parse(JSON.stringify(DEFAULT_PPKM_DATA)) as PpkmData;
}

test('buildAllGeneratedDocsFromProfile memperbarui isi & nomor seluruh 27 dokumen termasuk yang APPROVED saat Data Master berubah', () => {
  const initial = cloneDefaultData();
  const initialDocs = buildAllGeneratedDocsFromProfile(
    'inst-1',
    'per-2026',
    initial,
    'Tahun 2026',
    'uid-kepala'
  );

  assert.equal(initialDocs.length, DOCUMENT_TEMPLATES.length);

  // Tandai seluruh dokumen termasuk SK Pembagian Tugas dan Struktur Organisasi sebagai APPROVED
  const approvedDocs = initialDocs.map((d) => ({
    ...d,
    status: 'APPROVED' as const,
  }));

  // Ubah Data Master: ganti nama guru, nama Kepala RA, nama lembaga, dan nomor SK
  const updated = cloneDefaultData();
  updated.institution.namaLembaga = 'RA Al-Hidayah Nusantara';
  updated.principal.namaLengkap = 'Ustadzah Fatimah Azzahra, M.Pd';
  updated.adminDocs = {
    ...EMPTY_ADMIN_DOCS,
    ...(updated.adminDocs || {}),
    skPanitiaNomor: '099/RA.AHN/SK/XI/2026',
    suratTugasNomor: '105/RA.AHN/ST/XI/2026',
  };
  updated.ptkList = updated.ptkList.map((p) =>
    p.id === '3' ? { ...p, nama: 'Siti Aminah, S.Pd.I' } : p
  );

  const syncedDocs = buildAllGeneratedDocsFromProfile(
    'inst-1',
    'per-2026',
    updated,
    'Tahun 2026',
    'uid-kepala',
    approvedDocs,
    false
  );

  assert.equal(syncedDocs.length, DOCUMENT_TEMPLATES.length);

  const skTugas = syncedDocs.find((d) => d.templateId === 'kel-sk-tugas')!;
  assert.equal(skTugas.status, 'APPROVED');
  assert.equal(skTugas.docNumber, '099/RA.AHN/SK/XI/2026');
  assert.match(skTugas.bodyContent, /RA Al-Hidayah Nusantara/);
  assert.match(skTugas.bodyContent, /Siti Aminah, S\.Pd\.I/);
  assert.doesNotMatch(skTugas.bodyContent, /Nurlaela, S\.Pd\.I/);

  const suratTugas = syncedDocs.find((d) => d.templateId === 'sup-surat-tugas')!;
  assert.equal(suratTugas.status, 'APPROVED');
  assert.equal(suratTugas.docNumber, '105/RA.AHN/ST/XI/2026');
  assert.match(suratTugas.bodyContent, /Ustadzah Fatimah Azzahra, M\.Pd/);
  assert.match(suratTugas.bodyContent, /Siti Aminah, S\.Pd\.I/);

  // Jika resetApprovedToDraft = true, status kembali ke DRAFT
  const resetDocs = buildAllGeneratedDocsFromProfile(
    'inst-1',
    'per-2026',
    updated,
    'Tahun 2026',
    'uid-kepala',
    approvedDocs,
    true
  );
  assert.ok(resetDocs.every((d) => d.status === 'DRAFT'));
});

test('syncStructuralPositionsWithMasterData menyinkronkan perubahan, penggantian, penghapusan, dan penambahan guru serta pimpinan', () => {
  const base = cloneDefaultData();
  const oldPtk = base.ptkList;
  const oldStruct = base.structuralPositions || [];

  // 1. Ubah nama guru id '3' (Nurlaela) & guru id '5' (Rini Ariyani) yang juga menjabat Manajemen (Bendahara)
  const renamedPtk: PtkItem[] = oldPtk.map((p) => {
    if (p.id === '3') return { ...p, nama: 'Dewi Sartika, S.Pd', tugas: 'Wali Kelas B Unggulan' };
    if (p.id === '5') return { ...p, nama: 'Aisyah Rahma, S.E' };
    return p;
  });

  const syncedRenamed = syncStructuralPositionsWithMasterData(oldPtk, renamedPtk, oldStruct, {
    oldPrincipalName: base.principal.namaLengkap,
    newPrincipalName: 'Dra. Hj. Mariam Ulfah',
    oldKomiteName: base.evaluators.komiteNama,
    newKomiteName: 'H. Ridwan Kamil, S.Ag',
  });

  const posKetua = syncedRenamed.find((s) => s.jabatan.includes('Komite'));
  const posKepala = syncedRenamed.find((s) => s.jabatan.includes('Kepala RA'));
  const posGuruB = syncedRenamed.find((s) => s.ptkId === '3');
  const posBendahara = syncedRenamed.find((s) => s.ptkId === '5');

  assert.equal(posKetua?.nama, 'H. Ridwan Kamil, S.Ag');
  assert.equal(posKepala?.nama, 'Dra. Hj. Mariam Ulfah');
  assert.equal(posGuruB?.nama, 'Dewi Sartika, S.Pd');
  assert.equal(posBendahara?.nama, 'Aisyah Rahma, S.E');

  // 2. Penggantian 1-to-1: hapus guru id '4' (Khairun Nisa) lalu tambah guru baru id 'ptk_99' (Zainab)
  const replacedPtk: PtkItem[] = [
    ...renamedPtk.filter((p) => p.id !== '4'),
    {
      id: 'ptk_99',
      nama: 'Zainab Al-Kubra, S.Pd',
      nip: '-',
      statusPegawai: 'NON PNS',
      tugas: 'Guru Kelas RA Kelompok A',
      pendidikanTerakhir: 'S-1 PIAUD',
      statusSertifikasi: 'BELUM SERTIFIKASI',
    },
  ];

  const syncedReplaced = syncStructuralPositionsWithMasterData(renamedPtk, replacedPtk, syncedRenamed);
  const posSlotA = syncedReplaced.find((s) => s.id === 'st6');
  assert.equal(posSlotA?.nama, 'Zainab Al-Kubra, S.Pd');
  assert.equal(posSlotA?.ptkId, 'ptk_99');

  // 3. Hapus guru tanpa pengganti: slot Guru dipangkas, slot Manajemen ditandai [Belum Ditentukan]
  const deletedPtk = replacedPtk.filter((p) => p.id !== 'ptk_99' && p.id !== '5');
  const syncedDeleted = syncStructuralPositionsWithMasterData(replacedPtk, deletedPtk, syncedReplaced);
  assert.equal(syncedDeleted.some((s) => s.nama === 'Zainab Al-Kubra, S.Pd'), false);
  const vacantBendahara = syncedDeleted.find((s) => s.id === 'st4');
  assert.equal(vacantBendahara?.nama, '[Belum Ditentukan]');

  // 4. Tambah guru baru: otomatis masuk daftar Guru pada struktur organisasi
  const addedPtk: PtkItem[] = [
    ...deletedPtk,
    {
      id: 'ptk_100',
      nama: 'Rahmawati, S.Pd.I',
      nip: '-',
      statusPegawai: 'NON PNS',
      tugas: 'Guru Tahfidz RA',
      pendidikanTerakhir: 'S-1 PAI',
      statusSertifikasi: 'BELUM SERTIFIKASI',
    },
  ];
  const syncedAdded = syncStructuralPositionsWithMasterData(deletedPtk, addedPtk, syncedDeleted);
  const newGuruPos = syncedAdded.find((s) => s.ptkId === 'ptk_100');
  assert.ok(newGuruPos);
  assert.equal(newGuruPos?.nama, 'Rahmawati, S.Pd.I');
  assert.equal(newGuruPos?.tingkat, 'Guru');
});

test('Alur terpadu perubahan guru menyinkronkan Struktur Organisasi dan seluruh naskah surat terkait', () => {
  const data = cloneDefaultData();
  const initialDocs = buildAllGeneratedDocsFromProfile(
    'inst-1',
    'per-2026',
    data,
    'Tahun 2026',
    'uid-kepala'
  ).map((d) => ({ ...d, status: 'APPROVED' as const }));

  const nextPtk = data.ptkList.map((p) =>
    p.id === '2' ? { ...p, nama: 'Hj. Mahmudah, M.Pd' } : p
  );

  const nextStruct = syncStructuralPositionsWithMasterData(
    data.ptkList,
    nextPtk,
    data.structuralPositions || []
  );

  const updatedData: PpkmData = {
    ...data,
    ptkList: nextPtk,
    structuralPositions: nextStruct,
  };

  const docsAfterUpdate = buildAllGeneratedDocsFromProfile(
    'inst-1',
    'per-2026',
    updatedData,
    'Tahun 2026',
    'uid-kepala',
    initialDocs
  );

  const targetIds = ['kel-sk-tugas', 'kel-struktur', 'kel-uraian-tugas', 'sup-surat-tugas', 'spv-program'];
  for (const tplId of targetIds) {
    const doc = docsAfterUpdate.find((d) => d.templateId === tplId);
    assert.ok(doc, `Dokumen ${tplId} harus tersedia`);
    assert.match(doc.bodyContent, /Hj\. Mahmudah, M\.Pd/, `${tplId} harus memuat nama guru baru`);
    assert.doesNotMatch(doc.bodyContent, /Hj\. Kuniah, S\.Ag/, `${tplId} tidak boleh menyisakan nama guru lama`);
  }
});
