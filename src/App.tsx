import React, { useState } from 'react';
import { Building2, LogOut, Plus } from 'lucide-react';
import { SaasProvider, useSaas } from './context/SaasContext';
import { SaasShell } from './components/Saas/SaasShell';
import { DashboardView } from './components/Saas/DashboardView';
import { QuickExpressFlowView } from './components/Saas/QuickExpressFlowView';
import { CompanyProfilePptView } from './components/Saas/CompanyProfilePptView';
import { InstrumentPenilaianView } from './components/Saas/InstrumentPenilaianView';
import { DocumentGeneratorView } from './components/Saas/DocumentGeneratorView';
import { EvidenceManagerView } from './components/Saas/EvidenceManagerView';
import { AiAssistantView } from './components/Saas/AiAssistantView';
import { AssessorScoringView } from './components/Saas/AssessorScoringView';
import { PemeriksaanKelengkapanView } from './components/Saas/PemeriksaanKelengkapanView';
import { HasilPenilaianView } from './components/Saas/HasilPenilaianView';
import { RekomendasiRtlView } from './components/Saas/RekomendasiRtlView';
import { AuditLogView } from './components/Saas/AuditLogView';
import {
  ArsipTahunanView,
  LaporanHubView,
  RekapNilaiView,
  SettingsTenantView,
} from './components/Saas/RekapitulasiArsipView';
import { PrintTabKey } from './components/Print/PrintView';
import { GeneralEditor } from './components/Editor/GeneralEditor';
import { PtkEditor } from './components/Editor/PtkEditor';
import { StructuralEditor } from './components/Editor/StructuralEditor';
import { StudentsSarprasEditor } from './components/Editor/StudentsSarprasEditor';
import { ProgramsEditor } from './components/Editor/ProgramsEditor';
import { EMPTY_ADMIN_DOCS } from './data/cleanPpkmFactory';
import { MasterIndicatorDef } from './types/saas';

function CleanCloudOnboardingCard() {
  const { firebaseUser, createInstitution, signOutUser, isCloudSyncing } = useSaas();
  const [name, setName] = useState('');
  const [nsm, setNsm] = useState('');
  const [npsn, setNpsn] = useState('');
  const [kepalaNama, setKepalaNama] = useState(firebaseUser?.displayName || '');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createInstitution({
        name: name.trim(),
        nsm: nsm.trim() || '-',
        npsn: npsn.trim() || '-',
        kepalaNama: kepalaNama.trim() || firebaseUser?.displayName || 'Kepala RA',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-6 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Selamat Datang, {firebaseUser?.displayName || firebaseUser?.email}
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              {isCloudSyncing
                ? 'Sedang memeriksa undangan keanggotaan lembaga RA di Cloud Firestore...'
                : 'Akun Google Anda belum terhubung dengan lembaga RA mana pun. Daftarkan lembaga RA baru (mulai bersih) atau tunggu undangan email dari Admin Lembaga / Super Admin.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={signOutUser}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg shrink-0 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar</span>
        </button>
      </div>

      <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="sm:col-span-2">
          <label className="font-semibold text-slate-700 block mb-1">Nama Lembaga RA Baru</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: RA Nurul Falah"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="font-semibold text-slate-700 block mb-1">NSM</label>
          <input
            type="text"
            value={nsm}
            onChange={(e) => setNsm(e.target.value)}
            placeholder="10123209..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
          />
        </div>
        <div>
          <label className="font-semibold text-slate-700 block mb-1">NPSN</label>
          <input
            type="text"
            value={npsn}
            onChange={(e) => setNpsn(e.target.value)}
            placeholder="69986..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="font-semibold text-slate-700 block mb-1">Nama Kepala RA</label>
          <input
            type="text"
            value={kepalaNama}
            onChange={(e) => setKepalaNama(e.target.value)}
            placeholder="Nama lengkap & gelar Kepala RA"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div className="sm:col-span-2 pt-1">
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-semibold rounded-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{submitting ? 'Menyiapkan Ruang Kerja Bersih...' : 'Buat Lembaga RA Baru (Mulai Bersih)'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function SaasWorkspaceRouter() {
  const {
    activeMenu,
    setActiveMenu,
    activeInstitution,
    hasNoCloudInstitution,
    masterAssessors,
    updateActiveInstitutionData,
    setPendingQuickPrint,
  } = useSaas();

  const [focusedIndicatorId, setFocusedIndicatorId] = useState<string | null>(null);
  const [docGenIndicator, setDocGenIndicator] = useState<MasterIndicatorDef | null>(null);
  const [evidenceIndicatorId, setEvidenceIndicatorId] = useState<string | null>(null);
  const [aiIndicator, setAiIndicator] = useState<MasterIndicatorDef | null>(null);
  const [printInitialTab, setPrintInitialTab] = useState<PrintTabKey | undefined>(undefined);

  if (hasNoCloudInstitution || activeInstitution.institutionId === 'onboarding-ra') {
    return <CleanCloudOnboardingCard />;
  }

  const ppkmData = activeInstitution.profileData;
  const activeSectionFilter =
    activeMenu === 'profil_lembaga' ||
    activeMenu === 'data_kepala' ||
    activeMenu === 'data_penilai'
      ? activeMenu
      : 'ALL';

  const renderGeneralWrapper = () => (
    <GeneralEditor
      institution={ppkmData.institution}
      principal={ppkmData.principal}
      evaluators={ppkmData.evaluators}
      adminDocs={ppkmData.adminDocs || EMPTY_ADMIN_DOCS}
      masterAssessors={masterAssessors}
      sectionFilter={activeSectionFilter}
      onUpdateInstitution={(updated) =>
        updateActiveInstitutionData((prev) => ({
          ...prev,
          institution: { ...prev.institution, ...updated },
        }))
      }
      onUpdatePrincipal={(updated) =>
        updateActiveInstitutionData((prev) => ({
          ...prev,
          principal: { ...prev.principal, ...updated },
        }))
      }
      onUpdateEvaluators={(updated) =>
        updateActiveInstitutionData((prev) => ({
          ...prev,
          evaluators: { ...prev.evaluators, ...updated },
        }))
      }
      onUpdateAdminDocs={(updated) =>
        updateActiveInstitutionData((prev) => ({
          ...prev,
          adminDocs: {
            ...(prev.adminDocs || EMPTY_ADMIN_DOCS),
            ...updated,
          },
        }))
      }
    />
  );

  const handleOpenPrintFromQuickFlow = (tab: PrintTabKey, autoPrint = false) => {
    setPrintInitialTab(tab);
    setPendingQuickPrint(autoPrint);
    setActiveMenu('laporan_pkkm');
  };

  switch (activeMenu) {
    case 'mode_cepat':
      return <QuickExpressFlowView onOpenPrint={handleOpenPrintFromQuickFlow} />;

    case 'company_profile_ppt':
      return <CompanyProfilePptView />;

    case 'dashboard':
      return (
        <DashboardView
          onJumpToIndicator={(id) => {
            setFocusedIndicatorId(id);
            setActiveMenu('instrumen_penilaian');
          }}
        />
      );

    case 'profil_lembaga':
    case 'data_kepala':
    case 'data_penilai':
      return (
        <div className="space-y-6">
          {renderGeneralWrapper()}
          {activeMenu === 'profil_lembaga' && (
            <StudentsSarprasEditor
              institution={ppkmData.institution}
              onUpdateInstitution={(updated) =>
                updateActiveInstitutionData((prev) => ({
                  ...prev,
                  institution: { ...prev.institution, ...updated },
                }))
              }
              students={ppkmData.students}
              studentTrends={ppkmData.studentTrends}
              graduates={ppkmData.graduates}
              parentDemographics={ppkmData.parentDemographics}
              buildings={ppkmData.buildings}
              inventory={ppkmData.inventory}
              onUpdateStudents={(students) =>
                updateActiveInstitutionData((prev) => ({ ...prev, students }))
              }
              onUpdateStudentTrends={(studentTrends) =>
                updateActiveInstitutionData((prev) => ({ ...prev, studentTrends }))
              }
              onUpdateGraduates={(graduates) =>
                updateActiveInstitutionData((prev) => ({ ...prev, graduates }))
              }
              onUpdateParentDemographics={(parentDemographics) =>
                updateActiveInstitutionData((prev) => ({ ...prev, parentDemographics }))
              }
              onUpdateBuildings={(buildings) =>
                updateActiveInstitutionData((prev) => ({ ...prev, buildings }))
              }
              onUpdateInventory={(inventory) =>
                updateActiveInstitutionData((prev) => ({ ...prev, inventory }))
              }
            />
          )}
        </div>
      );

    case 'data_guru':
      return (
        <div className="space-y-6">
          <PtkEditor
            ptkList={ppkmData.ptkList}
            onUpdatePtkList={(ptkList) =>
              updateActiveInstitutionData((prev) => ({ ...prev, ptkList }))
            }
          />
          <StructuralEditor
            structuralPositions={ppkmData.structuralPositions || []}
            ptkList={ppkmData.ptkList}
            onUpdateStructuralPositions={(structuralPositions) =>
              updateActiveInstitutionData((prev) => ({ ...prev, structuralPositions }))
            }
          />
        </div>
      );

    case 'periode_pkkm':
    case 'arsip_tahunan':
      return <ArsipTahunanView />;

    case 'instrumen_penilaian':
      return (
        <InstrumentPenilaianView
          focusedIndicatorId={focusedIndicatorId}
          onOpenDocGenerator={(ind) => {
            setDocGenIndicator(ind);
            setActiveMenu('administrasi_dokumen');
          }}
          onOpenEvidenceUpload={(indId) => {
            setEvidenceIndicatorId(indId);
            setActiveMenu('bukti_fisik');
          }}
          onAskAiForIndicator={(ind) => {
            setAiIndicator(ind);
            setActiveMenu('ai_assistant');
          }}
        />
      );

    case 'administrasi_dokumen':
      return <DocumentGeneratorView preselectedIndicator={docGenIndicator} />;

    case 'program_kerja':
      return (
        <ProgramsEditor
          programGoals={ppkmData.programGoals}
          activityReports={ppkmData.activityReports}
          onUpdateProgramGoals={(programGoals) =>
            updateActiveInstitutionData((prev) => ({ ...prev, programGoals }))
          }
          onUpdateActivityReports={(activityReports) =>
            updateActiveInstitutionData((prev) => ({ ...prev, activityReports }))
          }
        />
      );

    case 'bukti_fisik':
      return <EvidenceManagerView preselectedIndicatorId={evidenceIndicatorId} />;

    case 'pemeriksaan_kelengkapan':
      return (
        <PemeriksaanKelengkapanView
          onOpenAiAssistant={() => setActiveMenu('ai_assistant')}
          onJumpToMenu={(menu) => setActiveMenu(menu)}
          onJumpToIndicator={(id) => {
            setFocusedIndicatorId(id);
            setActiveMenu('instrumen_penilaian');
          }}
        />
      );

    case 'ai_assistant':
      return <AiAssistantView preselectedIndicator={aiIndicator} />;

    case 'penilaian_1':
      return <AssessorScoringView assessorRole="PENILAI_1" />;

    case 'penilaian_2':
      return <AssessorScoringView assessorRole="PENILAI_2" />;

    case 'hasil_penilaian':
      return (
        <HasilPenilaianView
          onOpenPrintFormat={() => {
            setPrintInitialTab('format5_hasil_p1');
            setActiveMenu('laporan_pkkm');
          }}
        />
      );

    case 'rekap_nilai':
      return <RekapNilaiView />;

    case 'rekomendasi_rtl':
      return (
        <RekomendasiRtlView
          onOpenPrintRtl={() => {
            setPrintInitialTab('format10_rtl');
            setActiveMenu('laporan_pkkm');
          }}
        />
      );

    case 'laporan_pkkm':
      return <LaporanHubView initialTab={printInitialTab} />;

    case 'audit_log':
      return <AuditLogView />;

    case 'pengaturan':
      return <SettingsTenantView />;

    default:
      return <QuickExpressFlowView onOpenPrint={handleOpenPrintFromQuickFlow} />;
  }
}

export default function App() {
  return (
    <SaasProvider>
      <SaasShell>
        <SaasWorkspaceRouter />
      </SaasShell>
    </SaasProvider>
  );
}
