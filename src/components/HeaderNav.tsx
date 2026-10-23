import React from 'react';
import { 
  FileText, 
  Printer, 
  RotateCcw, 
  Download, 
  Upload, 
  CheckCircle,
  Eye,
  Sliders,
  Camera,
  Award,
  MonitorPlay
} from 'lucide-react';

interface HeaderNavProps {
  activeTab: 'general' | 'ptk' | 'structural' | 'students_sarpras' | 'programs' | 'photos' | 'assessment' | 'presentation' | 'print';
  setActiveTab: (tab: 'general' | 'ptk' | 'structural' | 'students_sarpras' | 'programs' | 'photos' | 'assessment' | 'presentation' | 'print') => void;
  onResetData: () => void;
  onExportJson: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDirectPrint: () => void;
  institutionName: string;
  logoUrl?: string;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  activeTab,
  setActiveTab,
  onResetData,
  onExportJson,
  onImportJson,
  onDirectPrint,
  institutionName,
  logoUrl,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Zone */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-11 h-11 rounded-lg bg-emerald-50/80 border border-emerald-200 p-1 flex items-center justify-center overflow-hidden shadow-xs shrink-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo Lembaga"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <FileText className="w-5 h-5 text-emerald-700" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                  SIM-PKKM Madrasah
                </span>
                <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-sm border border-emerald-200">
                  Kemenag RI
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-xs sm:max-w-md">
                {institutionName || 'Penilaian Kinerja Kepala Madrasah'}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onResetData}
              title="Reset ke Contoh Data MIN 8 Cirebon"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Data MIN 8</span>
            </button>

            <button
              onClick={onExportJson}
              title="Ekspor Data Cadangan JSON"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Ekspor JSON</span>
            </button>

            <label className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Impor JSON</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={onImportJson}
                className="hidden"
              />
            </label>

            <button
              onClick={() => setActiveTab('presentation')}
              title="Tampilkan Mode Presentasi Slide PowerPoint & Company Profile (16:9)"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-300 transition-colors shadow-xs whitespace-nowrap cursor-pointer"
            >
              <MonitorPlay className="w-4 h-4 text-emerald-700" />
              <span>Mode PPT (16:9)</span>
            </button>

            <button
              onClick={onDirectPrint}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs whitespace-nowrap cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Dokumen PKKM</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center space-x-1 overflow-x-auto py-2 border-t border-slate-100 scrollbar-none text-xs font-medium">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'general'
                ? 'bg-emerald-50 text-emerald-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>1. Profil & Lembaga</span>
          </button>

          <button
            onClick={() => setActiveTab('ptk')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'ptk'
                ? 'bg-emerald-50 text-emerald-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>2. Guru & PTK (17)</span>
          </button>

          <button
            onClick={() => setActiveTab('structural')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'structural'
                ? 'bg-emerald-50 text-emerald-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>3. Struktur Organisasi</span>
          </button>

          <button
            onClick={() => setActiveTab('students_sarpras')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'students_sarpras'
                ? 'bg-emerald-50 text-emerald-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>4. Siswa & Sarpras</span>
          </button>

          <button
            onClick={() => setActiveTab('programs')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'programs'
                ? 'bg-emerald-50 text-emerald-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>5. Program Kerja & Evaluasi</span>
          </button>

          <button
            onClick={() => setActiveTab('photos')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'photos'
                ? 'bg-emerald-50 text-emerald-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>6. Galeri Foto Bukti Fisik</span>
          </button>

          <button
            onClick={() => setActiveTab('assessment')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'assessment'
                ? 'bg-emerald-50 text-emerald-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>7. Instrumen & Nilai PKKM</span>
          </button>

          <button
            onClick={() => setActiveTab('presentation')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'presentation'
                ? 'bg-emerald-800 text-white font-bold shadow-xs'
                : 'text-emerald-900 bg-emerald-50/90 hover:bg-emerald-100 border border-emerald-200 font-semibold'
            }`}
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            <span>🖥️ Mode PPT (Company Profile)</span>
          </button>

          <button
            onClick={() => setActiveTab('print')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'print'
                ? 'bg-slate-900 text-white font-semibold shadow-xs'
                : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>📄 Tampilan Cetak Dokumen A4</span>
          </button>
        </div>
      </div>
    </header>
  );
};
