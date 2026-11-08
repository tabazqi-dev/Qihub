import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { useApp } from '../../context/AppContext';
import { 
  FinanceTransaction, 
  DebtReceivable, 
  MyDebtLiability,
  FinancialAccount,
  AccountAuditItem,
  DailyAuditRecord,
  WalletType,
  AccountType,
  ChartOfAccount,
  CoaClass,
  TransferType
} from '../../types';
import { 
  getAllChartOfAccounts,
  getCoaForFinancialAccount,
  getCoaForCategory,
  generateStandardJournalEntries,
  calculateCoaLedgers,
  getAccountingEquationSummary,
  CoaLedgerSummary
} from '../../utils/accounting';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Trash2, 
  Download, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Banknote, 
  Send, 
  Mail, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileCheck, 
  FileText, 
  Share2, 
  DollarSign, 
  Receipt, 
  Settings, 
  Sparkles, 
  CalendarCheck,
  Building2,
  Smartphone,
  Coins,
  Upload,
  RefreshCw,
  Edit2,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Scale,
  Calendar,
  FileSpreadsheet,
  BookOpen,
  BookMarked,
  Layers,
  Search,
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  ArrowLeftRight
} from 'lucide-react';
import { AccountLedgerView } from './AccountLedgerView';
import { ChartOfAccountsView } from './ChartOfAccountsView';
import { AccountTransferModal } from './AccountTransferModal';

type FinanceSubTab = 'overview' | 'accounts' | 'coa' | 'my-debts' | 'daily-audit' | 'debts' | 'invoice' | 'reports';

export const FinanceTrackerView: React.FC = () => {
  const { 
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
    updateInitialBalance,
    importAccountsFromCSV,
    transactions, 
    addTransaction, 
    deleteTransaction, 
    debts, 
    addDebt, 
    updateDebt, 
    deleteDebt, 
    recordDebtPayment,
    myDebts,
    addMyDebt,
    updateMyDebt,
    deleteMyDebt,
    payMyDebt,
    dailyAudits,
    saveDailyAudit,
    deleteDailyAudit,
    autoReconcileDifference,
    categoryBudgets,
    updateCategoryBudget,
    profile, 
    showToast 
  } = useApp();

  // Active top subtab
  const [activeSubTab, setActiveSubTab] = useState<FinanceSubTab>('overview');

  // Filter for transactions
  const [walletFilter, setWalletFilter] = useState<'all' | 'cash' | 'non_cash'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');

  // ================= TRANSACTION MODAL STATE =================
  const [isAddingTx, setIsAddingTx] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('Food & Dining');
  const [txAccountId, setTxAccountId] = useState<string>(() => accounts[0]?.id || '');
  const [txPaymentMethod, setTxPaymentMethod] = useState<'Bank Transfer' | 'E-Wallet' | 'Cash' | 'Credit Card'>('Bank Transfer');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [txNotes, setTxNotes] = useState('');

  // Option: Transaction creates MyDebt (Beli dengan Hutang / PayLater / Kredit)
  const [isCreditDebt, setIsCreditDebt] = useState(false);
  const [debtCreditorName, setDebtCreditorName] = useState('GoPay Later');
  const [debtDueDateInput, setDebtDueDateInput] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [debtDownPayment, setDebtDownPayment] = useState('');

  // ================= ACCOUNT MODAL STATE =================
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('bank');
  const [accInitialBalance, setAccInitialBalance] = useState('');
  const [accNumber, setAccNumber] = useState('');
  const [accNotes, setAccNotes] = useState('');

  // Upload Saldo Awal Modal
  const [isUploadBalanceOpen, setIsUploadBalanceOpen] = useState(false);
  const [csvUploadText, setCsvUploadText] = useState('');

  // Quick Edit Initial Balance Modal
  const [editingAcc, setEditingAcc] = useState<FinancialAccount | null>(null);
  const [editBalanceInput, setEditBalanceInput] = useState('');

  // ================= MY DEBTS (HUTANG SAYA) MODAL STATE =================
  const [isAddingMyDebt, setIsAddingMyDebt] = useState(false);
  const [myDebtCreditor, setMyDebtCreditor] = useState('');
  const [myDebtDesc, setMyDebtDesc] = useState('');
  const [myDebtAmount, setMyDebtAmount] = useState('');
  const [myDebtDueDate, setMyDebtDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [myDebtCategory, setMyDebtCategory] = useState('Work & Software');
  const [myDebtAccountId, setMyDebtAccountId] = useState<string>(() => accounts[0]?.id || '');

  // Modal Bayar Hutang Saya
  const [payingMyDebt, setPayingMyDebt] = useState<MyDebtLiability | null>(null);
  const [myDebtPayAmount, setMyDebtPayAmount] = useState('');
  const [myDebtPaySourceAcc, setMyDebtPaySourceAcc] = useState<string>(() => accounts[0]?.id || '');
  const [myDebtPayNotes, setMyDebtPayNotes] = useState('');

  // ================= DAILY AUDIT (CEK HARIAN) STATE =================
  const [auditDate, setAuditDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [actualBalancesInput, setActualBalancesInput] = useState<Record<string, string>>({});

  // ================= PIUTANG & INVOICE STATE =================
  const [isAddingDebt, setIsAddingDebt] = useState(false);
  const [debtorName, setDebtorName] = useState('');
  const [debtorPhone, setDebtorPhone] = useState('');
  const [debtorEmail, setDebtorEmail] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtDueDate, setDebtDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [debtDesc, setDebtDesc] = useState('');
  const [debtNotes, setDebtNotes] = useState('');
  // Pilihan akun yang dipotong dan akun penerima pelunasan
  const [debtDeductAccount, setDebtDeductAccount] = useState(true);
  const [debtSourceAccountId, setDebtSourceAccountId] = useState<string>(() => accounts[0]?.id || '');

  // Payment record modal for debt (Piutang)
  const [payingDebt, setPayingDebt] = useState<DebtReceivable | null>(null);
  const [paymentInput, setPaymentInput] = useState('');
  const [debtRepaymentDestAccountId, setDebtRepaymentDestAccountId] = useState<string>(() => accounts[0]?.id || '');
  const [selectedInvoiceDebt, setSelectedInvoiceDebt] = useState<DebtReceivable>(() => debts[0] || null);

  // Month selector for Monthly Reports & P&L
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Edit budget modal
  const [editingBudgetCategory, setEditingBudgetCategory] = useState<string | null>(null);
  const [budgetLimitInput, setBudgetLimitInput] = useState('');

  // ================= ACCOUNT LEDGER / MUTASI STATE =================
  const [selectedAccountForLedger, setSelectedAccountForLedger] = useState<FinancialAccount | null>(null);
  const [accountLedgerSearch, setAccountLedgerSearch] = useState('');
  const [accountLedgerTypeFilter, setAccountLedgerTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  // ================= TRANSFER & TARIK TUNAI MODAL STATE =================
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferInitialSourceId, setTransferInitialSourceId] = useState<string | undefined>(undefined);
  const [transferInitialType, setTransferInitialType] = useState<TransferType>('cash_withdrawal');

  // ================= COA SUBTAB STATE =================
  const [coaViewMode, setCoaViewMode] = useState<'chart' | 'journal' | 'trial_balance'>('chart');
  const [selectedCoaCategoryFilter, setSelectedCoaCategoryFilter] = useState<'all' | CoaClass>('all');
  const [coaSearchQuery, setCoaSearchQuery] = useState('');
  const [inspectingCoaCode, setInspectingCoaCode] = useState<string | null>(null);

  // =================== CALCULATIONS ===================
  // 1. Account balances calculation (Initial + Income - Expense)
  const accountBalances: Record<string, {
    account: FinancialAccount;
    initialBalance: number;
    totalIncome: number;
    totalExpense: number;
    currentBalance: number;
  }> = {};

  accounts.forEach(acc => {
    const accIncome = transactions
      .filter(t => (t.accountId === acc.id || t.accountName === acc.name) && t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);

    const accExpense = transactions
      .filter(t => (t.accountId === acc.id || t.accountName === acc.name) && t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);

    accountBalances[acc.id] = {
      account: acc,
      initialBalance: acc.initialBalance,
      totalIncome: accIncome,
      totalExpense: accExpense,
      currentBalance: acc.initialBalance + accIncome - accExpense
    };
  });

  // Grouped balances
  const totalBankBalance = accounts
    .filter(a => a.type === 'bank')
    .reduce((sum, a) => sum + (accountBalances[a.id]?.currentBalance || 0), 0);

  const totalEwalletBalance = accounts
    .filter(a => a.type === 'ewallet')
    .reduce((sum, a) => sum + (accountBalances[a.id]?.currentBalance || 0), 0);

  const totalCashBalance = accounts
    .filter(a => a.type === 'cash')
    .reduce((sum, a) => sum + (accountBalances[a.id]?.currentBalance || 0), 0);

  const totalCombinedBalance = totalBankBalance + totalEwalletBalance + totalCashBalance;

  // 2. Hutang Saya (Kewajiban)
  const totalMyDebtsUnpaid = myDebts
    .filter(d => d.status !== 'paid')
    .reduce((sum, d) => sum + (d.amount - d.amountPaid), 0);
  const totalMyDebtsPaid = myDebts.reduce((sum, d) => sum + d.amountPaid, 0);

  // 3. Piutang Orang Lain ke Saya
  const totalReceivables = debts
    .filter(d => d.status !== 'paid')
    .reduce((sum, d) => sum + (d.amount - d.amountPaid), 0);
  const totalPaidReceivables = debts.reduce((sum, d) => sum + d.amountPaid, 0);

  // 4. Net Worth (Total Saldo + Piutang - Hutang Saya)
  const netWorth = totalCombinedBalance + totalReceivables - totalMyDebtsUnpaid;

  // 5. Monthly P&L
  const monthlyTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));
  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const monthlyExpense = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const monthlyProfitLoss = monthlyIncome - monthlyExpense;
  const isProfit = monthlyProfitLoss >= 0;

  // Monthly Expenses by Category
  const monthlyCategoryExpenses: Record<string, number> = {};
  monthlyTransactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      monthlyCategoryExpenses[t.category] = (monthlyCategoryExpenses[t.category] || 0) + t.amount;
    });

  const sortedCategories = Object.entries(monthlyCategoryExpenses).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories[0] || null;

  // 6. Chart of Accounts & General Journal Calculations
  const allCoaList = useMemo(() => getAllChartOfAccounts(accounts), [accounts]);
  const standardJournalEntries = useMemo(() => 
    generateStandardJournalEntries(transactions, accounts, myDebts, debts),
    [transactions, accounts, myDebts, debts]
  );
  const coaLedgers = useMemo(() => 
    calculateCoaLedgers(allCoaList, standardJournalEntries),
    [allCoaList, standardJournalEntries]
  );
  const accountingSummary = useMemo(() => 
    getAccountingEquationSummary(coaLedgers),
    [coaLedgers]
  );

  // 7. Selected Account Mutations (Ledger with Running Balance)
  const selectedAccountData = selectedAccountForLedger 
    ? (accountBalances[selectedAccountForLedger.id] || { initialBalance: selectedAccountForLedger.initialBalance, totalIncome: 0, totalExpense: 0, currentBalance: selectedAccountForLedger.initialBalance })
    : null;

  const selectedAccountMutations = useMemo(() => {
    if (!selectedAccountForLedger) return [];

    // Filter transactions for this account
    const accTx = transactions.filter(t => 
      t.accountId === selectedAccountForLedger.id || 
      t.accountName === selectedAccountForLedger.name
    );

    // Sort chronologically ascending to calculate running balance
    const chronological = [...accTx].sort((a, b) => a.date.localeCompare(b.date));
    let running = selectedAccountForLedger.initialBalance;

    const withRunning = chronological.map(tx => {
      if (tx.type === 'income') {
        running += tx.amount;
      } else {
        running -= tx.amount;
      }

      // Contra account in accounting
      const contraCoa = getCoaForCategory(tx.category, tx.type, allCoaList);

      return {
        ...tx,
        runningBalance: running,
        contraCoaCode: contraCoa.code,
        contraCoaName: contraCoa.name
      };
    });

    // Sort descending for display (newest first)
    return withRunning.reverse();
  }, [selectedAccountForLedger, transactions, allCoaList]);

  // Filtered transactions for main table
  const filteredTransactions = transactions.filter(t => {
    if (walletFilter !== 'all' && t.walletType !== walletFilter) return false;
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (accountFilter !== 'all' && t.accountId !== accountFilter && t.accountName !== accountFilter) return false;
    return true;
  });

  // =================== HANDLERS ===================
  // 1. Save Transaction & optional MyDebt
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(txAmount.replace(/[^0-9]/g, ''));
    if (!txTitle.trim() || !parsedAmount) return;

    const selectedAcc = accounts.find(a => a.id === txAccountId);
    const resolvedWalletType: WalletType = selectedAcc?.type === 'cash' ? 'cash' : 'non_cash';

    const assetCoa = selectedAcc ? getCoaForFinancialAccount(selectedAcc, allCoaList) : allCoaList[0];
    let debitCode = '';
    let debitName = '';
    let creditCode = '';
    let creditName = '';

    if (txType === 'income') {
      const revCoa = getCoaForCategory(txCategory, 'income', allCoaList);
      debitCode = assetCoa.code;
      debitName = assetCoa.name;
      creditCode = revCoa.code;
      creditName = revCoa.name;
    } else {
      const expCoa = getCoaForCategory(txCategory, 'expense', allCoaList);
      debitCode = expCoa.code;
      debitName = expCoa.name;
      creditCode = assetCoa.code;
      creditName = assetCoa.name;
    }

    addTransaction({
      type: txType,
      title: txTitle.trim(),
      amount: parsedAmount,
      category: txCategory,
      date: txDate,
      paymentMethod: selectedAcc?.type === 'cash' ? 'Cash' : selectedAcc?.type === 'ewallet' ? 'E-Wallet' : 'Bank Transfer',
      walletType: resolvedWalletType,
      accountId: selectedAcc?.id,
      accountName: selectedAcc?.name || 'Rekening',
      notes: txNotes.trim() || undefined,
      debitAccountCode: debitCode,
      debitAccountName: debitName,
      creditAccountCode: creditCode,
      creditAccountName: creditName
    });

    // If marked as creating MyDebt
    if (isCreditDebt && txType === 'expense') {
      const parsedDP = parseFloat(debtDownPayment.replace(/[^0-9]/g, '')) || 0;
      const totalDebt = parsedAmount - parsedDP;

      if (totalDebt > 0) {
        addMyDebt({
          creditorName: debtCreditorName.trim() || 'Kreditur',
          description: `Hutang transaksi: ${txTitle.trim()}`,
          amount: totalDebt,
          amountPaid: 0,
          dueDate: debtDueDateInput,
          issuedDate: txDate,
          status: 'unpaid',
          sourceAccountId: selectedAcc?.id,
          category: txCategory,
          notes: `Timbul dari transaksi belanja "${txTitle.trim()}"`
        });
      }
    }

    setTxTitle('');
    setTxAmount('');
    setTxNotes('');
    setIsCreditDebt(false);
    setDebtDownPayment('');
    setIsAddingTx(false);
  };

  // 2. Save Account
  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedInit = parseFloat(accInitialBalance.replace(/[^0-9]/g, '')) || 0;
    if (!accName.trim()) return;

    const color = accType === 'cash' ? '#d97706' : accType === 'ewallet' ? '#059669' : '#2563eb';
    addAccount({
      name: accName.trim(),
      type: accType,
      initialBalance: parsedInit,
      accountNumber: accNumber.trim() || undefined,
      color,
      notes: accNotes.trim() || undefined
    });

    setAccName('');
    setAccInitialBalance('');
    setAccNumber('');
    setAccNotes('');
    setIsAddingAccount(false);
  };

  // 3. Quick Update Initial Balance
  const handleUpdateBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAcc) return;
    const parsed = parseFloat(editBalanceInput.replace(/[^0-9]/g, '')) || 0;
    updateInitialBalance(editingAcc.id, parsed);
    setEditingAcc(null);
    setEditBalanceInput('');
  };

  // 4. Save My Debt (Hutang Saya)
  const handleSaveMyDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(myDebtAmount.replace(/[^0-9]/g, ''));
    if (!myDebtCreditor.trim() || !parsed) return;

    addMyDebt({
      creditorName: myDebtCreditor.trim(),
      description: myDebtDesc.trim() || 'Kewajiban Hutang',
      amount: parsed,
      amountPaid: 0,
      dueDate: myDebtDueDate,
      issuedDate: new Date().toISOString().split('T')[0],
      status: 'unpaid',
      sourceAccountId: myDebtAccountId,
      category: myDebtCategory
    });

    setMyDebtCreditor('');
    setMyDebtDesc('');
    setMyDebtAmount('');
    setIsAddingMyDebt(false);
  };

  // 5. Pay My Debt (Cicil Hutang Saya)
  const handlePayMyDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingMyDebt) return;
    const parsed = parseFloat(myDebtPayAmount.replace(/[^0-9]/g, ''));
    if (!parsed || parsed <= 0) return;

    payMyDebt(payingMyDebt.id, parsed, myDebtPaySourceAcc, myDebtPayNotes);
    setPayingMyDebt(null);
    setMyDebtPayAmount('');
    setMyDebtPayNotes('');
  };

  // 6. CSV Upload Saldo Awal
  const handleProcessCsvUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvUploadText.trim()) return;
    const res = importAccountsFromCSV(csvUploadText);
    if (res.success) {
      setIsUploadBalanceOpen(false);
      setCsvUploadText('');
    } else {
      showToast(res.error || 'Gagal memproses CSV', 'error');
    }
  };

  // Download Sample CSV
  const handleDownloadSampleCsv = () => {
    const csvSample = `Nama Akun,Tipe,Nomor Rekening,Saldo Awal\nBCA Utama,bank,8830129841,18500000\nMandiri Payroll,bank,1370019283741,7200000\nGoPay,ewallet,081234567890,850000\nDANA,ewallet,081234567890,600000\nOVO,ewallet,081234567890,450000\nDompet Tunai Fisik,cash,,750000`;
    const blob = new Blob([csvSample], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_saldo_awal_omnihub.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Template CSV saldo awal berhasil diunduh', 'success');
  };

  // 7. Save Daily Audit (Cek Harian)
  const handleSaveDailyAudit = () => {
    const auditItems: AccountAuditItem[] = accounts.map(acc => {
      const sysBal = accountBalances[acc.id]?.currentBalance || 0;
      const rawActual = actualBalancesInput[acc.id];
      const actBal = rawActual !== undefined ? (parseFloat(rawActual.replace(/[^0-9.-]/g, '')) || 0) : sysBal;
      return {
        accountId: acc.id,
        accountName: acc.name,
        accountType: acc.type,
        systemBalance: sysBal,
        actualBalance: actBal,
        difference: actBal - sysBal
      };
    });

    const totSys = auditItems.reduce((s, it) => s + it.systemBalance, 0);
    const totAct = auditItems.reduce((s, it) => s + it.actualBalance, 0);
    const totDiff = totAct - totSys;

    saveDailyAudit({
      date: auditDate,
      accountAudits: auditItems,
      totalSystemBalance: totSys,
      totalActualBalance: totAct,
      totalDifference: totDiff,
      isBalanced: totDiff === 0
    });
  };

  // 8. Save Piutang (Debts to Me)
  const handleSaveDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(debtAmount.replace(/[^0-9]/g, ''));
    if (!debtorName.trim() || !parsed) return;

    let cleanPhone = debtorPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    }

    addDebt({
      debtorName: debtorName.trim(),
      debtorPhone: cleanPhone || undefined,
      debtorEmail: debtorEmail.trim() || undefined,
      amount: parsed,
      amountPaid: 0,
      dueDate: debtDueDate,
      issuedDate: new Date().toISOString().split('T')[0],
      description: debtDesc.trim() || 'Pinjaman / Tagihan Jasa',
      status: 'unpaid',
      notes: debtNotes.trim() || undefined,
    }, debtSourceAccountId, debtDeductAccount);

    setDebtorName('');
    setDebtorPhone('');
    setDebtorEmail('');
    setDebtAmount('');
    setDebtDesc('');
    setDebtNotes('');
    setIsAddingDebt(false);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt) return;
    const parsed = parseFloat(paymentInput.replace(/[^0-9]/g, ''));
    if (!parsed || parsed <= 0) return;

    recordDebtPayment(payingDebt.id, parsed, debtRepaymentDestAccountId);
    setPayingDebt(null);
    setPaymentInput('');
  };

  // 9. Send WhatsApp & Email Invoice
  const handleSendWhatsAppInvoice = (debtItem: DebtReceivable) => {
    if (!debtItem.debtorPhone) {
      showToast('Nomor WhatsApp belum terdaftar untuk debitur ini', 'warning');
      return;
    }
    const sisa = debtItem.amount - debtItem.amountPaid;
    const text = `Halo Kak ${debtItem.debtorName},\n\nMengingatkan tagihan resmi nomor ${debtItem.invoiceNumber} untuk "${debtItem.description}".\nTotal Tagihan: Rp ${debtItem.amount.toLocaleString('id-ID')}\nSisa Pembayaran: Rp ${sisa.toLocaleString('id-ID')}\nJatuh Tempo: ${debtItem.dueDate}\n\nPembayaran dapat ditransfer ke:\n${profile.bankAccountDetails || 'Rekening BCA: 8830129841 a/n ' + profile.name}\n\nTerima kasih atas kerja samanya!\nSalam hangat,\n${profile.name}`;
    window.open(`https://wa.me/${debtItem.debtorPhone}?text=${encodeURIComponent(text)}`, '_blank');
    showToast('Format pesan tagihan dibuka di WhatsApp!', 'success');
  };

  const handleSendEmailInvoice = (debtItem: DebtReceivable) => {
    if (!debtItem.debtorEmail) {
      showToast('Alamat email belum terdaftar', 'warning');
      return;
    }
    const sisa = debtItem.amount - debtItem.amountPaid;
    const subject = `[INVOICE] Tagihan ${debtItem.invoiceNumber} - ${debtItem.description}`;
    const body = `Halo ${debtItem.debtorName},\n\nBerikut kami sampaikan pengingat pembayaran tagihan resmi ${debtItem.invoiceNumber}.\n\nDeskripsi: ${debtItem.description}\nTotal: Rp ${debtItem.amount.toLocaleString('id-ID')}\nSudah Dibayar: Rp ${debtItem.amountPaid.toLocaleString('id-ID')}\nSisa Pembayaran: Rp ${sisa.toLocaleString('id-ID')}\nJatuh Tempo: ${debtItem.dueDate}\n\nInstruksi Pembayaran:\n${profile.bankAccountDetails || 'Bank BCA: 8830129841 a/n ' + profile.name}\n\nTerima kasih.\n${profile.name}`;
    window.location.href = `mailto:${debtItem.debtorEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleDownloadInvoicePDF = (debtItem: DebtReceivable) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;

      // Header Banner
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('FAKTUR PENAGIHAN RESMI (INVOICE)', margin, 18);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text(`Nomor Dokumen: ${debtItem.invoiceNumber} • Diterbitkan: ${debtItem.issuedDate}`, margin, 26);

      let y = 48;
      // Debtor Info
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('DITUJUKAN KEPADA:', margin, y);
      doc.text('INFORMASI PENAGIH:', pageWidth / 2 + 10, y);

      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(debtItem.debtorName, margin, y);
      doc.text(profile.name, pageWidth / 2 + 10, y);

      y += 5;
      if (debtItem.debtorPhone) doc.text(`WhatsApp: +${debtItem.debtorPhone}`, margin, y);
      doc.text(profile.title || 'Personal Dashboard User', pageWidth / 2 + 10, y);

      y += 12;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text('DESKRIPSI TAGIHAN / LAYANAN', margin + 4, y + 5.5);
      doc.text('TOTAL', pageWidth - margin - 25, y + 5.5, { align: 'right' });

      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(debtItem.description, margin + 4, y);
      doc.text(`Rp ${debtItem.amount.toLocaleString('id-ID')}`, pageWidth - margin - 25, y, { align: 'right' });

      y += 16;
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Totals
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Sudah Dibayarkan (DP):', pageWidth - margin - 70, y);
      doc.text(`Rp ${debtItem.amountPaid.toLocaleString('id-ID')}`, pageWidth - margin - 25, y, { align: 'right' });

      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(225, 29, 72);
      doc.text('SISA PEMBAYARAN:', pageWidth - margin - 70, y);
      doc.text(`Rp ${(debtItem.amount - debtItem.amountPaid).toLocaleString('id-ID')}`, pageWidth - margin - 25, y, { align: 'right' });

      y += 16;
      // Payment instructions
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - margin * 2, 24, 'F');
      doc.rect(margin, y, pageWidth - margin * 2, 24, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(79, 70, 229);
      doc.text('INSTRUKSI REKENING PEMBAYARAN:', margin + 4, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(profile.bankAccountDetails || 'Bank BCA: 8830129841 a/n ' + profile.name, margin + 4, y + 14);
      doc.text(`Batas Akhir Pelunasan: ${debtItem.dueDate}`, margin + 4, y + 20);

      doc.save(`Invoice_${debtItem.invoiceNumber}_${debtItem.debtorName.replace(/\s+/g, '_')}.pdf`);
      showToast('Invoice PDF berhasil diunduh!', 'success');
    } catch {
      showToast('Gagal mencetak PDF invoice', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Module Title & Subtab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Personal Finance & Multi-Account Hub
            </h2>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Kelola saldo bank & e-wallet, catat hutang timbul dari transaksi, dan lakukan cek harian saldo riil vs sistem.
          </p>
        </div>

        {/* Action Button: Catat Transaksi Baru */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddingTx(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Transaksi</span>
          </button>
        </div>
      </div>

      {/* Subtab Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'overview'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Arus Kas</span>
        </button>

        <button
          onClick={() => setActiveSubTab('accounts')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'accounts'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-indigo-500" />
          <span>Akun & Saldo Awal ({accounts.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('coa');
            setSelectedAccountForLedger(null);
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'coa'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
          <span>Bagan Akun (COA & Jurnal)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('my-debts')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'my-debts'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 text-rose-500" />
          <span>Hutang Saya ({myDebts.filter(d => d.status !== 'paid').length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('daily-audit')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'daily-audit'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-emerald-500" />
          <span>Cek Harian & Opname</span>
        </button>

        <button
          onClick={() => setActiveSubTab('debts')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'debts'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5 text-amber-500" />
          <span>Piutang Orang ({debts.filter(d => d.status !== 'paid').length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('invoice')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'invoice'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Share2 className="w-3.5 h-3.5 text-blue-500" />
          <span>Invoice WA & Email</span>
        </button>

        <button
          onClick={() => setActiveSubTab('reports')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'reports'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <CalendarCheck className="w-3.5 h-3.5 text-purple-500" />
          <span>Laporan P&L & Overbudget</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* SUBTAB 1: OVERVIEW & ARUS KAS                            */}
      {/* ========================================================= */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Hero KPI Cards: Saldo Terpadu, Bank, E-Wallet, Cash, Hutang Saya, Piutang */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Saldo Terpadu */}
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold">
                <span>Total Saldo Terpadu</span>
                <Wallet className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                {profile.currencySymbol} {totalCombinedBalance.toLocaleString('id-ID')}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono pt-1">
                <span>Kekayaan Bersih: {profile.currencySymbol} {netWorth.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Card 2: Saldo Bank & E-Wallet */}
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold">
                <span>Saldo Rekening & Dompet</span>
                <Building2 className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Bank ({accounts.filter(a => a.type === 'bank').length}):</span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">
                    Rp {totalBankBalance.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">E-Wallet ({accounts.filter(a => a.type === 'ewallet').length}):</span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">
                    Rp {totalEwalletBalance.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Uang Tunai:</span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">
                    Rp {totalCashBalance.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Hutang Saya (Kewajiban) */}
            <div 
              onClick={() => setActiveSubTab('my-debts')}
              className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1 cursor-pointer hover:border-rose-400 transition-colors"
            >
              <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold">
                <span>Hutang Saya (Kewajiban)</span>
                <CreditCard className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                Rp {totalMyDebtsUnpaid.toLocaleString('id-ID')}
              </p>
              <p className="text-[11px] text-neutral-400">
                {myDebts.filter(d => d.status !== 'paid').length} tagihan kredit / PayLater aktif
              </p>
            </div>

            {/* Card 4: Piutang Orang Lain */}
            <div 
              onClick={() => setActiveSubTab('debts')}
              className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1 cursor-pointer hover:border-amber-400 transition-colors"
            >
              <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold">
                <span>Piutang Orang Lain</span>
                <ArrowDownLeft className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                Rp {totalReceivables.toLocaleString('id-ID')}
              </p>
              <p className="text-[11px] text-neutral-400">
                {debts.filter(d => d.status !== 'paid').length} orang · Siap ditagih via WA
              </p>
            </div>
          </div>

          {/* Transactions Filter & Table */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-neutral-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                  Buku Kas & Riwayat Transaksi ({filteredTransactions.length})
                </h3>
              </div>

              {/* Filter Row */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Account filter */}
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 font-semibold"
                >
                  <option value="all">Semua Akun / Dompet</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.type.toUpperCase()})</option>
                  ))}
                </select>

                {/* Type filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 font-semibold"
                >
                  <option value="all">Semua Tipe</option>
                  <option value="income">Pemasukan Saja</option>
                  <option value="expense">Pengeluaran Saja</option>
                </select>
              </div>
            </div>

            {/* Transaction List */}
            {filteredTransactions.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 space-y-2">
                <Receipt className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs">Belum ada transaksi pada filter ini.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((tx) => {
                  const isIncome = tx.type === 'income';

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isIncome 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}>
                          {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                            {tx.title}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-neutral-200/60 dark:bg-neutral-700/60 text-neutral-700 dark:text-neutral-300 font-medium">
                              {tx.accountName || (tx.walletType === 'cash' ? 'Dompet Tunai' : 'Non-Cash')}
                            </span>
                            <span>•</span>
                            <span>{tx.category}</span>
                            <span>•</span>
                            <span className="font-mono">{tx.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-bold font-mono tabular-nums ${
                          isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-neutral-100'
                        }`}>
                          {isIncome ? '+' : '-'}{profile.currencySymbol} {tx.amount.toLocaleString('id-ID')}
                        </span>

                        <button
                          onClick={() => deleteTransaction(tx.id)}
                          className="p-1 rounded text-neutral-400 hover:text-rose-500 cursor-pointer"
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 2: KELOLA AKUN & SALDO AWAL (REQUESTED)             */}
      {/* ========================================================= */}
      {activeSubTab === 'accounts' && (
        selectedAccountForLedger ? (
          <AccountLedgerView
            account={selectedAccountForLedger}
            allAccounts={accounts}
            allTransactions={transactions}
            allCoaList={allCoaList}
            currencySymbol={profile.currencySymbol}
            onBack={() => setSelectedAccountForLedger(null)}
            onSelectAccount={(acc) => setSelectedAccountForLedger(acc)}
            onAddTransactionForAccount={(accId) => {
              setTxAccountId(accId);
              setIsAddingTx(true);
            }}
            onEditInitialBalance={(acc) => {
              setEditingAcc(acc);
              setEditBalanceInput(String(acc.initialBalance));
            }}
            onDeleteTransaction={deleteTransaction}
            onNavigateToCoa={() => {
              setSelectedAccountForLedger(null);
              setActiveSubTab('coa');
            }}
            onOpenTransfer={(sourceId, type) => {
              setTransferInitialSourceId(sourceId);
              setTransferInitialType(type);
              setIsTransferModalOpen(true);
            }}
          />
        ) : (
          <div className="space-y-6">
            {/* Header Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-500" />
                  <span>Manajemen Rekening Bank, E-Wallet & Kas Fisik</span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Klik kartu akun untuk melihat <strong>buku pembantu rekening & mutasi transaksi</strong> akun tersebut. Saldo awal dapat diatur langsung atau via CSV.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setTransferInitialSourceId(undefined);
                    setTransferInitialType('cash_withdrawal');
                    setIsTransferModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 shadow-xs cursor-pointer transition-all hover:scale-102"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Transfer / Tarik Tunai</span>
                </button>

                <button
                  onClick={() => setIsUploadBalanceOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Saldo Awal (CSV)</span>
                </button>

                <button
                  onClick={() => setIsAddingAccount(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Akun Baru</span>
                </button>
              </div>
            </div>

            {/* 3 Categories Grid: Bank, E-Wallet, Cash */}
            {(['bank', 'ewallet', 'cash'] as AccountType[]).map((type) => {
              const typeAccounts = accounts.filter(a => a.type === type);
              const typeTitle = type === 'bank' ? 'Rekening Bank' : type === 'ewallet' ? 'E-Wallet (Digital Wallet)' : 'Uang Tunai / Kas Fisik';
              const TypeIcon = type === 'bank' ? Building2 : type === 'ewallet' ? Smartphone : Coins;
              const typeTotal = typeAccounts.reduce((s, a) => s + (accountBalances[a.id]?.currentBalance || 0), 0);

              return (
                <div key={type} className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      <TypeIcon className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                        {typeTitle} ({typeAccounts.length})
                      </h4>
                    </div>
                    <div className="text-xs font-bold font-mono text-neutral-800 dark:text-neutral-200">
                      Total: Rp {typeTotal.toLocaleString('id-ID')}
                    </div>
                  </div>

                  {typeAccounts.length === 0 ? (
                    <p className="text-xs text-neutral-400 py-4 text-center">
                      Belum ada akun terdaftar pada kategori ini. Klik "+ Tambah Akun Baru" di atas.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {typeAccounts.map((acc) => {
                        const data = accountBalances[acc.id] || { initialBalance: acc.initialBalance, totalIncome: 0, totalExpense: 0, currentBalance: acc.initialBalance };

                        return (
                          <div
                            key={acc.id}
                            onClick={() => setSelectedAccountForLedger(acc)}
                            className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 space-y-3 relative group hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                  {acc.name}
                                </p>
                                {acc.accountNumber && (
                                  <p className="text-[11px] font-mono text-neutral-400">
                                    {acc.accountNumber}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => {
                                    setEditingAcc(acc);
                                    setEditBalanceInput(String(acc.initialBalance));
                                  }}
                                  className="p-1 rounded text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                                  title="Ubah Saldo Awal"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteAccount(acc.id)}
                                  className="p-1 rounded text-neutral-400 hover:text-rose-500 cursor-pointer"
                                  title="Hapus Akun"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Balance Display */}
                            <div className="pt-1">
                              <span className="text-[10px] text-neutral-400 uppercase font-semibold">
                                Saldo Berjalan
                              </span>
                              <p className="text-lg font-bold font-mono text-neutral-900 dark:text-neutral-100 tabular-nums">
                                Rp {data.currentBalance.toLocaleString('id-ID')}
                              </p>
                            </div>

                            {/* Initial Balance & Flow Details */}
                            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 text-[11px] space-y-1 font-mono">
                              <div className="flex justify-between text-neutral-500">
                                <span>Saldo Awal:</span>
                                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                                  Rp {data.initialBalance.toLocaleString('id-ID')}
                                </span>
                              </div>
                              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                <span>Total Masuk:</span>
                                <span>+Rp {data.totalIncome.toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex justify-between text-rose-500">
                                <span>Total Keluar:</span>
                                <span>-Rp {data.totalExpense.toLocaleString('id-ID')}</span>
                              </div>
                            </div>

                            {/* Clickable Ledger Hint */}
                            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline">
                              <span>Lihat Mutasi Transaksi</span>
                              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ========================================================= */}
      {/* SUBTAB: BAGAN AKUN STANDAR AKUNTANSI (CHART OF ACCOUNTS)  */}
      {/* ========================================================= */}
      {activeSubTab === 'coa' && (
        <ChartOfAccountsView
          allCoaList={allCoaList}
          journalEntries={standardJournalEntries}
          coaLedgers={coaLedgers}
          accountingSummary={accountingSummary}
          currencySymbol={profile.currencySymbol}
          accounts={accounts}
          onOpenAccountLedger={(acc) => {
            setSelectedAccountForLedger(acc);
            setActiveSubTab('accounts');
          }}
        />
      )}

      {/* ========================================================= */}
      {/* SUBTAB 3: HUTANG SAYA (KEWAJIBAN / PAYABLES) (REQUESTED)    */}
      {/* ========================================================= */}
      {activeSubTab === 'my-debts' && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-rose-500" />
                <span>Pencatatan Hutang Saya (Kewajiban & Cicilan)</span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Catat hutang yang timbul dari transaksi belanja kredit, PayLater, atau pinjaman pribadi, dan bayar cicilan dengan otomatis memotong saldo akun Anda.
              </p>
            </div>

            <button
              onClick={() => setIsAddingMyDebt(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Hutang Baru</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <span className="text-xs text-neutral-500">Sisa Kewajiban Hutang</span>
              <p className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                Rp {totalMyDebtsUnpaid.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <span className="text-xs text-neutral-500">Sudah Dibayar / Dicicil</span>
              <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                Rp {totalMyDebtsPaid.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <span className="text-xs text-neutral-500">Total Komitmen Hutang</span>
              <p className="text-xl font-bold font-mono text-neutral-800 dark:text-neutral-200 mt-1">
                Rp {(totalMyDebtsUnpaid + totalMyDebtsPaid).toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Debt List */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                Daftar Tagihan Hutang Saya ({myDebts.length})
              </h4>
            </div>

            {myDebts.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 space-y-2">
                <CreditCard className="w-8 h-8 mx-auto opacity-40 text-rose-500" />
                <p className="text-xs">Tidak ada catatan hutang aktif. Keuangan Anda bebas hutang!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myDebts.map((debt) => {
                  const sisaHutang = debt.amount - debt.amountPaid;
                  const isPaid = debt.status === 'paid';
                  const percentPaid = Math.round((debt.amountPaid / debt.amount) * 100);

                  return (
                    <div
                      key={debt.id}
                      className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                              {debt.creditorName}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                              isPaid 
                                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' 
                                : debt.status === 'partial'
                                ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                                : 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                            }`}>
                              {isPaid ? 'Lunas' : debt.status === 'partial' ? 'Cicilan Sebagian' : 'Belum Lunas'}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {debt.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isPaid && (
                            <button
                              onClick={() => {
                                setPayingMyDebt(debt);
                                setMyDebtPayAmount(String(sisaHutang));
                              }}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                            >
                              Bayar / Cicil
                            </button>
                          )}
                          <button
                            onClick={() => deleteMyDebt(debt.id)}
                            className="p-1 rounded text-neutral-400 hover:text-rose-500 cursor-pointer"
                            title="Hapus Hutang"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] font-mono text-neutral-500 mb-1">
                          <span>Terbayar: Rp {debt.amountPaid.toLocaleString('id-ID')} ({percentPaid}%)</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            Sisa: Rp {sisaHutang.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                          <div 
                            className={`h-full transition-all ${isPaid ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: `${percentPaid}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono pt-1">
                        <span>Jatuh Tempo: {debt.dueDate}</span>
                        <span>Dicatat: {debt.issuedDate}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 4: CEK HARIAN & REKONSILIASI SALDO (REQUESTED)      */}
      {/* ========================================================= */}
      {activeSubTab === 'daily-audit' && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-500" />
                <span>Cek Harian & Opname Saldo Riil vs Sistem</span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Bandingkan saldo yang ada di rekening bank, m-banking, e-wallet, dan dompet fisik Anda hari ini dengan kalkulasi sistem OmniHub.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Tanggal Cek:
              </label>
              <input
                type="date"
                value={auditDate}
                onChange={(e) => setAuditDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
              />
            </div>
          </div>

          {/* Audit Verification Table */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                Verifikasi Saldo per Akun ({auditDate})
              </span>
              <span className="text-xs text-neutral-400">
                Ketik saldo riil dari aplikasi bank/dompet Anda di kolom bawah
              </span>
            </div>

            <div className="space-y-3">
              {accounts.map((acc) => {
                const sysBal = accountBalances[acc.id]?.currentBalance || 0;
                const rawActual = actualBalancesInput[acc.id];
                const actBal = rawActual !== undefined ? (parseFloat(rawActual.replace(/[^0-9.-]/g, '')) || 0) : sysBal;
                const diff = actBal - sysBal;
                const isMatch = diff === 0;

                return (
                  <div
                    key={acc.id}
                    className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          {acc.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-neutral-700 uppercase font-mono">
                          {acc.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                        Saldo Sistem: <span className="font-bold text-neutral-700 dark:text-neutral-300">Rp {sysBal.toLocaleString('id-ID')}</span>
                      </p>
                    </div>

                    {/* Actual input */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-neutral-500 whitespace-nowrap">
                        Saldo Riil Anda:
                      </label>
                      <div className="flex items-center">
                        <span className="text-xs font-mono text-neutral-400 mr-1.5">Rp</span>
                        <input
                          type="text"
                          placeholder={sysBal.toLocaleString('id-ID')}
                          value={rawActual !== undefined ? rawActual : ''}
                          onChange={(e) => {
                            setActualBalancesInput(prev => ({
                              ...prev,
                              [acc.id]: e.target.value
                            }));
                          }}
                          className="w-36 px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-mono font-bold"
                        />
                      </div>
                    </div>

                    {/* Difference Indicator & Auto-Reconcile Button */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold font-mono px-2.5 py-1 rounded-lg ${
                          isMatch 
                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' 
                            : diff > 0 
                            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' 
                            : 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                        }`}>
                          {isMatch ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                          <span>
                            {isMatch ? 'Cocok (Rp 0)' : `${diff > 0 ? '+' : ''}Rp ${diff.toLocaleString('id-ID')}`}
                          </span>
                        </span>
                      </div>

                      {!isMatch && (
                        <button
                          type="button"
                          onClick={() => {
                            autoReconcileDifference({
                              accountId: acc.id,
                              accountName: acc.name,
                              accountType: acc.type,
                              systemBalance: sysBal,
                              actualBalance: actBal,
                              difference: diff
                            }, auditDate);
                          }}
                          className="px-2.5 py-1 text-[11px] rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold whitespace-nowrap cursor-pointer"
                        >
                          Sesuaikan Otomatis
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Submit */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <span className="text-xs text-neutral-400">
                Pengecekan harian memastikan tidak ada nota atau pengeluaran tunai yang lupa dicatat.
              </span>
              <button
                onClick={handleSaveDailyAudit}
                className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold text-xs shadow-md hover:bg-neutral-800 cursor-pointer"
              >
                Simpan Hasil Cek Harian Ini
              </button>
            </div>
          </div>

          {/* Audit History Log */}
          {dailyAudits.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                Riwayat Pengecekan Saldo Sebelumnya
              </h4>

              <div className="space-y-2">
                {dailyAudits.map((record) => (
                  <div
                    key={record.id}
                    className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">{record.date}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        record.isBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {record.isBalanced ? '✓ 100% Cocok' : `Selisih Rp ${Math.abs(record.totalDifference).toLocaleString('id-ID')}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-neutral-400">
                        Total Riil: Rp {record.totalActualBalance.toLocaleString('id-ID')}
                      </span>
                      <button
                        onClick={() => deleteDailyAudit(record.id)}
                        className="text-neutral-400 hover:text-rose-500"
                        title="Hapus Log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 5: PIUTANG ORANG LAIN KE SAYA (EXISTING)           */}
      {/* ========================================================= */}
      {activeSubTab === 'debts' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-amber-500" />
                <span>Piutang Orang Lain ke Saya</span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Catat piutang dari rekan atau klien, pantau pelunasan, dan buat faktur resmi siap kirim ke WhatsApp.
              </p>
            </div>

            <button
              onClick={() => setIsAddingDebt(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Piutang Baru</span>
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
              Daftar Piutang ({debts.length})
            </h4>

            {debts.length === 0 ? (
              <p className="text-xs text-neutral-400 py-8 text-center">Belum ada catatan piutang.</p>
            ) : (
              <div className="space-y-3">
                {debts.map((d) => {
                  const sisa = d.amount - d.amountPaid;
                  const isPaid = d.status === 'paid';

                  return (
                    <div
                      key={d.id}
                      className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{d.debtorName}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                            isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {isPaid ? 'Lunas' : 'Belum Lunas'}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">{d.description}</p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400 font-mono mt-1">
                          <span>Invoice: {d.invoiceNumber}</span>
                          <span>•</span>
                          <span>Jatuh Tempo: {d.dueDate}</span>
                          {d.sourceAccountName && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-sans font-medium">
                                <span>Sumber: {d.sourceAccountName}</span>
                                {d.deductFromAccount && <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded font-semibold text-indigo-600 dark:text-indigo-300">(Saldo Dipotong)</span>}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono">
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                            Sisa: Rp {sisa.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            Total: Rp {d.amount.toLocaleString('id-ID')}
                          </span>
                        </div>

                        {!isPaid && (
                          <button
                            onClick={() => {
                              setPayingDebt(d);
                              setPaymentInput(String(sisa));
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                          >
                            Catat Bayar
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSelectedInvoiceDebt(d);
                            setActiveSubTab('invoice');
                          }}
                          className="px-2.5 py-1.5 rounded-lg border text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                        >
                          Faktur
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 6: FAKTUR PENAGIHAN & WHATSAPP (EXISTING)          */}
      {/* ========================================================= */}
      {activeSubTab === 'invoice' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-blue-500" />
              <span>Generator Faktur Penagihan & Kirim Tagihan</span>
            </h3>

            {/* Select Debtor */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Pilih Debitur / Piutang:
              </label>
              <select
                value={selectedInvoiceDebt?.id || ''}
                onChange={(e) => {
                  const found = debts.find(d => d.id === e.target.value);
                  if (found) setSelectedInvoiceDebt(found);
                }}
                className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border text-xs font-semibold"
              >
                {debts.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.debtorName} - {d.invoiceNumber} (Sisa: Rp {(d.amount - d.amountPaid).toLocaleString('id-ID')})
                  </option>
                ))}
              </select>
            </div>

            {selectedInvoiceDebt ? (
              <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-700">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-indigo-500 uppercase">{selectedInvoiceDebt.invoiceNumber}</span>
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{selectedInvoiceDebt.debtorName}</h4>
                    <p className="text-xs text-neutral-500">{selectedInvoiceDebt.description}</p>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-xs text-neutral-400">Sisa Tagihan</span>
                    <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                      Rp {(selectedInvoiceDebt.amount - selectedInvoiceDebt.amountPaid).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                {/* Dispatch Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => handleSendWhatsAppInvoice(selectedInvoiceDebt)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Tagihan via WhatsApp</span>
                  </button>

                  <button
                    onClick={() => handleSendEmailInvoice(selectedInvoiceDebt)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Kirim via Email</span>
                  </button>

                  <button
                    onClick={() => handleDownloadInvoicePDF(selectedInvoiceDebt)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF Invoice</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 py-6 text-center">Pilih piutang terlebih dahulu.</p>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 7: LAPORAN BULANAN & P&L (EXISTING)                */}
      {/* ========================================================= */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-purple-500" />
                <span>Laporan Bulanan Profit & Loss (P&L)</span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Evaluasi laba/rugi bulanan dan deteksi otomatis pengeluaran yang melebihi batas anggaran (overbudget).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-neutral-500">Pilih Bulan:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold border border-neutral-300 dark:border-neutral-700"
              />
            </div>
          </div>

          {/* P&L Hero Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <span className="text-xs text-neutral-500 font-semibold">Total Pemasukan Bulan Ini</span>
              <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                +Rp {monthlyIncome.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <span className="text-xs text-neutral-500 font-semibold">Total Pengeluaran Bulan Ini</span>
              <p className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                -Rp {monthlyExpense.toLocaleString('id-ID')}
              </p>
            </div>
            <div className={`p-5 rounded-2xl border ${isProfit ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200' : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200'}`}>
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Status Laba / Rugi (P&L)
              </span>
              <p className={`text-xl font-bold font-mono mt-1 ${isProfit ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                {isProfit ? 'SURPLUS' : 'DEFISIT'}: Rp {Math.abs(monthlyProfitLoss).toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Overbudget Categories Breakdown */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
              Evaluasi Anggaran per Kategori (Deteksi Overbudget)
            </h4>

            <div className="space-y-3">
              {categoryBudgets.map((b) => {
                const spent = monthlyCategoryExpenses[b.category] || 0;
                const isOver = spent > b.limit;
                const percent = Math.min(100, Math.round((spent / b.limit) * 100));

                return (
                  <div key={b.category} className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900 dark:text-neutral-100">{b.category}</span>
                        {isOver && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 font-mono">
                            OVERBUDGET (+Rp {(spent - b.limit).toLocaleString('id-ID')})
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-neutral-600 dark:text-neutral-400">
                        Rp {spent.toLocaleString('id-ID')} / Rp {b.limit.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                      <div
                        className={`h-full ${isOver ? 'bg-rose-500' : 'bg-indigo-500'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 8: JURNAL AKUNTANSI, LEDGER & TRIAL BALANCE        */}
      {/* ========================================================= */}
      {activeSubTab === 'accounting' && (
        <AccountingView />
      )}

      {/* ========================================================= */}
      {/* MODAL: CATAT TRANSAKSI (DENGAN OPSI TIMBUL HUTANG)        */}
      {/* ========================================================= */}
      {isAddingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Catat Transaksi Baru
              </h3>
              <button onClick={() => setIsAddingTx(false)} className="p-1 rounded text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4">
              {/* Type Switch */}
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTxType('expense')}
                  className={`py-2 rounded-xl border text-center transition-all ${
                    txType === 'expense' ? 'border-rose-500 bg-rose-50/40 text-rose-600 font-bold' : 'border-neutral-200 text-neutral-500'
                  }`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxType('income');
                    setIsCreditDebt(false);
                  }}
                  className={`py-2 rounded-xl border text-center transition-all ${
                    txType === 'income' ? 'border-emerald-500 bg-emerald-50/40 text-emerald-600 font-bold' : 'border-neutral-200 text-neutral-500'
                  }`}
                >
                  Pemasukan
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Deskripsi / Judul
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Belanja Meja Kerja, Makan Siang..."
                  value={txTitle}
                  onChange={(e) => setTxTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Nominal (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="150000"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Pilih Akun / Dompet
                  </label>
                  <select
                    value={txAccountId}
                    onChange={(e) => setTxAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border text-xs font-semibold"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Kategori
                  </label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border text-xs font-semibold"
                  >
                    <option value="Food & Dining">Food & Dining</option>
                    <option value="Work & Software">Work & Software</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Transport">Transport</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Salary">Salary / Gaji</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Cicilan & Hutang">Cicilan & Hutang</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Toggle: Beli dengan Hutang / PayLater / Kredit */}
              {txType === 'expense' && (
                <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCreditDebt}
                      onChange={(e) => setIsCreditDebt(e.target.checked)}
                      className="rounded accent-rose-600"
                    />
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                      Timbul Hutang / Beli dengan PayLater / Kredit (Catat ke Hutang Saya)
                    </span>
                  </label>

                  {isCreditDebt && (
                    <div className="space-y-3 pt-2 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                          Nama Kreditur / PayLater
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: GoPay Later, SpayLater, Kartu Kredit Mandiri, Teman"
                          value={debtCreditorName}
                          onChange={(e) => setDebtCreditorName(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                            Jatuh Tempo Pembayaran
                          </label>
                          <input
                            type="date"
                            value={debtDueDateInput}
                            onChange={(e) => setDebtDueDateInput(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                            Uang Muka / DP Sekarang (Rp)
                          </label>
                          <input
                            type="number"
                            placeholder="0 (jika full kredit)"
                            value={debtDownPayment}
                            onChange={(e) => setDebtDownPayment(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingTx(false)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: TAMBAH AKUN BARU                                   */}
      {/* ========================================================= */}
      {isAddingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-500" />
                <span>Tambah Akun Keuangan Baru</span>
              </h3>
              <button onClick={() => setIsAddingAccount(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Nama Akun</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BCA Utama, Mandiri, GoPay, DANA, Dompet Tunai"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Tipe Akun</label>
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as AccountType)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border font-semibold"
                >
                  <option value="bank">Rekening Bank (BCA, Mandiri, BRI, dll)</option>
                  <option value="ewallet">E-Wallet (GoPay, OVO, DANA, ShopeePay)</option>
                  <option value="cash">Uang Tunai / Kas Fisik</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Saldo Awal (Rp)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={accInitialBalance}
                  onChange={(e) => setAccInitialBalance(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Nomor Rekening / No HP (Opsional)</label>
                <input
                  type="text"
                  placeholder="8830129841 atau 08123456789"
                  value={accNumber}
                  onChange={(e) => setAccNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingAccount(false)}
                  className="px-3 py-1.5 rounded-xl border"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: UPLOAD SALDO AWAL (CSV / TEXT)                     */}
      {/* ========================================================= */}
      {isUploadBalanceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Upload Saldo Awal (Bank, E-Wallet, Cash)
                </h3>
              </div>
              <button onClick={() => setIsUploadBalanceOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Format baris: <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">Nama Akun, Tipe (bank/ewallet/cash), No Rekening, Saldo Awal</code>
            </p>

            <form onSubmit={handleProcessCsvUpload} className="space-y-3">
              <textarea
                rows={6}
                value={csvUploadText}
                onChange={(e) => setCsvUploadText(e.target.value)}
                placeholder={`BCA Utama,bank,8830129841,18500000\nMandiri Payroll,bank,1370019283741,7200000\nGoPay,ewallet,081234567890,850000\nDANA,ewallet,081234567890,600000\nDompet Tunai,cash,,750000`}
                className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border text-xs font-mono leading-relaxed"
              />

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Contoh Template CSV</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadBalanceOpen(false)}
                    className="px-3 py-1.5 text-xs rounded-xl border"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!csvUploadText.trim()}
                    className="px-4 py-1.5 text-xs rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-40"
                  >
                    Terapkan Saldo Awal
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT SALDO AWAL AKUN                              */}
      {/* ========================================================= */}
      {editingAcc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Ubah Saldo Awal: {editingAcc.name}
            </h3>

            <form onSubmit={handleUpdateBalanceSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-500 mb-1">
                  Saldo Awal Baru (Rp)
                </label>
                <input
                  type="number"
                  required
                  value={editBalanceInput}
                  onChange={(e) => setEditBalanceInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border text-sm font-mono font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAcc(null)}
                  className="px-3 py-1.5 text-xs rounded-xl border"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CATAT HUTANG SAYA (MANUAL)                         */}
      {/* ========================================================= */}
      {isAddingMyDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-rose-500" />
                <span>Catat Hutang / Kewajiban Saya</span>
              </h3>
              <button onClick={() => setIsAddingMyDebt(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMyDebt} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Kreditur / Pihak Pemberi Hutang</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: GoPay Later, SpayLater, Bank Mandiri, Teman"
                  value={myDebtCreditor}
                  onChange={(e) => setMyDebtCreditor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Keperluan / Deskripsi Barang</label>
                <input
                  type="text"
                  placeholder="Contoh: Cicilan Laptop, Pinjaman Modal Kerja"
                  value={myDebtDesc}
                  onChange={(e) => setMyDebtDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Total Hutang (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="3500000"
                    value={myDebtAmount}
                    onChange={(e) => setMyDebtAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Jatuh Tempo</label>
                  <input
                    type="date"
                    value={myDebtDueDate}
                    onChange={(e) => setMyDebtDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingMyDebt(false)}
                  className="px-3 py-1.5 rounded-xl border"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  Simpan Hutang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: BAYAR / CICIL HUTANG SAYA (POTONG SALDO OTOMATIS)   */}
      {/* ========================================================= */}
      {payingMyDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Bayar Cicilan: {payingMyDebt.creditorName}
            </h3>

            <p className="text-xs text-neutral-500">
              Sisa hutang saat ini: <strong className="text-rose-600 font-mono">Rp {(payingMyDebt.amount - payingMyDebt.amountPaid).toLocaleString('id-ID')}</strong>
            </p>

            <form onSubmit={handlePayMyDebtSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Nominal yang Dibayarkan (Rp)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={payingMyDebt.amount - payingMyDebt.amountPaid}
                  value={myDebtPayAmount}
                  onChange={(e) => setMyDebtPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Bayar Menggunakan Akun:</label>
                <select
                  value={myDebtPaySourceAcc}
                  onChange={(e) => setMyDebtPaySourceAcc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border font-semibold"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Saldo: Rp {(accountBalances[acc.id]?.currentBalance || 0).toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Saldo akun ini akan otomatis berkurang senilai pembayaran.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingMyDebt(null)}
                  className="px-3 py-1.5 rounded-xl border"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  Bayar Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: TAMBAH PIUTANG BARU                                */}
      {/* ========================================================= */}
      {isAddingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-amber-500" />
                <span>Catat Piutang Baru (Orang Hutang ke Saya)</span>
              </h3>
              <button onClick={() => setIsAddingDebt(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDebt} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Nama Debitur / Peminjam</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso, CV Maju Jaya"
                  value={debtorName}
                  onChange={(e) => setDebtorName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Nomor WhatsApp</label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={debtorPhone}
                    onChange={(e) => setDebtorPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Email (Opsional)</label>
                  <input
                    type="email"
                    placeholder="nama@email.com"
                    value={debtorEmail}
                    onChange={(e) => setDebtorEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Deskripsi Layanan / Pinjaman</label>
                <input
                  type="text"
                  placeholder="Contoh: Pembuatan Desain UI/UX & Website"
                  value={debtDesc}
                  onChange={(e) => setDebtDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="3000000"
                    value={debtAmount}
                    onChange={(e) => setDebtAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Jatuh Tempo</label>
                  <input
                    type="date"
                    value={debtDueDate}
                    onChange={(e) => setDebtDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border"
                  />
                </div>
              </div>

              {/* Pilihan Mau Mengurangi Saldo Akun yang Mana */}
              <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={debtDeductAccount}
                    onChange={(e) => setDebtDeductAccount(e.target.checked)}
                    className="rounded accent-indigo-600"
                  />
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    Kurangi Saldo Rekening / Dompet (Uang Keluar)
                  </span>
                </label>

                {debtDeductAccount ? (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                      Pilih Akun yang Dikurangi Saldonya:
                    </label>
                    <select
                      value={debtSourceAccountId}
                      onChange={(e) => setDebtSourceAccountId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border text-xs font-semibold text-neutral-900 dark:text-neutral-100"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.type === 'bank' ? '🏦' : acc.type === 'ewallet' ? '📱' : '💵'} {acc.name} (Saldo: Rp {(accountBalances[acc.id]?.currentBalance || 0).toLocaleString('id-ID')})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
                      Saldo akun ini akan otomatis berkurang senilai nominal piutang dan dicatat sebagai pengeluaran transaksi terkait.
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    Piutang dicatat tanpa memotong saldo akun (misal piutang tagihan jasa/invoice yang belum dibayarkan klien).
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingDebt(false)}
                  className="px-3 py-1.5 rounded-xl border"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold"
                >
                  Simpan Piutang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CATAT BAYAR PIUTANG                                */}
      {/* ========================================================= */}
      {payingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Catat Pembayaran dari {payingDebt.debtorName}
            </h3>

            <p className="text-xs text-neutral-500">
              Sisa piutang: <strong className="font-mono text-emerald-600">Rp {(payingDebt.amount - payingDebt.amountPaid).toLocaleString('id-ID')}</strong>
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-500 mb-1">
                  Nominal yang Dibayarkan (Rp)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={payingDebt.amount - payingDebt.amountPaid}
                  value={paymentInput}
                  onChange={(e) => setPaymentInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Terima Pembayaran ke Akun:
                </label>
                <select
                  value={debtRepaymentDestAccountId}
                  onChange={(e) => setDebtRepaymentDestAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border text-xs font-semibold"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.type === 'bank' ? '🏦' : acc.type === 'ewallet' ? '📱' : '💵'} {acc.name} (Saldo: Rp {(accountBalances[acc.id]?.currentBalance || 0).toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Saldo akun ini akan otomatis bertambah senilai pembayaran yang diterima.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingDebt(null)}
                  className="px-3 py-1.5 text-xs rounded-xl border"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  Simpan Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Antar Akun & Tarik Tunai Modal */}
      <AccountTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        defaultSourceAccountId={transferInitialSourceId}
        defaultType={transferInitialType}
      />
    </div>
  );
};
