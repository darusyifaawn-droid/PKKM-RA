import { EMPTY_ADMIN_DOCS } from '../data/cleanPpkmFactory';
import {
  DOCUMENT_TEMPLATES,
  MASTER_INDICATORS_V26,
} from '../data/masterInstrumentV26';
import { PpkmData, PtkItem, StructuralPosition } from '../types/ppkm';
import {
  DocumentTemplateDef,
  EvidenceFileRecord,
  GeneratedDocRecord,
  IndicatorResponseRecord,
} from '../types/saas';

function normalizePersonName(name: string | undefined): string {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function syncStructuralPositionsWithMasterData(
  oldPtkList: PtkItem[],
  newPtkList: PtkItem[],
  currentPositions: StructuralPosition[],
  options?: {
    oldPrincipalName?: string;
    newPrincipalName?: string;
    oldKomiteName?: string;
    newKomiteName?: string;
  }
): StructuralPosition[] {
  const oldById = new Map(oldPtkList.map((p) => [p.id, p]));
  const newById = new Map(newPtkList.map((p) => [p.id, p]));
  const removedOld = oldPtkList.filter((o) => !newById.has(o.id));
  const addedNew = newPtkList.filter((n) => !oldById.has(n.id));

  // Pair 1-to-1 replacements by removal order when users delete & re-add a teacher
  const replacementByOldId = new Map<string, PtkItem>();
  const pairedNewIds = new Set<string>();
  const pairCount = Math.min(removedOld.length, addedNew.length);
  for (let i = 0; i < pairCount; i++) {
    replacementByOldId.set(removedOld[i].id, addedNew[i]);
    pairedNewIds.add(addedNew[i].id);
  }

  const oldPrincipalNorm = normalizePersonName(options?.oldPrincipalName);
  const newPrincipalClean = (options?.newPrincipalName || '').trim();
  const oldKomiteNorm = normalizePersonName(options?.oldKomiteName);
  const newKomiteClean = (options?.newKomiteName || '').trim();

  const updatedList: StructuralPosition[] = [];

  for (const pos of currentPositions) {
    const nextPos: StructuralPosition = { ...pos };

    // 1. Sync Kepala RA / Komite names when principal or committee changes
    if (
      newPrincipalClean &&
      ((oldPrincipalNorm && normalizePersonName(nextPos.nama) === oldPrincipalNorm) ||
        (nextPos.tingkat === 'Pimpinan' &&
          nextPos.jabatan.toLowerCase().includes('kepala ra') &&
          !nextPos.ptkId))
    ) {
      nextPos.nama = newPrincipalClean;
    }

    if (
      newKomiteClean &&
      ((oldKomiteNorm && normalizePersonName(nextPos.nama) === oldKomiteNorm) ||
        (nextPos.tingkat === 'Pimpinan' && nextPos.jabatan.toLowerCase().includes('komite')))
    ) {
      nextPos.nama = newKomiteClean;
    }

    // 2. Sync PTK link (by ptkId first, then fallback by matching old teacher name)
    let matchedOldPtk: PtkItem | undefined = nextPos.ptkId ? oldById.get(nextPos.ptkId) : undefined;
    if (!matchedOldPtk && nextPos.nama) {
      const posNameNorm = normalizePersonName(nextPos.nama);
      matchedOldPtk = oldPtkList.find((o) => normalizePersonName(o.nama) === posNameNorm);
    }

    if (matchedOldPtk) {
      const matchedNew = newById.get(matchedOldPtk.id);
      if (matchedNew) {
        nextPos.ptkId = matchedNew.id;
        nextPos.nama = matchedNew.nama;
        if (
          nextPos.tingkat === 'Guru' &&
          matchedOldPtk.tugas &&
          normalizePersonName(nextPos.jabatan) === normalizePersonName(matchedOldPtk.tugas) &&
          matchedNew.tugas
        ) {
          nextPos.jabatan = matchedNew.tugas;
        }
        updatedList.push(nextPos);
        continue;
      }

      // Teacher was removed: apply 1-to-1 replacement if available, else prune Guru slot or clear name
      const replacement = replacementByOldId.get(matchedOldPtk.id);
      if (replacement) {
        nextPos.ptkId = replacement.id;
        nextPos.nama = replacement.nama;
        if (nextPos.tingkat === 'Guru' && replacement.tugas) {
          nextPos.jabatan = replacement.tugas;
        }
        updatedList.push(nextPos);
        continue;
      }

      if (nextPos.tingkat === 'Guru') {
        continue;
      }

      delete nextPos.ptkId;
      nextPos.nama = '[Belum Ditentukan]';
      updatedList.push(nextPos);
      continue;
    }

    // 3. If pos has ptkId that already exists in newPtkList directly
    if (nextPos.ptkId && newById.has(nextPos.ptkId)) {
      const directNew = newById.get(nextPos.ptkId)!;
      nextPos.nama = directNew.nama;
      updatedList.push(nextPos);
      continue;
    }

    // 4. Opportunistic link to a matching current PTK name for future edits
    const directByName = newPtkList.find(
      (n) => normalizePersonName(n.nama) === normalizePersonName(nextPos.nama)
    );
    if (directByName) {
      nextPos.ptkId = directByName.id;
    }
    updatedList.push(nextPos);
  }

  // 5. Append newly added unpaired teachers so new teachers also appear in Struktur Organisasi
  const existingPtkIds = new Set(updatedList.map((p) => p.ptkId).filter(Boolean));
  const existingNamesNorm = new Set(updatedList.map((p) => normalizePersonName(p.nama)));
  const principalNorm = normalizePersonName(newPrincipalClean || options?.oldPrincipalName);

  for (const newTeacher of addedNew) {
    if (pairedNewIds.has(newTeacher.id)) continue;
    const teacherNameNorm = normalizePersonName(newTeacher.nama);
    if (!teacherNameNorm) continue;
    if (existingPtkIds.has(newTeacher.id) || existingNamesNorm.has(teacherNameNorm)) continue;
    if (principalNorm && teacherNameNorm === principalNorm && updatedList.some((p) => p.tingkat === 'Pimpinan')) {
      continue;
    }
    updatedList.push({
      id: `st_ptk_${newTeacher.id}`,
      ptkId: newTeacher.id,
      jabatan: newTeacher.tugas || 'Guru Kelas',
      nama: newTeacher.nama,
      tingkat: 'Guru',
      keterangan: `${newTeacher.statusPegawai} · ${newTeacher.pendidikanTerakhir}`,
      urutan: updatedList.length + 1,
    });
    existingPtkIds.add(newTeacher.id);
    existingNamesNorm.add(teacherNameNorm);
  }

  return updatedList.map((item, idx) => ({
    ...item,
    urutan: idx + 1,
  }));
}

function mergeAdminDocs(data: PpkmData) {
  return {
    ...EMPTY_ADMIN_DOCS,
    ...(data.adminDocs || {}),
  };
}

function getSafeListText(items: string[] | undefined, fallback: string): string {
  if (!items || items.length === 0) return `1. ${fallback}`;
  return items.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
}

export function buildTemplateDocumentContent(
  tpl: DocumentTemplateDef,
  data: PpkmData,
  yearLabel: string
): { docNumber: string; bodyContent: string } {
  const { institution, principal, evaluators, ptkList, structuralPositions, students, buildings, inventory, programGoals, activityReports } = data;
  const admin = mergeAdminDocs(data);
  const tempatLabel = evaluators.tempatPenilaian || institution.kecamatan || '[TEMPAT BELUM DIISI]';
  const tanggalLabel = evaluators.tanggalPenilaian || '[TANGGAL BELUM DIISI]';
  const tempatTanggal = `${tempatLabel}, ${tanggalLabel}`;
  const kepalaLabel = principal.namaLengkap || '[NAMA KEPALA RA BELUM DIISI]';
  const totalSiswa = students.reduce((acc, s) => acc + (Number(s.lakiLaki) || 0) + (Number(s.perempuan) || 0), 0);

  const ptkSummary = ptkList.length
    ? ptkList.map((p, i) => `${i + 1}. ${p.nama} — ${p.tugas} (${p.statusPegawai}, ${p.pendidikanTerakhir})`).join('\n')
    : '1. [Belum ada daftar PTK yang diinput]';

  const structSummary = (structuralPositions || []).length
    ? [...structuralPositions]
        .sort((a, b) => (a.urutan || 99) - (b.urutan || 99))
        .map((s, i) => `${i + 1}. ${s.jabatan}: ${s.nama}${s.keterangan ? ` (${s.keterangan})` : ''}`)
        .join('\n')
    : ptkSummary;

  const programsSummary = (institution.featuredPrograms || []).length
    ? institution.featuredPrograms!.map((p, i) => `${i + 1}. ${p.nama}: ${p.deskripsi}`).join('\n')
    : '1. [Belum ada program unggulan yang diinput]';

  const sarprasSummary = buildings.length
    ? buildings.map((b, i) => `${i + 1}. ${b.jenisBangunan}: ${b.jumlahLokal} unit (${b.baik} Baik, ${b.rusakRingan} Rusak Ringan)`).join('\n')
    : '1. [Belum ada data bangunan/ruang yang diinput]';

  const apeSummary = inventory.length
    ? inventory.map((inv, i) => `${i + 1}. ${inv.namaBarang} (${inv.kategori || 'Sarpras'}): ${inv.jumlah} unit (${inv.baik} Baik)`).join('\n')
    : '1. [Belum ada data inventaris APE yang diinput]';

  switch (tpl.templateId) {
    case 'kel-sk-tugas':
      return {
        docNumber: admin.skPanitiaNomor || '[NOMOR SK BELUM DIISI]',
        bodyContent: `SURAT KEPUTUSAN KEPALA ${institution.namaLembaga}
Nomor: ${admin.skPanitiaNomor || '[NOMOR SK BELUM DIISI]'}

TENTANG
PEMBAGIAN TUGAS PENDIDIK DAN TENAGA KEPENDIDIKAN
TAHUN PELAJARAN ${institution.tahunPelajaran || '[TAHUN PELAJARAN]'} (${yearLabel})

MENIMBANG:
Bahwa demi kelancaran penyelenggaraan pembelajaran, tata kelola administrasi, dan penyusunan portofolio PKKRA di ${institution.namaLembaga} (NSM: ${institution.nsm || '-'}, NPSN: ${institution.npsn || institution.npsm || '-'}), perlu ditetapkan pembagian tugas pendidik dan tenaga kependidikan.

MEMUTUSKAN / MENETAPKAN:
Pertama: Menetapkan pembagian tugas mengajar, manajerial, dan koordinator administrasi bagi personil berikut:
${ptkSummary}

Kedua: Masing-masing pendidik dan tenaga kependidikan wajib melaksanakan tugas dengan penuh tanggung jawab dan melaporkan capaian pembelajaran serta administrasi kelas kepada Kepala RA secara berkala.
Ketiga: Keputusan ini berlaku sejak tanggal ditetapkan (${admin.skPanitiaTanggal || tempatTanggal}).`,
      };

    case 'kel-struktur':
      return {
        docNumber: admin.skPanitiaNomor || '[NOMOR PENETAPAN BELUM DIISI]',
        bodyContent: `PENETAPAN STRUKTUR ORGANISASI ${institution.namaLembaga}
TAHUN PELAJARAN ${institution.tahunPelajaran || '[TAHUN PELAJARAN]'} (${yearLabel})

1. IDENTITAS SATUAN PENDIDIKAN
Nama Lembaga: ${institution.namaLembaga}
Penyelenggara: ${admin.namaYayasan || '[NAMA YAYASAN BELUM DIISI]'}
NSM / NPSN: ${institution.nsm || '-'} / ${institution.npsn || institution.npsm || '-'}
Izin Operasional: ${admin.izinOperasionalNomor || '[NOMOR IJOP BELUM DIISI]'}

2. SUSUNAN ORGANISASI DAN PENGELOLA
${structSummary}

3. TATA HUBUNGAN KERJA
Struktur organisasi disusun melalui musyawarah yayasan, kepala RA, komite (${evaluators.komiteNama || '[KOMITE BELUM DIISI]'}), dan dewan guru untuk menjamin ketercapaian 8 Standar Nasional PAUD/RA.`,
      };

    case 'kel-uraian-tugas':
      return {
        docNumber: admin.skPanitiaNomor || '[NOMOR LAMPIRAN SK BELUM DIISI]',
        bodyContent: `URAIAN TUGAS POKOK DAN FUNGSI (JOB DESCRIPTION) PERSONALIA
${institution.namaLembaga} · ${yearLabel}

1. KEPALA RAUDHATUL ATHFAL (${kepalaLabel})
Bertanggung jawab penuh atas perencanaan strategis (RKJM/RKT), pelaksanaan tugas manajerial, pengelolaan kurikulum, supervisi akademik guru, kewirausahaan, serta evaluasi kinerja tahunan (PKKRA).

2. RINCIAN TUGAS PENDIDIK & TENAGA KEPENDIDIKAN
${structSummary}

3. DAFTAR PENUGASAN HARIAN PTK (${ptkList.length} PERSONIL)
${ptkSummary}`,
      };

    case 'kel-program-kerja':
    case 'kel-rkjm':
    case 'man-pengembangan':
      return {
        docNumber: '[NOMOR DOKUMEN PROGRAM KERJA]',
        bodyContent: `${tpl.title.toUpperCase()}
${institution.namaLembaga} (${yearLabel})
NSM: ${institution.nsm || '-'} · NPSN: ${institution.npsn || institution.npsm || '-'}

1. VISI LEMBAGA
"${programGoals.visi || institution.visi || '[VISI LEMBAGA BELUM DIISI]'}"

2. MISI LEMBAGA
${getSafeListText(programGoals.misi?.length ? programGoals.misi : institution.misi, '[Misi lembaga belum diisi]')}

3. TUJUAN PROGRAM KERJA & PENGEMBANGAN 8 SNP
${getSafeListText(programGoals.tujuanProgramKerja, '[Tujuan program kerja belum diisi]')}

4. PROGRAM UNGGULAN & LAYANAN ANAK USIA DINI
${programsSummary}

5. RUANG LINGKUP KEGIATAN
${getSafeListText(programGoals.ruangLingkup, '[Ruang lingkup program kerja belum diisi]')}

6. PENANGGUNG JAWAB & EVALUASI
Penanggung Jawab: ${kepalaLabel} (Kepala RA)
Komite RA: ${evaluators.komiteNama || '[KOMITE BELUM DIISI]'}
Pengawas Pembina: ${evaluators.pengawas1Nama || '[PENILAI 1 BELUM DIISI]'} (NIP: ${evaluators.pengawas1Nip || '-'})`,
      };

    case 'kel-kaldik':
      return {
        docNumber: '[NOMOR PENETAPAN KALDIK]',
        bodyContent: `PENETAPAN KALENDER PENDIDIKAN (KALDIK)
${institution.namaLembaga}
Tahun Pelajaran: ${institution.kaldikTahun || institution.tahunPelajaran || '[TAHUN PELAJARAN]'}

1. DASAR PENYUSUNAN
Mengacu pada Kalender Pendidikan Direktorat Jenderal Pendidikan Islam Kemenag RI, Kanwil Kemenag ${institution.provinsi || '[PROVINSI]'}, dan Kankemenag ${institution.kotaKab || '[KAB/KOTA]'}.

2. RINGKASAN JADWAL HARI EFEKTIF & KEGIATAN UTAMA
- Awal Tahun Pelajaran & Masa Ta'aruf Santri RA (MATSAMA): Juli
- Pelaksanaan Pembelajaran Tematik & P5-RA Semester Ganjil: Juli – Desember
- Penilaian Perkembangan Anak & Pembagian Raport Semester 1: Desember
- Pelaksanaan Pembelajaran & Persiapan Manasik/Pentas Akhir Tahun Semester Genap: Januari – Juni
- Kegiatan Rutin Harian & Mingguan: ${(activityReports.harian || []).map((h) => h.namaKegiatan).slice(0, 3).join(', ') || '[Belum ada jadwal kegiatan harian]'}

3. PENETAPAN RESMI
Ditetapkan di ${tempatTanggal} oleh Kepala RA (${kepalaLabel}).`,
      };

    case 'kel-tatib':
    case 'kel-sop':
      return {
        docNumber: '[NOMOR SOP / TATA TERTIB]',
        bodyContent: `${tpl.title.toUpperCase()}
${institution.namaLembaga} · Tahun Pelajaran ${institution.tahunPelajaran || '[TAHUN PELAJARAN]'}

1. KETENTUAN UMUM LAYANAN PENDIDIK & SANTRI (${totalSiswa} SANTRI)
Seluruh civitas ${institution.namaLembaga} yang terdiri atas ${ptkList.length} pendidik/tenaga kependidikan dan ${totalSiswa} peserta didik menaati pedoman kedisiplinan, adab islami, keselamatan lingkungan bermain, dan etika komunikasi bersama orang tua.

2. STANDAR PROSEDUR HARIAN
- Penyambutan santri pagi dengan penerapan 5S (Senyum, Salam, Sapa, Sopan, Santun).
- Pembiasaan wudhu, sholat dhuha, dan hafalan surat pendek.
- Pelaksanaan pembelajaran sentra menggunakan media APE aman dan terawat.
- Pemantauan kebersihan, kesehatan gigi/tumbuh kembang, dan prosedur penjemputan aman.

3. PENGAWASAN & KEPATUHAN
Diawasi langsung oleh Kepala RA (${kepalaLabel}) bersama tim pendidik.`,
      };

    case 'kel-profil':
      return {
        docNumber: admin.izinOperasionalNomor || '[NOMOR IJOP BELUM DIISI]',
        bodyContent: `PROFIL RESMI SATUAN PENDIDIKAN
${institution.namaLembaga} (${yearLabel})

Nama Satuan Pendidikan: ${institution.namaLembaga}
Status / Penyelenggara: ${institution.status || '-'} / ${admin.namaYayasan || '[BELUM DIISI]'}
NSM / NPSN: ${institution.nsm || '-'} / ${institution.npsn || institution.npsm || '-'}
Nomor Izin Operasional: ${admin.izinOperasionalNomor || '[BELUM DIISI]'}
Akreditasi BAN-PDM: ${institution.accreditationDetail?.peringkat || institution.akreditasi || '-'} (SK: ${institution.accreditationDetail?.nomorSk || '-'})
Alamat: ${institution.alamat || '[ALAMAT BELUM DIISI]'}, Kec. ${institution.kecamatan || '-'}, ${institution.kotaKab || '-'}, ${institution.provinsi || '-'}
Kontak: Telp ${institution.telepon || '-'} · Email ${institution.email || '-'}
Luas / Status Tanah: ${institution.luasTanah || '-'} (${institution.statusTanah || '-'})

KEPALA RAUDHATUL ATHFAL:
Nama: ${kepalaLabel} · NUPTK: ${principal.nuptk || '-'} · TMT: ${principal.tmtJabatan || '-'}

DATA PESERTA DIDIK (${totalSiswa} Anak):
${students.length ? students.map((s) => `- ${s.kelas}: ${s.lakiLaki} L, ${s.perempuan} P (Total ${Number(s.lakiLaki) + Number(s.perempuan)})`).join('\n') : '- [Belum ada data peserta didik yang diinput]'}

DATA SARANA PRASARANA & APE:
${sarprasSummary}`,
      };

    case 'man-berita-acara':
      return {
        docNumber: admin.beritaAcaraNomor || '[NOMOR BERITA ACARA BELUM DIISI]',
        bodyContent: `BERITA ACARA PENILAIAN KINERJA KEPALA RA (PKKRA)
Nomor: ${admin.beritaAcaraNomor || '[NOMOR MENYUSUL]'}

Pada hari ini, ${admin.beritaAcaraHari || '[HARI]'}, tanggal ${admin.beritaAcaraTanggal || tanggalLabel}, bertempat di ${admin.beritaAcaraTempat || institution.namaLembaga} pada pukul ${admin.beritaAcaraWaktu || '[WAKTU]'}, telah dilaksanakan kegiatan Verifikasi Portofolio dan Penilaian Kinerja Kepala Raudhatul Athfal (PKKRA) periode ${yearLabel}.

Satuan Pendidikan: ${institution.namaLembaga} (NSM: ${institution.nsm || '-'})
Kepala RA yang Dinilai: ${kepalaLabel}
Penilai 1: ${evaluators.pengawas1Nama || '[PENILAI 1 BELUM DIISI]'} (NIP: ${evaluators.pengawas1Nip || '-'})
Penilai 2: ${evaluators.pengawas2Nama || '[PENILAI 2 BELUM DIISI]'} (NIP: ${evaluators.pengawas2Nip || '-'})

Catatan Pelaksanaan:
${admin.beritaAcaraCatatan || '[Catatan pelaksanaan berita acara belum diisi]'}`,
      };

    case 'man-notulen':
    case 'man-daftar-hadir':
    case 'sup-undangan':
      return {
        docNumber: '[NOMOR SURAT / AGENDA RAPAT]',
        bodyContent: `${tpl.title.toUpperCase()}
${institution.namaLembaga} · ${yearLabel}

Tempat: ${institution.namaLembaga}, ${institution.alamat || '[ALAMAT BELUM DIISI]'}
Tanggal Pelaksanaan: ${tanggalLabel}
Pimpinan Rapat / Penanggung Jawab: ${kepalaLabel} (Kepala RA)

PESERTA YANG DIUNDANG / HADIR:
1. Perwakilan Yayasan / Komite RA (${evaluators.komiteNama || '[KOMITE BELUM DIISI]'})
${ptkSummary}

AGENDA PEMBAHASAN:
1. Penyelarasan Visi, Misi, RKT, dan RKJM ${institution.namaLembaga}.
2. Evaluasi program unggulan (${(institution.featuredPrograms || []).map((p) => p.nama).join(', ') || '[Program unggulan belum diisi]'}).
3. Pembagian tanggung jawab pengumpulan bukti fisik 96 indikator PKKM_v.26.`,
      };

    case 'man-monitoring':
    case 'man-evaluasi':
    case 'man-rtl': {
      const swot = data.komponenAchievements?.swotRtl;
      return {
        docNumber: '[NOMOR DOKUMEN MONEV / RTL]',
        bodyContent: `${tpl.title.toUpperCase()}
${institution.namaLembaga} · ${yearLabel}

1. RINGKASAN KETERLAKSANAAN PROGRAM KERJA
- Program Harian (${(activityReports.harian || []).length} kegiatan): ${(activityReports.harian || []).map((a) => `${a.namaKegiatan} (${a.realisasi}%)`).join('; ') || '[Belum diinput]'}
- Program Mingguan (${(activityReports.mingguan || []).length} kegiatan): ${(activityReports.mingguan || []).map((a) => `${a.namaKegiatan} (${a.realisasi}%)`).join('; ') || '[Belum diinput]'}
- Program Semesteran/Tahunan (${(activityReports.semesteran || []).length + (activityReports.tahunan || []).length} kegiatan)

2. ANALISIS SWOT & KENDALA UTAMA
Kekuatan: ${(swot?.kekuatan || []).join('; ') || '[Belum diisi]'}
Kendala: ${(swot?.kelemahanKendala || []).join('; ') || '[Belum diisi]'}

3. RENCANA TINDAK LANJUT (RTL) PRIORITAS
${(swot?.rencanaTindakLanjut || []).map((r, i) => `${i + 1}. ${typeof r === 'string' ? r : `${r.fokusProgram}: ${r.langkahKonkret}`}`).join('\n') || '1. [Belum ada item RTL yang diinput]'}`,
      };
    }

    case 'kwu-program':
    case 'kwu-inovasi':
    case 'kwu-laporan':
      return {
        docNumber: '[NOMOR PROGRAM / LAPORAN KEWIRAUSAHAAN]',
        bodyContent: `${tpl.title.toUpperCase()}
${institution.namaLembaga} · ${yearLabel}

1. TUJUAN PENGEMBANGAN KEWIRAUSAHAAN & INOVASI
Menumbuhkan kemandirian, kreativitas, rasa percaya diri santri, serta inovasi media ajar APE ramah anak yang melibatkan guru, peserta didik (${totalSiswa} anak), dan orang tua/komite (${evaluators.komiteNama || '-'}).

2. PROGRAM UNGGULAN & KEGIATAN P5-RA / MARKET DAY
${programsSummary}

3. DUKUNGAN SARANA PRASARANA & APE
${apeSummary}

4. EVALUASI & DAMPAK PEMBELAJARAN
[Lengkapi laporan realisasi kegiatan kewirausahaan dan inovasi RA di sini sesuai dokumen bukti nyata]`,
      };

    case 'spv-program':
    case 'spv-jadwal':
    case 'spv-instrumen':
    case 'spv-laporan':
    case 'spv-rtl':
      return {
        docNumber: '[NOMOR DOKUMEN SUPERVISI AKADEMIK]',
        bodyContent: `${tpl.title.toUpperCase()}
${institution.namaLembaga} · ${yearLabel}

1. SUPERVISOR & SASARAN PEMBINAAN
Supervisor Utama: ${kepalaLabel} (Kepala RA)
Pendidik yang Disupervisi (${ptkList.length} PTK):
${ptkSummary}

2. FOKUS SUPERVISI PEMBELAJARAN RA
- Kelengkapan Perencanaan: Program Semester, RPPM, RPPH Sentra, dan Penilaian Perkembangan Anak (Ceklis, Anekdot, Hasil Karya).
- Kesiapan Media APE Indoor/Outdoor dan keterlibatan aktif peserta didik (${totalSiswa} santri).
- Pendekatan pembiasaan karakter islami (doa harian, hafalan surat pendek, akhlakul karimah).

3. TINDAK LANJUT & PENGEMBANGAN KEPROFESIAN (PKB)
Hasil observasi kelas ditindaklanjuti melalui diskusi refleksi bersama dewan guru serta keikutsertaan aktif pada forum KKG RA / IGRA Kecamatan ${institution.kecamatan || '-'}.`,
      };

    case 'sup-surat-tugas':
      return {
        docNumber: admin.suratTugasNomor || '[NOMOR SURAT TUGAS BELUM DIISI]',
        bodyContent: `SURAT TUGAS KEPALA ${institution.namaLembaga}
Nomor: ${admin.suratTugasNomor || '[NOMOR SURAT TUGAS BELUM DIISI]'}

Yang bertanda tangan di bawah ini:
Nama: ${kepalaLabel}
Jabatan: Kepala ${institution.namaLembaga}
Unit Kerja: ${institution.namaLembaga} (NSM: ${institution.nsm || '-'})

Memberikan tugas kepada Pendidik dan Tenaga Kependidikan berikut:
${ptkSummary}

Untuk melaksanakan kegiatan persiapan portofolio PKKRA, workshop/KKG RA, serta pengarsipan bukti fisik 4 komponen penilaian periode ${yearLabel}.
Ditetapkan di ${tempatTanggal}.`,
      };

    case 'sup-surat-ket':
      return {
        docNumber: admin.suratPernyataanNomor || '[NOMOR SURAT PERNYATAAN BELUM DIISI]',
        bodyContent: `SURAT PERNYATAAN KEABSAHAN DATA & PORTOFOLIO PKKRA
Nomor: ${admin.suratPernyataanNomor || '[NOMOR BELUM DIISI]'}

Yang bertanda tangan di bawah ini:
Nama: ${kepalaLabel}
NUPTK / NPK: ${principal.nuptk || '-'} / ${principal.npk || '-'}
Jabatan: Kepala ${institution.namaLembaga}
Alamat Lembaga: ${institution.alamat || '[ALAMAT BELUM DIISI]'}, Kec. ${institution.kecamatan || '-'}, ${institution.kotaKab || '-'}

Menyatakan dengan sesungguhnya bahwa seluruh data identitas lembaga, daftar ${ptkList.length} PTK, data ${totalSiswa} peserta didik, sarpras APE, serta seluruh bukti fisik dokumen portofolio periode ${yearLabel} yang disajikan kepada Tim Penilai (${evaluators.pengawas1Nama || '-'} dan ${evaluators.pengawas2Nama || '-'}) adalah benar, sah, dan dapat dipertanggungjawabkan sesuai kondisi riil lembaga.

Ditetapkan di ${tempatLabel}, ${admin.suratPernyataanTanggal || tanggalLabel}.`,
      };

    default:
      return {
        docNumber: '[NOMOR DOKUMEN MENYUSUL]',
        bodyContent: `${tpl.title.toUpperCase()}\n${institution.namaLembaga} · ${yearLabel}\n\n${tpl.description}\n\nKepala RA: ${kepalaLabel}`,
      };
  }
}

export function buildAllGeneratedDocsFromProfile(
  institutionId: string,
  periodId: string,
  data: PpkmData,
  yearLabel: string,
  createdBy: string,
  existingDocs: GeneratedDocRecord[] = [],
  resetApprovedToDraft = false
): GeneratedDocRecord[] {
  const existingByDocId = new Map<string, GeneratedDocRecord>();
  const existingByTemplateId = new Map<string, GeneratedDocRecord>();
  for (const d of existingDocs) {
    if (d.institutionId === institutionId && d.periodId === periodId) {
      existingByDocId.set(d.docId, d);
      if (d.templateId && !existingByTemplateId.has(d.templateId)) {
        existingByTemplateId.set(d.templateId, d);
      }
    }
  }

  const templateMap = new Map(DOCUMENT_TEMPLATES.map((t) => [t.templateId, t]));
  const nowIso = new Date().toISOString();
  const autoDocs: GeneratedDocRecord[] = DOCUMENT_TEMPLATES.map((tpl) => {
    const autoDocId = `auto_${periodId}_${tpl.templateId}`;
    const existing = existingByDocId.get(autoDocId) || existingByTemplateId.get(tpl.templateId);
    const { docNumber, bodyContent } = buildTemplateDocumentContent(tpl, data, yearLabel);
    const nextStatus: 'DRAFT' | 'APPROVED' = resetApprovedToDraft
      ? 'DRAFT'
      : existing?.status || 'DRAFT';
    return {
      docId: autoDocId,
      institutionId,
      periodId,
      templateId: tpl.templateId,
      category: tpl.category,
      title: tpl.title,
      docNumber,
      bodyContent,
      status: nextStatus,
      createdBy: existing?.createdBy || createdBy,
      authorizedUids: existing?.authorizedUids || [createdBy],
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };
  });

  const customDocs = existingDocs
    .filter(
      (d) =>
        d.institutionId === institutionId &&
        d.periodId === periodId &&
        !d.docId.startsWith(`auto_${periodId}_`)
    )
    .map((d) => {
      if (d.templateId && templateMap.has(d.templateId)) {
        const tpl = templateMap.get(d.templateId)!;
        const { docNumber, bodyContent } = buildTemplateDocumentContent(tpl, data, yearLabel);
        return {
          ...d,
          title: tpl.title,
          category: tpl.category,
          docNumber,
          bodyContent,
          status: resetApprovedToDraft ? ('DRAFT' as const) : d.status,
          updatedAt: nowIso,
        };
      }
      return d;
    });

  return [...autoDocs, ...customDocs];
}

export function isEvidenceLinkedToIndicator(ev: EvidenceFileRecord, indicatorId: string): boolean {
  if (ev.indicatorId === indicatorId) return true;
  return Array.isArray(ev.linkedIndicatorIds) && ev.linkedIndicatorIds.includes(indicatorId);
}

export function buildAutoIndicatorResponses(
  institutionId: string,
  periodId: string,
  data: PpkmData,
  evidenceFiles: EvidenceFileRecord[],
  updatedBy: string,
  existingResponses: Record<string, IndicatorResponseRecord> = {},
  forceOverwrite = false
): Record<string, IndicatorResponseRecord> {
  const next: Record<string, IndicatorResponseRecord> = { ...existingResponses };
  const admin = mergeAdminDocs(data);
  const { institution, principal, ptkList, structuralPositions, students, buildings, inventory, programGoals, activityReports, photoEvidences, evaluators } = data;
  const totalSiswa = students.reduce((acc, s) => acc + (Number(s.lakiLaki) || 0) + (Number(s.perempuan) || 0), 0);
  const nowIso = new Date().toISOString();

  for (const ind of MASTER_INDICATORS_V26) {
    const existing = existingResponses[ind.id];
    const hasManualText = existing && existing.kepalaNote && existing.kepalaNote.trim().length > 0;
    if (!forceOverwrite && existing && existing.completionStatus === 'complete' && hasManualText) {
      continue;
    }

    const uploadedForInd = evidenceFiles.filter((e) => isEvidenceLinkedToIndicator(e, ind.id));
    let factualNote = '';
    let hasBackingData = false;

    if (ind.subKomponenKode === '1.1') {
      hasBackingData = (structuralPositions || []).length > 0 && ptkList.length > 0;
      if (hasBackingData) {
        factualNote = `Struktur organisasi ${institution.namaLembaga} menetapkan ${(structuralPositions || []).length} jabatan fungsional & ${ptkList.length} PTK beserta SK Pembagian Tugas (${admin.skPanitiaNomor || 'Draft SK'}) dan SOP layanan RA.`;
      }
    } else if (ind.subKomponenKode === '1.2') {
      hasBackingData = Boolean(programGoals.visi) && Boolean(institution.akreditasi);
      if (hasBackingData) {
        factualNote = `Visi "${programGoals.visi || institution.visi}", status akreditasi ${institution.accreditationDetail?.peringkat || institution.akreditasi}, serta tren perkembangan ${totalSiswa} santri & kelulusan terdokumentasi di profil RA.`;
      }
    } else if (ind.subKomponenKode === '1.3') {
      hasBackingData = Boolean(evaluators.komiteNama) && Boolean(admin.namaYayasan);
      if (hasBackingData) {
        factualNote = `Kemitraan aktif bersama ${admin.namaYayasan}, Komite RA (${evaluators.komiteNama}), wali santri, dan jejaring kesehatan/lingkungan sekitar.`;
      }
    } else if (ind.subKomponenKode === '1.4' || ind.subKomponenKode === '1.5') {
      hasBackingData = Boolean(institution.kaldikTahun || institution.tahunPelajaran) && (institution.featuredPrograms || []).length > 0;
      if (hasBackingData) {
        factualNote = `Penerapan Kurikulum Merdeka PAUD/RA pada Tahun Pelajaran ${institution.tahunPelajaran}, Kalender Pendidikan (${institution.kaldikTahun || institution.tahunPelajaran}), program unggulan ${(institution.featuredPrograms || []).map((p) => p.nama).slice(0, 2).join(' & ')}.`;
      }
    } else if (ind.subKomponenKode === '1.6' || ind.subKomponenKode === '1.7') {
      hasBackingData = Boolean(institution.socialMedia?.website || institution.email || institution.emisSimpatikaScreenshotUrl);
      if (hasBackingData) {
        factualNote = `Pengelolaan SIM/Digital aktif: EMIS/Simpatika terkelola, email resmi ${institution.email}, dan kanal informasi (${institution.socialMedia?.website || institution.socialMedia?.instagram || 'Portal RA'}).`;
      }
    } else if (ind.subKomponenKode === '2.1' || ind.subKomponenKode === '2.2') {
      hasBackingData = programGoals.tujuanProgramKerja.length > 0 && Boolean(principal.namaLengkap);
      if (hasBackingData) {
        factualNote = `Program Kerja Tahunan (RKT/RKJM) disusun oleh Kepala RA (${principal.namaLengkap}) dengan ${programGoals.tujuanProgramKerja.length} sasaran strategis dan tata tertib warga RA.`;
      }
    } else if (ind.subKomponenKode === '2.3' || ind.subKomponenKode === '2.4') {
      hasBackingData = ptkList.length > 0;
      if (hasBackingData) {
        factualNote = `Pembinaan ${ptkList.length} PTK (Sertifikasi: ${ptkList.filter((p) => p.statusSertifikasi === 'SERTIFIKASI').length} personil) melalui rapat rutin, KKG RA/IGRA, dan penugasan diklat.`;
      }
    } else if (ind.subKomponenKode === '2.5') {
      hasBackingData = buildings.length > 0 && inventory.length > 0;
      if (hasBackingData) {
        factualNote = `Pengelolaan sarpras seluas ${institution.luasTanah || '-'} (${buildings.length} kategori ruang) dan ${inventory.length} jenis inventaris APE indoor/outdoor terawat dengan baik.`;
      }
    } else if (ind.subKomponenKode === '2.6' || ind.subKomponenKode === '2.7') {
      hasBackingData = totalSiswa > 0 && students.length > 0;
      if (hasBackingData) {
        factualNote = `Pengelolaan ${totalSiswa} peserta didik dalam ${students.length} rombongan belajar beserta buku induk, demografi orang tua, dan asesmen perkembangan harian.`;
      }
    } else if (ind.subKomponenKode === '2.8' || ind.subKomponenKode === '2.9' || ind.subKomponenKode === '2.10') {
      hasBackingData = (activityReports.harian?.length || 0) > 0 && Boolean(admin.izinOperasionalNomor);
      if (hasBackingData) {
        factualNote = `Tata kelola persuratan (${admin.izinOperasionalNomor}), pelaporan BKU/BOP transparan, pengawasan program (${(activityReports.harian?.length || 0) + (activityReports.tahunan?.length || 0)} agenda), serta RTL berkesinambungan.`;
      }
    } else if (ind.komponenCode === 'K3') {
      hasBackingData = (institution.featuredPrograms || []).length > 0;
      if (hasBackingData) {
        factualNote = `Inovasi kewirausahaan & P5-RA di ${institution.namaLembaga}: ${(institution.featuredPrograms || []).map((p) => p.nama).join(', ')}.`;
      }
    } else {
      hasBackingData = ptkList.length > 0;
      if (hasBackingData) {
        factualNote = `Supervisi akademik Kepala RA (${principal.namaLengkap || '-'}) terhadap ${ptkList.length} guru menggunakan instrumen telaah RPPH, observasi kelas/APE, refleksi, dan tindak lanjut PKB.`;
      }
    }

    if (uploadedForInd.length > 0) {
      hasBackingData = true;
      if (!factualNote) {
        factualNote = `Tersedia ${uploadedForInd.length} berkas bukti fisik terunggah (${uploadedForInd.map((f) => f.fileName).join(', ')}).`;
      }
    }

    const autoChecked =
      existing?.checkedEvidences?.length
        ? existing.checkedEvidences
        : hasBackingData
        ? ind.buktiWajib.slice(0, Math.min(2, ind.buktiWajib.length))
        : [];

    const hasPhoto = (photoEvidences || []).length > 0;
    const isReady = hasBackingData && (autoChecked.length > 0 || uploadedForInd.length > 0 || hasPhoto);

    next[ind.id] = {
      responseId: `${institutionId}_${periodId}_${ind.id}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
      institutionId,
      periodId,
      indicatorId: ind.id,
      komponenCode: ind.komponenCode,
      kepalaNote: hasManualText ? existing!.kepalaNote : factualNote,
      completionStatus: isReady ? 'complete' : hasBackingData ? 'draft' : 'empty',
      checkedEvidences: autoChecked,
      updatedBy,
      authorizedUids: existing?.authorizedUids || [updatedBy],
      updatedAt: nowIso,
    };
  }

  return next;
}
