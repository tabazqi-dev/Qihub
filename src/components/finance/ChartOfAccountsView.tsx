import React, { useState, useMemo } from 'react';
import {
  ChartOfAccount,
  CoaClass,
  FinancialAccount,
  JournalEntry,
  CategoryBudget
} from '../../types';
import {
  CoaLedgerSummary,
  AccountingEquationSummary,
  generateBalanceSheetSummary,
  BASE_CHART_OF_ACCOUNTS
} from '../../utils/accounting';
import {
  BookOpen,
  Scale,
  Search,
  CheckCircle2,
  Layers,
  Eye,
  X,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Download,
  Landmark,
  BarChart3,
  Edit2,
  Plus,
  RotateCcw
} from 'lucide-react';

interface ChartOfAccountsViewProps {
  allCoaList: ChartOfAccount[];
  journalEntries: JournalEntry[];
  coaLedgers: Record<string, CoaLedgerSummary>;
  accountingSummary: AccountingEquationSummary;
  currencySymbol: string;
  onOpenAccountLedger: (acc: FinancialAccount) => void;
  accounts: FinancialAccount[];
  customCoaAccounts?: ChartOfAccount[];
  onUpsertCoa?: (coa: ChartOfAccount) => void;
  onDeleteCustomCoa?: (code: string) => void;
  // Unified P&L & Balance Sheet props
  selectedMonth: string;
  onChangeMonth: (month: string) => void;
  availableMonths: string[];
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyProfitLoss: number;
  monthlyCategoryExpenses: Record<string, number>;
  categoryBudgets: CategoryBudget[];
  onEditBudget: (category: string, currentLimit: number) => void;
  onAddBudget?: () => void;
  onExportPnlCsv?: () => void;
}

export const ChartOfAccountsView: React.FC<ChartOfAccountsViewProps> = ({
  allCoaList,
  journalEntries,
  coaLedgers,
  accountingSummary,
  currencySymbol,
  customCoaAccounts = [],
  onUpsertCoa,
  onDeleteCustomCoa,
  selectedMonth,
  onChangeMonth,
  availableMonths,
  monthlyIncome,
  monthlyExpense,
  monthlyProfitLoss,
  monthlyCategoryExpenses,
  categoryBudgets,
  onEditBudget,
  onAddBudget,
  onExportPnlCsv
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'journal' | 'trial_balance' | 'balance_sheet' | 'pnl'>('chart');
  const [classFilter, setClassFilter] = useState<'all' | CoaClass>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCoaForDetail, setSelectedCoaForDetail] = useState<ChartOfAccount | null>(null);

  // Add / Edit COA Modal state
  const [isCoaModalOpen, setIsCoaModalOpen] = useState(false);
  const [coaModalMode, setCoaModalMode] = useState<'add' | 'edit'>('add');
  const [coaCodeInput, setCoaCodeInput] = useState('');
  const [coaNameInput, setCoaNameInput] = useState('');
  const [coaCategoryInput, setCoaCategoryInput] = useState<CoaClass>('expense');
  const [coaSubCategoryInput, setCoaSubCategoryInput] = useState('Beban Operasional');
  const [coaNormalBalanceInput, setCoaNormalBalanceInput] = useState<'debit' | 'credit'>('debit');
  const [coaDescriptionInput, setCoaDescriptionInput] = useState('');
  const [coaLinkedAccountIdInput, setCoaLinkedAccountIdInput] = useState<string | undefined>(undefined);
  const [coaFormError, setCoaFormError] = useState<string | null>(null);

  const openAddCoaModal = () => {
    const defaultCategory: CoaClass = classFilter !== 'all' ? classFilter : 'expense';
    const prefix =
      defaultCategory === 'asset' ? '15'
      : defaultCategory === 'liability' ? '23'
      : defaultCategory === 'equity' ? '33'
      : defaultCategory === 'revenue' ? '44'
      : '55';
    let num = 1;
    let candidate = `${prefix}${String(num).padStart(2, '0')}`;
    while (allCoaList.some(c => c.code === candidate) && num < 99) {
      num += 1;
      candidate = `${prefix}${String(num).padStart(2, '0')}`;
    }

    setCoaModalMode('add');
    setCoaCodeInput(candidate);
    setCoaNameInput('');
    setCoaCategoryInput(defaultCategory);
    setCoaSubCategoryInput(
      defaultCategory === 'asset' ? 'Aset Lancar Lainnya'
      : defaultCategory === 'liability' ? 'Kewajiban Jangka Pendek'
      : defaultCategory === 'equity' ? 'Modal Pemilik'
      : defaultCategory === 'revenue' ? 'Pendapatan Utama'
      : 'Beban Operasional'
    );
    setCoaNormalBalanceInput(defaultCategory === 'asset' || defaultCategory === 'expense' ? 'debit' : 'credit');
    setCoaDescriptionInput('');
    setCoaLinkedAccountIdInput(undefined);
    setCoaFormError(null);
    setIsCoaModalOpen(true);
  };

  const openEditCoaModal = (coa: ChartOfAccount) => {
    setCoaModalMode('edit');
    setCoaCodeInput(coa.code);
    setCoaNameInput(coa.name);
    setCoaCategoryInput(coa.category);
    setCoaSubCategoryInput(coa.subCategory);
    setCoaNormalBalanceInput(coa.normalBalance);
    setCoaDescriptionInput(coa.description || '');
    setCoaLinkedAccountIdInput(coa.linkedAccountId);
    setCoaFormError(null);
    setIsCoaModalOpen(true);
  };

  const handleSaveCoaModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpsertCoa) return;
    const cleanCode = coaCodeInput.trim();
    const cleanName = coaNameInput.trim();
    if (!cleanCode) {
      setCoaFormError('Kode akun COA wajib diisi.');
      return;
    }
    if (!cleanName) {
      setCoaFormError('Nama akun COA wajib diisi.');
      return;
    }
    if (coaModalMode === 'add' && allCoaList.some(c => c.code.toLowerCase() === cleanCode.toLowerCase())) {
      setCoaFormError(`Kode akun "${cleanCode}" sudah ada. Gunakan kode unik lain atau edit akun tersebut.`);
      return;
    }

    onUpsertCoa({
      code: cleanCode,
      name: cleanName,
      category: coaCategoryInput,
      subCategory: coaSubCategoryInput.trim() || 'Kustom',
      normalBalance: coaNormalBalanceInput,
      description: coaDescriptionInput.trim() || undefined,
      linkedAccountId: coaLinkedAccountIdInput,
      isCustom: true,
    });
    setIsCoaModalOpen(false);
  };

  const filteredCoaList = useMemo(() => {
    return allCoaList.filter(coa => {
      if (classFilter !== 'all' && coa.category !== classFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = coa.code.toLowerCase().includes(q);
        const matchName = coa.name.toLowerCase().includes(q);
        const matchSub = coa.subCategory.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchSub) return false;
      }
      return true;
    });
  }, [allCoaList, classFilter, searchQuery]);

  const inspectedLedger = useMemo(() => {
    if (!selectedCoaForDetail) return null;
    return coaLedgers[selectedCoaForDetail.code] || null;
  }, [selectedCoaForDetail, coaLedgers]);

  const trialBalanceAccounts = useMemo(() => {
    return allCoaList.map(coa => {
      const ledger = coaLedgers[coa.code];
      const ending = ledger ? ledger.endingBalance : 0;
      let debitBal = 0;
      let creditBal = 0;

      if (coa.normalBalance === 'debit') {
        if (ending >= 0) debitBal = ending;
        else creditBal = Math.abs(ending);
      } else {
        if (ending >= 0) creditBal = ending;
        else debitBal = Math.abs(ending);
      }

      return {
        coa,
        debit: debitBal,
        credit: creditBal,
        hasActivity: (ledger?.totalDebit || 0) > 0 || (ledger?.totalCredit || 0) > 0 || ending !== 0
      };
    }).filter(item => item.hasActivity);
  }, [allCoaList, coaLedgers]);

  const balanceSheet = useMemo(() => {
    return generateBalanceSheetSummary(allCoaList, coaLedgers, accountingSummary);
  }, [allCoaList, coaLedgers, accountingSummary]);

  const handleExportBalanceSheetCsv = () => {
    const rows = [
      ['Kelompok', 'Kode Akun', 'Nama Akun', 'Sub Kategori', 'Saldo (Rp)'],
      ...balanceSheet.assets.map(a => ['AKTIVA (ASET)', a.code, a.name, a.subCategory, String(a.balance)]),
      ['TOTAL AKTIVA', '', '', '', String(balanceSheet.totalAssets)],
      ...balanceSheet.liabilities.map(l => ['KEWAJIBAN', l.code, l.name, l.subCategory, String(l.balance)]),
      ['TOTAL KEWAJIBAN', '', '', '', String(balanceSheet.totalLiabilities)],
      ...balanceSheet.equity.map(e => ['EKUITAS', e.code, e.name, e.subCategory, String(e.balance)]),
      ['EKUITAS', '3999', 'Laba / Rugi Tahun Berjalan (Net Income)', 'Laba Berjalan', String(balanceSheet.netIncome)],
      ['TOTAL KEWAJIBAN + EKUITAS', '', '', '', String(balanceSheet.totalLiabilitiesAndEquity)]
    ];
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `laporan-neraca-qhub-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getClassBadge = (cat: CoaClass) => {
    switch (cat) {
      case 'asset':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300';
      case 'liability':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300';
      case 'equity':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300';
      case 'revenue':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300';
      case 'expense':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300';
    }
  };

  const getClassNameIndonesian = (cat: CoaClass) => {
    switch (cat) {
      case 'asset': return '1-Aset';
      case 'liability': return '2-Kewajiban';
      case 'equity': return '3-Ekuitas';
      case 'revenue': return '4-Pendapatan';
      case 'expense': return '5-Beban';
    }
  };

  const allPnlCategories = useMemo(() => {
    const keys = new Set<string>([
      ...Object.keys(monthlyCategoryExpenses),
      ...categoryBudgets.map(b => b.category)
    ]);
    return Array.from(keys);
  }, [monthlyCategoryExpenses, categoryBudgets]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                General Ledger (Bagan Akun, Neraca & Laporan P&L)
              </h3>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl">
              Pusat pembukuan akuntansi terpadu: Bagan Akun (COA), Jurnal Umum Double-Entry, Neraca Saldo, Laporan Neraca (Balance Sheet), dan Laporan Laba-Rugi (P&L). Transaksi yang di-VOID otomatis dikecualikan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              accountingSummary.isEquationBalanced
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
              <span>{accountingSummary.isEquationBalanced ? 'Double-Entry Seimbang' : 'Periksa Selisih Jurnal'}</span>
            </span>
          </div>
        </div>

        {/* 5-Class Bento Accounting Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
              1-ASET (AKTIVA)
            </span>
            <p className="text-sm sm:text-base font-bold font-mono text-blue-950 dark:text-blue-100 tabular-nums">
              {currencySymbol} {accountingSummary.totalAssets.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80">Kas, Bank, Piutang</span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
              2-KEWAJIBAN
            </span>
            <p className="text-sm sm:text-base font-bold font-mono text-amber-950 dark:text-amber-100 tabular-nums">
              {currencySymbol} {accountingSummary.totalLiabilities.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80">Hutang & PayLater</span>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
              3-EKUITAS (MODAL)
            </span>
            <p className="text-sm sm:text-base font-bold font-mono text-purple-950 dark:text-purple-100 tabular-nums">
              {currencySymbol} {accountingSummary.totalEquity.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-purple-600/80 dark:text-purple-400/80">Modal Awal Pemilik</span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              4-PENDAPATAN
            </span>
            <p className="text-sm sm:text-base font-bold font-mono text-emerald-950 dark:text-emerald-100 tabular-nums">
              {currencySymbol} {accountingSummary.totalRevenue.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">Gaji, Freelance, Jasa</span>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
              5-BEBAN
            </span>
            <p className="text-sm sm:text-base font-bold font-mono text-rose-950 dark:text-rose-100 tabular-nums">
              {currencySymbol} {accountingSummary.totalExpense.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80">Operasional & Konsumsi</span>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
              LABA BERSIH (NET)
            </span>
            <p className={`text-sm sm:text-base font-bold font-mono tabular-nums ${
              accountingSummary.netIncome >= 0 ? 'text-indigo-900 dark:text-indigo-100' : 'text-rose-600'
            }`}>
              {accountingSummary.netIncome >= 0 ? '+' : '-'}{currencySymbol} {Math.abs(accountingSummary.netIncome).toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80">Pendapatan - Beban</span>
          </div>
        </div>

        {/* Persamaan Dasar Akuntansi Banner */}
        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">Persamaan Akuntansi:</span>
            <span>Aset ({currencySymbol} {accountingSummary.totalAssets.toLocaleString('id-ID')})</span>
            <span>=</span>
            <span>Kewajiban ({currencySymbol} {accountingSummary.totalLiabilities.toLocaleString('id-ID')})</span>
            <span>+</span>
            <span>Ekuitas ({currencySymbol} {accountingSummary.totalEquity.toLocaleString('id-ID')})</span>
            <span>+</span>
            <span>Laba ({currencySymbol} {accountingSummary.netIncome.toLocaleString('id-ID')})</span>
          </div>

          <div className="shrink-0 flex items-center gap-2 text-[11px]">
            <span className="text-neutral-400">Neraca Saldo:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              Debit = Kredit ({currencySymbol} {accountingSummary.totalDebitTrialBalance.toLocaleString('id-ID')})
            </span>
          </div>
        </div>
      </div>

      {/* Unified Sub-view Selector Buttons */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2 text-xs">
        <button
          onClick={() => setViewMode('chart')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            viewMode === 'chart'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Bagan Akun (COA)</span>
        </button>

        <button
          onClick={() => setViewMode('journal')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            viewMode === 'journal'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Jurnal Umum ({journalEntries.length})</span>
        </button>

        <button
          onClick={() => setViewMode('trial_balance')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            viewMode === 'trial_balance'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Neraca Saldo</span>
        </button>

        <button
          onClick={() => setViewMode('balance_sheet')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            viewMode === 'balance_sheet'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>Laporan Neraca (Balance Sheet)</span>
        </button>

        <button
          onClick={() => setViewMode('pnl')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            viewMode === 'pnl'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Laporan P&L & Budget</span>
        </button>
      </div>

      {/* 1. CHART OF ACCOUNTS TREE */}
      {viewMode === 'chart' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                onClick={() => setClassFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  classFilter === 'all'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                }`}
              >
                Semua ({allCoaList.length})
              </button>
              {(['asset', 'liability', 'equity', 'revenue', 'expense'] as CoaClass[]).map(cls => (
                <button
                  key={cls}
                  onClick={() => setClassFilter(cls)}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    classFilter === cls
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                  }`}
                >
                  {getClassNameIndonesian(cls)}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Cari kode atau nama akun..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs w-52 focus:w-60 transition-all"
                />
              </div>

              {onUpsertCoa && (
                <button
                  type="button"
                  onClick={openAddCoaModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah COA</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-bold uppercase text-neutral-400">
                  <th className="py-2.5 px-3">Kode Akun</th>
                  <th className="py-2.5 px-3">Nama Akun Standar</th>
                  <th className="py-2.5 px-3">Klasifikasi & Sub-Kategori</th>
                  <th className="py-2.5 px-3 text-center">Saldo Normal</th>
                  <th className="py-2.5 px-3 text-right">Debit (Rp)</th>
                  <th className="py-2.5 px-3 text-right">Kredit (Rp)</th>
                  <th className="py-2.5 px-3 text-right">Saldo Akhir</th>
                  <th className="py-2.5 px-3 text-center">Aksi & Buku Besar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono">
                {filteredCoaList.map((coa) => {
                  const ledger = coaLedgers[coa.code];
                  const ending = ledger ? ledger.endingBalance : 0;
                  const hasMutations = (ledger?.mutationCount || 0) > 0;
                  const isDebitNormal = coa.normalBalance === 'debit';
                  const hasCustomOverride = customCoaAccounts.some(c => c.code === coa.code);
                  const isBaseCoa = BASE_CHART_OF_ACCOUNTS.some(b => b.code === coa.code);

                  return (
                    <tr
                      key={coa.code}
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {coa.code}
                      </td>

                      <td className="py-3 px-3 font-sans">
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 flex-wrap">
                          <span>{coa.name}</span>
                          {coa.linkedAccountId && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-mono">
                              Akun Riil
                            </span>
                          )}
                          {hasCustomOverride && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono">
                              {isBaseCoa ? 'Diedit' : 'Kustom'}
                            </span>
                          )}
                        </div>
                        {coa.description && (
                          <div className="text-[11px] text-neutral-400 line-clamp-1">
                            {coa.description}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 font-sans whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getClassBadge(coa.category)}`}>
                          {coa.subCategory}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-sans text-[11px] whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          isDebitNormal
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                        }`}>
                          {isDebitNormal ? 'Debit (+)' : 'Kredit (+)'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        {ledger?.totalDebit ? ledger.totalDebit.toLocaleString('id-ID') : '-'}
                      </td>

                      <td className="py-3 px-3 text-right text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        {ledger?.totalCredit ? ledger.totalCredit.toLocaleString('id-ID') : '-'}
                      </td>

                      <td className={`py-3 px-3 text-right font-bold whitespace-nowrap ${
                        ending > 0 ? 'text-neutral-900 dark:text-neutral-100' : ending < 0 ? 'text-rose-500' : 'text-neutral-400'
                      }`}>
                        {currencySymbol} {ending.toLocaleString('id-ID')}
                      </td>

                      <td className="py-3 px-3 text-center font-sans">
                        <div className="inline-flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedCoaForDetail(coa)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ledger {hasMutations ? `(${ledger?.mutationCount})` : ''}</span>
                          </button>

                          {onUpsertCoa && (
                            <button
                              type="button"
                              onClick={() => openEditCoaModal(coa)}
                              title="Edit Nama & Detail COA"
                              className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 text-neutral-600 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}

                          {hasCustomOverride && onDeleteCustomCoa && (
                            <button
                              type="button"
                              onClick={() => onDeleteCustomCoa(coa.code)}
                              title={isBaseCoa ? 'Kembalikan Nama COA ke Standar' : 'Hapus COA Kustom'}
                              className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-neutral-500 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. GENERAL JOURNAL */}
      {viewMode === 'journal' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                Buku Jurnal Umum Berpasangan (Double-Entry General Journal)
              </h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Format standar akuntansi: Setiap transaksi menjurnal sisi Debit dan Kredit dengan nominal seimbang.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-neutral-500">
              Total {journalEntries.length} Ayat Jurnal
            </span>
          </div>

          {journalEntries.length === 0 ? (
            <p className="py-12 text-center text-neutral-400 text-xs">Belum ada ayat jurnal yang tercatat.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-bold uppercase text-neutral-400">
                    <th className="py-2.5 px-3">Tanggal & Ref</th>
                    <th className="py-2.5 px-3">Keterangan & Nama Akun Standar</th>
                    <th className="py-2.5 px-3">Kode Akun</th>
                    <th className="py-2.5 px-3 text-right">Debit ({currencySymbol})</th>
                    <th className="py-2.5 px-3 text-right">Kredit ({currencySymbol})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-mono">
                  {journalEntries.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr className="bg-neutral-50/50 dark:bg-neutral-800/30 text-[11px]">
                        <td className="py-2 px-3 font-semibold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                          {entry.date} • <span className="text-indigo-600 dark:text-indigo-400">{entry.referenceNo}</span>
                        </td>
                        <td colSpan={2} className="py-2 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">
                          {entry.description}
                        </td>
                        <td colSpan={2} className="py-2 px-3 text-right text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          ✓ Seimbang ({currencySymbol} {entry.totalDebit.toLocaleString('id-ID')})
                        </td>
                      </tr>

                      {entry.lines.map((line, lIdx) => {
                        const isDebit = line.debit > 0;
                        return (
                          <tr key={lIdx} className="hover:bg-neutral-50/30">
                            <td className="py-1.5 px-3"></td>
                            <td className={`py-1.5 px-3 font-sans ${isDebit ? 'font-medium text-neutral-900 dark:text-neutral-100 pl-4' : 'text-neutral-600 dark:text-neutral-400 pl-10'}`}>
                              {line.accountName}
                            </td>
                            <td className="py-1.5 px-3 text-neutral-400 text-[11px]">
                              {line.accountCode}
                            </td>
                            <td className="py-1.5 px-3 text-right font-bold text-neutral-800 dark:text-neutral-200">
                              {line.debit > 0 ? line.debit.toLocaleString('id-ID') : '-'}
                            </td>
                            <td className="py-1.5 px-3 text-right font-bold text-neutral-800 dark:text-neutral-200">
                              {line.credit > 0 ? line.credit.toLocaleString('id-ID') : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. TRIAL BALANCE */}
      {viewMode === 'trial_balance' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                Neraca Saldo (Trial Balance Statement)
              </h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Kompilasi saldo akhir seluruh akun aktif untuk membuktikan keseimbangan debit dan kredit buku besar.
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold ${
              accountingSummary.isTrialBalanceBalanced
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
            }`}>
              {accountingSummary.isTrialBalanceBalanced ? 'Status: Balanced' : 'Status: Unbalanced'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-bold uppercase text-neutral-400">
                  <th className="py-2.5 px-3">Kode Akun</th>
                  <th className="py-2.5 px-3">Nama Akun</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3 text-right">Debit ({currencySymbol})</th>
                  <th className="py-2.5 px-3 text-right">Kredit ({currencySymbol})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono">
                {trialBalanceAccounts.map(({ coa, debit, credit }) => (
                  <tr key={coa.code} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40">
                    <td className="py-2.5 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                      {coa.code}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-neutral-900 dark:text-neutral-100">
                      {coa.name}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-neutral-400 text-[11px]">
                      {coa.subCategory}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-neutral-800 dark:text-neutral-200">
                      {debit > 0 ? debit.toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-neutral-800 dark:text-neutral-200">
                      {credit > 0 ? credit.toLocaleString('id-ID') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-neutral-900 dark:border-neutral-100 font-mono text-sm font-bold bg-neutral-50 dark:bg-neutral-800/60">
                  <td colSpan={3} className="py-3 px-3 uppercase text-neutral-900 dark:text-neutral-100">
                    Grand Total Neraca Saldo
                  </td>
                  <td className="py-3 px-3 text-right text-indigo-600 dark:text-indigo-400">
                    {currencySymbol} {accountingSummary.totalDebitTrialBalance.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 text-right text-indigo-600 dark:text-indigo-400">
                    {currencySymbol} {accountingSummary.totalCreditTrialBalance.toLocaleString('id-ID')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 4. BALANCE SHEET (LAPORAN NERACA) */}
      {viewMode === 'balance_sheet' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-indigo-500" />
                <span>Laporan Neraca (Balance Sheet)</span>
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Posisi Keuangan: Total Aktiva (Aset) dibandingkan dengan Total Pasiva (Kewajiban + Ekuitas + Laba Berjalan).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                balanceSheet.isBalanced
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
              }`}>
                {balanceSheet.isBalanced ? 'NERACA SEIMBANG (BALANCED)' : 'SELISIH NERACA'}
              </span>
              <button
                onClick={handleExportBalanceSheetCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:opacity-90 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT SIDE: AKTIVA (ASSETS) */}
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/20 dark:bg-blue-950/10 overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-blue-50/70 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/50 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  AKTIVA (ASET)
                </span>
                <span className="text-xs font-mono font-bold text-blue-800 dark:text-blue-200 tabular-nums">
                  {currencySymbol} {balanceSheet.totalAssets.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="divide-y divide-neutral-200/70 dark:divide-neutral-800/70 flex-1">
                {balanceSheet.assets.map(item => (
                  <div key={item.code} className="px-4 py-2.5 flex items-center justify-between text-xs gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 mr-1.5">{item.code}</span>
                        {item.name}
                      </p>
                      <p className="text-[10px] text-neutral-400">{item.subCategory}</p>
                    </div>
                    <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200 tabular-nums shrink-0">
                      {currencySymbol} {item.balance.toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="px-4 py-3 bg-blue-100/60 dark:bg-blue-950/50 border-t border-blue-200 dark:border-blue-900/50 flex items-center justify-between text-xs font-bold">
                <span className="text-blue-900 dark:text-blue-100 uppercase">Total Aktiva (Aset)</span>
                <span className="font-mono text-sm text-blue-900 dark:text-blue-100 tabular-nums">
                  {currencySymbol} {balanceSheet.totalAssets.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* RIGHT SIDE: PASIVA (LIABILITIES + EQUITY + NET INCOME) */}
            <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/15 dark:bg-purple-950/10 overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-purple-50/70 dark:bg-purple-950/40 border-b border-purple-200 dark:border-purple-900/50 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  PASIVA (KEWAJIBAN & EKUITAS)
                </span>
                <span className="text-xs font-mono font-bold text-purple-800 dark:text-purple-200 tabular-nums">
                  {currencySymbol} {balanceSheet.totalLiabilitiesAndEquity.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex-1 divide-y divide-neutral-200/70 dark:divide-neutral-800/70">
                <div className="px-4 py-2 bg-amber-50/50 dark:bg-amber-950/20 text-[11px] font-bold uppercase text-amber-700 dark:text-amber-300">
                  Kewajiban (Liabilitas)
                </div>
                {balanceSheet.liabilities.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-neutral-400">Tidak ada saldo kewajiban.</div>
                ) : (
                  balanceSheet.liabilities.map(item => (
                    <div key={item.code} className="px-4 py-2.5 flex items-center justify-between text-xs gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          <span className="font-mono text-amber-600 dark:text-amber-400 mr-1.5">{item.code}</span>
                          {item.name}
                        </p>
                        <p className="text-[10px] text-neutral-400">{item.subCategory}</p>
                      </div>
                      <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200 tabular-nums shrink-0">
                        {currencySymbol} {item.balance.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))
                )}

                <div className="px-4 py-2 bg-purple-50/60 dark:bg-purple-950/30 text-[11px] font-bold uppercase text-purple-700 dark:text-purple-300">
                  Ekuitas & Laba Berjalan
                </div>
                {balanceSheet.equity.map(item => (
                  <div key={item.code} className="px-4 py-2.5 flex items-center justify-between text-xs gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        <span className="font-mono text-purple-600 dark:text-purple-400 mr-1.5">{item.code}</span>
                        {item.name}
                      </p>
                      <p className="text-[10px] text-neutral-400">{item.subCategory}</p>
                    </div>
                    <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200 tabular-nums shrink-0">
                      {currencySymbol} {item.balance.toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}

                <div className="px-4 py-2.5 flex items-center justify-between text-xs gap-2 bg-indigo-50/40 dark:bg-indigo-950/20">
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 mr-1.5">3999</span>
                      Laba / Rugi Periode Berjalan (Net Income)
                    </p>
                    <p className="text-[10px] text-neutral-400">Selisih Pendapatan & Beban</p>
                  </div>
                  <span className={`font-mono font-bold tabular-nums shrink-0 ${
                    balanceSheet.netIncome >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {currencySymbol} {balanceSheet.netIncome.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="px-4 py-3 bg-purple-100/60 dark:bg-purple-950/50 border-t border-purple-200 dark:border-purple-900/50 flex items-center justify-between text-xs font-bold">
                <span className="text-purple-900 dark:text-purple-100 uppercase">Total Pasiva (Kewajiban + Ekuitas)</span>
                <span className="font-mono text-sm text-purple-900 dark:text-purple-100 tabular-nums">
                  {currencySymbol} {balanceSheet.totalLiabilitiesAndEquity.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. LAPORAN P&L & BUDGET */}
      {viewMode === 'pnl' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Laporan Laba-Rugi (P&L) & Kontrol Overbudget
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Analisis pendapatan, pengeluaran operasional, surplus/defisit, dan batas anggaran kategori per bulan.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => onChangeMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-mono font-semibold cursor-pointer"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {onExportPnlCsv && (
                <button
                  onClick={onExportPnlCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:opacity-90 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export P&L CSV</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-1">
              <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Pendapatan ({selectedMonth})</span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold font-mono text-emerald-950 dark:text-emerald-100 tabular-nums">
                +{currencySymbol} {monthlyIncome.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-1">
              <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-semibold">
                <span>Pengeluaran ({selectedMonth})</span>
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold font-mono text-rose-950 dark:text-rose-100 tabular-nums">
                -{currencySymbol} {monthlyExpense.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-1">
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 block">
                Surplus / Defisit Bulan Ini
              </span>
              <p className={`text-lg font-bold font-mono tabular-nums ${
                monthlyProfitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {monthlyProfitLoss >= 0 ? '+' : '-'}{currencySymbol} {Math.abs(monthlyProfitLoss).toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Realisasi Belanja ({selectedMonth}) vs Batas Anggaran per Kategori
                </h5>
                <p className="text-[11px] text-neutral-400">
                  Realisasi otomatis reset ke Rp 0 setiap ganti bulan tanpa menghapus riwayat transaksi.
                </p>
              </div>
              {onAddBudget && (
                <button
                  type="button"
                  onClick={onAddBudget}
                  className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 cursor-pointer"
                >
                  + Atur Batas Kategori
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allPnlCategories.length === 0 ? (
                <div className="md:col-span-2 py-8 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                  Belum ada batas anggaran atau pengeluaran pada bulan {selectedMonth}.
                </div>
              ) : (
                allPnlCategories.map(cat => {
                  const spent = monthlyCategoryExpenses[cat] || 0;
                  const budgetObj = categoryBudgets.find(b => b.category === cat);
                  const limit = budgetObj?.limit || 0;
                  const remaining = limit - spent;
                  const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
                  const isOver = limit > 0 && spent > limit;

                  return (
                    <div
                      key={cat}
                      className={`p-3.5 rounded-xl border space-y-2 ${
                        isOver
                          ? 'border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20'
                          : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">{cat}</span>
                          {isOver && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                              <AlertTriangle className="w-3 h-3" /> Overbudget
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => onEditBudget(cat, limit)}
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" /> Atur Limit
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                        <span className={isOver ? 'text-rose-600 font-bold' : 'text-neutral-700 dark:text-neutral-300'}>
                          Terpakai: {currencySymbol} {spent.toLocaleString('id-ID')}
                        </span>
                        <span className="text-neutral-400">
                          / {limit > 0 ? `${currencySymbol} ${limit.toLocaleString('id-ID')}` : 'Tanpa Batas'}
                        </span>
                      </div>

                      {limit > 0 && (
                        <>
                          <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOver ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                            <span className={remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                              {remaining >= 0
                                ? `Sisa Budget: ${currencySymbol} ${remaining.toLocaleString('id-ID')}`
                                : `Lebih Batas: -${currencySymbol} ${Math.abs(remaining).toLocaleString('id-ID')}`}
                            </span>
                            <span className="text-neutral-400">{pct}%</span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BUKU BESAR DETAIL */}
      {selectedCoaForDetail && inspectedLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                  GL
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    <span>Buku Besar: {selectedCoaForDetail.name}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                      {selectedCoaForDetail.code}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5 font-mono">
                    Saldo Normal: {selectedCoaForDetail.normalBalance === 'debit' ? 'Debit (+)' : 'Kredit (+)'} • Kategori: {selectedCoaForDetail.subCategory}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCoaForDetail(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 shrink-0 text-xs font-mono">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <span className="text-[10px] text-neutral-400 block">Total Mutasi Debit</span>
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {currencySymbol} {inspectedLedger.totalDebit.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <span className="text-[10px] text-neutral-400 block">Total Mutasi Kredit</span>
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {currencySymbol} {inspectedLedger.totalCredit.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block">Saldo Akhir</span>
                <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100">
                  {currencySymbol} {inspectedLedger.endingBalance.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-neutral-200 dark:border-neutral-800 rounded-xl">
              {inspectedLedger.lines.length === 0 ? (
                <div className="py-12 text-center text-neutral-400 text-xs">
                  Belum ada mutasi atau posting pada akun ini.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/80 sticky top-0 z-10 border-b border-neutral-200 dark:border-neutral-800 text-[10px] uppercase font-bold text-neutral-400">
                    <tr>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">No. Ref</th>
                      <th className="py-2.5 px-3">Keterangan & Akun Lawan</th>
                      <th className="py-2.5 px-3 text-right">Debit</th>
                      <th className="py-2.5 px-3 text-right">Kredit</th>
                      <th className="py-2.5 px-3 text-right">Saldo Berjalan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-[11px]">
                    {inspectedLedger.lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                        <td className="py-2 px-3 text-neutral-500 whitespace-nowrap">{line.date}</td>
                        <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{line.referenceNo}</td>
                        <td className="py-2 px-3 font-sans">
                          <p className="font-semibold text-neutral-900 dark:text-neutral-100">{line.description}</p>
                          <p className="text-[10px] text-neutral-400 font-mono">Lawan: {line.contraAccountName}</p>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-neutral-800 dark:text-neutral-200">
                          {line.debit > 0 ? line.debit.toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-neutral-800 dark:text-neutral-200">
                          {line.credit > 0 ? line.credit.toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                          {currencySymbol} {line.runningBalance.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedCoaForDetail(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 cursor-pointer"
              >
                Tutup Buku Besar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: TAMBAH / EDIT AKUN COA */}
      {isCoaModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsCoaModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>{coaModalMode === 'add' ? 'Tambah Akun COA Baru' : `Edit Akun COA (${coaCodeInput})`}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCoaModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {coaFormError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {coaFormError}
              </div>
            )}

            <form onSubmit={handleSaveCoaModal} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Kode Akun COA
                  </label>
                  <input
                    type="text"
                    required
                    disabled={coaModalMode === 'edit'}
                    value={coaCodeInput}
                    onChange={(e) => setCoaCodeInput(e.target.value)}
                    placeholder="Contoh: 5501"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-mono font-bold disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Klasifikasi
                  </label>
                  <select
                    value={coaCategoryInput}
                    disabled={coaModalMode === 'edit' && Boolean(coaLinkedAccountIdInput)}
                    onChange={(e) => {
                      const nextCat = e.target.value as CoaClass;
                      setCoaCategoryInput(nextCat);
                      if (coaModalMode === 'add') {
                        setCoaNormalBalanceInput(
                          nextCat === 'asset' || nextCat === 'expense' ? 'debit' : 'credit'
                        );
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-semibold disabled:opacity-60"
                  >
                    <option value="asset">1-Aset</option>
                    <option value="liability">2-Kewajiban</option>
                    <option value="equity">3-Ekuitas</option>
                    <option value="revenue">4-Pendapatan</option>
                    <option value="expense">5-Beban</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Nama Akun Standar
                </label>
                <input
                  type="text"
                  required
                  value={coaNameInput}
                  onChange={(e) => setCoaNameInput(e.target.value)}
                  placeholder="Contoh: Beban Marketing & Iklan Digital"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Sub-Kategori
                  </label>
                  <input
                    type="text"
                    required
                    value={coaSubCategoryInput}
                    onChange={(e) => setCoaSubCategoryInput(e.target.value)}
                    placeholder="Contoh: Beban Pemasaran"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Saldo Normal
                  </label>
                  <select
                    value={coaNormalBalanceInput}
                    disabled={coaModalMode === 'edit' && Boolean(coaLinkedAccountIdInput)}
                    onChange={(e) => setCoaNormalBalanceInput(e.target.value as 'debit' | 'credit')}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-semibold disabled:opacity-60"
                  >
                    <option value="debit">Debit (+)</option>
                    <option value="credit">Kredit (+)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Deskripsi / Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  value={coaDescriptionInput}
                  onChange={(e) => setCoaDescriptionInput(e.target.value)}
                  placeholder="Penjelasan penggunaan akun COA ini..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCoaModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
                >
                  {coaModalMode === 'add' ? 'Tambah COA' : 'Simpan Perubahan COA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
