import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PriorityLevel, TransferType } from '../../types';
import { X, CalendarCheck, Wallet, FileText, ArrowLeftRight } from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose }) => {
  const { addTodo, addTransaction, addNote, profile, noteCategories, accounts, addMyDebt, transferBetweenAccounts } = useApp();
  const [activeType, setActiveType] = useState<'todo' | 'finance' | 'transfer' | 'note'>('todo');

  // Todo Form State
  const [todoTitle, setTodoTitle] = useState('');
  const [todoCategory, setTodoCategory] = useState('Work');
  const [todoPriority, setTodoPriority] = useState<PriorityLevel>('medium');
  const [todoDueDate, setTodoDueDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Finance Form State
  const [txTitle, setTxTitle] = useState('');
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('Food & Dining');
  const [txAccountId, setTxAccountId] = useState(() => accounts[0]?.id || '');
  const [isDebtLiability, setIsDebtLiability] = useState(false);
  const [creditorName, setCreditorName] = useState('');
  const [debtDueDate, setDebtDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Transfer Form State
  const [transferType, setTransferType] = useState<TransferType>('cash_withdrawal');
  const [transferSourceId, setTransferSourceId] = useState(() => {
    const bank = accounts.find(a => a.type === 'bank');
    return bank ? bank.id : accounts[0]?.id || '';
  });
  const [transferTargetId, setTransferTargetId] = useState(() => {
    const cash = accounts.find(a => a.type === 'cash');
    return cash ? cash.id : accounts[1]?.id || accounts[0]?.id || '';
  });
  const [transferAmount, setTransferAmount] = useState('500000');
  const [transferAdminFee, setTransferAdminFee] = useState('0');
  const [transferNotes, setTransferNotes] = useState('');

  // Note Form State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteCategory, setNoteCategory] = useState('Ide');
  const [noteContent, setNoteContent] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeType === 'todo') {
      if (!todoTitle.trim()) return;
      addTodo({
        title: todoTitle.trim(),
        dueDate: todoDueDate,
        priority: todoPriority,
        status: 'pending',
        category: todoCategory,
        tags: [todoCategory]
      });
      setTodoTitle('');
    } else if (activeType === 'finance') {
      const parsedAmount = parseFloat(txAmount.replace(/[^0-9]/g, ''));
      if (!txTitle.trim() || !parsedAmount) return;

      const selectedAcc = accounts.find(a => a.id === (txAccountId || accounts[0]?.id));
      const chosenAccountId = selectedAcc ? selectedAcc.id : accounts[0]?.id;
      const chosenWalletType = selectedAcc?.type === 'cash' ? 'cash' : 'non_cash';
      const chosenPaymentMethod: 'Bank Transfer' | 'E-Wallet' | 'Cash' | 'Credit Card' = 
        selectedAcc?.type === 'cash' 
          ? 'Cash' 
          : selectedAcc?.type === 'ewallet' 
          ? 'E-Wallet' 
          : 'Bank Transfer';

      let createdDebtId: string | undefined = undefined;

      if (txType === 'expense' && isDebtLiability) {
        createdDebtId = addMyDebt({
          creditorName: creditorName.trim() || 'Kreditor / PayLater',
          description: txTitle.trim(),
          amount: parsedAmount,
          amountPaid: 0,
          issuedDate: new Date().toISOString().split('T')[0],
          dueDate: debtDueDate,
          status: 'unpaid',
          category: txCategory,
          notes: 'Dibuat otomatis dari entri transaksi pengeluaran'
        });
      }

      addTransaction({
        type: txType,
        title: txTitle.trim(),
        amount: parsedAmount,
        category: txCategory,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: chosenPaymentMethod,
        walletType: chosenWalletType,
        accountId: chosenAccountId,
        accountName: selectedAcc ? selectedAcc.name : 'Utama',
        relatedDebtId: createdDebtId
      });

      setTxTitle('');
      setTxAmount('');
      setIsDebtLiability(false);
      setCreditorName('');
    } else if (activeType === 'transfer') {
      const parsedAmount = Math.max(0, parseInt(transferAmount.replace(/\D/g, '') || '0', 10));
      const parsedFee = Math.max(0, parseInt(transferAdminFee.replace(/\D/g, '') || '0', 10));
      if (parsedAmount <= 0) return;
      if (transferSourceId === transferTargetId) return;

      const res = transferBetweenAccounts({
        sourceAccountId: transferSourceId,
        targetAccountId: transferTargetId,
        amount: parsedAmount,
        adminFee: parsedFee,
        date: new Date().toISOString().split('T')[0],
        transferType,
        notes: transferNotes.trim() || undefined
      });

      if (res.success) {
        setTransferAmount('500000');
        setTransferAdminFee('0');
        setTransferNotes('');
        onClose();
        return;
      }
    } else if (activeType === 'note') {
      if (!noteTitle.trim()) return;
      addNote({
        title: noteTitle.trim(),
        category: noteCategory,
        tags: [noteCategory],
        content: noteContent.trim() || '# ' + noteTitle.trim() + '\n\nTulis ide di sini...',
        isPinned: false
      });
      setNoteTitle('');
      setNoteContent('');
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Tambah Cepat
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-4 p-2 bg-neutral-100 dark:bg-neutral-800/60 gap-1 border-b border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveType('todo')}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${
              activeType === 'todo'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Tugas</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveType('finance')}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${
              activeType === 'finance'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Keuangan</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveType('transfer')}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${
              activeType === 'transfer'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Transfer</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveType('note')}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${
              activeType === 'note'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Catatan</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {activeType === 'todo' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Nama Tugas
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Selesaikan konversi laporan PDF..."
                  value={todoTitle}
                  onChange={(e) => setTodoTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Tenggat Waktu
                  </label>
                  <input
                    type="date"
                    value={todoDueDate}
                    onChange={(e) => setTodoDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Prioritas
                  </label>
                  <select
                    value={todoPriority}
                    onChange={(e) => setTodoPriority(e.target.value as PriorityLevel)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="low">Rendah (Low)</option>
                    <option value="medium">Sedang (Medium)</option>
                    <option value="high">Mendesak (High)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Kategori
                </label>
                <input
                  type="text"
                  placeholder="Work, Personal, Finance, Project..."
                  value={todoCategory}
                  onChange={(e) => setTodoCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100"
                />
              </div>
            </>
          )}

          {activeType === 'finance' && (
            <>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTxType('expense')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    txType === 'expense'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                      : 'border-neutral-300 dark:border-neutral-700 text-neutral-500'
                  }`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('income')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    txType === 'income'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'border-neutral-300 dark:border-neutral-700 text-neutral-500'
                  }`}
                >
                  Pemasukan
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Deskripsi Transaksi
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Langganan Software, Makan Siang..."
                  value={txTitle}
                  onChange={(e) => setTxTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Nominal ({profile.currencySymbol})
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="150000"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Kategori
                  </label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="Food & Dining">Food & Dining</option>
                    <option value="Work & Software">Work & Software</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Salary">Salary / Gaji</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Investment">Investment</option>
                    <option value="Shopping & Lifestyle">Shopping & Lifestyle</option>
                    <option value="Cicilan & Hutang">Cicilan & Hutang</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Rekening / Sumber Dana
                </label>
                <select
                  value={txAccountId}
                  onChange={(e) => setTxAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.type === 'bank' ? '🏦' : acc.type === 'ewallet' ? '📱' : '💵'} {acc.name} ({acc.accountNumber || acc.type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {txType === 'expense' && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDebtLiability}
                      onChange={(e) => setIsDebtLiability(e.target.checked)}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                      Timbul Hutang Saya (Kredit / PayLater / Beli Tempo)
                    </span>
                  </label>

                  {isDebtLiability && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-500/20">
                      <div>
                        <label className="block text-[11px] font-medium text-amber-800 dark:text-amber-300 mb-1">
                          Nama Kreditor / Mitra
                        </label>
                        <input
                          type="text"
                          placeholder="Shopee PayLater, Tokopedia, Teman..."
                          value={creditorName}
                          onChange={(e) => setCreditorName(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-700 text-xs"
                          required={isDebtLiability}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-amber-800 dark:text-amber-300 mb-1">
                          Jatuh Tempo Pembayaran
                        </label>
                        <input
                          type="date"
                          value={debtDueDate}
                          onChange={(e) => setDebtDueDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-700 text-xs font-mono"
                          required={isDebtLiability}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeType === 'transfer' && (
            <>
              {/* Transfer Mode Pills */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                {[
                  { type: 'cash_withdrawal' as TransferType, label: '🏧 Tarik Tunai' },
                  { type: 'transfer' as TransferType, label: '🔁 Transfer Bank' },
                  { type: 'ewallet_topup' as TransferType, label: '📲 Top Up E-Wallet' }
                ].map((m) => (
                  <button
                    key={m.type}
                    type="button"
                    onClick={() => {
                      setTransferType(m.type);
                      if (m.type === 'cash_withdrawal') {
                        const bank = accounts.find(a => a.type === 'bank');
                        const cash = accounts.find(a => a.type === 'cash');
                        if (bank) setTransferSourceId(bank.id);
                        if (cash) setTransferTargetId(cash.id);
                        setTransferAdminFee('0');
                      } else if (m.type === 'ewallet_topup') {
                        const bank = accounts.find(a => a.type === 'bank');
                        const ewallet = accounts.find(a => a.type === 'ewallet');
                        if (bank) setTransferSourceId(bank.id);
                        if (ewallet) setTransferTargetId(ewallet.id);
                        setTransferAdminFee('1000');
                      }
                    }}
                    className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                      transferType === m.type
                        ? 'bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Source & Target Accounts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Sumber Dana (Berkurang)
                  </label>
                  <select
                    value={transferSourceId}
                    onChange={(e) => setTransferSourceId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-neutral-100"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Penerima Dana (Bertambah)
                  </label>
                  <select
                    value={transferTargetId}
                    onChange={(e) => setTransferTargetId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-neutral-100"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id} disabled={acc.id === transferSourceId}>
                        {acc.name} ({acc.type.toUpperCase()}) {acc.id === transferSourceId ? '(Sumber)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Nominal Transfer ({profile.currencySymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-neutral-400">
                    {profile.currencySymbol}
                  </span>
                  <input
                    type="text"
                    required
                    value={transferAmount ? parseInt(transferAmount.replace(/\D/g, '') || '0', 10).toLocaleString('id-ID') : ''}
                    onChange={(e) => setTransferAmount(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-base font-mono font-bold text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {[100000, 200000, 500000, 1000000].map((nom) => (
                    <button
                      key={nom}
                      type="button"
                      onClick={() => setTransferAmount(String(nom))}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                    >
                      +{profile.currencySymbol} {(nom / 1000).toLocaleString('id-ID')}k
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin Fee & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Biaya Admin ({profile.currencySymbol})
                  </label>
                  <input
                    type="text"
                    value={transferAdminFee ? parseInt(transferAdminFee.replace(/\D/g, '') || '0', 10).toLocaleString('id-ID') : '0'}
                    onChange={(e) => setTransferAdminFee(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs font-mono text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Keterangan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    placeholder="Catatan transfer..."
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>
            </>
          )}

          {activeType === 'note' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Judul Catatan
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rangkuman Riset Pasar Q4..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Folder / Kategori
                </label>
                <input
                  type="text"
                  list="quick-add-note-categories"
                  placeholder="Pilih atau ketik kategori..."
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100"
                />
                <datalist id="quick-add-note-categories">
                  {noteCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Isi Singkat (Mendukung Markdown)
                </label>
                <textarea
                  rows={3}
                  placeholder="Tulis ringkasan atau poin penting..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 resize-none font-sans"
                />
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-sm transition-all"
            >
              Simpan Entri
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
