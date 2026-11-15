import React, { useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileArchive,
  MonitorPlay,
  Plus,
  Printer,
  RotateCcw,
  ShieldCheck,
  UserPlus,
  AlertTriangle,
  Upload,
  Trash2,
} from 'lucide-react';
import { useSaas } from '../../context/SaasContext';
import { MASTER_INSTRUMENT_META } from '../../data/masterInstrumentV26';
import { computeDualAssessorRekap } from '../../utils/pkkmScoring';
import { downloadPkkmAsXlsx, downloadPkkmAsZip } from '../../utils/documentExporters';
import { PrintView } from '../Print/PrintView';
import { PresentationView } from '../Presentation/PresentationView';
import { UserRole } from '../../types/saas';

export const RekapNilaiView: React.FC = () => {
  const {
    activeInstitution,
    activePeriod,
    activeIndicators,
    p1Scores,
    p2Scores,
    p1Note,
    p2Note,
    evidenceFiles,
    recommendations,
    updatePeriodMeta,
  } = useSaas();
  const rekap = computeDualAssessorRekap(p1Scores, p2Scores, activeIndicators);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-semibold text-emerald-700 block mb-0.5">
              Format 7 &amp; Format 8 · Rekapitulasi Nilai Tahunan Kepala RA
            </span>
            <h1 className="text-lg font-bold text-slate-900">
              Rekapitulasi Hasil Penilaian Kinerja Tahunan Kepala RA
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeInstitution.name} · {activePeriod.yearLabel} · Penilai 1 &amp; Penilai 2 ({activeIndicators.length} Indikator)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                downloadPkkmAsXlsx(
                  activeInstitution.profileData,
                  p1Scores,
                  p2Scores,
                  activePeriod.yearLabel,
                  activeIndicators,
                  evidenceFiles,
                  recommendations
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export XLSX (PKKM v.26)</span>
            </button>
          </div>
        </div>

        {/* Strict Dual Assessor Completeness Warning (Excel Gate) */}
        {rekap.incompleteWarning && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block">{rekap.incompleteWarning}</strong>
              <p className="text-amber-800 mt-0.5 tabular-nums">
                Status Saat Ini — Penilai 1: <strong>{rekap.penilai1.scoredIndicators}/{rekap.penilai1.totalIndicators}</strong> indikator · Penilai 2: <strong>{rekap.penilai2.scoredIndicators}/{rekap.penilai2.totalIndicators}</strong> indikator. Nilai Kinerja Tahunan &amp; Predikat resmi baru ditetapkan setelah kedua penilai menilai lengkap seluruh indikator.
              </p>
            </div>
          </div>
        )}

        {/* Formula Verification Notice (Strict adherence to Section B & N) */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-800">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block">Status Verifikasi Rumus Master Excel (Sheet Setting)</strong>
              <p className="text-slate-600 mt-0.5">{rekap.formulaVerificationNotice}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              updatePeriodMeta(activePeriod.periodId, {
                formulaVerified: !activePeriod.formulaVerified,
              })
            }
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
              activePeriod.formulaVerified
                ? 'bg-emerald-700 text-white'
                : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-100'
            }`}
          >
            {activePeriod.formulaVerified ? 'Rumus Terverifikasi' : 'Tandai Terverifikasi'}
          </button>
        </div>

        {/* Official Rekap Nilai Table mirroring PKKM_v.26 Rekap Nilai Sheet */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <th className="py-3 px-3 border-r border-slate-200 w-12 text-center">No.</th>
                <th className="py-3 px-3 border-r border-slate-200">Tugas Utama / Komponen</th>
                <th className="py-3 px-3 border-r border-slate-200 text-right">Skor P1</th>
                <th className="py-3 px-3 border-r border-slate-200 text-right">Skor P2</th>
                <th className="py-3 px-3 border-r border-slate-200 text-right">Rata-rata Skor</th>
                <th className="py-3 px-3 text-right">Capaian (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 tabular-nums">
              {rekap.rataRataKomponen.map((row) => (
                <tr key={row.komponenCode}>
                  <td className="py-3 px-3 border-r border-slate-200 text-center font-mono">
                    {row.komponenNomor}.
                  </td>
                  <td className="py-3 px-3 border-r border-slate-200 font-semibold text-slate-900">
                    {row.komponenNama}
                  </td>
                  <td className="py-3 px-3 border-r border-slate-200 text-right font-mono">
                    {row.p1Skor}
                  </td>
                  <td className="py-3 px-3 border-r border-slate-200 text-right font-mono">
                    {row.p2Skor}
                  </td>
                  <td className="py-3 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900">
                    {row.rataSkor.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                    {row.rataNilai100.toFixed(1)}%
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <td className="py-3 px-3 border-r border-slate-200" />
                <td className="py-3 px-3 border-r border-slate-200">
                  Jumlah Skor (Maks. {rekap.penilai1.maxSkorTotal})
                </td>
                <td className="py-3 px-3 border-r border-slate-200 text-right font-mono">
                  {rekap.penilai1.jumlahSkor}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 text-right font-mono">
                  {rekap.penilai2.jumlahSkor}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 text-right font-mono">
                  {rekap.jumlahSkorRataRata.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-right font-mono">
                  {rekap.nilaiKinerjaTahunan.toFixed(1)}%
                </td>
              </tr>
              <tr className="bg-slate-50 font-semibold">
                <td className="py-3 px-3 border-r border-slate-200" />
                <td className="py-3 px-3 border-r border-slate-200">Nilai Kinerja (Skala 100)</td>
                <td className="py-3 px-3 border-r border-slate-200 text-right font-mono">
                  {rekap.penilai1.isComplete ? rekap.penilai1.nilaiKinerja.toFixed(2) : 'Belum Lengkap'}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 text-right font-mono">
                  {rekap.penilai2.isComplete ? rekap.penilai2.nilaiKinerja.toFixed(2) : 'Belum Lengkap'}
                </td>
                <td colSpan={2} className="py-3 px-3 text-right font-mono text-emerald-800">
                  {rekap.isBothComplete && rekap.finalNilaiKinerjaTahunan !== null
                    ? rekap.finalNilaiKinerjaTahunan.toFixed(2)
                    : 'Belum Final'}
                </td>
              </tr>
              <tr className="bg-emerald-50 font-bold text-emerald-950">
                <td className="py-3.5 px-3 border-r border-slate-200" />
                <td className="py-3.5 px-3 border-r border-slate-200">
                  Nilai Kinerja Tahunan &amp; Predikat Resmi
                </td>
                <td colSpan={4} className="py-3.5 px-3 text-right font-mono text-base">
                  {rekap.isBothComplete && rekap.finalNilaiKinerjaTahunan !== null
                    ? `${rekap.finalNilaiKinerjaTahunan.toFixed(2)} — ${rekap.finalPredikat}`
                    : 'BELUM FINAL (Menunggu Kelengkapan 100% P1 & P2)'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SVG Bar Comparison Chart (Format 8 Visualization) */}
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <strong className="text-slate-900">Grafik Perbandingan Capaian Penilai 1 vs Penilai 2 per Komponen (%)</strong>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 text-slate-700">
                <span className="w-3 h-3 rounded-xs bg-emerald-700 inline-block" /> Penilai 1
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-700">
                <span className="w-3 h-3 rounded-xs bg-amber-600 inline-block" /> Penilai 2
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {rekap.rataRataKomponen.map((row) => (
              <div key={row.komponenCode} className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="font-semibold text-slate-800 truncate">
                  {row.komponenNomor}. {row.komponenNama}
                </div>
                <div className="space-y-1.5 tabular-nums">
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[11px] text-slate-500">Penilai 1</span>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-700 rounded-full" style={{ width: `${row.p1Nilai100}%` }} />
                    </div>
                    <span className="w-12 text-right font-mono text-[11px] font-bold">{row.p1Nilai100.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[11px] text-slate-500">Penilai 2</span>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-600 rounded-full" style={{ width: `${row.p2Nilai100}%` }} />
                    </div>
                    <span className="w-12 text-right font-mono text-[11px] font-bold">{row.p2Nilai100.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations from Penilai 1 & 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <strong className="text-slate-900 block">Rekomendasi Penilai 1:</strong>
            <p className="text-slate-600">{p1Note?.recommendation || 'Belum ada catatan rekomendasi dari Penilai 1.'}</p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <strong className="text-slate-900 block">Rekomendasi Penilai 2:</strong>
            <p className="text-slate-600">{p2Note?.recommendation || 'Belum ada catatan rekomendasi dari Penilai 2.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const LaporanHubView: React.FC<{ initialTab?: string }> = ({ initialTab }) => {
  const {
    activeInstitution,
    activePeriod,
    activeIndicators,
    p1Scores,
    p2Scores,
    p1Note,
    p2Note,
    evidenceFiles,
    recommendations,
    generatedDocs,
    responses,
    pendingQuickPrint,
    setPendingQuickPrint,
  } = useSaas();
  const [subMode, setSubMode] = useState<'print' | 'presentation'>('print');

  const handleExportJson = () => {
    const payload = {
      institution: activeInstitution,
      period: activePeriod,
      p1Scores,
      p2Scores,
      responses,
      evidenceFiles,
      recommendations,
      generatedDocs,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `pkkm_${activeInstitution.institutionId}_${activePeriod.yearLabel}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-4">
      <div className="no-print bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubMode('print')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer ${
              subMode === 'print' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Laporan Resmi A4 &amp; Format 1–10 Kemenag</span>
          </button>
          <button
            type="button"
            onClick={() => setSubMode('presentation')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer ${
              subMode === 'presentation' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            <span>Slide Presentasi 16:9</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() =>
              downloadPkkmAsXlsx(
                activeInstitution.profileData,
                p1Scores,
                p2Scores,
                activePeriod.yearLabel,
                activeIndicators,
                evidenceFiles,
                recommendations
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>XLSX</span>
          </button>
          <button
            type="button"
            onClick={() =>
              downloadPkkmAsZip(
                activeInstitution.profileData,
                p1Scores,
                p2Scores,
                generatedDocs,
                activePeriod.yearLabel,
                activeIndicators,
                evidenceFiles,
                recommendations
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileArchive className="w-3.5 h-3.5 text-emerald-700" />
            <span>Unduh Bundel ZIP</span>
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>Backup JSON</span>
          </button>
        </div>
      </div>

      {subMode === 'print' ? (
        <PrintView
          data={activeInstitution.profileData}
          onBackToEdit={() => setSubMode('presentation')}
          p1Scores={p1Scores}
          p2Scores={p2Scores}
          p1Note={p1Note?.recommendation}
          p2Note={p2Note?.recommendation}
          generatedDocs={generatedDocs}
          responses={responses}
          evidenceFiles={evidenceFiles}
          recommendations={recommendations}
          indicators={activeIndicators}
          periodLabel={activePeriod.yearLabel}
          initialTab={initialTab as any}
          autoPrintOnMount={pendingQuickPrint}
          onAutoPrintConsumed={() => setPendingQuickPrint(false)}
        />
      ) : (
        <PresentationView
          data={activeInstitution.profileData}
          onBackToEdit={() => setSubMode('print')}
        />
      )}
    </div>
  );
};

export const ArsipTahunanView: React.FC = () => {
  const { activeRole, periods, activePeriod, setActivePeriodId, createPeriod, updatePeriodMeta } = useSaas();
  const [newYear, setNewYear] = useState('PKKM 2027');
  const [startDate, setStartDate] = useState('2027-01-01');
  const [endDate, setEndDate] = useState('2027-12-31');

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Archive className="w-5 h-5 text-emerald-700" />
              <span>Periode Penilaian &amp; Arsip Tahunan</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Setiap tahun penilaian tersimpan terpisah. Periode yang diarsipkan tidak dapat diubah tanpa pembukaan kembali oleh Super Admin.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newYear.trim()) return;
            createPeriod(newYear.trim(), startDate, endDate);
          }}
          className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs items-end"
        >
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Label Periode Baru</label>
            <input
              type="text"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Tanggal Selesai</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Periode</span>
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {periods.map((p) => {
          const isCurrent = p.periodId === activePeriod.periodId;
          return (
            <div
              key={p.periodId}
              className={`bg-white border rounded-xl p-5 space-y-3 ${
                isCurrent ? 'border-emerald-600 ring-1 ring-emerald-600' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-slate-900">{p.yearLabel}</span>
                <span
                  className={`text-xs font-semibold ${
                    p.status === 'archived' ? 'text-slate-500' : 'text-emerald-700'
                  }`}
                >
                  {p.status === 'archived' ? 'Diarsipkan' : 'Aktif'}
                </span>
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                <div>Rentang: {p.startDate} s/d {p.endDate}</div>
                <div>Instrumen: {p.instrumentVersionId}</div>
                <div>Penilai 1: {p.p1Finalized ? 'Final' : 'Proses'} · Penilai 2: {p.p2Finalized ? 'Final' : 'Proses'}</div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActivePeriodId(p.periodId)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                    isCurrent
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  {isCurrent ? 'Periode Aktif' : 'Pilih Periode'}
                </button>
                {(activeRole === 'SUPER_ADMIN' || activeRole === 'ADMIN_LEMBAGA') && (
                  <button
                    type="button"
                    onClick={() =>
                      updatePeriodMeta(p.periodId, {
                        status: p.status === 'archived' ? 'in_progress' : 'archived',
                      })
                    }
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                  >
                    {p.status === 'archived' ? 'Buka' : 'Arsipkan'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const SettingsTenantView: React.FC = () => {
  const {
    activeRole,
    institutions,
    createInstitution,
    toggleInstitutionStatus,
    setActiveInstitutionId,
    memberships,
    teamInvitations,
    addTeamMember,
    revokeTeamInvitation,
    instrumentVersions,
    activeInstrumentVersion,
    importInstrumentFromFile,
    activateInstrumentVersion,
    toggleSettingSheetVerified,
    masterAssessors,
    saveMasterAssessor,
    deleteMasterAssessor,
    auditLogs,
    resetLocalToDefault,
  } = useSaas();

  const [newName, setNewName] = useState('');
  const [newNsm, setNewNsm] = useState('');
  const [newNpsn, setNewNpsn] = useState('');
  const [newKepala, setNewKepala] = useState('');

  const [memberEmail, setMemberEmail] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState<UserRole>('PENILAI_1');

  // Master Penilai Form
  const [assNama, setAssNama] = useState('');
  const [assNip, setAssNip] = useState('');
  const [assPangkat, setAssPangkat] = useState('');
  const [assJabatan, setAssJabatan] = useState('Pengawas Madrasah');
  const [assUnit, setAssUnit] = useState('Kemenag Kab. Cirebon');

  // Excel (.xlsm/.xlsx) & CSV Instrument Importer
  const [csvVersionNumber, setCsvVersionNumber] = useState('v.26.2');
  const [csvTitle, setCsvTitle] = useState('Instrumen PKKM RA Import Workbook');
  const [csvChangelog, setCsvChangelog] = useState('Pembaruan instrumen dari workbook resmi PKKM_v.26 untuk RA.xlsm');
  const [csvSettingVerified, setCsvSettingVerified] = useState(false);
  const [csvResultMsg, setCsvResultMsg] = useState('');
  const [csvErrorMsg, setCsvErrorMsg] = useState('');
  const [isImportingFile, setIsImportingFile] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const handleInstrumentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvErrorMsg('');
    setCsvResultMsg('');
    setIsImportingFile(true);
    try {
      const res = await importInstrumentFromFile(file, {
        versionNumber: csvVersionNumber.trim() || 'v.26-custom',
        title: csvTitle.trim() || file.name,
        changelog: csvChangelog.trim(),
        settingSheetVerified: csvSettingVerified,
        activateImmediately: true,
      });
      const settingNote = res.settingSummary?.settingEntries.length
        ? `Sheet Setting terdeteksi (${res.settingSummary.settingEntries.length} entri).`
        : 'Sheet Setting kosong / tidak ditemukan pada berkas.';
      setCsvResultMsg(
        `Terimpor ${res.count} indikator dari ${file.name} (${res.anomalies.length} catatan verifikasi). ${settingNote}`
      );
    } catch (err: any) {
      setCsvErrorMsg(err?.message || 'Gagal memproses berkas instrumen Excel/CSV.');
    } finally {
      setIsImportingFile(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Multi-RA Tenant Provisioning */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Pengaturan Multi-RA, Master Penilai &amp; Impor Instrumen
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola tenant lembaga RA, direktori pengawas penilai lintas lembaga, dan versi instrumen {activeInstrumentVersion.versionNumber}.
            </p>
          </div>
          {confirmResetOpen ? (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  resetLocalToDefault();
                  setConfirmResetOpen(false);
                }}
                className="px-3 py-2 bg-red-600 text-white font-semibold rounded-lg cursor-pointer"
              >
                Ya, Reset Cache Lokal
              </button>
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-3 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg cursor-pointer"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data Default</span>
            </button>
          )}
        </div>

        {/* Add New RA Form (Initializes Clean via createCleanPpkmData) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            createInstitution({
              name: newName.trim(),
              nsm: newNsm.trim() || '-',
              npsn: newNpsn.trim() || '-',
              kepalaNama: newKepala.trim() || 'Kepala RA',
            });
            setNewName('');
            setNewNsm('');
            setNewNpsn('');
            setNewKepala('');
          }}
          className="grid grid-cols-1 sm:grid-cols-6 gap-3 text-xs items-end"
        >
          <div className="sm:col-span-2">
            <label className="font-semibold text-slate-700 block mb-1">Tambah Lembaga RA Baru (Mulai Bersih)</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Contoh: RA Akhlakul Karimah"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">NSM</label>
            <input
              type="text"
              value={newNsm}
              onChange={(e) => setNewNsm(e.target.value)}
              placeholder="10123209..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">NPSN</label>
            <input
              type="text"
              value={newNpsn}
              onChange={(e) => setNewNpsn(e.target.value)}
              placeholder="69986..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Kepala RA</label>
            <input
              type="text"
              value={newKepala}
              onChange={(e) => setNewKepala(e.target.value)}
              placeholder="Nama Kepala RA"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah RA</span>
          </button>
        </form>

        {/* Institution Control List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 px-3">Lembaga</th>
                <th className="py-2 px-3">Masa Aktif</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-right">Kontrol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {institutions.map((i) => (
                <tr key={i.institutionId}>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{i.name}</td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">{i.expiresAt || '2027-12-31'}</td>
                  <td className="py-2.5 px-3">
                    <span className={i.status === 'active' ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'}>
                      {i.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => setActiveInstitutionId(i.institutionId)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md font-semibold cursor-pointer"
                    >
                      Buka
                    </button>
                    {activeRole === 'SUPER_ADMIN' && (
                      <button
                        type="button"
                        onClick={() => toggleInstitutionStatus(i.institutionId)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md font-semibold cursor-pointer"
                      >
                        {i.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Master Penilai Lintas Lembaga & CSV Instrument Importer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Master Penilai */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 text-xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-700" />
              <span>Master Data Penilai / Pengawas Lintas Lembaga</span>
            </h2>
            <p className="text-slate-500 mt-0.5">
              Pengawas yang terdaftar di sini muncul sebagai pilihan cepat pada menu Data Penilai di seluruh lembaga RA.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!assNama.trim()) return;
              saveMasterAssessor({
                nama: assNama.trim(),
                nip: assNip.trim() || '-',
                pangkatGol: assPangkat.trim() || '-',
                jabatan: assJabatan.trim() || 'Pengawas Madrasah',
                unitKerja: assUnit.trim() || 'Kemenag',
                status: 'active',
              });
              setAssNama('');
              setAssNip('');
              setAssPangkat('');
            }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200"
          >
            <input
              type="text"
              value={assNama}
              onChange={(e) => setAssNama(e.target.value)}
              placeholder="Nama Lengkap & Gelar Penilai"
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
            />
            <input
              type="text"
              value={assNip}
              onChange={(e) => setAssNip(e.target.value)}
              placeholder="NIP Pengawas"
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-mono"
            />
            <input
              type="text"
              value={assPangkat}
              onChange={(e) => setAssPangkat(e.target.value)}
              placeholder="Pangkat / Golongan"
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
            />
            <input
              type="text"
              value={assUnit}
              onChange={(e) => setAssUnit(e.target.value)}
              placeholder="Unit Kerja / Pokjawasmad"
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
            />
            <button
              type="submit"
              className="sm:col-span-2 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-md cursor-pointer"
            >
              Simpan ke Master Penilai
            </button>
          </form>

          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {masterAssessors.map((a) => (
              <div key={a.assessorId} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <strong className="text-slate-900 block">{a.nama}</strong>
                  <span className="text-slate-500 font-mono">
                    NIP. {a.nip} · {a.pangkatGol} · {a.unitKerja}
                  </span>
                </div>
                {activeRole === 'SUPER_ADMIN' && (
                  <button
                    type="button"
                    onClick={() => deleteMasterAssessor(a.assessorId)}
                    className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                    title="Hapus dari Master Penilai"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Super Admin Excel (.xlsm/.xlsx) & CSV Instrument Importer + Version Control */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 text-xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Master Instrumen, Versi &amp; Impor Excel/CSV (Super Admin)</span>
            </h2>
            <p className="text-slate-500 mt-0.5">
              Unggah workbook asli <em>PKKM_v.26 untuk RA.xlsm</em> (.xlsm/.xlsx/.xls) atau CSV untuk migrasi versi instrumen beserta inspeksi otomatis Sheet Setting &amp; Rekap Nilai.
            </p>
          </div>

          {activeRole === 'SUPER_ADMIN' && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={csvVersionNumber}
                  onChange={(e) => setCsvVersionNumber(e.target.value)}
                  placeholder="Nomor Versi (mis. v.26.2)"
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
                />
                <input
                  type="text"
                  value={csvTitle}
                  onChange={(e) => setCsvTitle(e.target.value)}
                  placeholder="Judul Versi Instrumen"
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
                />
              </div>
              <input
                type="text"
                value={csvChangelog}
                onChange={(e) => setCsvChangelog(e.target.value)}
                placeholder="Catatan perubahan versi (changelog)..."
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
              />
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={csvSettingVerified}
                  onChange={(e) => setCsvSettingVerified(e.target.checked)}
                  className="accent-emerald-700"
                />
                <span>Sheet &ldquo;Setting&rdquo; rumus bobot Excel sudah diverifikasi langsung</span>
              </label>

              <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{isImportingFile ? 'Memproses Workbook...' : 'Pilih & Impor Excel (.xlsm/.xlsx) / CSV'}</span>
                <input
                  type="file"
                  accept=".xlsm,.xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleInstrumentFileUpload}
                  disabled={isImportingFile}
                  className="hidden"
                />
              </label>
              {csvResultMsg && <p className="text-emerald-800 font-semibold">{csvResultMsg}</p>}
              {csvErrorMsg && <p className="text-red-700 font-semibold">{csvErrorMsg}</p>}
            </div>
          )}

          {/* Version History List */}
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {instrumentVersions.map((ver) => (
              <div key={ver.versionId} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <strong className="text-slate-900">{ver.versionNumber}</strong> — {ver.title}
                  </div>
                  <span className={ver.isActive ? 'text-emerald-700 font-bold' : 'text-slate-400 font-semibold'}>
                    {ver.isActive ? 'Aktif' : 'Arsip'}
                  </span>
                </div>
                <div className="text-slate-600 tabular-nums">
                  {ver.indicators.length} indikator · Sumber: {ver.sourceFile} ·{' '}
                  <strong className={ver.settingSheetVerified ? 'text-emerald-700' : 'text-amber-700'}>
                    {ver.settingSheetVerified ? 'Setting Excel Terverifikasi' : 'Perlu Verifikasi Sheet Setting'}
                  </strong>
                </div>
                {ver.settingSummary && (
                  <div className="text-[11px] bg-white border border-slate-200 rounded p-2 space-y-1 text-slate-700">
                    <div>
                      <strong>Sheet Terdeteksi ({ver.settingSummary.detectedSheets.length}):</strong>{' '}
                      {ver.settingSummary.detectedSheets.join(', ')}
                    </div>
                    {ver.settingSummary.indicatorSheetUsed && (
                      <div>
                        <strong>Sheet Indikator:</strong> {ver.settingSummary.indicatorSheetUsed} ·{' '}
                        <strong>Entri Sheet Setting:</strong> {ver.settingSummary.settingEntries.length} entri
                      </div>
                    )}
                    {ver.settingSummary.rekapFormulas.length > 0 && (
                      <div className="font-mono text-[10px] text-slate-600 truncate">
                        Sampel Rumus Rekap:{' '}
                        {ver.settingSummary.rekapFormulas
                          .slice(0, 3)
                          .map((f) => `${f.cell}(${f.formula})`)
                          .join(' | ')}
                      </div>
                    )}
                  </div>
                )}
                {ver.anomalies && ver.anomalies.length > 0 && (
                  <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                    <strong>Catatan Verifikasi:</strong> {ver.anomalies.join(' | ')}
                  </div>
                )}
                {activeRole === 'SUPER_ADMIN' && (
                  <div className="flex items-center gap-2 pt-1">
                    {!ver.isActive && (
                      <button
                        type="button"
                        onClick={() => activateInstrumentVersion(ver.versionId)}
                        className="px-2.5 py-1 bg-emerald-700 text-white rounded font-semibold cursor-pointer"
                      >
                        Aktifkan Versi Ini
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleSettingSheetVerified(ver.versionId)}
                      className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 rounded font-semibold cursor-pointer"
                    >
                      {ver.settingSheetVerified ? 'Batalkan Verifikasi Setting' : 'Tandai Setting Terverifikasi'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Access & Audit Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-700" />
            <span>Pengguna &amp; Penilai Lembaga Aktif</span>
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!memberEmail.trim() || !memberName.trim()) return;
              addTeamMember(memberEmail.trim(), memberName.trim(), memberRole);
              setMemberEmail('');
              setMemberName('');
            }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs"
          >
            <input
              type="text"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="Nama lengkap"
              className="px-3 py-2 border border-slate-200 rounded-lg"
            />
            <input
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="Email Google"
              className="px-3 py-2 border border-slate-200 rounded-lg"
            />
            <div className="flex gap-1.5">
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value as UserRole)}
                className="flex-1 px-2 py-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="ADMIN_LEMBAGA">Admin Lembaga</option>
                <option value="KEPALA_RA">Kepala RA</option>
                <option value="PENILAI_1">Penilai 1</option>
                <option value="PENILAI_2">Penilai 2</option>
              </select>
              <button
                type="submit"
                className="px-3 py-2 bg-emerald-700 text-white font-semibold rounded-lg cursor-pointer"
              >
                Tambah
              </button>
            </div>
          </form>

          <div className="space-y-3 text-xs">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Keanggotaan Aktif ({memberships.length})
              </div>
              {memberships.length === 0 ? (
                <p className="text-slate-500 py-2">Belum ada akun Google yang aktif mengklaim akses pada lembaga ini.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {memberships.map((m) => (
                    <div key={m.membershipId} className="py-2 flex items-center justify-between gap-2">
                      <div>
                        <strong className="text-slate-900 block">{m.displayName}</strong>
                        <span className="text-slate-500">{m.userEmail}</span>
                      </div>
                      <span className="font-semibold text-emerald-700">{m.role.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Undangan Email Google ({teamInvitations.length})
              </div>
              {teamInvitations.length === 0 ? (
                <p className="text-slate-500 py-1.5">
                  Belum ada undangan email tertunda. Undang Kepala RA atau Penilai agar peran terkunci otomatis saat mereka login Google.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
                  {teamInvitations.map((inv) => (
                    <div key={inv.inviteId} className="py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <strong className="text-slate-900 block truncate">{inv.displayName}</strong>
                        <span className="text-slate-500 block truncate">{inv.invitedEmail} · {inv.role.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-semibold ${
                            inv.status === 'claimed'
                              ? 'text-emerald-700'
                              : inv.status === 'revoked'
                              ? 'text-red-600'
                              : 'text-amber-700'
                          }`}
                        >
                          {inv.status === 'claimed'
                            ? 'Aktif (Diklaim)'
                            : inv.status === 'revoked'
                            ? 'Dicabut'
                            : 'Menunggu Login'}
                        </span>
                        {inv.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => revokeTeamInvitation(inv.inviteId)}
                            className="px-2 py-1 text-[11px] bg-red-50 text-red-700 hover:bg-red-100 rounded font-semibold cursor-pointer"
                          >
                            Cabut
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 text-xs">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>Audit Log Terbaru</span>
          </h2>
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {auditLogs.slice(0, 15).map((log, i) => (
              <div key={log.logId || i} className="py-2 flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono font-semibold text-slate-800">{log.action}</span>
                  <p className="text-slate-600">{log.summary}</p>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">{log.actorRole}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            Versi Master Aktif: {MASTER_INSTRUMENT_META.versionNumber} ({activeInstrumentVersion.indicators.length} butir).
          </p>
        </div>
      </div>
    </div>
  );
};
