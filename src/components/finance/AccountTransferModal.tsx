import React, { useState, useId } from 'react';
import { 
  X, 
  ArrowRight, 
  ArrowLeftRight, 
  Wallet, 
  Building2, 
  Smartphone, 
  Banknote, 
  Check, 
  AlertCircle,
  HelpCircle,
  Receipt,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TransferType, FinancialAccount } from '../../types';

interface AccountTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSourceAccountId?: string;
  defaultTargetAccountId?: string;
  defaultType?: TransferType;
}

export const AccountTransferModal: React.FC<AccountTransferModalProps> = ({
  isOpen,
  onClose,
  defaultSourceAccountId,
  defaultTargetAccountId,
  defaultType = 'cash_withdrawal'
}) => {
  const { accounts, transactions, profile, transferBetweenAccounts } = useApp();

  const [transferType, setTransferType] = useState<TransferType>(defaultType);
  const [sourceAccountId, setSourceAccountId] = useState<string>(() => {
    if (defaultSourceAccountId && accounts.some(a => a.id === defaultSourceAccountId)) {
      return defaultSourceAccountId;
    }
    // Default: find first bank account, or first account
    const bank = accounts.find(a => a.type === 'bank');
    return bank ? bank.id : accounts[0]?.id || '';
  });

  const [targetAccountId, setTargetAccountId] = useState<string>(() => {
    if (defaultTargetAccountId && accounts.some(a => a.id === defaultTargetAccountId)) {
      return defaultTargetAccountId;
    }
    // Default for cash withdrawal: find cash account
    const cash = accounts.find(a => a.type === 'cash');
    if (cash && cash.id !== sourceAccountId) return cash.id;
    const other = accounts.find(a => a.id !== sourceAccountId);
    return other ? other.id : '';
  });

  const [amountStr, setAmountStr] = useState<string>('500000');
  const [adminFeeStr, setAdminFeeStr] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Form field IDs for accessible labels
  const sourceAccountIdFieldId = useId();
  const targetAccountIdFieldId = useId();
  const amountFieldId = useId();
  const adminFeeFieldId = useId();
  const dateFieldId = useId();
  const notesFieldId = useId();

  if (!isOpen) return null;

  // Calculate live balance for an account
  const getAccountLiveBalance = (acc: FinancialAccount) => {
    const accTxs = transactions.filter(t => t.accountId === acc.id || t.accountName === acc.name);
    const income = accTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = accTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return acc.initialBalance + income - expense;
  };

  const sourceAccount = accounts.find(a => a.id === sourceAccountId) || accounts[0];
  const targetAccount = accounts.find(a => a.id === targetAccountId) || accounts[1] || accounts[0];

  const sourceBalance = sourceAccount ? getAccountLiveBalance(sourceAccount) : 0;
  const targetBalance = targetAccount ? getAccountLiveBalance(targetAccount) : 0;

  const parsedAmount = Math.max(0, parseInt(amountStr.replace(/\D/g, '') || '0', 10));
  const parsedAdminFee = Math.max(0, parseInt(adminFeeStr.replace(/\D/g, '') || '0', 10));
  const totalDeducted = parsedAmount + parsedAdminFee;

  const isInsufficient = sourceBalance < totalDeducted;
  const isSameAccount = sourceAccountId === targetAccountId;

  // When changing transfer mode, set smart presets
  const handleTypeChange = (type: TransferType) => {
    setTransferType(type);
    if (type === 'cash_withdrawal') {
      // Bank -> Cash
      const bank = accounts.find(a => a.type === 'bank') || accounts[0];
      const cash = accounts.find(a => a.type === 'cash') || accounts[1];
      if (bank) setSourceAccountId(bank.id);
      if (cash) setTargetAccountId(cash.id);
      setAdminFeeStr('0');
    } else if (type === 'cash_deposit') {
      // Cash -> Bank
      const cash = accounts.find(a => a.type === 'cash') || accounts[0];
      const bank = accounts.find(a => a.type === 'bank') || accounts[1];
      if (cash) setSourceAccountId(cash.id);
      if (bank) setTargetAccountId(bank.id);
      setAdminFeeStr('0');
    } else if (type === 'ewallet_topup') {
      // Bank -> E-Wallet
      const bank = accounts.find(a => a.type === 'bank') || accounts[0];
      const ewallet = accounts.find(a => a.type === 'ewallet') || accounts[1];
      if (bank) setSourceAccountId(bank.id);
      if (ewallet) setTargetAccountId(ewallet.id);
      setAdminFeeStr('1000');
    } else {
      // General Transfer
      setAdminFeeStr('0');
    }
  };

  // Quick swap source and target
  const handleSwap = () => {
    const temp = sourceAccountId;
    setSourceAccountId(targetAccountId);
    setTargetAccountId(temp);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSameAccount) return;
    if (parsedAmount <= 0) return;

    const result = transferBetweenAccounts({
      sourceAccountId,
      targetAccountId,
      amount: parsedAmount,
      adminFee: parsedAdminFee,
      date,
      transferType,
      notes: notes.trim() || undefined
    });

    if (result.success) {
      onClose();
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'bank': return <Building2 className="w-4 h-4 text-indigo-500" />;
      case 'ewallet': return <Smartphone className="w-4 h-4 text-cyan-500" />;
      case 'cash': return <Banknote className="w-4 h-4 text-emerald-500" />;
      default: return <Wallet className="w-4 h-4 text-neutral-500" />;
    }
  };

  const quickNominals = [100000, 200000, 500000, 1000000, 2000000];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <span>Transfer & Tarik Tunai</span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] font-semibold">
                  Antar Akun
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Pindahkan saldo antar rekening, isi e-wallet, atau catat penarikan uang tunai di ATM
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Transfer Type Preset Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60">
            <button
              type="button"
              onClick={() => handleTypeChange('cash_withdrawal')}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                transferType === 'cash_withdrawal'
                  ? 'bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <span className="text-sm mb-0.5">🏧</span>
              <span>Tarik Tunai</span>
              <span className="text-[10px] text-neutral-400 font-normal">Bank → Cash</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('transfer')}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                transferType === 'transfer'
                  ? 'bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <span className="text-sm mb-0.5">🔁</span>
              <span>Transfer Bank</span>
              <span className="text-[10px] text-neutral-400 font-normal">Antar Rekening</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('ewallet_topup')}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                transferType === 'ewallet_topup'
                  ? 'bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <span className="text-sm mb-0.5">📲</span>
              <span>Top Up E-Wallet</span>
              <span className="text-[10px] text-neutral-400 font-normal">Bank → E-Wallet</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('cash_deposit')}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                transferType === 'cash_deposit'
                  ? 'bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <span className="text-sm mb-0.5">💵</span>
              <span>Setor Tunai</span>
              <span className="text-[10px] text-neutral-400 font-normal">Cash → Bank</span>
            </button>
          </div>

          {/* Interactive Visual Account Flow Cards */}
          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
            {/* Source Account (Sumber Dana) */}
            <div className="space-y-2">
              <label htmlFor={sourceAccountIdFieldId} className="flex items-center justify-between text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Sumber Dana (Berkurang)</span>
                </span>
                <span className="text-[11px] font-mono text-neutral-400">
                  Saldo: {profile.currencySymbol} {sourceBalance.toLocaleString('id-ID')}
                </span>
              </label>

              <div className="relative">
                <select
                  id={sourceAccountIdFieldId}
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type.toUpperCase()}) — Saldo {profile.currencySymbol} {getAccountLiveBalance(acc).toLocaleString('id-ID')}
                    </option>
                  ))}
                </select>
              </div>

              {sourceAccount && (
                <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                      {getAccountIcon(sourceAccount.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">{sourceAccount.name}</p>
                      <p className="text-[10px] text-neutral-400 font-mono truncate">{sourceAccount.accountNumber || 'Dompet Tunai'}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-neutral-400">Sisa Saldo</p>
                    <p className={`text-xs font-mono font-bold ${isInsufficient ? 'text-rose-500' : 'text-neutral-900 dark:text-neutral-100'}`}>
                      {profile.currencySymbol} {(sourceBalance - totalDeducted).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Middle Swap Button */}
            <div className="sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 flex items-center justify-center my-1 sm:my-0 z-10">
              <button
                type="button"
                onClick={handleSwap}
                title="Tukar Posisi Akun Sumber & Tujuan"
                className="w-8 h-8 rounded-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 shadow-md flex items-center justify-center text-neutral-500 hover:text-indigo-600 hover:scale-110 active:scale-95 transition-all cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Target Account (Penerima Dana) */}
            <div className="space-y-2">
              <label htmlFor={targetAccountIdFieldId} className="flex items-center justify-between text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Penerima Dana (Bertambah)</span>
                </span>
                <span className="text-[11px] font-mono text-neutral-400">
                  Saldo: {profile.currencySymbol} {targetBalance.toLocaleString('id-ID')}
                </span>
              </label>

              <div className="relative">
                <select
                  id={targetAccountIdFieldId}
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} disabled={acc.id === sourceAccountId}>
                      {acc.name} ({acc.type.toUpperCase()}) {acc.id === sourceAccountId ? '(Sedang Dipilih Sebagai Sumber)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {targetAccount && (
                <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                      {getAccountIcon(targetAccount.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">{targetAccount.name}</p>
                      <p className="text-[10px] text-neutral-400 font-mono truncate">{targetAccount.accountNumber || 'Dompet Tunai'}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-neutral-400">Saldo Baru</p>
                    <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {profile.currencySymbol} {(targetBalance + parsedAmount).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Same Account Warning */}
          {isSameAccount && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Akun sumber dana dan akun penerima tidak boleh sama. Silakan pilih akun tujuan yang berbeda.</span>
            </div>
          )}

          {/* Amount Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor={amountFieldId} className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Nominal Dana yang Dipindahkan ({profile.currencySymbol})
              </label>
              <button
                type="button"
                onClick={() => setAmountStr(String(Math.max(0, sourceBalance - parsedAdminFee)))}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
              >
                Tarik Semua Saldo
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-mono font-bold text-neutral-400">
                {profile.currencySymbol}
              </span>
              <input
                id={amountFieldId}
                type="text"
                value={parsedAmount > 0 ? parsedAmount.toLocaleString('id-ID') : ''}
                onChange={(e) => setAmountStr(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-lg sm:text-xl font-mono font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Quick nominal buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {quickNominals.map((nom) => (
                <button
                  key={nom}
                  type="button"
                  onClick={() => setAmountStr(String(nom))}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[11px] font-mono text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  +{profile.currencySymbol} {(nom / 1000).toLocaleString('id-ID')}k
                </button>
              ))}
            </div>
          </div>

          {/* Admin Fee & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Biaya Admin */}
            <div className="space-y-1.5">
              <label htmlFor={adminFeeFieldId} className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <span>Biaya Admin (Jika Ada)</span>
                <span className="text-[10px] text-neutral-400 font-normal">Dipotong dari sumber</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-400">
                  {profile.currencySymbol}
                </span>
                <input
                  id={adminFeeFieldId}
                  type="text"
                  value={parsedAdminFee > 0 ? parsedAdminFee.toLocaleString('id-ID') : '0'}
                  onChange={(e) => setAdminFeeStr(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs font-mono font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Admin fee pills */}
              <div className="flex items-center gap-1.5 pt-0.5">
                {[
                  { label: 'Gratis Rp 0', fee: 0 },
                  { label: 'E-Wallet 1k', fee: 1000 },
                  { label: 'BI-FAST 2.5k', fee: 2500 },
                  { label: 'ATM 7.5k', fee: 7500 }
                ].map((item) => (
                  <button
                    key={item.fee}
                    type="button"
                    onClick={() => setAdminFeeStr(String(item.fee))}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                      parsedAdminFee === item.fee
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tanggal Transaksi */}
            <div className="space-y-1.5">
              <label htmlFor={dateFieldId} className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Tanggal Transaksi
              </label>
              <input
                id={dateFieldId}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Catatan / Keterangan */}
          <div className="space-y-1.5">
            <label htmlFor={notesFieldId} className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Keterangan / Catatan (Opsional)
            </label>
            <input
              id={notesFieldId}
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                transferType === 'cash_withdrawal'
                  ? 'Contoh: Tarik tunai di ATM BCA Mall untuk uang saku'
                  : transferType === 'ewallet_topup'
                  ? 'Contoh: Isi saldo GoPay untuk pesanan makan siang'
                  : 'Contoh: Pindah dana operasional ke rekening harian'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Insufficient Balance Notice */}
          {isInsufficient && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Peringatan: Saldo Akun Asal Kurang</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Total yang ditarik/dipotong ({profile.currencySymbol} {totalDeducted.toLocaleString('id-ID')}) melebihi saldo akun {sourceAccount.name} ({profile.currencySymbol} {sourceBalance.toLocaleString('id-ID')}). Saldo akun asal akan menjadi minus jika tetap diproses.
              </p>
            </div>
          )}

          {/* Accounting Impact Summary Banner */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 text-xs text-neutral-600 dark:text-neutral-300 space-y-2">
            <div className="flex items-center justify-between font-semibold text-indigo-700 dark:text-indigo-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dampak Buku Besar & Akuntansi (PSAK Standar):</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded">
                Debit = Kredit
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded-lg bg-white dark:bg-neutral-900/70 border border-neutral-200/60 dark:border-neutral-800">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">[DEBIT]</span> {targetAccount?.name}: +{profile.currencySymbol} {parsedAmount.toLocaleString('id-ID')}
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-neutral-900/70 border border-neutral-200/60 dark:border-neutral-800">
                <span className="text-rose-600 dark:text-rose-400 font-bold">[KREDIT]</span> {sourceAccount?.name}: -{profile.currencySymbol} {parsedAmount.toLocaleString('id-ID')}
              </div>
            </div>
            {parsedAdminFee > 0 && (
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                * Biaya admin {profile.currencySymbol} {parsedAdminFee.toLocaleString('id-ID')} dibukukan ke Beban Finansial (Debit) dan memotong kas pengirim (Kredit).
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSameAccount || parsedAmount <= 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all hover:scale-102 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>
                {transferType === 'cash_withdrawal'
                  ? `Konfirmasi Tarik Tunai (${profile.currencySymbol} ${parsedAmount.toLocaleString('id-ID')})`
                  : transferType === 'ewallet_topup'
                  ? `Konfirmasi Top Up (${profile.currencySymbol} ${parsedAmount.toLocaleString('id-ID')})`
                  : `Proses Transfer (${profile.currencySymbol} ${parsedAmount.toLocaleString('id-ID')})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
