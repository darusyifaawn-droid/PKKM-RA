import React, { useState, useEffect, useRef } from 'react';
import { PpkmData, PhotoEvidenceItem, SwotRtlItem } from '../../types/ppkm';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Play, 
  Pause, 
  Printer, 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  Instagram, 
  Globe, 
  Sparkles, 
  Layers, 
  MapPin, 
  TrendingUp, 
  Camera, 
  Laptop, 
  Trophy, 
  ArrowLeft, 
  Building, 
  Target, 
  FileCheck, 
  ShieldCheck, 
  Check, 
  ZoomIn, 
  X 
} from 'lucide-react';

interface PresentationViewProps {
  data: PpkmData;
  onBackToEdit: () => void;
}

export const PresentationView: React.FC<PresentationViewProps> = ({ data, onBackToEdit }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const institution = data.institution;
  const principal = data.principal;
  const evaluators = data.evaluators;
  const achievements = data.komponenAchievements;

  const institutionName = institution.namaLembaga || institution.nama || 'RA Al-Khoiriyah';
  const npsnCode = institution.npsm || institution.npsn || '69912345';
  const visiMadrasah = data.programGoals?.visi || institution.visi || 'Mewujudkan Generasi Qurani yang Cerdas, Mandiri, dan Berakhlakul Karimah';
  const misiMadrasah = data.programGoals?.misi || institution.misi || [
    'Menyelenggarakan pendidikan Islam berbasis fitrah anak usia dini yang menyenangkan.',
    'Membiasakan nilai adab, hafalan surat-surat pendek, doa harian, dan tata cara ibadah sejak dini.',
    'Mengembangkan kecerdasan majemuk (multiple intelligences) dan kemandirian anak melalui bermain kreatif.',
    'Membangun sinergi harmonis antara madrasah, keluarga, dan masyarakat dalam pengasuhan positif.'
  ];
  const desaKelurahan = institution.desaKelurahan || 'Putukrejo';
  const fotoBersama = institution.fotoBersamaUrl || achievements?.fotoPenutupUrl || '/src/assets/images/foto_guru_komite_1792723695121.jpg';
  const closingText = achievements?.closingStatement || achievements?.kalimatPenutup || `Terima kasih atas perhatian Tim Penilai PKKM ${institution.tahunPelajaran.split('/')[0] || '2026'}. Kami siap menerima arahan, bimbingan, dan evaluasi demi kemajuan RA ${institutionName}.`;

  const accreditation = institution.accreditationDetail || {
    peringkat: 'Terakreditasi A (Unggul)',
    nilaiAngka: '94',
    nomorSk: '145/BAN-PAUD-PNF/AKR/2023',
    lembagaAkreditasi: 'Badan Akreditasi Nasional PAUD dan PNF (BAN-PDM)',
    tahunAkreditasi: '2023',
    masaBerlaku: '2023 s/d 2028',
    sertifikatUrl: '/src/assets/images/sertifikat_akreditasi_1792427208613.jpg',
  };

  const totalStudents = data.students.reduce((sum, item) => sum + (Number(item.lakiLaki) || 0) + (Number(item.perempuan) || 0), 0);
  const totalPtk = data.ptkList.length;
  const s1Ptk = data.ptkList.filter((p) => p.pendidikanTerakhir.toUpperCase().includes('S1') || p.pendidikanTerakhir.toUpperCase().includes('S-1') || p.pendidikanTerakhir.toUpperCase().includes('S2')).length;
  const d3Ptk = data.ptkList.filter((p) => p.pendidikanTerakhir.toUpperCase().includes('D3') || p.pendidikanTerakhir.toUpperCase().includes('D-3')).length;
  const certifiedPtk = data.ptkList.filter((p) => p.statusSertifikasi === 'SERTIFIKASI').length;

  // The 10 Official Slides for PKKM RA Presentation
  const slides = [
    { 
      id: 'slide_1', 
      number: 1, 
      category: 'Pembukaan', 
      title: 'Judul Utama & Tim Penilai', 
      subtitle: 'Presentasi Laporan Kinerja Kepala RA' 
    },
    { 
      id: 'slide_2', 
      number: 2, 
      category: 'Pembukaan', 
      title: 'Profil Singkat Lembaga', 
      subtitle: 'Identitas, Akreditasi, Visi & Misi' 
    },
    { 
      id: 'slide_3', 
      number: 3, 
      category: 'Pembukaan', 
      title: 'Data Kondisi Riil RA', 
      subtitle: 'Siswa, PTK & Sarpras Unggulan' 
    },
    { 
      id: 'slide_4', 
      number: 4, 
      category: 'Komponen A', 
      title: 'Capaian Komponen A', 
      subtitle: 'Usaha Pengembangan RA & TIK' 
    },
    { 
      id: 'slide_5', 
      number: 5, 
      category: 'Komponen B', 
      title: 'Capaian Komponen B', 
      subtitle: 'Pelaksanaan Tugas Manajerial & BOP' 
    },
    { 
      id: 'slide_6', 
      number: 6, 
      category: 'Komponen C', 
      title: 'Capaian Komponen C', 
      subtitle: 'Kewirausahaan, Inovasi & P5-RA' 
    },
    { 
      id: 'slide_7', 
      number: 7, 
      category: 'Komponen D', 
      title: 'Capaian Komponen D', 
      subtitle: 'Supervisi Guru & Tenaga Kependidikan' 
    },
    { 
      id: 'slide_8', 
      number: 8, 
      category: 'Komponen E', 
      title: 'Hasil Kinerja & Prestasi', 
      subtitle: 'Penghargaan Siswa, Guru & Kejuaraan' 
    },
    { 
      id: 'slide_9', 
      number: 9, 
      category: 'Evaluasi', 
      title: 'Analisis SWOT & RTL', 
      subtitle: 'Rencana Tindak Lanjut Program Kerja' 
    },
    { 
      id: 'slide_10', 
      number: 10, 
      category: 'Penutup', 
      title: 'Penutup & Terima Kasih', 
      subtitle: 'Dokumentasi Dewan Guru & Komite' 
    },
  ];

  const totalSlides = slides.length;

  const handleNext = () => {
    setCurrentSlide((prev) => (prev < totalSlides - 1 ? prev + 1 : 0));
  };

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : totalSlides - 1));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewImage) {
        if (e.key === 'Escape') setPreviewImage(null);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, previewImage]);

  // Autoplay timer
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        handleNext();
      }, 7000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentSlide]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.log(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden ${
        isFullscreen ? 'p-0' : 'pb-16'
      }`}
    >
      {/* ============================================================== */}
      {/* TOP CONTROL NAVIGATION BAR                                     */}
      {/* ============================================================== */}
      <header className="no-print bg-slate-900/95 backdrop-blur-md border-b border-emerald-900/40 px-4 py-2.5 flex items-center justify-between z-40 sticky top-0 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToEdit}
            className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Kembali ke Editor</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase bg-emerald-950 text-emerald-400 border border-emerald-800/80">
              PPT PKKM RA
            </span>
            <span className="text-xs font-semibold text-slate-200 hidden md:inline truncate max-w-xs">
              {slides[currentSlide].title}
            </span>
          </div>
        </div>

        {/* Center: Slide indicator & jump */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer disabled:opacity-40"
            title="Slide Sebelumnya (Panah Kiri)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-xs font-mono font-bold px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400">
            {currentSlide + 1} / {totalSlides}
          </div>

          <button
            onClick={handleNext}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer disabled:opacity-40"
            title="Slide Selanjutnya (Panah Kanan / Space)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right side tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isPlaying 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title="Auto Play Slide (Otomatis berganti tiap 7 detik)"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="hidden lg:inline">{isPlaying ? 'Jeda' : 'Putar'}</span>
          </button>

          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              showThumbnails 
                ? 'bg-emerald-600 text-white' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title="Daftar 10 Slide"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">10 Slide</span>
          </button>

          <button
            onClick={() => window.print()}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Cetak Dokumen PKKM Lengkap"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden sm:inline">Cetak</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer shadow-sm"
            title={isFullscreen ? 'Keluar Fullscreen (Esc)' : 'Layar Penuh (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* SLIDE CANVAS (16:9 RATIO PRESENTATION THEME)                    */}
      {/* ============================================================== */}
      <main className="flex-1 flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-6xl aspect-[16/9] bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/80 border border-emerald-900/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative transition-all duration-300">
          
          {/* Subtle Top Accent Ribbon */}
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400" />

          {/* Slide Header (Except Slide 1 Cover) */}
          {currentSlide > 0 && (
            <div className="px-6 sm:px-8 pt-4 pb-2 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800/80 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm">
                  0{slides[currentSlide].number}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      {slides[currentSlide].category}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {slides[currentSlide].subtitle}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg md:text-xl font-bold text-white tracking-tight">
                    {slides[currentSlide].title}
                  </h2>
                </div>
              </div>

              {/* Institution Small Watermark */}
              <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                <img 
                  src={institution.logoUrl} 
                  alt={institutionName} 
                  className="w-7 h-7 object-contain bg-white/10 rounded-sm p-0.5" 
                />
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold text-slate-300 leading-tight">{institutionName}</p>
                  <p className="text-[9px] text-emerald-400 font-mono">PKKM {institution.periodePenilaian}</p>
                </div>
              </div>
            </div>
          )}

          {/* Slide Body Content */}
          <div className="flex-1 p-5 sm:p-7 md:p-8 overflow-y-auto custom-scrollbar flex flex-col justify-center">

            {/* ============================================================== */}
            {/* SLIDE 1: JUDUL UTAMA (BAGIAN PEMBUKAAN)                         */}
            {/* ============================================================== */}
            {currentSlide === 0 && (
              <div className="h-full flex flex-col justify-between py-2 text-center relative">
                
                {/* Top Logos & Agency */}
                <div className="flex items-center justify-center gap-6 sm:gap-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 p-1 bg-white/10 rounded-xl border border-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                      <img 
                        src="/src/assets/images/logo_kemenag_1792427181313.png" 
                        alt="Logo Kemenag" 
                        className="max-h-full max-w-full object-contain" 
                      />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] sm:text-xs font-bold tracking-widest text-emerald-400 uppercase">
                        KEMENTERIAN AGAMA RI
                      </p>
                      <p className="text-[9px] sm:text-[11px] text-slate-300">
                        Kantor Kemenag {institution.kotaKab}
                      </p>
                    </div>
                  </div>

                  <div className="h-10 w-px bg-slate-800" />

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 p-1 bg-white/10 rounded-xl border border-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                      <img 
                        src={institution.logoUrl} 
                        alt="Logo Lembaga" 
                        className="max-h-full max-w-full object-contain" 
                      />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] sm:text-xs font-bold text-amber-400 uppercase">
                        LEMBAGA RA / MADRASAH
                      </p>
                      <p className="text-[9px] sm:text-[11px] text-slate-300 truncate max-w-[140px] sm:max-w-none">
                        {institutionName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Main Headline Title */}
                <div className="my-auto py-4 space-y-2 max-w-4xl mx-auto">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-semibold mb-1 shadow-inner">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span>Laporan Resmi Kinerja Tahunan Raudlatul Athfal (RA)</span>
                  </div>

                  <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight uppercase">
                    Presentasi Laporan Kinerja Kepala RA <span className="text-emerald-400">{institutionName}</span>
                  </h1>

                  <p className="text-sm sm:text-lg font-bold text-amber-300 uppercase tracking-wider">
                    Penilaian Kinerja Kepala Madrasah (PKKM) Tahun Pelajaran {institution.tahunPelajaran}
                  </p>

                  <p className="text-xs sm:text-sm text-slate-400 font-medium">
                    {institution.periodePenilaian} • Disusun Berdasarkan Juknis Dirjen Pendis Kemenag RI
                  </p>
                </div>

                {/* Bottom Profile Duo: Kepala RA & Tim Penilai */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto w-full pt-2">
                  
                  {/* Kepala RA Box */}
                  <div className="bg-slate-900/80 border border-emerald-900/60 rounded-xl p-3.5 flex items-center gap-3.5 text-left shadow-lg">
                    <div className="w-14 h-16 sm:w-16 sm:h-20 rounded-lg overflow-hidden border-2 border-emerald-500/60 shrink-0 bg-slate-800 shadow-md">
                      <img 
                        src={principal.fotoUrl} 
                        alt={principal.namaLengkap} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        Kepala Raudlatul Athfal
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                        {principal.namaLengkap}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono">NIP: {principal.nip}</p>
                      <p className="text-[10px] text-slate-400">Pangkat/Gol: {principal.pangkatGol}</p>
                    </div>
                  </div>

                  {/* Tim Penilai Box */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-left shadow-lg flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                      Tim Penilai PKKM {institution.kotaKab}
                    </span>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Pengawas Penilai 1:</span>
                        <strong className="text-slate-200 font-semibold">{evaluators.pengawas1Nama}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Pengawas Penilai 2:</span>
                        <strong className="text-slate-200 font-semibold">{evaluators.pengawas2Nama}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Ketua Komite:</span>
                        <strong className="text-slate-200 font-semibold">{evaluators.komiteNama}</strong>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* ============================================================== */}
            {/* SLIDE 2: PROFIL SINGKAT LEMBAGA                                 */}
            {/* ============================================================== */}
            {currentSlide === 1 && (
              <div className="h-full grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* Left Column: Identitas & Akreditasi (5 cols) */}
                <div className="md:col-span-5 space-y-3.5">
                  <div className="bg-slate-900/90 border border-emerald-900/50 rounded-xl p-4 shadow-xl">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                      <img 
                        src={institution.logoUrl} 
                        alt="Logo" 
                        className="w-12 h-12 object-contain bg-white/10 rounded-lg p-1" 
                      />
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-white">{institutionName}</h3>
                        <p className="text-[11px] text-emerald-400 font-medium">Binaan Kantor Kemenag {institution.kotaKab}</p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Nomor Statistik Madrasah (NSM):</span>
                        <span className="font-mono font-bold text-slate-200">{institution.nsm}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">NPSN:</span>
                        <span className="font-mono font-bold text-slate-200">{npsnCode}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Status Madrasah:</span>
                        <span className="font-bold text-amber-300">{institution.status}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Status Akreditasi:</span>
                        <span className="font-bold text-emerald-400">{institution.akreditasi} (Skor: {accreditation.nilaiAngka})</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Nomor SK Akreditasi:</span>
                        <span className="font-mono text-[10px] text-slate-300">{accreditation.nomorSk}</span>
                      </div>
                      <div className="py-1">
                        <span className="text-slate-400 block text-[10px] mb-0.5">Alamat Lembaga:</span>
                        <p className="text-slate-300 text-[11px] leading-relaxed flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{institution.alamat}, {desaKelurahan}, Kec. {institution.kecamatan}, {institution.kotaKab}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Pill for Social */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 flex items-center justify-around text-xs text-slate-300">
                    <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-teal-400" /> Web Aktif</span>
                    <span className="flex items-center gap-1.5"><Instagram className="w-3.5 h-3.5 text-pink-400" /> Medsos</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> EMIS 100%</span>
                  </div>
                </div>

                {/* Right Column: Visi & Misi RA (7 cols) */}
                <div className="md:col-span-7 space-y-4">
                  {/* Visi */}
                  <div className="bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-700/60 rounded-xl p-4.5 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                      <Sparkles className="w-20 h-20 text-emerald-300" />
                    </div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-1">
                      VISI UTAMA LEMBAGA
                    </span>
                    <blockquote className="text-sm sm:text-base font-semibold text-white italic leading-relaxed">
                      "{visiMadrasah}"
                    </blockquote>
                  </div>

                  {/* Misi */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow-xl">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-2.5">
                      MISI RAUDLATUL ATHFAL
                    </span>
                    <ul className="space-y-2 text-xs sm:text-sm text-slate-200">
                      {misiMadrasah.map((m: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-600/80 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <span className="leading-snug">{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Foto Gedung Tampak Depan */}
                  <div className="relative rounded-xl overflow-hidden border border-slate-700/80 h-28 sm:h-32 shadow-lg group">
                    <img 
                      src={institution.fotoMadrasahUrl} 
                      alt="Gedung Lembaga" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2.5">
                      <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-emerald-400" />
                        Gedung & Halaman Bermain {institutionName}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ============================================================== */}
            {/* SLIDE 3: DATA KONDISI RIIL RA (SISWA, PTK, SARPRAS)             */}
            {/* ============================================================== */}
            {currentSlide === 2 && (
              <div className="h-full flex flex-col justify-between space-y-4">
                
                {/* Top Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-900/90 border border-emerald-800/60 rounded-xl p-3 text-center shadow-lg">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Siswa RA</span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono my-1">{totalStudents}</div>
                    <span className="text-[10px] text-emerald-300">Kelompok A & Kelompok B</span>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-center shadow-lg">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pendidik & Tendik</span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono my-1">{totalPtk} Orang</div>
                    <span className="text-[10px] text-slate-400">{s1Ptk} S1 • {certifiedPtk} Bersertifikasi</span>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-center shadow-lg">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ruang Belajar & Sentra</span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-teal-400 font-mono my-1">
                      {data.buildings.filter(b => b.jenisBangunan.toLowerCase().includes('kelas') || b.jenisBangunan.toLowerCase().includes('sentra') || b.jenisBangunan.toLowerCase().includes('kelompok')).length || 6}
                    </div>
                    <span className="text-[10px] text-slate-400">100% Kondisi Baik</span>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-center shadow-lg">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sarpras & APE Ramah Anak</span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-purple-400 font-mono my-1">
                      {data.inventory.length}+
                    </div>
                    <span className="text-[10px] text-purple-300">Indoor & Outdoor APE</span>
                  </div>
                </div>

                {/* Split Table: Siswa Rombel vs PTK Kualifikasi */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
                  
                  {/* Table Siswa Kelompok A & B (6 cols) */}
                  <div className="md:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          Tabel Distribusi Siswa per Rombongan Belajar
                        </h4>
                        <span className="text-[10px] text-emerald-400 font-mono font-semibold">T.P {institution.tahunPelajaran}</span>
                      </div>

                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase font-semibold">
                            <th className="py-1 text-left">Kelompok / Rombel</th>
                            <th className="py-1 text-center">L</th>
                            <th className="py-1 text-center">P</th>
                            <th className="py-1 text-center font-bold text-slate-300">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
                          {data.students.map((st, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-1.5 text-left font-sans font-medium text-slate-300">{st.kelas}</td>
                              <td className="py-1.5 text-center text-blue-300">{st.lakiLaki}</td>
                              <td className="py-1.5 text-center text-pink-300">{st.perempuan}</td>
                              <td className="py-1.5 text-center font-bold text-emerald-400">{st.lakiLaki + st.perempuan}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Rata-rata Rasio Guru:Siswa</span>
                      <strong className="text-amber-300 font-mono">1 : 12 (Sangat Ideal Sesuai Standar RA)</strong>
                    </div>
                  </div>

                  {/* Kualifikasi Guru & Sarpras Unggulan (6 cols) */}
                  <div className="md:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                          Kualifikasi PTK & Sarpras Bermain Unggulan
                        </h4>
                      </div>

                      {/* PTK mini summary */}
                      <div className="grid grid-cols-3 gap-2 mb-3 text-center font-mono">
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                          <span className="text-[9px] text-slate-400 block font-sans">S1 PAUD/PGMI</span>
                          <span className="text-sm font-bold text-emerald-400">{s1Ptk} Org</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                          <span className="text-[9px] text-slate-400 block font-sans">D3 / Linier</span>
                          <span className="text-sm font-bold text-amber-400">{d3Ptk} Org</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                          <span className="text-[9px] text-slate-400 block font-sans">Sertifikasi</span>
                          <span className="text-sm font-bold text-teal-400">{certifiedPtk} Org</span>
                        </div>
                      </div>

                      {/* Sarpras & APE photo pill */}
                      <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
                        <div className="w-20 h-16 rounded-md overflow-hidden shrink-0 border border-slate-700">
                          <img 
                            src={data.inventory.find(i => i.fotoUrl)?.fotoUrl || "/src/assets/images/sarpras_ape_bermain_1792723675926.jpg"} 
                            alt="Sarpras APE" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="text-[11px] space-y-0.5">
                          <strong className="text-slate-200 block">Kondisi Sarpras APE Edukatif:</strong>
                          <p className="text-slate-400 leading-tight">
                            Tersedia arena bermain indoor (balok sentra, puzzle, peran) & outdoor (ayunan, perosotan, jungkat-jungkit) ramah anak & aman.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Status Kepemilikan Lahan:</span>
                      <strong className="text-emerald-400 font-semibold">Milik Sendiri / Wakaf Resmi (Legalitas Sah)</strong>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* ============================================================== */}
            {/* SLIDE 4: CAPAIAN KOMPONEN A (USAHA PENGEMBANGAN RA & TIK)       */}
            {/* ============================================================== */}
            {currentSlide === 3 && (
              <div className="h-full grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                
                {/* Left 6 cols: Poin Capaian Komponen A */}
                <div className="md:col-span-6 space-y-3">
                  <div className="bg-slate-900/90 border border-emerald-900/60 rounded-xl p-4 shadow-xl">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                      FOKUS 1: STRUKTUR ORGANISASI & LEGALITAS
                    </span>
                    <h3 className="text-sm font-bold text-white mb-2">
                      Pengembangan Struktur Organisasi & Tata Kelola RA
                    </h3>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Bagan organisasi madrasah disahkan Yayasan & dilengkapi SK Pembagian Tugas resmi.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Rincian Job Description tertulis untuk guru kelas, pendamping, TU & komite.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-slate-900/90 border border-emerald-900/60 rounded-xl p-4 shadow-xl">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                      FOKUS 2: DIGITALISASI SISTEM & LAYANAN SOP
                    </span>
                    <h3 className="text-sm font-bold text-white mb-2">
                      Implementasi Digital TIK & SOP Layanan Anak Usia Dini
                    </h3>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Data EMIS 4.0 & Simpatika Kemenag 100% valid dan update tepat waktu.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Website madrasah aktif & Portal Siswa untuk komunikasi kemitraan orang tua.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>SOP Lengkap: Penyambutan Pagi, Toilet Training, Makan Sehat, dan Penjemputan.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Right 6 cols: Visual Screenshots (Website & Portal) */}
                <div className="md:col-span-6 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    
                    {/* Website Screenshot */}
                    <div 
                      onClick={() => setPreviewImage({ url: institution.websiteScreenshotUrl || "/src/assets/images/beranda_website_ra_1792723631190.jpg", title: "Beranda Website Resmi RA" })}
                      className="cursor-pointer group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-lg hover:border-emerald-500 transition-all"
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        <img 
                          src={institution.websiteScreenshotUrl || "/src/assets/images/beranda_website_ra_1792723631190.jpg"} 
                          alt="Beranda Website" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                      <div className="p-2 bg-slate-950/90 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-200 truncate">Website Resmi RA</span>
                        <ZoomIn className="w-3 h-3 text-emerald-400 opacity-60 group-hover:opacity-100" />
                      </div>
                    </div>

                    {/* Portal Siswa Screenshot */}
                    <div 
                      onClick={() => setPreviewImage({ url: institution.portalSiswaScreenshotUrl || "/src/assets/images/portal_siswa_ra_1792723646007.jpg", title: "Portal Siswa & Wali Murid RA" })}
                      className="cursor-pointer group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-lg hover:border-emerald-500 transition-all"
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        <img 
                          src={institution.portalSiswaScreenshotUrl || "/src/assets/images/portal_siswa_ra_1792723646007.jpg"} 
                          alt="Portal Siswa" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                      <div className="p-2 bg-slate-950/90 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-200 truncate">Portal Siswa & Ortu</span>
                        <ZoomIn className="w-3 h-3 text-emerald-400 opacity-60 group-hover:opacity-100" />
                      </div>
                    </div>

                  </div>

                  {/* Organigram & Digital Badges */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-400">
                        <Laptop className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-white block">Digitalisasi Terintegrasi</span>
                        <p className="text-[9px] text-slate-400">EMIS 4.0, Simpatika, Website PPDB & Buku Penghubung Online</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
                      100% Aktif
                    </span>
                  </div>
                </div>

              </div>
            )}

            {/* ============================================================== */}
            {/* SLIDE 5: CAPAIAN KOMPONEN B (PELAKSANAAN TUGAS MANAJERIAL)       */}
            {/* ============================================================== */}
            {currentSlide === 4 && (
              <div className="h-full grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                
                {/* Left 6 cols: Poin Manajerial */}
                <div className="md:col-span-6 space-y-3">
                  <div className="bg-slate-900/90 border border-emerald-900/60 rounded-xl p-4 shadow-xl">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                      MANAJEMEN KURIKULUM & KALDIK
                    </span>
                    <h3 className="text-sm font-bold text-white mb-1.5">
                      Penerapan Kurikulum Operasional Madrasah (KOM)
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Mengimplementasikan Kurikulum Merdeka RA secara utuh dengan RPPH tematik interaktif berbasis bermain bermakna, dilengkapi KALDIK Kemenag resmi.
                    </p>
                  </div>

                  <div className="bg-slate-900/90 border border-emerald-900/60 rounded-xl p-4 shadow-xl">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                      PENGELOLAAN DANA BOP & SARPRAS
                    </span>
                    <h3 className="text-sm font-bold text-white mb-1.5">
                      Transparansi BOP RA & Pemeliharaan Sarana
                    </h3>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Penyusunan RKT & RKAM berbasis EDM (Evaluasi Diri Madrasah) partisipatif.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Laporan pertanggungjawaban dana BOP RA 100% tepat waktu dan auditable.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Pemeliharaan fasilitas bermain anak secara berkala demi keselamatan fisik.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Right 6 cols: KALDIK & Sarpras APE Photos */}
                <div className="md:col-span-6 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    
                    {/* KALDIK Photo */}
                    <div 
                      onClick={() => setPreviewImage({ url: institution.kaldikUrl || "/src/assets/images/kaldik_madrasah_ra_1792723659933.jpg", title: "Kalender Pendidikan (KALDIK) RA" })}
                      className="cursor-pointer group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-lg hover:border-emerald-500 transition-all"
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        <img 
                          src={institution.kaldikUrl || "/src/assets/images/kaldik_madrasah_ra_1792723659933.jpg"} 
                          alt="KALDIK Madrasah" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                      <div className="p-2 bg-slate-950/90 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-200 truncate">KALDIK T.P {institution.tahunPelajaran}</span>
                        <ZoomIn className="w-3 h-3 text-emerald-400 opacity-60 group-hover:opacity-100" />
                      </div>
                    </div>

                    {/* APE Bermain Photo */}
                    <div 
                      onClick={() => setPreviewImage({ url: data.inventory.find(i => i.fotoUrl)?.fotoUrl || "/src/assets/images/sarpras_ape_bermain_1792723675926.jpg", title: "Sarana Fasilitas Bermain Anak (APE)" })}
                      className="cursor-pointer group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-lg hover:border-emerald-500 transition-all"
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        <img 
                          src={data.inventory.find(i => i.fotoUrl)?.fotoUrl || "/src/assets/images/sarpras_ape_bermain_1792723675926.jpg"} 
                          alt="Sarana Fasilitas Bermain" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                      <div className="p-2 bg-slate-950/90 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-200 truncate">Fasilitas Bermain Ramah Anak</span>
                        <ZoomIn className="w-3 h-3 text-emerald-400 opacity-60 group-hover:opacity-100" />
                      </div>
                    </div>

                  </div>

                  {/* Keterangan Manajerial Card */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-950 flex items-center justify-center text-amber-400">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-white block">Dokumen RKT, RKAM & KOM Lengkap</span>
                        <p className="text-[9px] text-slate-400">Tersedia dokumen fisik & softcopy terverifikasi tim pengawas</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
                      Terverifikasi
                    </span>
                  </div>
                </div>

              </div>
            )}

            {/* ============================================================== */}
            {/* SLIDE 6: CAPAIAN KOMPONEN C (KEWIRAUSAHAAN & INOVASI)           */}
            {/* ============================================================== */}
            {currentSlide === 5 && (
              <div className="h-full grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                
                {/* Left 6 cols: Program Unggulan & MoU */}
                <div className="md:col-span-6 space-y-3">
                  <div className="bg-slate-900/90 border border-emerald-900/60 rounded-xl p-4 shadow-xl">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                      INOVASI PEMBELAJARAN ANAK USIA DINI
                    </span>
                    <h3 className="text-sm font-bold text-white mb-2">
                      Program Unggulan Tahfidz Cilik & P5-RA
                    </h3>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Tahfiz Cilik:</strong> Hafalan Juz 30 (Surat An-Nas s/d Ad-Dhuha) & doa harian.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>P5-RA:</strong> Projek Penguatan Profil Pelajar Rahmatan Lil Alamin (Gaya Hidup Berkelanjutan).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Market Day:</strong> Edukasi kemandirian, literasi keuangan dasar & kejujuran berwirausaha.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-slate-900/90 border border-emerald-900/60 rounded-xl p-4 shadow-xl">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                      KEMITRAAN & UNIT USAHA MANDIRI
                    </span>
                    <h3 className="text-sm font-bold text-white mb-2">
                      Kerja Sama Eksternal (MoU) & Koperasi Lembaga
                    </h3>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>MoU Aktif bersama Puskesmas (Pemeriksaan berkala tumbuh kembang & gizi anak).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Unit usaha koperasi penyediaan seragam & perlengkapan kreasi anak usia dini.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Right 6 cols: Visual Kegiatan P5-RA & MoU */}
                <div className="md:col-span-6 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    
                    {/* Foto P5-RA / Market Day */}
                    <div 
                      onClick={() => setPreviewImage({ 
                        url: data.photoEvidences.find(p => p.kategori.toLowerCase().includes('unggulan') || p.judul.toLowerCase().includes('inovasi'))?.fotoUrl || "/src/assets/images/foto_kegiatan_1_1792427218693.jpg", 
                        title: "Kegiatan P5-RA & Market Day Anak Usia Dini" 
                      })}
                      className="cursor-pointer group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-lg hover:border-emerald-500 transition-all"
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        <img 
                          src={data.photoEvidences.find(p => p.kategori.toLowerCase().includes('unggulan') || p.judul.toLowerCase().includes('inovasi'))?.fotoUrl || "/src/assets/images/foto_kegiatan_1_1792427218693.jpg"} 
                          alt="Kegiatan P5-RA" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                      <div className="p-2 bg-slate-950/90 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-200 truncate">Kegiatan P5-RA / Market Day</span>
                        <ZoomIn className="w-3 h-3 text-emerald-400 opacity-60 group-hover:opacity-100" />
                      </div>
                    </div>

                    {/* Foto MoU / Kemitraan */}
                    <div 
                      onClick={() => setPreviewImage({ 
                        url: data.photoEvidences.find(p => p.kategori.toLowerCase().includes('fasilitas') || p.kategori.toLowerCase().includes('lainnya'))?.fotoUrl || "/src/assets/images/foto_kegiatan_2_1792427228800.jpg", 
                        title: "Kerja Sama (MoU) dengan Puskesmas & Instansi Luar" 
                      })}
                      className="cursor-pointer group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-lg hover:border-emerald-500 transition-all"
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        <img 
                          src={data.photoEvidences.find(p => p.kategori.toLowerCase().includes('fasilitas') || p.kategori.toLowerCase().includes('lainnya'))?.fotoUrl || "/src/assets/images/foto_kegiatan_2_1792427228800.jpg"} 
                          alt="Kerja Sama Kemitraan" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                      <div className="p-2 bg-slate-950/90 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-200 truncate">MoU Kesehatan Puskesmas</span>
                        <ZoomIn className="w-3 h-3 text-emerald-400 opacity-60 group-hover:opacity-100" />
                      </div>
                    </div>

                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-950 flex items-center justify-center text-purple-400">
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-white block">Dampak Karakter & Kewirausahaan</span>
                        <p className="text-[9px] text-slate-400">Menumbuhkan kemandirian, empati sosial dan kecerdasan religius anak</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700">
                      Inovatif
                    </span>
                  </div>
                </div>

              </div>
            )}

            {/* ============================================================== */}
            {/* SLIDE 7: CAPAIAN KOMPONEN D (SUPERVISI GURU & TENDIK)           */}
            {/* ============================================================== */}
            {currentSlide === 6 && (
              <div className="h-full grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                
                {/* Left 6 cols: Data Supervisi */}
                <div className="md:col-span-6 space-y-3">
                  <div className="bg-slate-900/90 border border-emerald-900/60 rounded-xl p-4 shadow-xl">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                      KETERLAKSANAAN SUPERVISI AKADEMIK
                    </span>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-white">Supervisi Pembelajaran di Kelas</h3>
                      <span className="text-base font-extrabold text-emerald-400 font-mono">100% Selesai</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      Seluruh guru kelas dan guru pendamping telah disupervisi melalui tahapan Pra-Observasi, Observasi Pembelajaran Langsung, dan Pasca-Observasi (Refleksi Bersama).
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-300 font-medium">
                        <span>Realisasi Target Supervisi ({totalPtk} dari {totalPtk} Guru)</span>
                        <span className="text-emerald-400 font-bold font-mono">100%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full w-full" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-emerald-900/60 rounded-xl p-4 shadow-xl">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                      TINDAK LANJUT & PENINGKATAN KOMPETENSI
                    </span>
                    <h3 className="text-sm font-bold text-white mb-2">Pelatihan KKG / IGRA & Workshop Media</h3>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Keikutsertaan aktif guru pada KKG / IGRA (Ikatan Guru Raudlatul Athfal).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Peningkatan skor kompetensi pedagogik guru rata-rata naik dari 81.2 menjadi 92.5.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Pemberian reward dan rekomendasi kenaikan jenjang karir bagi guru berprestasi.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Right 6 cols: Foto Supervisi & Dokumen */}
                <div className="md:col-span-6 space-y-3">
                  <div 
                    onClick={() => setPreviewImage({ 
                      url: data.photoEvidences.find(p => p.kategori.toLowerCase().includes('supervisi') || p.judul.toLowerCase().includes('supervisi'))?.fotoUrl || "/src/assets/images/foto_kegiatan_3_1792427238258.jpg", 
                      title: "Dokumentasi Supervisi Langsung di Kelas oleh Kepala RA" 
                    })}
                    className="cursor-pointer group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-xl hover:border-emerald-500 transition-all"
                  >
                    <div className="aspect-[16/10] overflow-hidden">
                      <img 
                        src={data.photoEvidences.find(p => p.kategori.toLowerCase().includes('supervisi') || p.judul.toLowerCase().includes('supervisi'))?.fotoUrl || "/src/assets/images/foto_kegiatan_3_1792427238258.jpg"} 
                        alt="Foto Supervisi" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    </div>
                    <div className="p-3 bg-slate-950/90 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">Dokumentasi Supervisi Kelas</span>
                        <p className="text-[10px] text-slate-400">Kepala RA mengamati pelaksanaan pembelajaran dan interaksi anak</p>
                      </div>
                      <ZoomIn className="w-4 h-4 text-emerald-400 opacity-70 group-hover:opacity-100" />
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-950 flex items-center justify-center text-teal-400">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-white block">Evaluasi & Tindak Lanjut Nyata</span>
                        <p className="text-[9px] text-slate-400">Tersedia instrumen, lembar catatan berkala, dan tindak lanjut per guru</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-700">
                      Lengkap
                    </span>
                  </div>
                </div>

              </div>
            )}

            {/* ============================================================== */}
            {/* SLIDE 8: HASIL KINERJA & PRESTASI (KOMPONEN E)                  */}
            {/* ============================================================== */}
            {currentSlide === 7 && (
              <div className="h-full grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                
                {/* Left 6 cols: Daftar Prestasi Siswa & Guru */}
                <div className="md:col-span-6 space-y-3">
                  <div className="bg-slate-900/90 border border-emerald-900/60 rounded-xl p-4 shadow-xl">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                      REKAP PRESTASI TINGKAT KECAMATAN / KABUPATEN / PROVINSI
                    </span>
                    <h3 className="text-sm font-bold text-white mb-2.5">
                      Daftar Kejuaraan Siswa & Guru (1-4 Tahun Terakhir)
                    </h3>

                    <div className="space-y-2 text-xs">
                      {achievements?.prestasiList && achievements.prestasiList.length > 0 ? (
                        achievements.prestasiList.map((pr, idx: number) => (
                          <div key={idx} className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 flex items-start justify-between">
                            <div className="space-y-0.5">
                              <strong className="text-white block font-semibold">{pr.namaPrestasi}</strong>
                              <p className="text-[10px] text-slate-400">Tingkat: <span className="text-amber-300">{pr.tingkat}</span> ({pr.tahun})</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800 shrink-0">
                              {pr.peraih}
                            </span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 flex items-start justify-between">
                            <div>
                              <strong className="text-white block font-semibold">Juara 1 Lomba Tahfidz Cilik RA se-Kabupaten</strong>
                              <p className="text-[10px] text-slate-400">Porseni RA Kemenag • Tahun 2024</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800">
                              Siswa RA
                            </span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 flex items-start justify-between">
                            <div>
                              <strong className="text-white block font-semibold">Juara 2 Lomba Mewarnai & Kreativitas Anak Usia Dini</strong>
                              <p className="text-[10px] text-slate-400">Gebyar IGRA Provinsi • Tahun 2024</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800">
                              Siswa RA
                            </span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 flex items-start justify-between">
                            <div>
                              <strong className="text-white block font-semibold">Guru Berprestasi Inovasi Pembuatan APE Edukatif</strong>
                              <p className="text-[10px] text-slate-400">Apresiasi GTK Kemenag • Tahun 2023</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800">
                              Pendidik RA
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right 6 cols: Foto Piagam & Tropi */}
                <div className="md:col-span-6 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    
                    {/* Sertifikat Akreditasi / Piagam */}
                    <div 
                      onClick={() => setPreviewImage({ url: accreditation.sertifikatUrl, title: "Sertifikat Akreditasi Resmi" })}
                      className="cursor-pointer group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-lg hover:border-amber-500 transition-all"
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        <img 
                          src={accreditation.sertifikatUrl} 
                          alt="Sertifikat Akreditasi" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                      <div className="p-2 bg-slate-950/90 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-300 truncate">Sertifikat Akreditasi</span>
                        <ZoomIn className="w-3 h-3 text-amber-400 opacity-60 group-hover:opacity-100" />
                      </div>
                    </div>

                    {/* Foto Penyerahan Piala */}
                    <div 
                      onClick={() => setPreviewImage({ 
                        url: data.photoEvidences.find(p => p.kategori.toLowerCase().includes('prestasi') || p.judul.toLowerCase().includes('juara'))?.fotoUrl || "/src/assets/images/foto_kegiatan_4_1792427248962.jpg", 
                        title: "Foto Penyerahan Piala & Penghargaan Lomba" 
                      })}
                      className="cursor-pointer group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-lg hover:border-amber-500 transition-all"
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        <img 
                          src={data.photoEvidences.find(p => p.kategori.toLowerCase().includes('prestasi') || p.judul.toLowerCase().includes('juara'))?.fotoUrl || "/src/assets/images/foto_kegiatan_4_1792427248962.jpg"} 
                          alt="Piala Penghargaan" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                      <div className="p-2 bg-slate-950/90 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-200 truncate">Dokumentasi Tropi & Lomba</span>
                        <ZoomIn className="w-3 h-3 text-amber-400 opacity-60 group-hover:opacity-100" />
                      </div>
                    </div>

                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-950 flex items-center justify-center text-amber-400">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-white block">Dukungan Minat Bakat Sejak Usia Dini</span>
                        <p className="text-[9px] text-slate-400">Apresiasi sertifikat, tropi & pembinaan bakat berkelanjutan</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700">
                      Juara
                    </span>
                  </div>
                </div>

              </div>
            )}

            {/* ============================================================== */}
            {/* SLIDE 9: ANALISIS SWOT RINGKAS & RENCANA TINDAK LANJUT (RTL)   */}
            {/* ============================================================== */}
            {currentSlide === 8 && (
              <div className="h-full flex flex-col justify-between space-y-4">
                
                {/* 4 Quadrant Mini SWOT */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  
                  {/* S - Strength */}
                  <div className="bg-slate-900/90 border border-emerald-800/70 rounded-xl p-3 shadow-lg">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-md bg-emerald-950 border border-emerald-600 text-emerald-400 font-bold text-[10px] flex items-center justify-center">
                        S
                      </div>
                      <span className="text-[11px] font-bold text-emerald-400 uppercase">Kekuatan (Strengths)</span>
                    </div>
                    <ul className="text-[11px] text-slate-300 space-y-1">
                      {achievements?.swotRtl?.kekuatan?.slice(0, 2).map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-emerald-400">•</span>
                          <span className="leading-tight">{item}</span>
                        </li>
                      )) || (
                        <>
                          <li className="leading-tight">• Status akreditasi unggul & kepercayaan masyarakat tinggi</li>
                          <li className="leading-tight">• PTK 100% linier S1/D3 berdedikasi tinggi</li>
                        </>
                      )}
                    </ul>
                  </div>

                  {/* W - Weakness / Kendala */}
                  <div className="bg-slate-900/90 border border-amber-800/70 rounded-xl p-3 shadow-lg">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-md bg-amber-950 border border-amber-600 text-amber-400 font-bold text-[10px] flex items-center justify-center">
                        W
                      </div>
                      <span className="text-[11px] font-bold text-amber-400 uppercase">Kelemahan (Weakness)</span>
                    </div>
                    <ul className="text-[11px] text-slate-300 space-y-1">
                      {(achievements?.swotRtl?.kelemahan || achievements?.swotRtl?.kelemahanKendala)?.slice(0, 2).map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-amber-400">•</span>
                          <span className="leading-tight">{item}</span>
                        </li>
                      )) || (
                        <>
                          <li className="leading-tight">• Lahan bermain outdoor terbatas saat musim penghujan</li>
                          <li className="leading-tight">• Kebutuhan penambahan sarana sentra multimedia</li>
                        </>
                      )}
                    </ul>
                  </div>

                  {/* O - Opportunity */}
                  <div className="bg-slate-900/90 border border-blue-800/70 rounded-xl p-3 shadow-lg">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-md bg-blue-950 border border-blue-600 text-blue-400 font-bold text-[10px] flex items-center justify-center">
                        O
                      </div>
                      <span className="text-[11px] font-bold text-blue-400 uppercase">Peluang (Opportunity)</span>
                    </div>
                    <ul className="text-[11px] text-slate-300 space-y-1">
                      {achievements?.swotRtl?.peluang?.slice(0, 2).map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-blue-400">•</span>
                          <span className="leading-tight">{item}</span>
                        </li>
                      )) || (
                        <>
                          <li className="leading-tight">• Dukungan komite & paguyuban wali murid (POMG) sangat solid</li>
                          <li className="leading-tight">• Akses program BOP Kemenag & bantuan CSR instansi</li>
                        </>
                      )}
                    </ul>
                  </div>

                  {/* T - Threat */}
                  <div className="bg-slate-900/90 border border-rose-800/70 rounded-xl p-3 shadow-lg">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-md bg-rose-950 border border-rose-600 text-rose-400 font-bold text-[10px] flex items-center justify-center">
                        T
                      </div>
                      <span className="text-[11px] font-bold text-rose-400 uppercase">Tantangan (Threats)</span>
                    </div>
                    <ul className="text-[11px] text-slate-300 space-y-1">
                      {(achievements?.swotRtl?.ancaman || [
                        'Kompetisi lembaga PAUD sekitarnya',
                        'Dampak gadget gawai anak di rumah'
                      ]).slice(0, 2).map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-rose-400">•</span>
                          <span className="leading-tight">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

                {/* RTL (Rencana Tindak Lanjut Konkret) */}
                <div className="bg-slate-900/95 border border-emerald-900/60 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                      <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                        <Target className="w-4 h-4 text-emerald-400" />
                        Rencana Tindak Lanjut (RTL) Nyata untuk Tahun Anggaran Berikutnya
                      </h4>
                      <span className="text-[10px] font-bold text-amber-400 uppercase font-mono">Solusi Terencana</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {achievements?.swotRtl?.rencanaTindakLanjut?.map((rtl: string | SwotRtlItem, idx: number) => {
                        const isObj = typeof rtl === 'object' && rtl !== null;
                        const fokus = isObj ? (rtl as SwotRtlItem).fokusProgram : `Program Unggulan ${idx + 1}`;
                        const langkah = isObj ? (rtl as SwotRtlItem).langkahKonkret : String(rtl);
                        const target = isObj ? (rtl as SwotRtlItem).targetWaktu : 'Tahun Pelajaran 2026/2027';
                        const pj = isObj ? (rtl as SwotRtlItem).penanggungJawab : 'Kepala RA & Komite';
                        return (
                          <div key={idx} className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <strong className="text-slate-200 font-semibold text-[11px]">{fokus}</strong>
                            </div>
                            <p className="text-[10px] text-slate-300 pl-7 leading-relaxed">{langkah}</p>
                            <div className="pl-7 pt-1 flex justify-between text-[9px] text-emerald-400 font-mono">
                              <span>Target: {target}</span>
                              <span>PJ: {pj}</span>
                            </div>
                          </div>
                        );
                      }) || (
                        <>
                          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-1">
                            <strong className="text-slate-200 font-semibold text-[11px] block">1. Perluasan Kanopi & Karpet Rumput Sintetis</strong>
                            <p className="text-[10px] text-slate-300 leading-relaxed">Menutup sebagian area outdoor dengan kanopi UV agar aman digunakan anak saat terik maupun hujan.</p>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-1">
                            <strong className="text-slate-200 font-semibold text-[11px] block">2. Pojok Sentra Digital & Storytelling</strong>
                            <p className="text-[10px] text-slate-300 leading-relaxed">Pemanfaatan audio visual edukatif untuk pengenalan kosakata bahasa Arab & Inggris dasar.</p>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-1">
                            <strong className="text-slate-200 font-semibold text-[11px] block">3. Workshop Rutin Parenting Bulanan</strong>
                            <p className="text-[10px] text-slate-300 leading-relaxed">Menguatkan sinergi keluarga dan madrasah dalam mengurangi ketergantungan gawai pada anak usia dini.</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic pt-2 border-t border-slate-800/60 text-right">
                    *RTL telah diselaraskan dengan RKAM dan disepakati bersama Pengurus Yayasan & Komite RA.
                  </p>
                </div>

              </div>
            )}

            {/* ============================================================== */}
            {/* SLIDE 10: BAGIAN PENUTUP (FOTO BERSAMA & KALIMAT PENUTUP)       */}
            {/* ============================================================== */}
            {currentSlide === 9 && (
              <div className="h-full flex flex-col justify-between py-2 text-center">
                
                {/* Header Text */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                    BAGIAN PENUTUP LAPORAN KINERJA
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                    Kebersamaan & Dedikasi Keluarga Besar RA {institutionName}
                  </h2>
                </div>

                {/* Big Group Photo of Teachers, Staff & Committee */}
                <div className="my-auto max-w-4xl mx-auto w-full">
                  <div 
                    onClick={() => setPreviewImage({ 
                      url: fotoBersama, 
                      title: "Dokumentasi Foto Bersama Seluruh Guru, Staf & Komite RA" 
                    })}
                    className="cursor-pointer group relative rounded-2xl overflow-hidden border-2 border-emerald-500/60 bg-slate-900 shadow-2xl hover:border-emerald-400 transition-all max-h-[260px] sm:max-h-[300px]"
                  >
                    <img 
                      src={fotoBersama} 
                      alt="Dewan Guru & Komite" 
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500 max-h-[260px] sm:max-h-[300px]" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end justify-between p-3 sm:p-4">
                      <div className="text-left">
                        <span className="text-xs sm:text-sm font-bold text-white block">
                          Dewan Guru, Tenaga Kependidikan & Pengurus Komite RA
                        </span>
                        <p className="text-[10px] sm:text-xs text-emerald-300">
                          Siap Berkolaborasi Mewujudkan Pendidikan Anak Usia Dini yang Bermutu & Berakhlak Mulia
                        </p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 flex items-center gap-1 text-xs">
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-semibold hidden sm:inline">Perbesar</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Formal Closing Sentence requested by user */}
                <div className="max-w-3xl mx-auto space-y-2 pt-2">
                  <blockquote className="text-xs sm:text-sm md:text-base font-medium text-slate-200 italic leading-relaxed bg-slate-900/80 border border-emerald-900/60 p-3 sm:p-4 rounded-xl shadow-lg">
                    "{closingText}"
                  </blockquote>

                  {/* Signature Row */}
                  <div className="flex items-center justify-center gap-8 text-[11px] pt-1 text-slate-400">
                    <span>{institution.kotaKab}, {evaluators.tanggalPenilaian}</span>
                    <span>•</span>
                    <strong className="text-slate-200">{principal.namaLengkap}</strong>
                    <span>•</span>
                    <span className="text-emerald-400">{institutionName}</span>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Slide Footer */}
          <footer className="px-6 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                SIM-PKKM Madrasah Terpadu
              </span>
              <span className="hidden sm:inline text-slate-600">•</span>
              <span className="hidden sm:inline text-slate-400">
                Slide {currentSlide + 1} dari {totalSlides} ({slides[currentSlide].category})
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500 text-[10px]">Gunakan panah ◀ ▶ keyboard untuk navigasi</span>
              <div className="flex items-center gap-1">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      currentSlide === i ? 'w-6 bg-emerald-400' : 'w-2 bg-slate-700 hover:bg-slate-500'
                    }`}
                    title={`Lompat ke Slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </footer>

        </div>
      </main>

      {/* ============================================================== */}
      {/* 10 SLIDES THUMBNAIL DRAWER                                      */}
      {/* ============================================================== */}
      {showThumbnails && (
        <aside className="no-print fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/80 p-3 z-50 shadow-2xl">
          <div className="max-w-6xl mx-auto flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Urutan Lengkap 10 Slide Presentasi PKKM RA:
            </span>
            <button
              onClick={() => setShowThumbnails(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 cursor-pointer text-xs flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Tutup Panel</span>
            </button>
          </div>

          <div className="max-w-6xl mx-auto grid grid-cols-5 md:grid-cols-10 gap-2 overflow-x-auto pb-1">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  setCurrentSlide(idx);
                  setShowThumbnails(false);
                }}
                className={`p-2 rounded-lg text-left transition-all border cursor-pointer ${
                  currentSlide === idx 
                    ? 'bg-emerald-950 border-emerald-500 text-white shadow-md ring-1 ring-emerald-400' 
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] font-mono font-bold mb-1">
                  <span>0{s.number}</span>
                  <span className="text-amber-400 truncate text-[8px]">{s.category}</span>
                </div>
                <div className="text-[10px] font-semibold truncate leading-tight">
                  {s.title}
                </div>
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* ============================================================== */}
      {/* HIGH-RES IMAGE PREVIEW MODAL                                   */}
      {/* ============================================================== */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-xs cursor-pointer animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                {previewImage.title}
              </h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/50">
              <img 
                src={previewImage.url} 
                alt={previewImage.title} 
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg" 
              />
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <span>Bukti Fisik Resmi PKKM Terintegrasi</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs font-semibold cursor-pointer"
              >
                Tutup (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
