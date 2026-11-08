import React, { useState, useMemo } from 'react';
import { 
  FinancialAccount, 
  FinanceTransaction, 
  ChartOfAccount 
} from '../../types';
import { 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  Building2, 
  Smartphone, 
  Coins, 
  Edit2, 
  Receipt, 
  BookOpen, 
  Calendar,
  ExternalLink,
  ChevronDown,
  ArrowLeftRight
} from 'lucide-react';
import { getCoaForFinancialAccount, getCoaForCategory } from '../../utils/accounting';

interface AccountLedgerViewProps {
  account: FinancialAccount;
  allAccounts: FinancialAccount[];
  allTransactions: FinanceTransaction[];
  allCoaList: ChartOfAccount[];
  currencySymbol: string;
  onBack: () => void;
  onSelectAccount: (acc: FinancialAccount) => void;
  onAddTransactionForAccount: (accountId: string) => void;
  onEditInitialBalance: (account: FinancialAccount) => void;
  onDeleteTransaction: (id: string) => void;
  onNavigateToCoa: () => void;
  onOpenTransfer?: (sourceAccountId: string, type: 'cash_withdrawal' | 'transfer' | 'ewallet_topup' | 'cash_deposit') => void;
}

export const AccountLedgerView: React.FC<AccountLedgerViewProps> = ({
  account,
  allAccounts,
  allTransactions,
  allCoaList,
  currencySymbol,
  onBack,
  onSelectAccount,
  onAddTransactionForAccount,
  onEditInitialBalance,
  onDeleteTransaction,
  onNavigateToCoa,
  onOpenTransfer
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const coaInfo = useMemo(() => {
    return getCoaForFinancialAccount(account, allCoaList);
  }, [account, allCoaList]);

  // Compute all chronological transactions for this account with cumulative running balance
  const { mutations, totalIncome, totalExpense, incomeCount, expenseCount, currentBalance } = useMemo(() => {
    // 1. Filter transactions targeting this account
    const rawTx = allTransactions.filter(t => 
      t.accountId === account.id || t.accountName === account.name
    );

    // 2. Sort chronologically ascending
    const chronological = [...rawTx].sort((a, b) => a.date.localeCompare(b.date));

    let running = account.initialBalance;
    let inSum = 0;
    let inCount = 0;
    let outSum = 0;
    let outCount = 0;

    const computed = chronological.map((tx, idx) => {
      const isIncome = tx.type === 'income';
      if (isIncome) {
        running += tx.amount;
        inSum += tx.amount;
        inCount += 1;
      } else {
        running -= tx.amount;
        outSum += tx.amount;
        outCount += 1;
      }

      // Identify Contra Account in standard double entry accounting
      const contraCoa = getCoaForCategory(tx.category, tx.type, allCoaList);

      return {
        ...tx,
        index: idx + 1,
        runningBalance: running,
        contraCoaCode: contraCoa.code,
        contraCoaName: contraCoa.name
      };
    });

    return {
      mutations: computed.reverse(), // display newest first
      totalIncome: inSum,
      totalExpense: outSum,
      incomeCount: inCount,
      expenseCount: outCount,
      currentBalance: running
    };
  }, [account, allTransactions, allCoaList]);

  // Available months from transactions
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allTransactions
      .filter(t => t.accountId === account.id || t.accountName === account.name)
      .forEach(t => {
        if (t.date && t.date.length >= 7) {
          months.add(t.date.substring(0, 7));
        }
      });
    return Array.from(months).sort().reverse();
  }, [allTransactions, account]);

  // Filter mutations for display
  const filteredMutations = useMemo(() => {
    return mutations.filter(m => {
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      if (selectedMonth !== 'all' && !m.date.startsWith(selectedMonth)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchCat = m.category.toLowerCase().includes(q);
        const matchContra = m.contraCoaName.toLowerCase().includes(q) || m.contraCoaCode.toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchContra) return false;
      }
      return true;
    });
  }, [mutations, typeFilter, selectedMonth, searchQuery]);

  const TypeIcon = account.type === 'bank' ? Building2 : account.type === 'ewallet' ? Smartphone : Coins;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Navigation & Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-all cursor-pointer group"
              title="Kembali ke Daftar Akun"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
                style={{ backgroundColor: account.color || '#4f46e5' }}
              >
                <TypeIcon className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    {account.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                    {account.type.toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono">
                  <span>{account.accountNumber ? `No: ${account.accountNumber}` : 'Dompet Kas Fisik'}</span>
                  <span>•</span>
                  <button 
                    onClick={onNavigateToCoa}
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                    title="Buka di Bagan Akun Standar"
                  >
                    <span>COA: {coaInfo.code} ({coaInfo.name})</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Account Switcher & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={account.id}
                onChange={(e) => {
                  const target = allAccounts.find(a => a.id === e.target.value);
                  if (target) onSelectAccount(target);
                }}
                className="px-3 py-2 pr-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-neutral-100 cursor-pointer appearance-none"
              >
                {allAccounts.map(a => (
                  <option key={a.id} value={a.id}>
                    Pindah: {a.name} ({a.type.toUpperCase()})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>

            {onOpenTransfer && (
              <button
                onClick={() => {
                  const type = account.type === 'bank' ? 'cash_withdrawal' : account.type === 'cash' ? 'cash_deposit' : 'transfer';
                  onOpenTransfer(account.id, type);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 cursor-pointer transition-colors"
                title="Pindahkan saldo atau tarik uang tunai"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{account.type === 'bank' ? 'Tarik Tunai / Transfer' : account.type === 'cash' ? 'Setor Tunai' : 'Transfer / Top Up'}</span>
              </button>
            )}

            <button
              onClick={() => onEditInitialBalance(account)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Saldo Awal</span>
            </button>

            <button
              onClick={() => onAddTransactionForAccount(account.id)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 cursor-pointer shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat di Akun Ini</span>
            </button>
          </div>
        </div>

        {/* Account Financial KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* 1. Saldo Awal */}
          <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
              Saldo Awal
            </span>
            <p className="text-base font-bold font-mono text-neutral-800 dark:text-neutral-200 tabular-nums">
              {currencySymbol} {account.initialBalance.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-neutral-400">Modal Awal Akun (3-1100)</span>
          </div>

          {/* 2. Total Masuk (Kredit) */}
          <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Total Masuk (Kredit)
            </span>
            <p className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              +{currencySymbol} {totalIncome.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300">{incomeCount} mutasi pemasukan</span>
          </div>

          {/* 3. Total Keluar (Debit) */}
          <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
              Total Keluar (Debit)
            </span>
            <p className="text-base font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
              -{currencySymbol} {totalExpense.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-rose-700 dark:text-rose-300">{expenseCount} mutasi pengeluaran</span>
          </div>

          {/* 4. Saldo Berjalan Saat Ini */}
          <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
              Saldo Akhir Berjalan
            </span>
            <p className="text-lg font-bold font-mono text-indigo-900 dark:text-indigo-100 tabular-nums">
              {currencySymbol} {currentBalance.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
              Kalkulasi: Awal + Masuk - Keluar
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Mutation Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
              Buku Pembantu & Mutasi Rekening ({filteredMutations.length} Transaksi)
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Cari transaksi / akun lawan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs w-48 focus:w-60 transition-all"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold"
            >
              <option value="all">Semua Mutasi</option>
              <option value="income">Uang Masuk (+)</option>
              <option value="expense">Uang Keluar (-)</option>
            </select>

            {/* Month Filter */}
            {availableMonths.length > 0 && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-mono"
              >
                <option value="all">Semua Bulan</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Mutation Table */}
        {filteredMutations.length === 0 ? (
          <div className="py-12 text-center text-neutral-400 space-y-2">
            <Receipt className="w-8 h-8 mx-auto opacity-40" />
            <p className="text-xs font-medium">Belum ada transaksi pada rekening ini.</p>
            <button
              onClick={() => onAddTransactionForAccount(account.id)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              + Catat Transaksi Baru
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-bold uppercase text-neutral-400">
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Keterangan / Transaksi</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3">Akun Lawan (COA Standar)</th>
                  <th className="py-2.5 px-3 text-right">Masuk (+)</th>
                  <th className="py-2.5 px-3 text-right">Keluar (-)</th>
                  <th className="py-2.5 px-3 text-right">Saldo Berjalan</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono">
                {filteredMutations.map((m) => {
                  const isIncome = m.type === 'income';

                  return (
                    <tr 
                      key={m.id}
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 text-neutral-500 whitespace-nowrap">
                        {m.date}
                      </td>

                      <td className="py-3 px-3 font-sans">
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {m.title}
                        </div>
                        {m.notes && (
                          <div className="text-[11px] text-neutral-400 font-sans line-clamp-1">
                            {m.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 font-sans whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium text-[11px]">
                          {m.category}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-sans text-neutral-600 dark:text-neutral-400 text-[11px] whitespace-nowrap">
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold mr-1">
                          {m.contraCoaCode}
                        </span>
                        <span>{m.contraCoaName}</span>
                      </td>

                      <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                        {isIncome ? `+${currencySymbol} ${m.amount.toLocaleString('id-ID')}` : '-'}
                      </td>

                      <td className="py-3 px-3 text-right text-rose-600 dark:text-rose-400 font-bold whitespace-nowrap">
                        {!isIncome ? `-${currencySymbol} ${m.amount.toLocaleString('id-ID')}` : '-'}
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                        {currencySymbol} {m.runningBalance.toLocaleString('id-ID')}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => onDeleteTransaction(m.id)}
                          className="p-1 rounded text-neutral-400 hover:text-rose-500 cursor-pointer transition-colors"
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info: Explanation of running balance and accounting tie */}
        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-neutral-400 gap-2">
          <span>
            Buku Pembantu Rekening dihitung otomatis berdasarkan prinsip akuntansi standar (Saldo Awal + Total Masuk - Total Keluar).
          </span>
          <button
            onClick={onNavigateToCoa}
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
          >
            <span>Buka Jurnal Umum & Neraca Saldo</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
