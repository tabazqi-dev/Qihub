import React from 'react';
import { useApp } from '../../context/AppContext';
import { NavigationTab } from '../../types';
import { sanitizeSafeImageSrc } from '../../utils/debtItems';
import { 
  Menu, 
  Sun, 
  Moon, 
  Search, 
  Calendar as CalendarIcon,
  HelpCircle
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onOpenSearch: () => void;
}

const TAB_TITLES: Record<NavigationTab, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard Utama', subtitle: 'Ringkasan produktivitas & metriks harian' },
  todos: { title: 'Todo & Master Kalender', subtitle: 'Perencanaan tugas dan jadwal terpadu' },
  finance: { title: 'Keuangan, Piutang & Invoice', subtitle: 'Pencatatan arus kas, kas/non-kas, dan penagihan' },
  reimburse: { title: 'Reimburse Proyek (WD / WE)', subtitle: 'Klaim proyek dengan kalkulasi otomatis tarif Excel' },
  removebg: { title: 'Remove Background Studio', subtitle: 'Hapus latar belakang gambar instan & studio backdrop' },
  converter: { title: 'Image Converter (PNG ⇄ JPG)', subtitle: 'Konversi format PNG, JPG, dan WebP secara instan & batch' },
  notes: { title: 'Catatan & Knowledge Base', subtitle: 'Dokumentasi materi, ide, dan referensi' },
  pdftools: { title: 'PDF Utilities & E-Signature', subtitle: 'Konversi gambar, kompresi ukuran file, dan tanda tangan digital' },
  barcode: { title: 'QR & Barcode Studio', subtitle: 'Generator & pemindai barcode / QR code' },
  focus: { title: 'Pomodoro Focus Timer', subtitle: 'Ritme kerja terfokus dengan suara latar' },
  logbook: { title: 'Logbook Kerja Harian', subtitle: 'Pencatatan aktivitas harian dan ekspor laporan XLSX' },
  architecture: { title: 'Arsitektur Modular Super App', subtitle: 'Struktur kode & panduan integrasi sistem' },
};

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  onOpenSearch
}) => {
  const { activeTab, setActiveTab, theme, toggleTheme, appBranding } = useApp();
  const currentTabInfo = TAB_TITLES[activeTab] || { title: 'Dashboard', subtitle: '' };
  const appName = appBranding.appName?.trim() || "Q'Hub";
  const safeLogo = sanitizeSafeImageSrc(appBranding.appLogoUrl);

  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  return (
    <header className="h-16 px-4 lg:px-6 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4 sticky top-0 z-30 transition-colors">
      {/* Zone 1: Mobile Hamburger & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileSidebar}
          className="p-2 -ml-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden transition-colors"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 min-w-0">
          {safeLogo && (
            <img
              src={safeLogo}
              alt={appName}
              className="w-5 h-5 rounded-md object-cover lg:hidden shrink-0"
            />
          )}
          <span 
            onClick={() => setActiveTab('dashboard')}
            className="cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors font-medium hidden sm:inline"
          >
            {appName}
          </span>
          <span className="hidden sm:inline text-neutral-300 dark:text-neutral-600">/</span>
          <h1 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
            {currentTabInfo.title}
          </h1>
        </div>
      </div>

      {/* Zone 2: Empty Spacer */}
      <div className="hidden md:flex flex-1" />

      {/* Zone 3: Date, Search, Actions & Theme Toggle (All on Right Side) */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <div className="hidden md:flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 font-mono text-[11px] tabular-nums">
            <CalendarIcon className="w-3.5 h-3.5 text-neutral-400" />
            <span>{todayFormatted}</span>
          </div>

          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200/70 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors text-xs cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Cari cepat...</span>
            <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 font-mono">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Mobile Quick Search next to Dark/Light */}
        <button
          onClick={onOpenSearch}
          className="md:hidden p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Cari cepat"
          title="Cari cepat"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
        </button>

        <button
          onClick={() => setActiveTab('architecture')}
          className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors hidden sm:flex cursor-pointer"
          title="Panduan Arsitektur & Ekstensibilitas"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
