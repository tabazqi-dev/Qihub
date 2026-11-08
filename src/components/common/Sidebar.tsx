import React from 'react';
import { useApp } from '../../context/AppContext';
import { NavigationTab } from '../../types';
import { 
  LayoutDashboard, 
  CalendarCheck, 
  Wallet, 
  Receipt,
  Scissors,
  FileText, 
  FileType, 
  QrCode, 
  Timer, 
  Layers, 
  ChevronLeft, 
  ChevronRight,
  Settings,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSettings: () => void;
}

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenMobile,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
  onOpenSettings
}) => {
  const { activeTab, setActiveTab, todos, debts, reimbursements, profile } = useApp();

  const pendingTodosCount = todos.filter(t => t.status !== 'completed').length;
  const pendingDebtsCount = debts.filter(d => d.status !== 'paid').length;
  const pendingReimburseCount = (reimbursements || []).filter(r => r.status === 'Submitted' || r.status === 'Draft' || r.status === 'Approved').length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard },
    { id: 'finance', label: 'Keuangan & Piutang', icon: Wallet, badge: pendingDebtsCount > 0 ? pendingDebtsCount : undefined },
    { id: 'reimburse', label: 'Reimburse Proyek', icon: Receipt, badge: pendingReimburseCount > 0 ? pendingReimburseCount : undefined },
    { id: 'removebg', label: 'Remove Background', icon: Scissors },
    { id: 'todos', label: 'Todo & Kalender', icon: CalendarCheck, badge: pendingTodosCount > 0 ? pendingTodosCount : undefined },
    { id: 'notes', label: 'Catatan & Ide', icon: FileText },
    { id: 'pdftools', label: 'PDF Utilities', icon: FileType },
    { id: 'barcode', label: 'QR & Barcode Hub', icon: QrCode },
    { id: 'focus', label: 'Focus Pomodoro', icon: Timer },
    { id: 'architecture', label: 'Arsitektur Super App', icon: Layers },
  ];

  const handleSelectTab = (tab: NavigationTab) => {
    setActiveTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300 ease-in-out lg:static ${
          isOpenMobile ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-18' : 'lg:w-64'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
              Ω
            </div>
            {(!isCollapsed || isOpenMobile) && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-neutral-100 truncate">
                    Qihub
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono text-[9px] font-bold">
                    v3.0.0
                  </span>
                </div>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium truncate">
                  Personal Super App
                </span>
              </div>
            )}
          </div>

          {/* Close on Mobile */}
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 lg:hidden"
            aria-label="Tutup menu sidebar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Collapse Toggle on Desktop */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {(!isCollapsed || isOpenMobile) && (
            <div className="px-3 py-2 text-[11px] font-semibold tracking-wider uppercase text-neutral-400 dark:text-neutral-400">
              Modul Utama
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                title={isCollapsed && !isOpenMobile ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 hover:text-neutral-900 dark:hover:text-neutral-100'
                } ${isCollapsed && !isOpenMobile ? 'justify-center px-0' : ''}`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                    isActive
                      ? 'text-white dark:text-neutral-900'
                      : 'text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200'
                  }`}
                />

                {(!isCollapsed || isOpenMobile) && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}

                {item.badge !== undefined && (!isCollapsed || isOpenMobile) && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md font-mono tabular-nums ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-neutral-900/10 dark:text-neutral-900 font-semibold'
                        : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer User Profile Card */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 shrink-0">
          <div
            onClick={onOpenSettings}
            className={`flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors cursor-pointer group ${
              isCollapsed && !isOpenMobile ? 'justify-center p-1' : ''
            }`}
          >
            <div className="relative shrink-0">
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover ring-1 ring-neutral-300 dark:ring-neutral-700"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full absolute bottom-0 right-0 ring-2 ring-white dark:ring-neutral-900" />
            </div>

            {(!isCollapsed || isOpenMobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                  {profile.name}
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                  {profile.title}
                </p>
              </div>
            )}

            {(!isCollapsed || isOpenMobile) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSettings();
                }}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                title="Buka Pengaturan"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
          {(!isCollapsed || isOpenMobile) && (
            <div className="pt-2 text-center">
              <span className="text-[10px] text-neutral-400 font-mono">
                Qihub v3.0.0 • Enterprise Edition
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
