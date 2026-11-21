import React, { useState } from 'react';
import {
  Archive,
  Award,
  Bell,
  Building2,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  HelpCircle,
  History,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Presentation,
  Printer,
  Settings,
  Sparkles,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useSaas } from '../../context/SaasContext';
import { SaasMenuKey, UserRole } from '../../types/saas';

interface NavItemDef {
  key: SaasMenuKey;
  label: string;
  group: string;
  section: 'primary' | 'advanced';
  icon: React.FC<{ className?: string }>;
  roles: UserRole[];
}

const NAV_ITEMS: NavItemDef[] = [
  { key: 'mode_cepat', label: 'Input Otomatis (Beranda)', group: 'Panel Admin Utama', section: 'primary', icon: Zap, roles: ['SUPER_ADMIN', 'ADMIN_LEMBAGA', 'KEPALA_RA', 'PENILAI_1', 'PENILAI_2'] },
  { key: 'company_profile_ppt', label: 'Company Profile PPT (12 Slide)', group: 'Panel Admin Utama', section: 'primary', icon: Presentation, roles: ['SUPER_ADMIN', 'ADMIN_LEMBAGA', 'KEPALA_RA', 'PENILAI_1', 'PENILAI_2'] },
  { key: 'laporan_pkkm', label: 'Cetak 53 Hal (Lampiran PDF)', group: 'Panel Admin Utama', section: 'primary', icon: Printer, roles: ['SUPER_ADMIN', 'ADMIN_LEMBAGA', 'KEPALA_RA', 'PENILAI_1', 'PENILAI_2'] },
  { key: 'instrumen_penilaian', label: 'Instrumen 96 Butir (P1 & P2)', group: 'Panel Admin Utama', section: 'primary', icon: ClipboardCheck, roles: ['SUPER_ADMIN', 'ADMIN_LEMBAGA', 'KEPALA_RA', 'PENILAI_1', 'PENILAI_2'] },
  { key: 'dashboard', label: 'Dashboard Ringkasan', group: 'Ringkasan', section: 'advanced', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN_LEMBAGA', 'KEPALA_RA', 'PENILAI_1', 'PENILAI_2'] },
  { key: 'profil_lembaga', label: 'Profil Lembaga', group: 'Data Master', section: 'advanced', icon: Building2, roles: ['SUPER_ADMIN', 'ADMIN_LEMBAGA', 'KEPALA_RA'] },
  { key: 'data_kepala', label: 'Data Kepala RA', group: 'Data Master', section: 'advanced', icon: UserCheck, roles: ['SUPER_ADMIN', 'ADMIN_LEMBAGA', 'KEPALA_RA'] },
  { key: 'data_guru', label: 'Data Guru & Tendik', group: 'Data Master', section: 'advanced', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN_LEMBAGA', 'KEPALA_RA'] },
  { key: 'data_penilai', label: 'Data Penilai', group: 'Data Master', section: 'advanced', icon: Award, roles: ['SUPER_ADMIN', 'ADMIN_LEMBAGA', 'KEPALA_RA'] },
  { key: 'periode_pkkm', label: 'Periode PKKM', group: 'Data Master', section: 'advanced', icon: Calendar, roles: ['SUPER_ADMIN', 'ADMIN_LEMBAGA', 'KEPALA_RA'] },
  { key: 'administrasi_dokumen', label: 'Administrasi & 27 Dokumen', group: 'Administrasi', section: 'advanced', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN_LEMBAGA', 'KEPALA_RA'] },
  { key: 'program_kerja', label: 'Program Kerja', group: 'Administrasi', section: 'advanced', icon: Calendar, roles: ['SUPER_ADMIN', 'ADMIN_LEMBAGA', 'KEPALA_RA'] },
  { key: 'bukti_fisik', label: 'Bukti Fisik Portofolio', group: 'Administrasi', section: 'advanced', icon: FolderOpen, roles: ['SUPER_ADMIN', 'ADMIN_LEMBAGA', 'KEPALA_RA', 'PENILAI_1', 'PENILAI_2'] },
  { key: 'pemeriksaan_kelengkapan', label: 'Pemeriksaan Kelengkapan', group: 'Administrasi', section: 'advanced', icon: CheckSquare, roles: ['SUPER_ADMIN', 'ADMIN_LEMBAGA', 'KEPALA_RA', 'PENILAI_1', 'PENILAI_2'] },
  { key: 'penilaian_1', label: 'Penilaian Penilai 1', group: 'Penilaian', section: 'advanced', icon: ClipboardCheck, roles: ['SUPER_ADMIN', 'PENILAI_1', 'KEPALA_RA', 'ADMIN_LEMBAGA'] },
  { key: 'penilaian_2', label: 'Penilaian Penilai 2', group: 'Penilaian', section: 'advanced', icon: ClipboardCheck, roles: ['SUPER_ADMIN', 'PENILAI_2', 'KEPALA_RA', 'ADMIN_LEMBAGA'] },
  { key: 'hasil_penilaian', label: 'Hasil Penilaian (P1 & P2)', group: 'Penilaian', section: 'advanced', icon: FileCheck2, roles: ['SUPER_ADMIN', 'ADMIN_LEMBAGA', 'KEPALA_RA', 'PENILAI_1', 'PENILAI_2'] },
  { key: 'rekap_nilai', label: 'Rekapitulasi Nilai', group: 'Hasil & Laporan', section: 'advanced', icon: FileSpreadsheet, roles: ['SUPER_ADMIN', 'ADMIN_LEMBAGA', 'KEPALA_RA', 'PENILAI_1', 'PENILAI_2'] },
  { key: 'rekomendasi_rtl', label: 'Rekomendasi & Tindak Lanjut', group: 'Hasil & Laporan', section: 'advanced', icon: ClipboardList, roles: ['SUPER_ADMIN', 'ADMIN_LEMBAGA', 'KEPALA_RA', 'PENILAI_1', 'PENILAI_2'] },
  { key: 'arsip_tahunan', label: 'Arsip Tahun Sebelumnya', group: 'Sistem', section: 'advanced', icon: Archive, roles: ['SUPER_ADMIN', 'ADMIN_LEMBAGA', 'KEPALA_RA'] },
  { key: 'audit_log', label: 'Audit Log & Riwayat Skor', group: 'Sistem', section: 'advanced', icon: History, roles: ['SUPER_ADMIN', 'ADMIN_LEMBAGA', 'KEPALA_RA', 'PENILAI_1', 'PENILAI_2'] },
  { key: 'pengaturan', label: 'Pengaturan', group: 'Sistem', section: 'advanced', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN_LEMBAGA'] },
];

export const SaasShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    firebaseUser,
    isCloudConnected,
    isCloudSyncing,
    isDemoRoleSwitcherAllowed,
    activeRole,
    setActiveRole,
    activeMenu,
    setActiveMenu,
    signInWithGoogle,
    signOutUser,
    institutions,
    activeInstitution,
    setActiveInstitutionId,
    periods,
    activePeriod,
    setActivePeriodId,
    notifications,
    statusMessage,
    autoSyncAllNow,
    setPendingQuickPrint,
  } = useSaas();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);

  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(activeRole));
  const primaryNav = visibleNav.filter((item) => item.section === 'primary');
  const advancedNav = visibleNav.filter((item) => item.section === 'advanced');
  const isAdvancedActive =
    activeMenu === 'ai_assistant' || advancedNav.some((item) => item.key === activeMenu);
  const advancedExpanded = showAdvancedMenu || isAdvancedActive;

  const currentMenuObj =
    activeMenu === 'ai_assistant'
      ? { key: 'ai_assistant' as SaasMenuKey, label: 'Panduan Asisten AI PKKM' }
      : NAV_ITEMS.find((i) => i.key === activeMenu) || NAV_ITEMS[0];

  const handleQuickPrintJump = async () => {
    await autoSyncAllNow(false);
    setPendingQuickPrint(true);
    setActiveMenu('laporan_pkkm');
    setMobileOpen(false);
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#064e3b] via-[#054434] to-[#032e22] text-emerald-50 border-r border-[#d4af37]/30 w-68">
      {/* Brand Title */}
      <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#043927]/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#d4af37]/15 border border-[#d4af37]/50 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4 text-[#f3d46b]" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap block truncate">
              PKKM RA SMART SYSTEM
            </span>
            <span className="text-[11px] text-[#f3d46b] font-medium whitespace-nowrap block truncate">
              Multi-Tenant Kemenag RI
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 text-emerald-100 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tenant & Period Selector */}
      <div className="p-3 border-b border-white/10 space-y-2 bg-[#043927]/75">
        <div>
          <label className="text-[11px] font-semibold text-emerald-100/80 block mb-1">
            Lembaga RA Aktif
          </label>
          <select
            value={activeInstitution.institutionId}
            onChange={(e) => setActiveInstitutionId(e.target.value)}
            disabled={institutions.length === 0}
            className="w-full px-2.5 py-1.5 text-xs font-semibold text-white bg-[#032b1f] border border-[#d4af37]/35 hover:border-[#d4af37]/65 rounded-lg disabled:opacity-60 transition-colors"
          >
            {institutions.length === 0 ? (
              <option value={activeInstitution.institutionId}>Belum ada RA aktif</option>
            ) : (
              institutions.map((i) => (
                <option key={i.institutionId} value={i.institutionId}>
                  {i.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="text-[11px] font-semibold text-emerald-100/80 block mb-1">
              Periode
            </label>
            <select
              value={activePeriod.periodId}
              onChange={(e) => setActivePeriodId(e.target.value)}
              disabled={periods.length === 0}
              className="w-full px-2 py-1.5 text-xs font-medium text-white bg-[#032b1f] border border-[#d4af37]/30 hover:border-[#d4af37]/60 rounded-lg disabled:opacity-60 transition-colors"
            >
              {periods.length === 0 ? (
                <option value={activePeriod.periodId}>{activePeriod.yearLabel}</option>
              ) : (
                periods.map((p) => (
                  <option key={p.periodId} value={p.periodId}>
                    {p.yearLabel}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-emerald-100/80 block mb-1">
              {isDemoRoleSwitcherAllowed ? 'Simulasi Role' : 'Peran Terkunci'}
            </label>
            {isDemoRoleSwitcherAllowed ? (
              <select
                value={activeRole}
                onChange={(e) => setActiveRole(e.target.value as UserRole)}
                className="w-full px-2 py-1.5 text-xs font-medium text-white bg-[#032b1f] border border-[#d4af37]/30 hover:border-[#d4af37]/60 rounded-lg transition-colors"
              >
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN_LEMBAGA">Admin Lembaga</option>
                <option value="KEPALA_RA">Kepala RA</option>
                <option value="PENILAI_1">Penilai 1</option>
                <option value="PENILAI_2">Penilai 2</option>
              </select>
            ) : (
              <div
                className="w-full px-2 py-1.5 text-xs font-semibold text-[#f3d46b] bg-[#032b1f] border border-[#d4af37]/40 rounded-lg truncate"
                title="Peran dikunci otomatis sesuai hak akses akun Google Anda"
              >
                {activeRole.replace('_', ' ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Navigation Links: Panel Admin Utama + Menu Lanjutan */}
      <nav className="flex-1 overflow-y-auto p-2.5 space-y-1">
        <div className="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#f3d46b]/90">
          Panel Admin Otomatis
        </div>
        {primaryNav.map((item) => {
          const Icon = item.icon;
          const active = activeMenu === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setActiveMenu(item.key);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-white/14 text-white font-semibold border border-[#d4af37]/55 shadow-xs'
                  : 'text-emerald-100/85 hover:bg-white/8 hover:text-white border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#f3d46b]' : 'text-emerald-300/75'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}

        <div className="pt-3 mt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => setShowAdvancedMenu((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider text-emerald-200/80 hover:bg-white/8 hover:text-white cursor-pointer transition-colors"
          >
            <span>Menu Lanjutan ({advancedNav.length})</span>
            {advancedExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#f3d46b]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-emerald-200/70" />
            )}
          </button>

          {advancedExpanded && (
            <div className="mt-1 space-y-0.5">
              {advancedNav.map((item, idx) => {
                const Icon = item.icon;
                const active = activeMenu === item.key;
                const showGroup = idx === 0 || advancedNav[idx - 1].group !== item.group;
                return (
                  <React.Fragment key={item.key}>
                    {showGroup && (
                      <div className="px-3 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-[#f3d46b]/70">
                        {item.group}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenu(item.key);
                        setMobileOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-white/14 text-white font-semibold border border-[#d4af37]/45'
                          : 'text-emerald-100/80 hover:bg-white/8 hover:text-white border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#f3d46b]' : 'text-emerald-300/70'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Help, AI Panduan & Cloud Session */}
      <div className="p-3 border-t border-white/10 bg-[#03281d]/80 space-y-1.5 text-xs">
        <button
          type="button"
          onClick={() => {
            setActiveMenu('ai_assistant');
            setMobileOpen(false);
          }}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
            activeMenu === 'ai_assistant'
              ? 'bg-white/14 text-white font-semibold border border-[#d4af37]/45'
              : 'text-emerald-100/85 hover:text-white hover:bg-white/8'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#f3d46b]" />
          <span>Asisten AI PKKM</span>
        </button>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-emerald-100/85 hover:text-white hover:bg-white/8 rounded-lg cursor-pointer transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-[#f3d46b]" />
          <span>Pusat Bantuan PKKM</span>
        </button>
        <div className="px-3 py-1 text-[11px] text-emerald-200/75 flex items-center justify-between">
          <span>Cloud Sync</span>
          <span
            className={
              isCloudSyncing
                ? 'text-sky-300 font-semibold'
                : isCloudConnected
                ? 'text-emerald-300 font-semibold'
                : 'text-[#f3d46b] font-semibold'
            }
          >
            {isCloudSyncing ? 'Menyinkron...' : isCloudConnected ? 'Tersinkron' : 'Lokal'}
          </span>
        </div>
      </div>
    </div>
  );

  const mobileQuickTabs: { key: SaasMenuKey; label: string; icon: React.FC<{ className?: string }> }[] = [
    { key: 'mode_cepat', label: 'Mode Cepat', icon: Zap },
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'instrumen_penilaian', label: '96 Butir', icon: ClipboardCheck },
    {
      key: activeRole === 'PENILAI_1' ? 'penilaian_1' : activeRole === 'PENILAI_2' ? 'penilaian_2' : 'rekap_nilai',
      label: activeRole === 'PENILAI_1' ? 'Nilai P1' : activeRole === 'PENILAI_2' ? 'Nilai P2' : 'Rekap',
      icon: FileSpreadsheet,
    },
    { key: 'laporan_pkkm', label: 'Cetak', icon: Printer },
  ];

  return (
    <div className="app-main-shell min-h-screen bg-[#f7f8f5] text-slate-900 flex">
      {/* Desktop Permanent Sidebar */}
      <aside className="no-print hidden lg:block shrink-0 sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-[#022017]/60 backdrop-blur-[1px]" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 h-full">{SidebarContent}</div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (3-zone contract) */}
        <header className="no-print h-16 bg-white/95 backdrop-blur-xs border-b border-[#064e3b]/12 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          {/* Left: Mobile drawer trigger + Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-[#064e3b] hover:bg-emerald-50 rounded-lg cursor-pointer"
              aria-label="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
              <span className="font-semibold text-[#064e3b] truncate">{activeInstitution.name}</span>
              <span aria-hidden="true" className="text-[#b48a1e]">/</span>
              <span className="truncate font-medium text-slate-600">{currentMenuObj.label}</span>
            </div>
          </div>

          {/* Right: Quick Print, Notifications & Account Auth */}
          <div className="flex items-center gap-2.5 shrink-0">
            {statusMessage && (
              <span className="hidden xl:inline-block text-xs text-[#047857] font-medium truncate max-w-xs">
                {statusMessage}
              </span>
            )}

            {activeMenu !== 'laporan_pkkm' && (
              <button
                type="button"
                onClick={handleQuickPrintJump}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#6b4f09] bg-[#fdf8e8] hover:bg-[#f7ecc6] border border-[#d4af37]/70 rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-[#9a7414]" />
                <span className="hidden sm:inline">Cetak Laporan A4</span>
              </button>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                className="relative p-2 text-slate-600 hover:text-[#064e3b] hover:bg-emerald-50/70 rounded-lg cursor-pointer transition-colors"
                aria-label="Notifikasi"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 text-[10px] font-bold px-1 rounded-full bg-[#064e3b] text-[#f3d46b] tabular-nums border border-[#d4af37]/50">
                    {notifications.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#064e3b]/15 rounded-xl shadow-lg p-3 z-50 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#064e3b] pb-1.5 border-b border-slate-100">
                    <span>Notifikasi Sistem</span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        setActiveMenu(n.targetMenu);
                        setNotifOpen(false);
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-[#f7f8f5] text-xs space-y-0.5 cursor-pointer transition-colors"
                    >
                      <strong className="text-slate-900 block">{n.title}</strong>
                      <span className="text-slate-500 block">{n.detail}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {firebaseUser ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs font-medium text-slate-700 truncate max-w-[140px]">
                  {firebaseUser.displayName || firebaseUser.email}
                </span>
                <button
                  type="button"
                  onClick={signOutUser}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#064e3b] bg-[#f1f5f2] hover:bg-[#e5ede7] border border-[#064e3b]/15 rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#064e3b] hover:bg-[#043927] border border-[#d4af37]/40 rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-[#f3d46b]" />
                <span>Masuk Google Cloud</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 pb-20 lg:pb-6 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Bottom Quick Nav (<= 15% height, lg:hidden) */}
        <nav className="no-print lg:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-[#064e3b] border-t border-[#d4af37]/35 flex items-center justify-around px-1">
          {mobileQuickTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeMenu === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveMenu(tab.key)}
                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-[10px] font-semibold cursor-pointer transition-colors ${
                  active ? 'text-[#f3d46b]' : 'text-emerald-100/75 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Help Center Modal */}
      {helpOpen && (
        <div className="no-print fixed inset-0 z-50 bg-[#022017]/60 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-[#d4af37]/50 rounded-xl max-w-lg w-full overflow-hidden shadow-xl">
            <div className="h-1 bg-gradient-to-r from-[#064e3b] via-[#d4af37] to-[#064e3b]" />
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="font-display text-base font-bold text-[#064e3b]">
                  Pusat Bantuan PKKM RA SMART SYSTEM
                </h2>
                <button
                  type="button"
                  onClick={() => setHelpOpen(false)}
                  className="text-slate-400 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <p><strong>1. Prinsip Input Sekali:</strong> Lengkapi data lembaga, Kepala RA, Guru/PTK, Penilai, dan Program Kerja sekali saja. Semua dokumen administrasi dan laporan A4 otomatis terisi.</p>
                <p><strong>2. Instrumen 96 Indikator:</strong> Seluruh butir dari <em>PKKM_v.26 untuk RA</em> tersedia lengkap beserta daftar bukti wajib.</p>
                <p><strong>3. Penilai Independen:</strong> Penilai 1 dan Penilai 2 mengisi skor secara terpisah (skala 1–4) dan dapat mengunci hasil setelah seluruh bukti diverifikasi.</p>
                <p><strong>4. Ekspor Lengkap:</strong> Unduh hasil sebagai cetakan A4/PDF, Slide Presentasi 16:9, Word (.docx), Excel (.xlsx), dan arsip ZIP.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
