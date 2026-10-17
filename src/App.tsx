import React, { useState, useEffect } from 'react';
import { PpkmData } from './types/ppkm';
import { DEFAULT_PPKM_DATA } from './data/defaultPpkmData';
import { HeaderNav } from './components/HeaderNav';
import { GeneralEditor } from './components/Editor/GeneralEditor';
import { PtkEditor } from './components/Editor/PtkEditor';
import { StudentsSarprasEditor } from './components/Editor/StudentsSarprasEditor';
import { ProgramsEditor } from './components/Editor/ProgramsEditor';
import { PhotosEditor } from './components/Editor/PhotosEditor';
import { AssessmentEditor } from './components/Editor/AssessmentEditor';
import { PrintView } from './components/Print/PrintView';
import { 
  Building2, 
  Users, 
  GraduationCap, 
  Calendar, 
  Camera, 
  Award, 
  Printer, 
  CheckCircle,
  FileCheck2,
  Sparkles
} from 'lucide-react';

const STORAGE_KEY = 'SIM_PPKM_DATA_V1';

export default function App() {
  const [data, setData] = useState<PpkmData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved PPKM data:', e);
    }
    return DEFAULT_PPKM_DATA;
  });

  const [activeTab, setActiveTab] = useState<
    'general' | 'ptk' | 'students_sarpras' | 'programs' | 'photos' | 'assessment' | 'print'
  >('general');

  const [saveStatus, setSaveStatus] = useState<string>('');

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSaveStatus('Tersimpan otomatis');
      const timer = setTimeout(() => setSaveStatus(''), 2500);
      return () => clearTimeout(timer);
    } catch (e) {
      console.warn('Storage quota or error:', e);
    }
  }, [data]);

  const handleResetData = () => {
    if (confirm('Reset semua formulir ke data standar MIN 8 Cirebon?')) {
      setData(DEFAULT_PPKM_DATA);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `berkas_ppkm_${data.institution.namaLembaga.toLowerCase().replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.institution && parsed.principal) {
          setData(parsed);
          alert('Berhasil mengimpor data berkas PPKM!');
        } else {
          alert('Format file JSON tidak sesuai struktur PPKM.');
        }
      } catch (err) {
        alert('Gagal membaca file JSON.');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleDirectPrint = () => {
    setActiveTab('print');
    setTimeout(() => {
      window.print();
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Top Header & Navigation */}
      <HeaderNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetData={handleResetData}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onDirectPrint={handleDirectPrint}
        institutionName={`${data.institution.namaLembaga} (${data.institution.periodePenilaian})`}
        logoUrl={data.institution.logoUrl}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Quick Hero Banner only on edit tabs */}
        {activeTab !== 'print' && (
          <div className="no-print bg-white border-b border-slate-200 py-4 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Aplikasi Penilaian Kinerja Kepala Madrasah (PPKM)</span>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
                    Siap Cetak A4
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Input data profil, foto kegiatan, guru, sarpras, dan indikator. Dokumen tersusun rapi otomatis dan presisi sesuai standar format Kemenag.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {saveStatus && (
                  <span className="text-xs text-emerald-700 font-medium flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{saveStatus}</span>
                  </span>
                )}
                <button
                  onClick={() => setActiveTab('print')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Preview Cetak</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Profil Lembaga & Biodata Kepala */}
        {activeTab === 'general' && (
          <GeneralEditor
            institution={data.institution}
            principal={data.principal}
            evaluators={data.evaluators}
            onUpdateInstitution={(updated) =>
              setData({ ...data, institution: { ...data.institution, ...updated } })
            }
            onUpdatePrincipal={(updated) =>
              setData({ ...data, principal: { ...data.principal, ...updated } })
            }
            onUpdateEvaluators={(updated) =>
              setData({ ...data, evaluators: { ...data.evaluators, ...updated } })
            }
          />
        )}

        {/* Tab 2: PTK (Pendidik dan Tenaga Kependidikan) */}
        {activeTab === 'ptk' && (
          <PtkEditor
            ptkList={data.ptkList}
            onUpdatePtkList={(updated) => setData({ ...data, ptkList: updated })}
          />
        )}

        {/* Tab 3: Siswa & Sarana Prasarana */}
        {activeTab === 'students_sarpras' && (
          <StudentsSarprasEditor
            students={data.students}
            studentTrends={data.studentTrends}
            graduates={data.graduates}
            parentDemographics={data.parentDemographics}
            buildings={data.buildings}
            inventory={data.inventory}
            onUpdateStudents={(updated) => setData({ ...data, students: updated })}
            onUpdateStudentTrends={(updated) => setData({ ...data, studentTrends: updated })}
            onUpdateGraduates={(updated) => setData({ ...data, graduates: updated })}
            onUpdateParentDemographics={(updated) =>
              setData({ ...data, parentDemographics: updated })
            }
            onUpdateBuildings={(updated) => setData({ ...data, buildings: updated })}
            onUpdateInventory={(updated) => setData({ ...data, inventory: updated })}
          />
        )}

        {/* Tab 4: Program Kerja & Evaluasi */}
        {activeTab === 'programs' && (
          <ProgramsEditor
            programGoals={data.programGoals}
            activityReports={data.activityReports}
            onUpdateProgramGoals={(updated) => setData({ ...data, programGoals: updated })}
            onUpdateActivityReports={(updated) => setData({ ...data, activityReports: updated })}
          />
        )}

        {/* Tab 5: Galeri Foto Bukti Fisik */}
        {activeTab === 'photos' && (
          <PhotosEditor
            photoEvidences={data.photoEvidences}
            onUpdatePhotoEvidences={(updated) => setData({ ...data, photoEvidences: updated })}
            onNavigateToPrint={() => setActiveTab('print')}
          />
        )}

        {/* Tab 6: Instrumen Skor PPKM */}
        {activeTab === 'assessment' && (
          <AssessmentEditor
            assessmentScores={data.assessmentScores}
            onUpdateAssessmentScores={(updated) =>
              setData({ ...data, assessmentScores: updated })
            }
          />
        )}

        {/* Tab 7: Tampilan Cetak Dokumen A4 */}
        {activeTab === 'print' && (
          <PrintView
            data={data}
            onBackToEdit={() => setActiveTab('general')}
          />
        )}
      </main>

      {/* Footer (Hidden on print) */}
      <footer className="no-print bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SIM-PPKM Madrasah &copy; 2026 Kementerian Agama RI · Berkas Portofolio Kepala Madrasah</span>
          <span className="text-slate-400">Format Kertas Standar Cetak: A4 Portrait (210 x 297 mm)</span>
        </div>
      </footer>

    </div>
  );
}
