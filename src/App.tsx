/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { ToastContainer } from './components/common/Toast';
import { QuickAddModal } from './components/common/QuickAddModal';
import { SearchModal } from './components/common/SearchModal';
import { SettingsModal } from './components/settings/SettingsModal';

// Module Views
import { DashboardView } from './components/dashboard/DashboardView';
import { TodoCalendarView } from './components/todos/TodoCalendarView';
import { FinanceTrackerView } from './components/finance/FinanceTrackerView';
import { ReimburseView } from './components/reimburse/ReimburseView';
import { RemoveBgView } from './components/removebg/RemoveBgView';
import { NotesKnowledgeView } from './components/notes/NotesKnowledgeView';
import { PdfToolsView } from './components/pdf/PdfToolsView';
import { BarcodeQrView } from './components/barcode/BarcodeQrView';
import { FocusTimerView } from './components/focus/FocusTimerView';
import { ArchitectureGuideModal } from './components/docs/ArchitectureGuideModal';

// Icons for Mobile Bottom Nav
import { LayoutDashboard, CalendarCheck, Wallet, FileText, FileType, QrCode } from 'lucide-react';
import { NavigationTab } from './types';

const MainShell: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Render current active tab content
  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onOpenQuickAdd={() => setIsQuickAddOpen(true)} />;
      case 'todos':
        return <TodoCalendarView />;
      case 'finance':
        return <FinanceTrackerView />;
      case 'reimburse':
        return <ReimburseView />;
      case 'removebg':
        return <RemoveBgView />;
      case 'notes':
        return <NotesKnowledgeView />;
      case 'pdftools':
        return <PdfToolsView />;
      case 'barcode':
        return <BarcodeQrView />;
      case 'focus':
        return <FocusTimerView />;
      case 'architecture':
        return <ArchitectureGuideModal />;
      default:
        return <DashboardView onOpenQuickAdd={() => setIsQuickAddOpen(true)} />;
    }
  };

  const mobileNavItems: { id: NavigationTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'todos', label: 'Todo', icon: CalendarCheck },
    { id: 'finance', label: 'Keuangan', icon: Wallet },
    { id: 'notes', label: 'Catatan', icon: FileText },
    { id: 'pdftools', label: 'PDF', icon: FileType },
  ];

  return (
    <div className="min-h-screen bg-neutral-100/60 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors duration-200">
      <div className="flex-1 flex w-full">
        {/* Responsive Sidebar */}
        <Sidebar
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            onOpenSearch={() => setIsSearchOpen(true)}
          />

          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
            {renderActiveView()}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Thumb friendly for mobile devices) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-around py-2 px-1">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modals & Overlays */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainShell />
    </AppProvider>
  );
}
