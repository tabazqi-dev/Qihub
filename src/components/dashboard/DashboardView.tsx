import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  Receipt,
  FileType, 
  QrCode, 
  Timer, 
  Plus, 
  ChevronRight, 
  CheckSquare, 
  Sparkles,
  Flame,
  FileText,
  ArrowLeftRight
} from 'lucide-react';

interface DashboardViewProps {
  onOpenQuickAdd: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenQuickAdd }) => {
  const { profile, todos, transactions, notes, habits, toggleHabitDay, toggleTodoStatus, setActiveTab } = useApp();

  // Dynamic greeting based on current local hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Todo calculations
  const pendingTodos = todos.filter(t => t.status !== 'completed');
  const completedTodos = todos.filter(t => t.status === 'completed');
  const completionRate = todos.length > 0 ? Math.round((completedTodos.length / todos.length) * 100) : 0;

  // Finance calculations
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  // Multi-Account Finance calculations
  const { debts, accounts, myDebts } = useApp();

  const getAccountBalance = (accId: string, initial: number) => {
    const inc = transactions.filter(t => t.accountId === accId && t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = transactions.filter(t => t.accountId === accId && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return initial + inc - exp;
  };

  const totalBankBalance = accounts
    .filter(a => a.type === 'bank')
    .reduce((sum, a) => sum + getAccountBalance(a.id, a.initialBalance), 0);

  const totalEwalletBalance = accounts
    .filter(a => a.type === 'ewallet')
    .reduce((sum, a) => sum + getAccountBalance(a.id, a.initialBalance), 0);

  const totalCashBalance = accounts
    .filter(a => a.type === 'cash')
    .reduce((sum, a) => sum + getAccountBalance(a.id, a.initialBalance), 0);

  // If accounts exist, use their exact real-world current balance sum
  const totalCombinedBalance = accounts.length > 0 
    ? accounts.reduce((sum, a) => sum + getAccountBalance(a.id, a.initialBalance), 0)
    : (transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) - transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));

  const totalUnpaidDebts = debts
    .filter(d => d.status !== 'paid')
    .reduce((sum, d) => sum + (d.amount - d.amountPaid), 0);

  const totalUnpaidMyDebts = myDebts
    .filter(d => d.status !== 'paid')
    .reduce((sum, d) => sum + (d.amount - d.amountPaid), 0);

  const urgentTodos = pendingTodos
    .sort((a, b) => (a.priority === 'high' ? -1 : 1))
    .slice(0, 4);

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Greeting Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-indigo-950 text-white p-6 sm:p-8 border border-neutral-800 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Workspace & Productivity Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {getGreeting()}, {profile.name}!
            </h1>
            <p className="text-sm text-neutral-300 max-w-2xl">
              Tersedia <span className="font-semibold text-white">{accounts.length} rekening/dompet</span> aktif. Ada <span className="font-semibold text-amber-300">{myDebts.filter(d => d.status !== 'paid').length} hutang saya</span> dan <span className="font-semibold text-rose-400">{debts.filter(d => d.status !== 'paid').length} piutang orang lain</span> yang dapat ditagih.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onOpenQuickAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-neutral-900 hover:bg-neutral-100 text-xs font-semibold shadow-sm transition-all hover:scale-102 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Entri Cepat Baru</span>
            </button>
            <button
              onClick={() => setActiveTab('finance')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-all cursor-pointer"
            >
              <span>Cek Saldo Harian</span>
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Saldo Bersih Seluruh Rekening & Dompet */}
        <div 
          onClick={() => setActiveTab('finance')}
          className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium">Total Seluruh Saldo Riil</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 tracking-tight">
            {profile.currencySymbol} {totalCombinedBalance.toLocaleString('id-ID')}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Bank: {profile.currencySymbol} {totalBankBalance.toLocaleString('id-ID')}</span>
            <span>·</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-semibold">E-Wallet: {profile.currencySymbol} {totalEwalletBalance.toLocaleString('id-ID')}</span>
            <span>·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Cash: {profile.currencySymbol} {totalCashBalance.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Stat 2: Hutang Saya (Kewajiban / PayLater / Tempo) */}
        <div 
          onClick={() => setActiveTab('finance')}
          className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium">Hutang Saya (Kewajiban)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 tracking-tight">
            {profile.currencySymbol} {totalUnpaidMyDebts.toLocaleString('id-ID')}
          </div>
          <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
            {myDebts.filter(d => d.status !== 'paid').length} tagihan · Timbul dari transaksi kredit/PayLater
          </p>
        </div>

        {/* Stat 3: Piutang Orang Lain */}
        <div 
          onClick={() => setActiveTab('finance')}
          className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium">Piutang Orang Lain</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 tracking-tight">
            {profile.currencySymbol} {totalUnpaidDebts.toLocaleString('id-ID')}
          </div>
          <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
            {debts.filter(d => d.status !== 'paid').length} orang · Bisa ditagih via WA / Email
          </p>
        </div>

        {/* Stat 3: Tugas Selesai */}
        <div 
          onClick={() => setActiveTab('todos')}
          className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium">Tugas Selesai</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 tracking-tight">
            {completedTodos.length} <span className="text-sm font-normal text-neutral-400">/ {todos.length}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{completionRate}% selesai</span>
            <span className="text-neutral-300 dark:text-neutral-700">·</span>
            <span>{pendingTodos.length} tersisa</span>
          </div>
        </div>

        {/* Stat 4: Catatan & Knowledge */}
        <div 
          onClick={() => setActiveTab('notes')}
          className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium">Knowledge & Notes</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 tracking-tight">
            {notes.length} Dokumen
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span>{notes.filter(n => n.isPinned).length} disematkan</span>
            <span className="text-neutral-300 dark:text-neutral-700">·</span>
            <span>Markdown ready</span>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts Banner */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Akses Cepat Tool Utama
          </h2>
          <span className="text-xs text-neutral-400">Utilitas Sekali Klik</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <button
            onClick={() => setActiveTab('reimburse')}
            className="flex items-center gap-3 p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 hover:bg-teal-100/70 dark:hover:bg-teal-950/40 transition-all text-left group cursor-pointer border border-teal-200/70 dark:border-teal-800/60"
          >
            <div className="w-9 h-9 rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">Reimburse Proyek</p>
              <p className="text-[11px] text-teal-700 dark:text-teal-400 font-medium truncate">Klaim WD & WE Excel</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-left group cursor-pointer border border-neutral-200/60 dark:border-neutral-700/60"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">Tarik / Transfer</p>
              <p className="text-[11px] text-neutral-500 truncate">Pindah dana rekening</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('removebg')}
            className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-left group cursor-pointer border border-neutral-200/60 dark:border-neutral-700/60"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              ✂️
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">Remove BG</p>
              <p className="text-[11px] text-neutral-500 truncate">Hapus background foto</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-left group cursor-pointer border border-neutral-200/60 dark:border-neutral-700/60"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">Tagih Piutang</p>
              <p className="text-[11px] text-neutral-500 truncate">Kirim WA / Invoice</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('pdftools')}
            className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-left group cursor-pointer border border-neutral-200/60 dark:border-neutral-700/60"
          >
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FileType className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">Convert ke PDF</p>
              <p className="text-[11px] text-neutral-500 truncate">JPG/PNG ke PDF rapi</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('barcode')}
            className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-left group cursor-pointer border border-neutral-200/60 dark:border-neutral-700/60"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">QR & Barcode</p>
              <p className="text-[11px] text-neutral-500 truncate">Buat & scan kode</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('focus')}
            className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-left group cursor-pointer border border-neutral-200/60 dark:border-neutral-700/60"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Timer className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">Pomodoro</p>
              <p className="text-[11px] text-neutral-500 truncate">Timer fokus 25m</p>
            </div>
          </button>
        </div>
      </div>

      {/* Main Grid: Todos & Habit Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Urgent Todos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Tugas Prioritas Terdekat
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Tandai tugas yang telah diselesaikan untuk melihat progress Anda
                </p>
              </div>
              <button
                onClick={() => setActiveTab('todos')}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Lihat Semua ({todos.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {urgentTodos.length === 0 ? (
              <div className="py-8 text-center text-neutral-400">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="text-xs font-medium">Semua tugas beres! Kerja bagus.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {urgentTodos.map((todo) => {
                  const isHighPriority = todo.priority === 'high';
                  return (
                    <div
                      key={todo.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all group"
                    >
                      <button
                        onClick={() => toggleTodoStatus(todo.id)}
                        className="mt-0.5 w-5 h-5 rounded-md border border-neutral-300 dark:border-neutral-600 hover:border-indigo-500 flex items-center justify-center transition-colors shrink-0"
                        title="Tandai selesai"
                      >
                        {todo.status === 'completed' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                            {todo.title}
                          </p>
                          <span
                            className={`text-[11px] font-mono shrink-0 ${
                              isHighPriority
                                ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                : 'text-neutral-500 dark:text-neutral-400'
                            }`}
                          >
                            {todo.dueDate}
                          </span>
                        </div>

                        {todo.description && (
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                            {todo.description}
                          </p>
                        )}

                        <div className="mt-2 flex items-center gap-2 text-[11px] text-neutral-400">
                          <span className="text-neutral-600 dark:text-neutral-300 font-medium">
                            {todo.category}
                          </span>
                          <span>·</span>
                          <span className={isHighPriority ? 'text-rose-500' : 'text-neutral-400'}>
                            {todo.priority === 'high' ? 'Mendesak' : todo.priority === 'medium' ? 'Sedang' : 'Rendah'}
                          </span>
                          {todo.dueTime && (
                            <>
                              <span>·</span>
                              <span className="font-mono">{todo.dueTime}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Notes Preview */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Catatan Terbaru
              </h2>
              <button
                onClick={() => setActiveTab('notes')}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Buka Catatan</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {notes.slice(0, 2).map((note) => (
                <div
                  key={note.id}
                  onClick={() => setActiveTab('notes')}
                  className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer"
                >
                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    {note.title}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                    {note.content.replace(/[#*`_]/g, '')}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2 text-[10px] text-neutral-400">
                    <span>{note.category}</span>
                    <span>·</span>
                    <span className="font-mono">{note.updatedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Habits & Recent Cashflow */}
        <div className="space-y-4">
          {/* Daily Habit Consistency */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Konsistensi Harian
                </h2>
              </div>
              <span className="text-[11px] font-mono text-neutral-400">Hari ini</span>
            </div>

            <div className="space-y-3">
              {habits.map((habit) => {
                const isCompletedToday = habit.completedDays.includes(todayStr);

                return (
                  <div
                    key={habit.id}
                    onClick={() => toggleHabitDay(habit.id, todayStr)}
                    className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 cursor-pointer transition-all"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {habit.title}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {habit.completedDays.length} / {habit.targetPerWeek} kali minggu ini
                      </p>
                    </div>

                    <button
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        isCompletedToday
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Transactions List */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Arus Kas Terkini
              </h2>
              <button
                onClick={() => setActiveTab('finance')}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Detail
              </button>
            </div>

            <div className="space-y-2">
              {transactions.slice(0, 3).map((tx) => {
                const isIncome = tx.type === 'income';

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {tx.title}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {tx.category} · {tx.date}
                      </p>
                    </div>

                    <span
                      className={`text-xs font-mono font-semibold tabular-nums shrink-0 ${
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{profile.currencySymbol} {tx.amount.toLocaleString('id-ID')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
