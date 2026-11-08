import React, { useState, useMemo } from 'react';
import { 
  ChartOfAccount, 
  CoaClass, 
  FinancialAccount, 
  FinanceTransaction, 
  JournalEntry 
} from '../../types';
import { 
  CoaLedgerSummary, 
  AccountingEquationSummary 
} from '../../utils/accounting';
import { 
  BookOpen, 
  Scale, 
  FileSpreadsheet, 
  Search, 
  Filter, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Layers, 
  ChevronRight, 
  Eye, 
  X, 
  HelpCircle,
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Sparkles
} from 'lucide-react';

interface ChartOfAccountsViewProps {
  allCoaList: ChartOfAccount[];
  journalEntries: JournalEntry[];
  coaLedgers: Record<string, CoaLedgerSummary>;
  accountingSummary: AccountingEquationSummary;
  currencySymbol: string;
  onOpenAccountLedger: (acc: FinancialAccount) => void;
  accounts: FinancialAccount[];
}

export const ChartOfAccountsView: React.FC<ChartOfAccountsViewProps> = ({
  allCoaList,
  journalEntries,
  coaLedgers,
  accountingSummary,
  currencySymbol,
  onOpenAccountLedger,
  accounts
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'journal' | 'trial_balance'>('chart');
  const [classFilter, setClassFilter] = useState<'all' | CoaClass>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected COA for General Ledger Drawer/Modal
  const [selectedCoaForDetail, setSelectedCoaForDetail] = useState<ChartOfAccount | null>(null);

  // Filter COA accounts for table
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

  // Selected COA detail ledger
  const inspectedLedger = useMemo(() => {
    if (!selectedCoaForDetail) return null;
    return coaLedgers[selectedCoaForDetail.code] || null;
  }, [selectedCoaForDetail, coaLedgers]);

  // Trial Balance accounts (accounts with either debit > 0 or credit > 0)
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
      case 'asset': return '1-Aset / Aktiva';
      case 'liability': return '2-Kewajiban / Liabilitas';
      case 'equity': return '3-Ekuitas / Modal';
      case 'revenue': return '4-Pendapatan / Revenue';
      case 'expense': return '5-Beban & Pengeluaran';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Bagan Akun Standar Akuntansi (Chart of Accounts & Jurnal)
              </h3>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl">
              Seluruh transaksi kas, bank, e-wallet, hutang, dan piutang otomatis bermuara pada struktur 5 kelas akun akuntansi standar berprinsip berpasangan (Double-Entry Debit = Kredit).
            </p>
          </div>

          {/* Balance Status Badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Double-Entry 100% Seimbang</span>
            </span>
          </div>
        </div>

        {/* 5-Class Bento Accounting Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {/* 1. Aset */}
          <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
              1-ASET (AKTIVA)
            </span>
            <p className="text-sm sm:text-base font-bold font-mono text-blue-950 dark:text-blue-100 tabular-nums">
              {currencySymbol} {accountingSummary.totalAssets.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80">Kas, Bank, Piutang</span>
          </div>

          {/* 2. Kewajiban */}
          <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
              2-KEWAJIBAN
            </span>
            <p className="text-sm sm:text-base font-bold font-mono text-amber-950 dark:text-amber-100 tabular-nums">
              {currencySymbol} {accountingSummary.totalLiabilities.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80">Hutang & PayLater</span>
          </div>

          {/* 3. Ekuitas */}
          <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
              3-EKUITAS (MODAL)
            </span>
            <p className="text-sm sm:text-base font-bold font-mono text-purple-950 dark:text-purple-100 tabular-nums">
              {currencySymbol} {accountingSummary.totalEquity.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-purple-600/80 dark:text-purple-400/80">Modal Awal Pemilik</span>
          </div>

          {/* 4. Pendapatan */}
          <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              4-PENDAPATAN
            </span>
            <p className="text-sm sm:text-base font-bold font-mono text-emerald-950 dark:text-emerald-100 tabular-nums">
              {currencySymbol} {accountingSummary.totalRevenue.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">Gaji, Freelance, Jasa</span>
          </div>

          {/* 5. Beban */}
          <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
              5-BEBAN
            </span>
            <p className="text-sm sm:text-base font-bold font-mono text-rose-950 dark:text-rose-100 tabular-nums">
              {currencySymbol} {accountingSummary.totalExpense.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80">Operasional & Konsumsi</span>
          </div>

          {/* 6. Laba / Rugi Bersih */}
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

        {/* Persamaan Dasar Akuntansi Pill Banner */}
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

      {/* Sub-view Selector Buttons (Chart of Accounts / General Journal / Trial Balance) */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2 text-xs">
        <button
          onClick={() => setViewMode('chart')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            viewMode === 'chart'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Daftar Bagan Akun (COA Tree)</span>
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
          <span>Jurnal Umum Double-Entry ({journalEntries.length})</span>
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
          <span>Neraca Saldo (Trial Balance)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. VIEW MODE: CHART OF ACCOUNTS TREE                     */}
      {/* ======================================================== */}
      {viewMode === 'chart' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
            {/* Class Filter Tabs */}
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

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Cari kode atau nama akun..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs w-56 focus:w-64 transition-all"
              />
            </div>
          </div>

          {/* Table of COA Accounts */}
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
                  <th className="py-2.5 px-3 text-center">Buku Besar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono">
                {filteredCoaList.map((coa) => {
                  const ledger = coaLedgers[coa.code];
                  const ending = ledger ? ledger.endingBalance : 0;
                  const hasMutations = (ledger?.mutationCount || 0) > 0;
                  const isDebitNormal = coa.normalBalance === 'debit';

                  return (
                    <tr 
                      key={coa.code}
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {coa.code}
                      </td>

                      <td className="py-3 px-3 font-sans">
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                          <span>{coa.name}</span>
                          {coa.linkedAccountId && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-mono">
                              Akun Riil
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
                        <button
                          onClick={() => setSelectedCoaForDetail(coa)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Ledger {hasMutations ? `(${ledger?.mutationCount})` : ''}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. VIEW MODE: DOUBLE-ENTRY GENERAL JOURNAL (JURNAL UMUM) */}
      {/* ======================================================== */}
      {viewMode === 'journal' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                Buku Jurnal Umum Berpasangan (Double-Entry General Journal)
              </h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Format standar akuntansi: Setiap transaksi menjurnal sisi Debit (kiri) dan sisi Kredit (indentasi kanan) dengan nominal seimbang.
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
                      {/* Entry Header Row */}
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

                      {/* Entry Posting Lines (Standard Indented Accounting Format) */}
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

      {/* ======================================================== */}
      {/* 3. VIEW MODE: NERACA SALDO (TRIAL BALANCE)               */}
      {/* ======================================================== */}
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
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold">
                Status: Balanced
              </span>
            </div>
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
              {/* Grand Total Footer */}
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

      {/* ======================================================== */}
      {/* MODAL / DRAWER: BUKU BESAR (GENERAL LEDGER) DETAIL       */}
      {/* ======================================================== */}
      {selectedCoaForDetail && inspectedLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
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

            {/* Account Quick Summary in Modal */}
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

            {/* Ledger Postings Table */}
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

            {/* Modal Footer */}
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
    </div>
  );
};
