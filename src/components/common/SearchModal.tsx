import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { NavigationTab } from '../../types';
import { Search, X, CalendarCheck, Wallet, FileText, ArrowRight, CornerDownLeft } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const { todos, transactions, notes, setActiveTab, profile } = useApp();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const filteredTodos = q ? todos.filter(t => 
    t.title.toLowerCase().includes(q) || 
    t.category.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.toLowerCase().includes(q))
  ).slice(0, 4) : [];

  const filteredTransactions = q ? transactions.filter(t => 
    t.title.toLowerCase().includes(q) || 
    t.category.toLowerCase().includes(q)
  ).slice(0, 4) : [];

  const filteredNotes = q ? notes.filter(n => 
    n.title.toLowerCase().includes(q) || 
    n.content.toLowerCase().includes(q) ||
    n.tags.some(tag => tag.toLowerCase().includes(q))
  ).slice(0, 4) : [];

  const quickNavs: { label: string; tab: NavigationTab; desc: string }[] = [
    { label: 'Keuangan, Piutang & Invoice', tab: 'finance', desc: 'Saldo cash/non-cash, buku piutang & tagih WA' },
    { label: 'Remove Background Studio', tab: 'removebg', desc: 'Hapus background foto & ganti latar instan' },
    { label: 'PDF Utilities & Convert', tab: 'pdftools', desc: 'Konversi gambar ke PDF & ekstrak teks' },
    { label: 'QR & Barcode Studio', tab: 'barcode', desc: 'Buat & scan kode QR / barcode' },
    { label: 'Todo & Master Kalender', tab: 'todos', desc: 'Kalender bulanan & task board' },
    { label: 'Catatan & Knowledge Base', tab: 'notes', desc: 'Editor Markdown & catatan penting' },
    { label: 'Focus Pomodoro Timer', tab: 'focus', desc: 'Sesi fokus & produktivitas' },
    { label: 'Arsitektur Super App', tab: 'architecture', desc: 'Spesifikasi teknis & panduan kode' },
  ];

  const filteredNavs = q ? quickNavs.filter(nav => 
    nav.label.toLowerCase().includes(q) || 
    nav.desc.toLowerCase().includes(q)
  ) : quickNavs;

  const handleNavigate = (tab: NavigationTab) => {
    setActiveTab(tab);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-neutral-950/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input header */}
        <div className="flex items-center px-4 border-b border-neutral-200 dark:border-neutral-800">
          <Search className="w-5 h-5 text-neutral-400 shrink-0 mr-3" />
          <input
            type="text"
            placeholder="Cari tugas, transaksi, catatan, atau menu..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full py-4 text-sm bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden"
            autoFocus
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results area */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {/* Quick Navigations */}
          <div>
            <div className="px-2 pb-2 text-[11px] font-semibold tracking-wider uppercase text-neutral-400">
              Modul & Navigasi
            </div>
            <div className="space-y-1">
              {filteredNavs.map((nav) => (
                <button
                  key={nav.tab}
                  onClick={() => handleNavigate(nav.tab)}
                  className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {nav.label}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {nav.desc}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>

          {/* Search items matches */}
          {q && (
            <>
              {filteredTodos.length > 0 && (
                <div>
                  <div className="px-2 pb-2 text-[11px] font-semibold tracking-wider uppercase text-neutral-400">
                    Tugas Ditemukan ({filteredTodos.length})
                  </div>
                  <div className="space-y-1">
                    {filteredTodos.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleNavigate('todos')}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CalendarCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                            {t.title}
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-400 font-mono">
                          {t.dueDate}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredTransactions.length > 0 && (
                <div>
                  <div className="px-2 pb-2 text-[11px] font-semibold tracking-wider uppercase text-neutral-400">
                    Transaksi Keuangan ({filteredTransactions.length})
                  </div>
                  <div className="space-y-1">
                    {filteredTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        onClick={() => handleNavigate('finance')}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Wallet className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                            {tx.title}
                          </span>
                        </div>
                        <span className="text-xs font-mono tabular-nums font-semibold text-neutral-900 dark:text-neutral-100">
                          {profile.currencySymbol} {tx.amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredNotes.length > 0 && (
                <div>
                  <div className="px-2 pb-2 text-[11px] font-semibold tracking-wider uppercase text-neutral-400">
                    Catatan ({filteredNotes.length})
                  </div>
                  <div className="space-y-1">
                    {filteredNotes.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNavigate('notes')}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                            {n.title}
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-400">
                          {n.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-100/70 dark:bg-neutral-800/40 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-400">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 font-mono text-[10px]">
              ESC
            </kbd>
            <span>untuk menutup</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CornerDownLeft className="w-3.5 h-3.5" />
            <span>untuk memilih modul</span>
          </div>
        </div>
      </div>
    </div>
  );
};
