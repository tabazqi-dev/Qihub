import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { useApp } from '../../context/AppContext';
import { compressImageDataUrl } from '../../utils/imageCompress';
import { getDebtLineItems } from '../../utils/debtItems';
import {
  FinanceTransaction,
  DebtReceivable,
  DebtLineItem,
  MyDebtLiability,
  FinancialAccount,
  WalletType,
  AccountType,
  TransferType
} from '../../types';
import {
  getAllChartOfAccounts,
  getCoaForFinancialAccount,
  getCoaForCategory,
  getEffectiveContraCoaForTransaction,
  normalizeCoaCode,
  generateStandardJournalEntries,
  calculateCoaLedgers,
  getAccountingEquationSummary,
  isTransactionIncludedInLedger,
  isContraVoidTransaction,
  formatVoidReason
} from '../../utils/accounting';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Trash2,
  Download,
  CreditCard,
  Send,
  AlertTriangle,
  Building2,
  Smartphone,
  Coins,
  Upload,
  Edit2,
  X,
  Receipt,
  BookOpen,
  ChevronRight,
  ArrowLeftRight,
  Ban,
  SlidersHorizontal,
  QrCode,
  Share2,
  Copy,
  Image as ImageIcon
} from 'lucide-react';
import { AccountLedgerView } from './AccountLedgerView';
import { ChartOfAccountsView } from './ChartOfAccountsView';
import { AccountTransferModal } from './AccountTransferModal';

type FinanceSubTab = 'overview' | 'accounts' | 'general-ledger' | 'my-debts' | 'debts';

const EXPENSE_CATEGORY_OPTIONS = [
  'Makan & Minum Harian',
  'Tempat Tinggal & Utilitas',
  'Transportasi & BBM',
  'Komunikasi & Langganan Dasar',
  'Kesehatan & Obat-obatan',
  'Jajan, Kopi & Makan di Luar',
  'Belanja Pribadi & Penampilan',
  'Hiburan, Hobi & Liburan',
  'Beban Bunga Pinjaman',
  'Biaya Admin Bank & Transfer',
  'Pajak Pribadi',
  'Premi Asuransi',
  'Zakat, Infak, Sedekah & Donasi',
  'Hadiah & Acara Keluarga',
  'Pendidikan & Pengembangan Diri',
  'Cicilan & Hutang',
];

const INCOME_CATEGORY_OPTIONS = [
  'Gaji & Tunjangan Tetap',
  'Bonus, THR & Insentif',
  'Pendapatan Freelance / Sampingan',
  'Bunga Tabungan & Deposito',
  'Dividen & Capital Gain',
  'Pendapatan Sewa',
  'Hadiah, Hibah & Cashback',
  'Pelunasan Piutang',
];

const parseCurrencyInput = (raw: string): number => {
  const digits = raw.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

const formatCurrencyInput = (raw: string): string => {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('id-ID');
};

const getOffsetDateStr = (daysAgo = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

export const FinanceTrackerView: React.FC = () => {
  const {
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
    importAccountsFromCSV,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    voidTransaction,
    addCoaAdjustment,
    customCoaAccounts,
    upsertCoaAccount,
    deleteCustomCoaAccount,
    debts,
    addDebt,
    updateDebt,
    deleteDebt,
    recordDebtPayment,
    increaseDebtAmount,
    myDebts,
    addMyDebt,
    deleteMyDebt,
    payMyDebt,
    categoryBudgets,
    updateCategoryBudget,
    profile,
    appBranding,
    showToast
  } = useApp();

  // Active top subtab
  const [activeSubTab, setActiveSubTab] = useState<FinanceSubTab>('overview');

  // Filter for transactions
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [showVoidedTx, setShowVoidedTx] = useState(true);

  // Void Modal State
  const [voidingTx, setVoidingTx] = useState<FinanceTransaction | null>(null);
  const [voidReasonInput, setVoidReasonInput] = useState('');

  // ================= TRANSACTION MODAL STATE =================
  const [isAddingTx, setIsAddingTx] = useState(false);
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('Makan & Minum Harian');
  const [txCoaCode, setTxCoaCode] = useState('');
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
  const [accCoaCode, setAccCoaCode] = useState('');
  const [accNotes, setAccNotes] = useState('');

  // Upload Saldo Awal Modal
  const [isUploadBalanceOpen, setIsUploadBalanceOpen] = useState(false);
  const [csvUploadText, setCsvUploadText] = useState('');

  // Edit Account & Initial Balance Modal
  const [editingAcc, setEditingAcc] = useState<FinancialAccount | null>(null);
  const [editAccNameInput, setEditAccNameInput] = useState('');
  const [editAccNumberInput, setEditAccNumberInput] = useState('');
  const [editBalanceInput, setEditBalanceInput] = useState('');
  const [editAccCoaCode, setEditAccCoaCode] = useState('');
  const [editAccNotesInput, setEditAccNotesInput] = useState('');

  // ================= MY DEBTS (HUTANG SAYA) MODAL STATE =================
  const [isAddingMyDebt, setIsAddingMyDebt] = useState(false);
  const [myDebtCreditor, setMyDebtCreditor] = useState('');
  const [myDebtDesc, setMyDebtDesc] = useState('');
  const [myDebtAmount, setMyDebtAmount] = useState('');
  const [myDebtIssuedDate, setMyDebtIssuedDate] = useState(() => getOffsetDateStr(0));
  const [myDebtDueDate, setMyDebtDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [myDebtCategory, setMyDebtCategory] = useState('Komunikasi & Langganan Dasar');
  const [myDebtAddToAccount, setMyDebtAddToAccount] = useState<boolean>(() => accounts.length > 0);
  const [myDebtAccountId, setMyDebtAccountId] = useState<string>(() => accounts[0]?.id || '');

  // Modal Bayar Hutang Saya
  const [payingMyDebt, setPayingMyDebt] = useState<MyDebtLiability | null>(null);
  const [myDebtPayAmount, setMyDebtPayAmount] = useState('');
  const [myDebtPaySourceAcc, setMyDebtPaySourceAcc] = useState<string>(() => accounts[0]?.id || '');
  const [myDebtPayNotes, setMyDebtPayNotes] = useState('');

  // ================= COA ADJUSTMENT MODAL STATE =================
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjAccountId, setAdjAccountId] = useState<string>(() => accounts[0]?.id || '');
  const [adjType, setAdjType] = useState<'increase' | 'decrease'>('increase');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjCoaCode, setAdjCoaCode] = useState('3201');
  const [adjDate, setAdjDate] = useState(() => getOffsetDateStr(0));
  const [adjDescription, setAdjDescription] = useState('');

  // ================= PIUTANG & INVOICE STATE =================
  const [isAddingDebt, setIsAddingDebt] = useState(false);
  const [debtorName, setDebtorName] = useState('');
  const [debtorPhone, setDebtorPhone] = useState('');
  const [debtorEmail, setDebtorEmail] = useState('');
  const [debtLineItems, setDebtLineItems] = useState<{ id: string; description: string; amount: string }[]>([
    { id: 'item-1', description: '', amount: '' }
  ]);
  const [debtIssuedDate, setDebtIssuedDate] = useState(() => getOffsetDateStr(0));
  const [debtDueDate, setDebtDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [debtNotes, setDebtNotes] = useState('');
  const [debtQrDataUrl, setDebtQrDataUrl] = useState<string>('');
  // Pilihan akun yang dipotong dan akun penerima pelunasan
  const [debtDeductAccount, setDebtDeductAccount] = useState(true);
  const [debtSourceAccountId, setDebtSourceAccountId] = useState<string>(() => accounts[0]?.id || '');

  // Payment & WA QR Invoice Modal for debt (Piutang)
  const [payingDebt, setPayingDebt] = useState<DebtReceivable | null>(null);
  const [paymentInput, setPaymentInput] = useState('');
  const [debtRepaymentDestAccountId, setDebtRepaymentDestAccountId] = useState<string>(() => accounts[0]?.id || '');
  const [increasingDebt, setIncreasingDebt] = useState<DebtReceivable | null>(null);
  const [increaseAmountInput, setIncreaseAmountInput] = useState('');
  const [increaseNoteInput, setIncreaseNoteInput] = useState('');
  const [editingPhoneDebtId, setEditingPhoneDebtId] = useState<string | null>(null);
  const [editingPhoneValue, setEditingPhoneValue] = useState('');
  const [invoiceModalDebtId, setInvoiceModalDebtId] = useState<string | null>(null);
  const [selectedCombinedDebtIds, setSelectedCombinedDebtIds] = useState<string[]>([]);
  const invoiceModalDebt = useMemo(
    () => (invoiceModalDebtId ? debts.find(d => d.id === invoiceModalDebtId) || null : null),
    [debts, invoiceModalDebtId]
  );

  const openInvoiceModal = (debtItem: DebtReceivable) => {
    const normalizedName = debtItem.debtorName.trim().toLowerCase();
    const sameDebtorOpenDebts =
      debtItem.status === 'paid'
        ? [debtItem]
        : debts.filter(
            (d) =>
              d.debtorName.trim().toLowerCase() === normalizedName &&
              d.status !== 'paid'
          );
    const ids = sameDebtorOpenDebts.length > 0 ? sameDebtorOpenDebts.map((d) => d.id) : [debtItem.id];
    setSelectedCombinedDebtIds(ids.includes(debtItem.id) ? ids : [debtItem.id, ...ids]);
    setInvoiceModalDebtId(debtItem.id);
  };

  const debtorSiblingDebts = useMemo(() => {
    if (!invoiceModalDebt) return [] as DebtReceivable[];
    const normalizedName = invoiceModalDebt.debtorName.trim().toLowerCase();
    return debts.filter(
      (d) =>
        d.debtorName.trim().toLowerCase() === normalizedName &&
        (d.id === invoiceModalDebt.id || d.status !== 'paid')
    );
  }, [debts, invoiceModalDebt]);

  const combinedInvoiceDebts = useMemo(() => {
    if (!invoiceModalDebt) return [] as DebtReceivable[];
    const selected = debtorSiblingDebts.filter((d) => selectedCombinedDebtIds.includes(d.id));
    return selected.length > 0 ? selected : [invoiceModalDebt];
  }, [debtorSiblingDebts, selectedCombinedDebtIds, invoiceModalDebt]);

  // Month selector for Monthly Budget & General Ledger P&L
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Edit / Add category budget modal
  const [editingBudgetCategory, setEditingBudgetCategory] = useState<string | null>(null);
  const [budgetLimitInput, setBudgetLimitInput] = useState('');
  const [isAddingBudgetCategory, setIsAddingBudgetCategory] = useState(false);
  const [newBudgetCategoryInput, setNewBudgetCategoryInput] = useState('Makan & Minum Harian');
  const [newBudgetCustomName, setNewBudgetCustomName] = useState('');

  // ================= ACCOUNT LEDGER / MUTASI STATE =================
  const [selectedAccountForLedger, setSelectedAccountForLedger] = useState<FinancialAccount | null>(null);
  const activeLedgerAccount = useMemo(
    () => (selectedAccountForLedger ? accounts.find(a => a.id === selectedAccountForLedger.id) || selectedAccountForLedger : null),
    [accounts, selectedAccountForLedger]
  );

  // ================= TRANSFER & TARIK TUNAI MODAL STATE =================
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferInitialSourceId, setTransferInitialSourceId] = useState<string | undefined>(undefined);
  const [transferInitialType, setTransferInitialType] = useState<TransferType>('cash_withdrawal');

  // =================== CALCULATIONS (WITH CONTRA VOID REVERSALS) ===================
  const activeTransactions = useMemo(
    () => transactions.filter(isTransactionIncludedInLedger),
    [transactions]
  );

  // 1. Account balances calculation (Initial + Active Income - Active Expense)
  const accountBalances: Record<string, {
    account: FinancialAccount;
    initialBalance: number;
    totalIncome: number;
    totalExpense: number;
    currentBalance: number;
  }> = {};

  accounts.forEach(acc => {
    const accIncome = activeTransactions
      .filter(t => (t.accountId === acc.id || t.accountName === acc.name) && t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);

    const accExpense = activeTransactions
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

  // 4. Net Worth (Total Saldo + Piutang - Hutang Saya)
  const netWorth = totalCombinedBalance + totalReceivables - totalMyDebtsUnpaid;

  // 5. Available months & Monthly P&L (Active non-voided transactions)
  const availableMonths = useMemo(() => {
    const now = new Date();
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const set = new Set<string>([cur, selectedMonth]);
    activeTransactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        set.add(t.date.slice(0, 7));
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [activeTransactions, selectedMonth]);

  const monthlyTransactions = activeTransactions.filter(t => t.date.startsWith(selectedMonth));
  let monthlyIncome = 0;
  let monthlyExpense = 0;
  const monthlyCategoryExpenses: Record<string, number> = {};

  monthlyTransactions.forEach(t => {
    if (t.category === 'Pencairan Hutang') {
      return;
    }
    if (isContraVoidTransaction(t)) {
      if (t.type === 'income') {
        monthlyExpense -= t.amount;
        monthlyCategoryExpenses[t.category] = Math.max(0, (monthlyCategoryExpenses[t.category] || 0) - t.amount);
      } else {
        monthlyIncome -= t.amount;
      }
    } else if (t.type === 'income') {
      monthlyIncome += t.amount;
    } else {
      monthlyExpense += t.amount;
      monthlyCategoryExpenses[t.category] = (monthlyCategoryExpenses[t.category] || 0) + t.amount;
    }
  });
  monthlyIncome = Math.max(0, monthlyIncome);
  monthlyExpense = Math.max(0, monthlyExpense);
  const monthlyProfitLoss = monthlyIncome - monthlyExpense;

  const formatMonthLabel = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    if (!y || !m) return ym;
    const label = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
    return ym === currentMonthStr ? `${label} (Bulan Ini)` : label;
  };

  const budgetCategoriesList = useMemo(() => {
    const set = new Set<string>();
    categoryBudgets.forEach(b => {
      if (b.limit > 0 || (monthlyCategoryExpenses[b.category] || 0) > 0) {
        set.add(b.category);
      }
    });
    Object.keys(monthlyCategoryExpenses).forEach(cat => {
      if ((monthlyCategoryExpenses[cat] || 0) > 0 && cat !== 'Transfer & Tarik Tunai') {
        set.add(cat);
      }
    });
    return Array.from(set);
  }, [categoryBudgets, monthlyCategoryExpenses]);

  const totalConfiguredMonthlyBudget = useMemo(
    () => categoryBudgets.reduce((sum, b) => sum + (b.limit || 0), 0),
    [categoryBudgets]
  );

  const totalBudgetedSpentThisMonth = useMemo(() => {
    return categoryBudgets.reduce((sum, b) => {
      if (b.limit > 0) {
        return sum + (monthlyCategoryExpenses[b.category] || 0);
      }
      return sum;
    }, 0);
  }, [categoryBudgets, monthlyCategoryExpenses]);

  const totalRemainingMonthlyBudget = totalConfiguredMonthlyBudget - totalBudgetedSpentThisMonth;

  // 6. Chart of Accounts & General Journal Calculations
  const allCoaList = useMemo(
    () => getAllChartOfAccounts(accounts, customCoaAccounts),
    [accounts, customCoaAccounts]
  );
  const standardJournalEntries = useMemo(
    () => generateStandardJournalEntries(transactions, accounts, myDebts, debts, customCoaAccounts),
    [transactions, accounts, myDebts, debts, customCoaAccounts]
  );
  const coaLedgers = useMemo(() =>
    calculateCoaLedgers(allCoaList, standardJournalEntries),
    [allCoaList, standardJournalEntries]
  );
  const accountingSummary = useMemo(() =>
    getAccountingEquationSummary(coaLedgers),
    [coaLedgers]
  );

  // Filtered transactions for main table (sorted newest date first)
  const filteredTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter(t => {
      if (!showVoidedTx && (t.isVoided || isContraVoidTransaction(t))) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (accountFilter !== 'all' && t.accountId !== accountFilter && t.accountName !== accountFilter) return false;
      return true;
    });

  // =================== HANDLERS ===================
  const openAddTxModal = (preselectedAccountId?: string) => {
    setEditingTx(null);
    setTxType('expense');
    setTxTitle('');
    setTxAmount('');
    setTxCategory('Makan & Minum Harian');
    setTxCoaCode('');
    setTxAccountId(preselectedAccountId || accounts[0]?.id || '');
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxNotes('');
    setIsCreditDebt(false);
    setDebtDownPayment('');
    setIsAddingTx(true);
  };

  const openEditTxModal = (tx: FinanceTransaction) => {
    setEditingTx(tx);
    setTxType(tx.type);
    setTxTitle(tx.title);
    setTxAmount(tx.amount.toLocaleString('id-ID'));
    setTxCategory(tx.category);
    const normalizedExplicit = tx.coaCode ? normalizeCoaCode(tx.coaCode) : '';
    const hasMatch = normalizedExplicit ? allCoaList.some(c => c.code === normalizedExplicit) : false;
    setTxCoaCode(hasMatch && normalizedExplicit ? normalizedExplicit : '');
    const matchedAcc = accounts.find(a => a.id === tx.accountId) || accounts.find(a => a.name === tx.accountName) || accounts[0];
    setTxAccountId(matchedAcc?.id || '');
    setTxDate(tx.date);
    setTxNotes(tx.notes || '');
    setIsCreditDebt(false);
    setDebtDownPayment('');
    setIsAddingTx(true);
  };

  // 1. Save Transaction (Create or Edit + COA Assignment)
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseCurrencyInput(txAmount);
    if (!txTitle.trim() || !parsedAmount) return;

    const selectedAcc = accounts.find(a => a.id === txAccountId) || accounts[0];
    const resolvedWalletType: WalletType = selectedAcc?.type === 'cash' ? 'cash' : 'non_cash';
    const resolvedPaymentMethod: FinanceTransaction['paymentMethod'] =
      selectedAcc?.type === 'cash' ? 'Cash' : selectedAcc?.type === 'ewallet' ? 'E-Wallet' : 'Bank Transfer';

    const assetCoa = selectedAcc ? getCoaForFinancialAccount(selectedAcc, allCoaList) : allCoaList[0];
    const autoContraCoa = getCoaForCategory(txCategory, txType, allCoaList);
    const manualContraCoa = txCoaCode ? allCoaList.find(c => c.code === txCoaCode) : undefined;
    const contraCoa = manualContraCoa || autoContraCoa;

    let debitCode = '';
    let debitName = '';
    let creditCode = '';
    let creditName = '';

    if (txType === 'income') {
      debitCode = assetCoa.code;
      debitName = assetCoa.name;
      creditCode = contraCoa.code;
      creditName = contraCoa.name;
    } else {
      debitCode = contraCoa.code;
      debitName = contraCoa.name;
      creditCode = assetCoa.code;
      creditName = assetCoa.name;
    }

    if (editingTx) {
      updateTransaction(editingTx.id, {
        type: txType,
        title: txTitle.trim(),
        amount: parsedAmount,
        category: txCategory,
        date: txDate,
        paymentMethod: resolvedPaymentMethod,
        walletType: resolvedWalletType,
        accountId: selectedAcc?.id,
        accountName: selectedAcc?.name || 'Rekening',
        notes: (txNotes.trim() || null) as unknown as string,
        debitAccountCode: debitCode,
        debitAccountName: debitName,
        creditAccountCode: creditCode,
        creditAccountName: creditName,
        coaCode: (manualContraCoa ? manualContraCoa.code : null) as unknown as string,
        coaName: (manualContraCoa ? manualContraCoa.name : null) as unknown as string,
      });
    } else {
      addTransaction({
        type: txType,
        title: txTitle.trim(),
        amount: parsedAmount,
        category: txCategory,
        date: txDate,
        paymentMethod: resolvedPaymentMethod,
        walletType: resolvedWalletType,
        accountId: selectedAcc?.id,
        accountName: selectedAcc?.name || 'Rekening',
        notes: txNotes.trim() || undefined,
        debitAccountCode: debitCode,
        debitAccountName: debitName,
        creditAccountCode: creditCode,
        creditAccountName: creditName,
        coaCode: manualContraCoa?.code,
        coaName: manualContraCoa?.name,
      });

      // If marked as creating MyDebt
      if (isCreditDebt && txType === 'expense') {
        const parsedDP = parseCurrencyInput(debtDownPayment);
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
    }

    setEditingTx(null);
    setTxTitle('');
    setTxAmount('');
    setTxCoaCode('');
    setTxNotes('');
    setIsCreditDebt(false);
    setDebtDownPayment('');
    setIsAddingTx(false);
  };

  // 2. Save Account
  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedInit = parseCurrencyInput(accInitialBalance);
    if (!accName.trim()) return;

    const color = accType === 'cash' ? '#d97706' : accType === 'ewallet' ? '#059669' : '#2563eb';
    addAccount({
      name: accName.trim(),
      type: accType,
      initialBalance: parsedInit,
      accountNumber: accNumber.trim() || undefined,
      coaCode: accCoaCode || undefined,
      color,
      notes: accNotes.trim() || undefined
    });

    setAccName('');
    setAccInitialBalance('');
    setAccNumber('');
    setAccCoaCode('');
    setAccNotes('');
    setIsAddingAccount(false);
  };

  // 3. Open & Update Account Details (Name, Account Number, COA, Initial Balance, Notes)
  const openEditAccountModal = (acc: FinancialAccount) => {
    setEditingAcc(acc);
    setEditAccNameInput(acc.name);
    setEditAccNumberInput(acc.accountNumber || '');
    setEditBalanceInput(acc.initialBalance.toLocaleString('id-ID'));
    setEditAccCoaCode(acc.coaCode ? (normalizeCoaCode(acc.coaCode) || '') : '');
    setEditAccNotesInput(acc.notes || '');
  };

  const handleUpdateBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAcc) return;
    const parsed = parseCurrencyInput(editBalanceInput);
    updateAccount(editingAcc.id, {
      name: editAccNameInput.trim() || editingAcc.name,
      accountNumber: editAccNumberInput.trim(),
      initialBalance: parsed,
      coaCode: (editAccCoaCode || null) as unknown as string,
      notes: editAccNotesInput.trim(),
    });
    setEditingAcc(null);
    setEditAccNameInput('');
    setEditAccNumberInput('');
    setEditBalanceInput('');
    setEditAccCoaCode('');
    setEditAccNotesInput('');
  };

  // 3B. COA Adjustment Submit
  const handleSaveCoaAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseCurrencyInput(adjAmount);
    const targetAccId = adjAccountId || accounts[0]?.id;
    const chosenCoa = allCoaList.find(c => c.code === adjCoaCode) || allCoaList[0];
    if (!targetAccId || parsed <= 0 || !chosenCoa) {
      showToast('Pilih akun, COA lawan, dan nominal adjustment yang valid', 'warning');
      return;
    }

    addCoaAdjustment({
      accountId: targetAccId,
      adjustmentType: adjType,
      amount: parsed,
      coaCode: chosenCoa.code,
      coaName: chosenCoa.name,
      date: adjDate,
      description: adjDescription.trim() || `Adjustment ${adjType === 'increase' ? '+' : '-'} (${chosenCoa.name})`
    });

    setAdjAmount('');
    setAdjDescription('');
    setIsAdjustmentModalOpen(false);
  };

  // 4. Save My Debt (Hutang Saya)
  const handleSaveMyDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseCurrencyInput(myDebtAmount);
    if (!myDebtCreditor.trim() || !parsed) return;

    const chosenAccountId = myDebtAddToAccount ? (myDebtAccountId || accounts[0]?.id) : undefined;
    const chosenAccount = chosenAccountId ? accounts.find(a => a.id === chosenAccountId) : undefined;

    addMyDebt({
      creditorName: myDebtCreditor.trim(),
      description: myDebtDesc.trim() || 'Kewajiban Hutang',
      amount: parsed,
      amountPaid: 0,
      dueDate: myDebtDueDate,
      issuedDate: myDebtIssuedDate || getOffsetDateStr(0),
      status: 'unpaid',
      sourceAccountId: chosenAccount?.id,
      sourceAccountName: chosenAccount?.name,
      addToAccount: Boolean(myDebtAddToAccount && chosenAccount),
      category: myDebtCategory
    });

    setMyDebtCreditor('');
    setMyDebtDesc('');
    setMyDebtAmount('');
    setMyDebtIssuedDate(getOffsetDateStr(0));
    setIsAddingMyDebt(false);
  };

  // 5. Pay My Debt (Cicil Hutang Saya)
  const handlePayMyDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingMyDebt) return;
    const parsed = parseCurrencyInput(myDebtPayAmount);
    if (!parsed || parsed <= 0) return;

    payMyDebt(payingMyDebt.id, parsed, myDebtPaySourceAcc || accounts[0]?.id || '', myDebtPayNotes);
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

  const handleDownloadSampleCsv = () => {
    const csvSample = `Nama Akun,Tipe,Nomor Rekening,Saldo Awal\nBCA Utama,bank,8830129841,18500000\nMandiri Payroll,bank,1370019283741,7200000\nGoPay,ewallet,081234567890,850000\nDANA,ewallet,081234567890,600000\nOVO,ewallet,081234567890,450000\nDompet Tunai Fisik,cash,,750000`;
    const blob = new Blob([csvSample], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_saldo_awal_qhub.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Template CSV saldo awal berhasil diunduh', 'success');
  };

  // 7. Save Piutang (Debts to Me) with itemized breakdown, optional QR Image & Back Date
  const handleSaveDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const issueDate = debtIssuedDate || getOffsetDateStr(0);
    const parsedItems: DebtLineItem[] = debtLineItems
      .map((row, idx) => ({
        id: `di-${Date.now()}-${idx}`,
        description: row.description.trim() || `Item Tagihan #${idx + 1}`,
        amount: parseCurrencyInput(row.amount),
        date: issueDate,
      }))
      .filter((item) => item.amount > 0);

    const totalAmount = parsedItems.reduce((sum, item) => sum + item.amount, 0);
    if (!debtorName.trim() || totalAmount <= 0) {
      showToast('Lengkapi nama debitur dan minimal 1 nominal piutang.', 'warning');
      return;
    }

    let cleanPhone = debtorPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    }

    const summaryDescription =
      parsedItems.length === 1
        ? parsedItems[0].description
        : parsedItems.map((it) => it.description).join(', ');

    addDebt({
      debtorName: debtorName.trim(),
      debtorPhone: cleanPhone || undefined,
      debtorEmail: debtorEmail.trim() || undefined,
      amount: totalAmount,
      amountPaid: 0,
      dueDate: debtDueDate,
      issuedDate: issueDate,
      description: summaryDescription,
      status: 'unpaid',
      items: parsedItems,
      notes: debtNotes.trim() || undefined,
      qrImageDataUrl: debtQrDataUrl || undefined
    }, debtSourceAccountId || accounts[0]?.id, debtDeductAccount);

    setDebtorName('');
    setDebtorPhone('');
    setDebtorEmail('');
    setDebtLineItems([{ id: 'item-1', description: '', amount: '' }]);
    setDebtNotes('');
    setDebtQrDataUrl('');
    setIsAddingDebt(false);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt) return;
    const parsed = parseCurrencyInput(paymentInput);
    if (!parsed || parsed <= 0) return;

    recordDebtPayment(payingDebt.id, parsed, debtRepaymentDestAccountId || accounts[0]?.id);
    setPayingDebt(null);
    setPaymentInput('');
  };

  const handleSaveIncreaseDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!increasingDebt) return;
    const added = parseCurrencyInput(increaseAmountInput);
    if (!added || added <= 0) {
      showToast('Masukkan nominal tambahan piutang yang valid', 'warning');
      return;
    }
    increaseDebtAmount(increasingDebt.id, added, increaseNoteInput.trim() || undefined);
    setIncreasingDebt(null);
    setIncreaseAmountInput('');
    setIncreaseNoteInput('');
  };

  const handleSavePhone = (debtId: string) => {
    let clean = editingPhoneValue.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.substring(1);
    }
    updateDebt(debtId, { debtorPhone: clean || undefined });
    setEditingPhoneDebtId(null);
    showToast('Nomor WhatsApp debitur berhasil diperbarui!', 'success');
  };

  const handleUploadDebtQrImage = async (file: File, targetDebtId?: string) => {
    if (!file.type.startsWith('image/')) {
      showToast('Mohon unggah file gambar QR Code (PNG/JPG)', 'warning');
      return;
    }
    try {
      const compressed = await compressImageDataUrl(file, 360, 0.86);
      if (targetDebtId) {
        updateDebt(targetDebtId, { qrImageDataUrl: compressed });
      } else {
        setDebtQrDataUrl(compressed);
        showToast('Gambar QR Code berhasil dipasang pada tagihan baru', 'success');
      }
    } catch {
      showToast('Gagal memproses gambar QR Code', 'error');
    }
  };

  const buildCombinedInvoiceSummary = (primaryDebt: DebtReceivable, includedDebts?: DebtReceivable[]) => {
    const list = includedDebts && includedDebts.length > 0 ? includedDebts : [primaryDebt];
    const lineItems = list.flatMap((d) =>
      getDebtLineItems(d).map((item) => ({
        ...item,
        invoiceNumber: d.invoiceNumber,
      }))
    );
    const totalAmount = list.reduce((sum, d) => sum + d.amount, 0);
    const totalPaid = list.reduce((sum, d) => sum + d.amountPaid, 0);
    const remaining = Math.max(0, totalAmount - totalPaid);
    const invoiceNumbers = list.map((d) => d.invoiceNumber).join(', ');
    const latestDueDate = list
      .map((d) => d.dueDate)
      .sort()
      .slice(-1)[0] || primaryDebt.dueDate;
    return {
      list,
      lineItems,
      totalAmount,
      totalPaid,
      remaining,
      invoiceNumbers,
      latestDueDate,
    };
  };

  // Build WA invoice message with detailed line-item breakdown
  const buildInvoiceText = (debtItem: DebtReceivable, hasQr: boolean, includedDebts?: DebtReceivable[]) => {
    const summary = buildCombinedInvoiceSummary(debtItem, includedDebts);
    const rincianLines = summary.lineItems
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.description} — Rp ${item.amount.toLocaleString('id-ID')}`
      )
      .join('\n');

    return `Halo Kak ${debtItem.debtorName},\n\nMengingatkan tagihan resmi nomor *${summary.invoiceNumbers}*:\n\n*Rincian Tagihan:*\n${rincianLines}\n\nTotal Tagihan: Rp ${summary.totalAmount.toLocaleString('id-ID')}\nSudah Dibayar: Rp ${summary.totalPaid.toLocaleString('id-ID')}\n*Sisa Pembayaran: Rp ${summary.remaining.toLocaleString('id-ID')}*\nJatuh Tempo: ${summary.latestDueDate}\n\nPembayaran dapat ditransfer ke:\n${profile.bankAccountDetails || 'Rekening BCA: 8830129841 a/n ' + profile.name}${hasQr ? '\n\n(Atau silakan scan gambar QRIS / QR Code terlampir)' : ''}\n\nTerima kasih atas kerja samanya!\nSalam hangat,\n${profile.name}`;
  };

  const handleOpenWhatsAppWithInvoice = (debtItem: DebtReceivable, includedDebts?: DebtReceivable[]) => {
    if (!debtItem.debtorPhone) {
      showToast('Nomor WhatsApp belum terdaftar. Klik [Edit WA] pada kartu debitur terlebih dahulu.', 'warning');
      return;
    }
    const hasQr = Boolean(debtItem.qrImageDataUrl || profile.paymentQrDataUrl);
    const text = buildInvoiceText(debtItem, hasQr, includedDebts);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    window.open(`https://wa.me/${debtItem.debtorPhone}?text=${encodeURIComponent(text)}`, '_blank');
    showToast('Pesan tagihan dibuka di WhatsApp!', 'success');
  };

  const handleShareQrWithInvoice = async (debtItem: DebtReceivable, includedDebts?: DebtReceivable[]) => {
    const qrSrc = debtItem.qrImageDataUrl || profile.paymentQrDataUrl;
    const text = buildInvoiceText(debtItem, Boolean(qrSrc), includedDebts);
    if (!qrSrc) {
      handleOpenWhatsAppWithInvoice(debtItem, includedDebts);
      return;
    }
    try {
      const res = await fetch(qrSrc);
      const blob = await res.blob();
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const file = new File([blob], `QR_Pembayaran_${debtItem.invoiceNumber}.${ext}`, { type: blob.type || 'image/png' });
      const navWithShare = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (typeof navWithShare.share === 'function' && (!navWithShare.canShare || navWithShare.canShare({ files: [file] }))) {
        await navWithShare.share({
          title: `Tagihan ${debtItem.invoiceNumber}`,
          text,
          files: [file]
        });
        showToast('Gambar QR & teks tagihan berhasil dibagikan!', 'success');
        return;
      }
    } catch {
      // Fallback below
    }
    // Desktop fallback: download QR image + open WhatsApp
    handleDownloadQrImage(qrSrc, debtItem.invoiceNumber);
    handleOpenWhatsAppWithInvoice(debtItem, includedDebts);
  };

  const handleDownloadQrImage = (qrSrc: string, invoiceNo: string) => {
    const a = document.createElement('a');
    a.href = qrSrc;
    a.download = `QR_Tagihan_${invoiceNo}.png`;
    a.click();
    showToast('Gambar QR Code diunduh (siap dilampirkan ke WA)', 'info');
  };

  const handleDownloadInvoicePDF = (debtItem: DebtReceivable, includedDebts?: DebtReceivable[]) => {
    try {
      const summary = buildCombinedInvoiceSummary(debtItem, includedDebts);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
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
      doc.text(`Nomor Dokumen: ${summary.invoiceNumbers} • Diterbitkan: ${debtItem.issuedDate}`, margin, 26);

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
      doc.text(profile.title || (appBranding.appName || "Q'Hub User"), pageWidth / 2 + 10, y);

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
      doc.text('NO. & DESKRIPSI TAGIHAN / RINCIAN', margin + 4, y + 5.5);
      doc.text('NOMINAL', pageWidth - margin - 4, y + 5.5, { align: 'right' });

      y += 13;
      summary.lineItems.forEach((item, idx) => {
        if (y > pageHeight - 75) {
          doc.addPage();
          y = 20;
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        const label = `${idx + 1}. ${item.description}${summary.list.length > 1 ? ` (${item.invoiceNumber})` : ''}`;
        const wrapped = doc.splitTextToSize(label, pageWidth - margin * 2 - 42);
        doc.text(wrapped, margin + 4, y);
        doc.text(`Rp ${item.amount.toLocaleString('id-ID')}`, pageWidth - margin - 4, y, { align: 'right' });
        const rowHeight = Math.max(7, wrapped.length * 5 + 2);
        y += rowHeight;
        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y - 2, pageWidth - margin, y - 2);
      });

      y += 6;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Totals
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text('Total Tagihan:', pageWidth - margin - 75, y);
      doc.text(`Rp ${summary.totalAmount.toLocaleString('id-ID')}`, pageWidth - margin - 4, y, { align: 'right' });

      y += 6;
      doc.text('Sudah Dibayarkan (DP):', pageWidth - margin - 75, y);
      doc.text(`Rp ${summary.totalPaid.toLocaleString('id-ID')}`, pageWidth - margin - 4, y, { align: 'right' });

      y += 7;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(225, 29, 72);
      doc.text('SISA PEMBAYARAN:', pageWidth - margin - 75, y);
      doc.text(`Rp ${summary.remaining.toLocaleString('id-ID')}`, pageWidth - margin - 4, y, { align: 'right' });

      y += 14;
      const qrSrc = debtItem.qrImageDataUrl || profile.paymentQrDataUrl;
      const hasValidQr = Boolean(qrSrc && qrSrc.startsWith('data:image/') && !qrSrc.startsWith('data:image/svg+xml'));
      const boxHeight = hasValidQr ? 44 : 26;

      if (y + boxHeight > pageHeight - 15) {
        doc.addPage();
        y = 20;
      }

      // Payment instructions box (+ optional embedded QR code on the right)
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - margin * 2, boxHeight, 'F');
      doc.rect(margin, y, pageWidth - margin * 2, boxHeight, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(79, 70, 229);
      doc.text('INSTRUKSI REKENING PEMBAYARAN:', margin + 4, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const bankLines = doc.splitTextToSize(
        profile.bankAccountDetails || 'Bank BCA: 8830129841 a/n ' + profile.name,
        hasValidQr ? pageWidth - margin * 2 - 46 : pageWidth - margin * 2 - 8
      );
      doc.text(bankLines, margin + 4, y + 14);
      doc.text(`Batas Akhir Pelunasan: ${summary.latestDueDate}`, margin + 4, y + (hasValidQr ? 32 : 21));

      if (hasValidQr && qrSrc) {
        try {
          const imgType = qrSrc.includes('image/png') ? 'PNG' : 'JPEG';
          doc.addImage(qrSrc, imgType, pageWidth - margin - 38, y + 4, 32, 32);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text('SCAN QR BAYAR', pageWidth - margin - 22, y + 40, { align: 'center' });
        } catch {
          // Ignore malformed QR image when embedding PDF
        }
      }

      doc.save(`Invoice_${debtItem.invoiceNumber}_${debtItem.debtorName.replace(/\s+/g, '_')}.pdf`);
      showToast('Invoice PDF berhasil diunduh!', 'success');
    } catch {
      showToast('Gagal mencetak PDF invoice', 'error');
    }
  };

  // Export Monthly P&L CSV
  const handleExportPnlCsv = () => {
    const rows = [
      ['LAPORAN LABA RUGI (P&L) BULAN', selectedMonth],
      ['Total Pemasukan', monthlyIncome.toString()],
      ['Total Pengeluaran', monthlyExpense.toString()],
      ['Surplus / Defisit', monthlyProfitLoss.toString()],
      [],
      ['Kategori Pengeluaran', 'Realisasi (Rp)', 'Batas Anggaran (Rp)', 'Sisa Budget (Rp)', 'Status']
    ];
    const cats = new Set<string>([
      ...categoryBudgets.map(b => b.category),
      ...Object.keys(monthlyCategoryExpenses)
    ]);
    cats.forEach(cat => {
      const spent = monthlyCategoryExpenses[cat] || 0;
      const limit = categoryBudgets.find(b => b.category === cat)?.limit || 0;
      const remaining = limit > 0 ? limit - spent : 0;
      const status = limit > 0 ? (spent > limit ? 'OVERBUDGET' : 'AMAN') : 'TANPA BATAS';
      rows.push([cat, spent.toString(), limit.toString(), remaining.toString(), status]);
    });

    const csvContent = rows
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_PnL_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Laporan P&L bulan ${selectedMonth} berhasil diekspor!`, 'success');
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
            Kelola rekening bank & e-wallet, Adjustment COA, General Ledger (COA, Neraca & P&L), transaksi back-date, serta piutang QR WhatsApp.
          </p>
        </div>

        {/* Action Button: Catat Transaksi Baru */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => openAddTxModal()}
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
            setActiveSubTab('general-ledger');
            setSelectedAccountForLedger(null);
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'general-ledger'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
          <span>General Ledger</span>
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

          {/* Monthly Resetting Budget vs Spending Realization Per Category */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                  <span>Realisasi Belanja & Sisa Budget Per Kategori ({formatMonthLabel(selectedMonth)})</span>
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                  Realisasi belanja otomatis reset menjadi Rp 0 di awal bulan baru, sementara seluruh transaksi lama tetap tersimpan aman di riwayat.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold cursor-pointer"
                >
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{formatMonthLabel(m)}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setNewBudgetCategoryInput('Makan & Minum Harian');
                    setNewBudgetCustomName('');
                    setBudgetLimitInput('');
                    setIsAddingBudgetCategory(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Atur Batas Kategori</span>
                </button>
              </div>
            </div>

            {/* Summary Strip */}
            {totalConfiguredMonthlyBudget > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[11px] text-neutral-500 block">Total Batas Anggaran / Bln</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                    {profile.currencySymbol} {totalConfiguredMonthlyBudget.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[11px] text-neutral-500 block">Realisasi Terpakai ({selectedMonth})</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                    {profile.currencySymbol} {totalBudgetedSpentThisMonth.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className={`p-3 rounded-xl border ${
                  totalRemainingMonthlyBudget >= 0
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                    : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                }`}>
                  <span className="text-[11px] text-neutral-500 block">
                    {totalRemainingMonthlyBudget >= 0 ? 'Sisa Budget Bulan Ini' : 'Total Overbudget Bulan Ini'}
                  </span>
                  <span className={`text-sm font-bold font-mono tabular-nums ${
                    totalRemainingMonthlyBudget >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {totalRemainingMonthlyBudget >= 0 ? '' : '-'}
                    {profile.currencySymbol} {Math.abs(totalRemainingMonthlyBudget).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            )}

            {budgetCategoriesList.length === 0 ? (
              <div className="py-8 text-center text-neutral-400 space-y-2 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                <p className="text-xs">
                  Belum ada batas anggaran atau realisasi pengeluaran pada bulan {formatMonthLabel(selectedMonth)}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNewBudgetCategoryInput('Makan & Minum Harian');
                    setNewBudgetCustomName('');
                    setBudgetLimitInput('');
                    setIsAddingBudgetCategory(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Atur Batas Anggaran Pertama</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {budgetCategoriesList.map(cat => {
                  const spent = monthlyCategoryExpenses[cat] || 0;
                  const limit = categoryBudgets.find(b => b.category === cat)?.limit || 0;
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
                              <AlertTriangle className="w-3 h-3" /> Over
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBudgetCategory(cat);
                            setBudgetLimitInput(limit > 0 ? limit.toLocaleString('id-ID') : '');
                          }}
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                        <span className={isOver ? 'text-rose-600 font-bold' : 'text-neutral-700 dark:text-neutral-300'}>
                          {profile.currencySymbol} {spent.toLocaleString('id-ID')}
                        </span>
                        <span className="text-neutral-400">
                          / {limit > 0 ? `${profile.currencySymbol} ${limit.toLocaleString('id-ID')}` : 'Tanpa Batas'}
                        </span>
                      </div>

                      {limit > 0 ? (
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
                                ? `Sisa: ${profile.currencySymbol} ${remaining.toLocaleString('id-ID')}`
                                : `Over: -${profile.currencySymbol} ${Math.abs(remaining).toLocaleString('id-ID')}`}
                            </span>
                            <span className="text-neutral-400">{pct}%</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-[10px] text-neutral-400">
                          Klik Edit untuk mengatur batas anggaran bulanan.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
                  onChange={(e) => setTypeFilter(e.target.value as 'all' | 'income' | 'expense')}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 font-semibold"
                >
                  <option value="all">Semua Tipe</option>
                  <option value="income">Pemasukan Saja</option>
                  <option value="expense">Pengeluaran Saja</option>
                </select>

                {/* Show Voided Toggle */}
                <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={showVoidedTx}
                    onChange={(e) => setShowVoidedTx(e.target.checked)}
                    className="rounded accent-rose-600"
                  />
                  <span>Tampilkan Void</span>
                </label>
              </div>
            </div>

            {/* Transaction List (Responsive Mobile + Void Support) */}
            {filteredTransactions.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 space-y-2">
                <Receipt className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs">Belum ada transaksi pada filter ini.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const isVoided = Boolean(tx.isVoided);
                  const isContra = isContraVoidTransaction(tx);
                  const cleanVoidReason = formatVoidReason(tx.voidReason);
                  const effectiveContraCoa = getEffectiveContraCoaForTransaction(tx, allCoaList, myDebts);

                  return (
                    <div
                      key={tx.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-xl border transition-colors ${
                        isVoided
                          ? 'bg-neutral-100/70 dark:bg-neutral-800/20 border-neutral-200/70 dark:border-neutral-800/70 opacity-75'
                          : isContra
                          ? 'bg-amber-50/40 dark:bg-amber-950/15 border-amber-200/70 dark:border-amber-900/50'
                          : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isVoided
                            ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400'
                            : isContra
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : isIncome
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}>
                          {isVoided ? <Ban className="w-4 h-4" /> : isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className={`text-xs font-semibold truncate ${
                              isVoided ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'
                            }`}>
                              {tx.title}
                            </p>
                            {isVoided && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase font-mono bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                                DI-VOID
                              </span>
                            )}
                            {isContra && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase font-mono bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                                LAWAN VOID
                              </span>
                            )}
                            {tx.isAdjustment && tx.coaCode && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold font-mono bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                                ADJ • {effectiveContraCoa.code}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-neutral-200/60 dark:bg-neutral-700/60 text-neutral-700 dark:text-neutral-300 font-medium">
                              {tx.accountName || (tx.walletType === 'cash' ? 'Dompet Tunai' : 'Non-Cash')}
                            </span>
                            <span>•</span>
                            <span>{tx.category}</span>
                            <span>•</span>
                            <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
                              COA {effectiveContraCoa.code} ({effectiveContraCoa.name})
                            </span>
                            <span>•</span>
                            <span className="font-mono">{tx.date}</span>
                          </div>
                          {isVoided && cleanVoidReason && (
                            <p className="text-[10px] text-rose-500 mt-0.5 truncate">
                              Alasan Void: {cleanVoidReason}
                            </p>
                          )}
                          {isContra && tx.notes && (
                            <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 truncate">
                              {tx.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 shrink-0 pl-12 sm:pl-0">
                        <span className={`text-xs font-bold font-mono tabular-nums ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-neutral-900 dark:text-neutral-100'
                        }`}>
                          {isIncome ? '+' : '-'}{profile.currencySymbol} {tx.amount.toLocaleString('id-ID')}
                        </span>

                        <div className="flex items-center gap-1">
                          {!isVoided && !isContra && !tx.transferId && (
                            <button
                              onClick={() => openEditTxModal(tx)}
                              className="px-2 py-1 rounded-lg text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1 cursor-pointer"
                              title="Edit Transaksi / Ubah Akun COA"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Edit</span>
                            </button>
                          )}
                          {!isVoided && !isContra && (
                            <button
                              onClick={() => {
                                setVoidingTx(tx);
                                setVoidReasonInput('');
                              }}
                              className="px-2 py-1 rounded-lg text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-1 cursor-pointer"
                              title="Void / Buat Transaksi Lawannya (Tetap tercatat sebagai riwayat)"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Void</span>
                            </button>
                          )}
                          <button
                            onClick={() => deleteTransaction(tx.id)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                            title="Hapus Permanen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
        activeLedgerAccount ? (
          <AccountLedgerView
            account={activeLedgerAccount}
            allAccounts={accounts}
            allTransactions={transactions}
            allCoaList={allCoaList}
            currencySymbol={profile.currencySymbol}
            onBack={() => setSelectedAccountForLedger(null)}
            onSelectAccount={(acc) => setSelectedAccountForLedger(acc)}
            onAddTransactionForAccount={(accId) => openAddTxModal(accId)}
            onEditInitialBalance={openEditAccountModal}
            onEditTransaction={(tx) => openEditTxModal(tx)}
            onDeleteTransaction={deleteTransaction}
            onVoidTransaction={(id) => {
              const found = transactions.find(t => t.id === id);
              if (found) {
                setVoidingTx(found);
                setVoidReasonInput('');
              }
            }}
            onNavigateToCoa={() => {
              setSelectedAccountForLedger(null);
              setActiveSubTab('general-ledger');
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
                  Klik kartu akun untuk buku pembantu & mutasi. Gunakan <strong>Adjustment (COA)</strong> untuk penyesuaian saldo dengan memilih akun COA lawan.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    if (!adjAccountId && accounts[0]) setAdjAccountId(accounts[0].id);
                    setAdjDate(getOffsetDateStr(0));
                    setAdjAmount('');
                    setAdjDescription('');
                    setIsAdjustmentModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 shadow-xs cursor-pointer transition-all"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Adjustment (COA)</span>
                </button>

                <button
                  onClick={() => {
                    setTransferInitialSourceId(undefined);
                    setTransferInitialType('cash_withdrawal');
                    setIsTransferModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 shadow-xs cursor-pointer transition-all"
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
                                  onClick={() => openEditAccountModal(acc)}
                                  className="p-1 rounded text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                                  title="Edit Akun, No. Rekening & Saldo Awal"
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
      {/* SUBTAB: GENERAL LEDGER (COA, NERACA, JURNAL & P&L)        */}
      {/* ========================================================= */}
      {activeSubTab === 'general-ledger' && (
        <ChartOfAccountsView
          allCoaList={allCoaList}
          journalEntries={standardJournalEntries}
          coaLedgers={coaLedgers}
          accountingSummary={accountingSummary}
          currencySymbol={profile.currencySymbol}
          accounts={accounts}
          customCoaAccounts={customCoaAccounts}
          onUpsertCoa={upsertCoaAccount}
          onDeleteCustomCoa={deleteCustomCoaAccount}
          onOpenAccountLedger={(acc) => {
            setSelectedAccountForLedger(acc);
            setActiveSubTab('accounts');
          }}
          selectedMonth={selectedMonth}
          onChangeMonth={setSelectedMonth}
          availableMonths={availableMonths}
          monthlyIncome={monthlyIncome}
          monthlyExpense={monthlyExpense}
          monthlyProfitLoss={monthlyProfitLoss}
          monthlyCategoryExpenses={monthlyCategoryExpenses}
          categoryBudgets={categoryBudgets}
          onEditBudget={(cat, currentLimit) => {
            setEditingBudgetCategory(cat);
            setBudgetLimitInput(currentLimit > 0 ? currentLimit.toLocaleString('id-ID') : '');
          }}
          onAddBudget={() => {
            setNewBudgetCategoryInput('Makan & Minum Harian');
            setNewBudgetCustomName('');
            setBudgetLimitInput('');
            setIsAddingBudgetCategory(true);
          }}
          onExportPnlCsv={handleExportPnlCsv}
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
              onClick={() => {
                setMyDebtIssuedDate(getOffsetDateStr(0));
                if (!myDebtAccountId && accounts[0]) {
                  setMyDebtAccountId(accounts[0].id);
                }
                setMyDebtAddToAccount(accounts.length > 0);
                setIsAddingMyDebt(true);
              }}
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
                                setMyDebtPayAmount(sisaHutang.toLocaleString('id-ID'));
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

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-400 font-mono pt-1">
                        <span>Jatuh Tempo: {debt.dueDate}</span>
                        {debt.addToAccount && debt.sourceAccountName && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            + Saldo {debt.sourceAccountName}
                          </span>
                        )}
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
      {/* SUBTAB 5: PIUTANG ORANG LAIN KE SAYA (UNIFIED + QR WA)    */}
      {/* ========================================================= */}

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
                  const items = getDebtLineItems(d);

                  return (
                    <div
                      key={d.id}
                      className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{d.debtorName}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                            isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {isPaid ? 'Lunas' : 'Belum Lunas'}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">{d.description}</p>
                        {items.length > 1 && (
                          <div className="mt-1.5 space-y-0.5 pl-2.5 border-l-2 border-indigo-300 dark:border-indigo-700">
                            {items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between gap-3 text-[11px] text-neutral-600 dark:text-neutral-300">
                                <span className="truncate">• {item.description}</span>
                                <span className="font-mono font-semibold shrink-0">Rp {item.amount.toLocaleString('id-ID')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400 font-mono mt-1">
                          <span>Invoice: {d.invoiceNumber}</span>
                          <span>•</span>
                          <span>Jatuh Tempo: {d.dueDate}</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                            <span>WA: {d.debtorPhone || 'Belum ada'}</span>
                            {editingPhoneDebtId === d.id ? (
                              <span className="inline-flex items-center gap-1 ml-1">
                                <input
                                  type="text"
                                  value={editingPhoneValue}
                                  onChange={(e) => setEditingPhoneValue(e.target.value)}
                                  placeholder="628..."
                                  className="px-2 py-0.5 rounded border text-xs w-28 bg-white dark:bg-neutral-900"
                                />
                                <button
                                  onClick={() => handleSavePhone(d.id)}
                                  className="px-2 py-0.5 rounded bg-indigo-600 text-white font-semibold text-[10px] cursor-pointer"
                                >
                                  Simpan
                                </button>
                                <button
                                  onClick={() => setEditingPhoneDebtId(null)}
                                  className="px-1 text-[10px] text-neutral-400 cursor-pointer"
                                >
                                  Batal
                                </button>
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingPhoneDebtId(d.id);
                                  setEditingPhoneValue(d.debtorPhone || '');
                                }}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline text-[10px] font-sans font-semibold cursor-pointer"
                              >
                                [Edit WA]
                              </button>
                            )}
                          </span>

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

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-right font-mono">
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                            Sisa: Rp {sisa.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            Total: Rp {d.amount.toLocaleString('id-ID')}
                          </span>
                        </div>

                        {!isPaid && (
                          <>
                            <button
                              onClick={() => {
                                setIncreasingDebt(d);
                                setIncreaseAmountInput('');
                                setIncreaseNoteInput('');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="Tambah Nominal Piutang"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah Piutang</span>
                            </button>

                            <button
                              onClick={() => {
                                setPayingDebt(d);
                                setPaymentInput(sisa.toLocaleString('id-ID'));
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                            >
                              Catat Bayar
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => openInvoiceModal(d)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          title="Pratinjau Tagihan WhatsApp & Gambar QR Code"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Tagih WA + QR</span>
                        </button>

                        <button
                          onClick={() => handleDownloadInvoicePDF(d)}
                          className="px-2.5 py-1.5 rounded-lg border text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1 cursor-pointer"
                          title="Unduh PDF Invoice"
                        >
                          <Download className="w-3.5 h-3.5 text-indigo-500" />
                          <span>PDF</span>
                        </button>

                        <button
                          onClick={() => deleteDebt(d.id)}
                          className={`flex items-center gap-1 rounded-lg transition-colors cursor-pointer ${
                            isPaid
                              ? 'px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 text-xs font-semibold'
                              : 'p-1.5 text-neutral-400 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                          }`}
                          title={isPaid ? 'Hapus Piutang Lunas' : 'Hapus Piutang'}
                        >
                          <Trash2 className="w-4 h-4" />
                          {isPaid && <span>Hapus</span>}
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

      {/* Old Laporan P&L and AccountingView subtabs unified into General Ledger above */}

      {/* ========================================================= */}
      {/* MODAL: CATAT / EDIT TRANSAKSI & PILIH COA                 */}
      {/* ========================================================= */}
      {isAddingTx && (() => {
        const baseCategories = txType === 'expense' ? EXPENSE_CATEGORY_OPTIONS : INCOME_CATEGORY_OPTIONS;
        const categoryOptions = baseCategories.includes(txCategory)
          ? baseCategories
          : [txCategory, ...baseCategories];
        const autoMappedCoa = getCoaForCategory(txCategory, txType, allCoaList);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
            <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {editingTx ? 'Edit Transaksi & Mapping COA' : 'Catat Transaksi Baru'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingTx(false);
                    setEditingTx(null);
                  }}
                  className="p-1 rounded text-neutral-400 hover:text-neutral-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTransaction} className="space-y-4">
                {/* Type Switch */}
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setTxType('expense');
                      if (!editingTx && !EXPENSE_CATEGORY_OPTIONS.includes(txCategory)) {
                        setTxCategory('Makan & Minum Harian');
                      }
                    }}
                    className={`py-2 rounded-xl border text-center transition-all cursor-pointer ${
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
                      if (!editingTx && !INCOME_CATEGORY_OPTIONS.includes(txCategory)) {
                        setTxCategory('Gaji & Tunjangan Tetap');
                      }
                    }}
                    className={`py-2 rounded-xl border text-center transition-all cursor-pointer ${
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
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs font-mono text-neutral-400">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        placeholder="150.000"
                        value={txAmount}
                        onChange={(e) => setTxAmount(formatCurrencyInput(e.target.value))}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border text-xs font-mono font-bold"
                      />
                    </div>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                      Kategori
                    </label>
                    <select
                      value={txCategory}
                      onChange={(e) => setTxCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border text-xs font-semibold"
                    >
                      {categoryOptions.map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                      Tanggal (Mendukung Back Date)
                    </label>
                    <input
                      type="date"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border text-xs font-semibold"
                    />
                    <div className="flex items-center gap-1 mt-1">
                      {[
                        { label: 'Hari Ini', days: 0 },
                        { label: 'Kemarin', days: 1 },
                        { label: '2 Hari Lalu', days: 2 }
                      ].map(p => (
                        <button
                          key={p.days}
                          type="button"
                          onClick={() => setTxDate(getOffsetDateStr(p.days))}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                            txDate === getOffsetDateStr(p.days)
                              ? 'bg-indigo-600 text-white'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* COA Lawan Selector (Otomatis atau Pilih Manual) */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Akun COA Lawan (Posting General Ledger)
                  </label>
                  <select
                    value={txCoaCode}
                    onChange={(e) => setTxCoaCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border text-xs font-semibold"
                  >
                    <option value="">
                      Otomatis dari Kategori ({autoMappedCoa.code} - {autoMappedCoa.name})
                    </option>
                    {(['expense', 'revenue', 'asset', 'liability', 'equity'] as const).map(grp => {
                      const items = allCoaList.filter(c => c.category === grp);
                      if (items.length === 0) return null;
                      const grpLabel =
                        grp === 'expense'
                          ? '5000 - Beban'
                          : grp === 'revenue'
                          ? '4000 - Pendapatan'
                          : grp === 'asset'
                          ? '1000 - Aset'
                          : grp === 'liability'
                          ? '2000 - Liabilitas'
                          : '3000 - Ekuitas';
                      return (
                        <optgroup key={grp} label={grpLabel}>
                          {items.map(coa => (
                            <option key={coa.code} value={coa.code}>
                              {coa.code} - {coa.name}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Biarkan "Otomatis" untuk mapping standar berdasarkan kategori, atau pilih akun COA spesifik untuk pencatatan jurnal & buku besar.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Catatan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Catatan tambahan transaksi..."
                    value={txNotes}
                    onChange={(e) => setTxNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border text-xs"
                  />
                </div>

                {/* Toggle: Beli dengan Hutang / PayLater / Kredit (Create mode only) */}
                {!editingTx && txType === 'expense' && (
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
                            <div className="relative flex items-center">
                              <span className="absolute left-2.5 text-[11px] font-mono text-neutral-400">Rp</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={debtDownPayment}
                                onChange={(e) => setDebtDownPayment(formatCurrencyInput(e.target.value))}
                                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border text-xs font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingTx(false);
                      setEditingTx(null);
                    }}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl border cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 cursor-pointer"
                  >
                    {editingTx ? 'Simpan Perubahan' : 'Simpan Transaksi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

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
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-mono text-neutral-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={accInitialBalance}
                    onChange={(e) => setAccInitialBalance(formatCurrencyInput(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border font-mono font-bold"
                  />
                </div>
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

              <div>
                <label className="block font-semibold mb-1">Mapping Akun COA (Opsional)</label>
                <select
                  value={accCoaCode}
                  onChange={(e) => setAccCoaCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border font-semibold"
                >
                  <option value="">Otomatis (Sesuai Tipe / Nama Akun)</option>
                  {allCoaList
                    .filter(c => c.category === 'asset')
                    .map(coa => (
                      <option key={coa.code} value={coa.code}>
                        {coa.code} - {coa.name}
                      </option>
                    ))}
                </select>
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
      {/* MODAL: EDIT AKUN BANK / DOMPET, NO REK & SALDO AWAL       */}
      {/* ========================================================= */}
      {editingAcc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Edit Data Akun: {editingAcc.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingAcc(null)}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateBalanceSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Nama Akun
                </label>
                <input
                  type="text"
                  required
                  value={editAccNameInput}
                  onChange={(e) => setEditAccNameInput(e.target.value)}
                  placeholder="Contoh: Bank BCA Utama"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  {editingAcc.type === 'bank'
                    ? 'No. Rekening Bank'
                    : editingAcc.type === 'ewallet'
                    ? 'No. HP / ID Dompet Digital'
                    : 'Nomor Identitas Kas (Opsional)'}
                </label>
                <input
                  type="text"
                  value={editAccNumberInput}
                  onChange={(e) => setEditAccNumberInput(e.target.value)}
                  placeholder={editingAcc.type === 'bank' ? 'Contoh: 873-049-2189' : 'Contoh: 0812-xxxx-xxxx'}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-mono text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Saldo Awal (Rp)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-mono text-neutral-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={editBalanceInput}
                    onChange={(e) => setEditBalanceInput(formatCurrencyInput(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-sm font-mono font-bold text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Mapping Akun COA (Aset)
                </label>
                <select
                  value={editAccCoaCode}
                  onChange={(e) => setEditAccCoaCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-neutral-100"
                >
                  <option value="">Otomatis (Sesuai Tipe / Nama Akun)</option>
                  {allCoaList
                    .filter(c => c.category === 'asset')
                    .map(coa => (
                      <option key={coa.code} value={coa.code}>
                        {coa.code} - {coa.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  value={editAccNotesInput}
                  onChange={(e) => setEditAccNotesInput(e.target.value)}
                  placeholder="Keterangan singkat rekening / akun"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAcc(null)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADJUSTMENT SALDO AKUN DENGAN PILIH COA              */}
      {/* ========================================================= */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                <span>Adjustment Saldo & Pilih COA</span>
              </h3>
              <button onClick={() => setIsAdjustmentModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCoaAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Akun Kas / Rekening yang Disesuaikan</label>
                <select
                  value={adjAccountId}
                  onChange={(e) => setAdjAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border font-semibold"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Saldo: Rp {(accountBalances[acc.id]?.currentBalance || 0).toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjType('increase')}
                  className={`py-2 rounded-xl border font-semibold cursor-pointer ${
                    adjType === 'increase'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-500'
                  }`}
                >
                  Penambahan Saldo (+)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjType('decrease')}
                  className={`py-2 rounded-xl border font-semibold cursor-pointer ${
                    adjType === 'decrease'
                      ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-bold'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-500'
                  }`}
                >
                  Pengurangan Saldo (-)
                </button>
              </div>

              <div>
                <label className="block font-semibold mb-1">Nominal Penyesuaian (Rp)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-mono text-neutral-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="50.000"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(formatCurrencyInput(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Pilih Akun Lawan COA (Chart of Accounts)</label>
                <select
                  value={adjCoaCode}
                  onChange={(e) => setAdjCoaCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border font-semibold"
                >
                  {allCoaList.map(coa => (
                    <option key={coa.code} value={coa.code}>
                      [{coa.code}] {coa.name} ({coa.category.toUpperCase()})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Penyesuaian ini akan otomatis terposting di General Ledger (Jurnal Umum, Buku Besar, dan Neraca).
                </p>
              </div>

              <div>
                <label className="block font-semibold mb-1">Tanggal Adjustment (Back Date)</label>
                <input
                  type="date"
                  value={adjDate}
                  onChange={(e) => setAdjDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border font-semibold"
                />
                <div className="flex items-center gap-1 mt-1">
                  {[
                    { label: 'Hari Ini', days: 0 },
                    { label: 'Kemarin', days: 1 },
                    { label: '2 Hari Lalu', days: 2 }
                  ].map(p => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => setAdjDate(getOffsetDateStr(p.days))}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                        adjDate === getOffsetDateStr(p.days)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Keterangan Penyesuaian</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Selisih biaya admin bank, pembulatan kas, dll."
                  value={adjDescription}
                  onChange={(e) => setAdjDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
                >
                  Simpan Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: VOID TRANSAKSI (BATALKAN AUDIT-SAFE)               */}
      {/* ========================================================= */}
      {voidingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <Ban className="w-4 h-4" />
                <span>Void / Batalkan Transaksi</span>
              </h3>
              <button onClick={() => setVoidingTx(null)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-1">
              <p className="font-bold">{voidingTx.title}</p>
              <p className="font-mono">
                {voidingTx.type === 'income' ? '+' : '-'} Rp {voidingTx.amount.toLocaleString('id-ID')} ({voidingTx.date})
              </p>
              <p className="text-[11px] opacity-90 pt-1">
                Transaksi asli tetap tersimpan utuh dan sistem akan membuatkan <strong>transaksi lawannya ([VOID])</strong> dengan nominal terbalik ({voidingTx.type === 'income' ? 'Pengeluaran' : 'Pemasukan'}) untuk menetralkan saldo akun, Jurnal Umum, Neraca, dan Laba Rugi.
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block font-semibold text-neutral-700 dark:text-neutral-300">
                Alasan Void (Opsional)
              </label>
              <input
                type="text"
                value={voidReasonInput}
                onChange={(e) => setVoidReasonInput(e.target.value)}
                placeholder="Contoh: Salah input nominal atau transaksi dibatalkan"
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setVoidingTx(null)}
                className="px-3 py-1.5 text-xs rounded-xl border"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  voidTransaction(voidingTx.id, voidReasonInput);
                  setVoidingTx(null);
                  setVoidReasonInput('');
                }}
                className="px-4 py-1.5 text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
              >
                Konfirmasi Void
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ATUR LIMIT ANGGARAN KATEGORI                       */}
      {/* ========================================================= */}
      {editingBudgetCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Atur Limit Anggaran: {editingBudgetCategory}
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateCategoryBudget(editingBudgetCategory, parseCurrencyInput(budgetLimitInput));
                setEditingBudgetCategory(null);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-neutral-500 mb-1">
                  Batas Anggaran Bulanan (Rp)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-mono text-neutral-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={budgetLimitInput}
                    onChange={(e) => setBudgetLimitInput(formatCurrencyInput(e.target.value))}
                    placeholder="1.500.000 (0 = Tanpa Batas)"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border text-sm font-mono font-bold"
                  />
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Berlaku setiap bulan (realisasi otomatis reset di tanggal 1 tiap bulan).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBudgetCategory(null)}
                  className="px-3 py-1.5 text-xs rounded-xl border cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs rounded-xl bg-indigo-600 text-white font-semibold cursor-pointer"
                >
                  Simpan Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: TAMBAH / PILIH KATEGORI ANGGARAN BULANAN           */}
      {/* ========================================================= */}
      {isAddingBudgetCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Atur Batas Anggaran Kategori
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingBudgetCategory(false)}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const targetCat =
                  newBudgetCategoryInput === '__custom__'
                    ? newBudgetCustomName.trim()
                    : newBudgetCategoryInput;
                if (!targetCat) return;
                updateCategoryBudget(targetCat, parseCurrencyInput(budgetLimitInput));
                setIsAddingBudgetCategory(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-neutral-500 mb-1">
                  Pilih Kategori Pengeluaran
                </label>
                <select
                  value={newBudgetCategoryInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewBudgetCategoryInput(val);
                    const existing = categoryBudgets.find(b => b.category === val)?.limit || 0;
                    setBudgetLimitInput(existing > 0 ? existing.toLocaleString('id-ID') : '');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border font-semibold"
                >
                  {EXPENSE_CATEGORY_OPTIONS.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__custom__">+ Kategori Lainnya (Ketik Sendiri)</option>
                </select>
              </div>

              {newBudgetCategoryInput === '__custom__' && (
                <div>
                  <label className="block font-semibold text-neutral-500 mb-1">
                    Nama Kategori Baru
                  </label>
                  <input
                    type="text"
                    required
                    value={newBudgetCustomName}
                    onChange={(e) => setNewBudgetCustomName(e.target.value)}
                    placeholder="Misal: Kesehatan, Pendidikan, Olahraga"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-neutral-500 mb-1">
                  Batas Anggaran Bulanan (Rp)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-mono text-neutral-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={budgetLimitInput}
                    onChange={(e) => setBudgetLimitInput(formatCurrencyInput(e.target.value))}
                    placeholder="1.500.000"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border text-sm font-mono font-bold"
                  />
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Realisasi belanja akan ter-reset otomatis tiap bulan baru tanpa menghapus riwayat transaksi.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingBudgetCategory(false)}
                  className="px-3 py-1.5 text-xs rounded-xl border cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs rounded-xl bg-indigo-600 text-white font-semibold cursor-pointer"
                >
                  Simpan Batas Budget
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
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-rose-500" />
                <span>Catat Hutang / Kewajiban Saya</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingMyDebt(false)}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
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
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Keperluan / Deskripsi</label>
                <input
                  type="text"
                  placeholder="Contoh: Pinjaman Modal Kerja, Cicilan Laptop, Dana Talangan"
                  value={myDebtDesc}
                  onChange={(e) => setMyDebtDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Total Hutang (Rp)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-mono text-neutral-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="3.500.000"
                    value={myDebtAmount}
                    onChange={(e) => setMyDebtAmount(formatCurrencyInput(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Tanggal Pencatatan</label>
                  <input
                    type="date"
                    value={myDebtIssuedDate}
                    onChange={(e) => setMyDebtIssuedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Jatuh Tempo</label>
                  <input
                    type="date"
                    value={myDebtDueDate}
                    onChange={(e) => setMyDebtDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700"
                  />
                </div>
              </div>

              {/* Pilihan Menambah Saldo Akun Apa */}
              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-2.5">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={myDebtAddToAccount}
                    disabled={accounts.length === 0}
                    onChange={(e) => setMyDebtAddToAccount(e.target.checked)}
                    className="mt-0.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                      Dana hutang ini menambah saldo akun keuangan
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Centang jika dana pinjaman masuk ke rekening bank, e-wallet, atau kas tunai Anda.
                    </span>
                  </div>
                </label>

                {accounts.length === 0 ? (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    Belum ada akun kas/bank terdaftar. Tambahkan akun di tab Akun & Saldo Awal jika ingin saldo bertambah otomatis.
                  </p>
                ) : myDebtAddToAccount && (
                  <div>
                    <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Menambah Saldo Akun:
                    </label>
                    <select
                      value={myDebtAccountId || accounts[0]?.id || ''}
                      onChange={(e) => setMyDebtAccountId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800 font-semibold"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} (Saldo saat ini: Rp {(accountBalances[acc.id]?.currentBalance || 0).toLocaleString('id-ID')})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1">
                      Otomatis menambah saldo akun tersebut & menjurnal Debit Kas/Bank vs Kredit Hutang di General Ledger.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingMyDebt(false)}
                  className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
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
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-mono text-neutral-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={myDebtPayAmount}
                    onChange={(e) => setMyDebtPayAmount(formatCurrencyInput(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border font-mono font-bold"
                  />
                </div>
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
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
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

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold">Rincian Item Piutang (Deskripsi & Nominal)</label>
                  <button
                    type="button"
                    onClick={() =>
                      setDebtLineItems((prev) => [
                        ...prev,
                        { id: `item-${Date.now()}-${prev.length + 1}`, description: '', amount: '' },
                      ])
                    }
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 font-semibold text-[11px] cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah Rincian</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {debtLineItems.map((row, idx) => (
                    <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-7">
                        <input
                          type="text"
                          required
                          placeholder={idx === 0 ? 'Contoh: Makan siang / Pinjaman' : 'Contoh: Beli sepatu'}
                          value={row.description}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDebtLineItems((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, description: val } : r))
                            );
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border"
                        />
                      </div>
                      <div className={debtLineItems.length > 1 ? 'col-span-4 relative flex items-center' : 'col-span-5 relative flex items-center'}>
                        <span className="absolute left-2.5 text-[11px] font-mono text-neutral-400">Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          placeholder="100.000"
                          value={row.amount}
                          onChange={(e) => {
                            const formatted = formatCurrencyInput(e.target.value);
                            setDebtLineItems((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, amount: formatted } : r))
                            );
                          }}
                          className="w-full pl-8 pr-2 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border font-mono font-bold"
                        />
                      </div>
                      {debtLineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDebtLineItems((prev) => prev.filter((r) => r.id !== row.id))
                          }
                          className="col-span-1 p-1.5 text-neutral-400 hover:text-rose-500 flex justify-center cursor-pointer"
                          title="Hapus rincian item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 font-mono">
                  <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                    Total Piutang ({debtLineItems.length} item):
                  </span>
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    Rp {debtLineItems.reduce((s, r) => s + parseCurrencyInput(r.amount), 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Tanggal Catat (Back Date)</label>
                  <input
                    type="date"
                    value={debtIssuedDate}
                    onChange={(e) => setDebtIssuedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Jatuh Tempo Pembayaran</label>
                  <input
                    type="date"
                    value={debtDueDate}
                    onChange={(e) => setDebtDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border"
                  />
                </div>
              </div>

              {/* Attach QR Code Khusus Piutang Ini */}
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-indigo-500" />
                    Gambar QR Pembayaran (Opsional)
                  </span>
                  {debtQrDataUrl && (
                    <button
                      type="button"
                      onClick={() => setDebtQrDataUrl('')}
                      className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                    >
                      Hapus QR
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {debtQrDataUrl && (
                    <img src={debtQrDataUrl} alt="QR Tagihan" className="w-12 h-12 rounded-lg border bg-white object-contain" />
                  )}
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-semibold cursor-pointer hover:bg-neutral-100">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{debtQrDataUrl ? 'Ganti Gambar QR' : 'Unggah Gambar QR'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleUploadDebtQrImage(f);
                      }}
                    />
                  </label>
                </div>
                {!debtQrDataUrl && profile.paymentQrDataUrl && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    Otomatis memakai QR Default dari Pengaturan Profil jika tidak diunggah khusus.
                  </p>
                )}
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
      {/* MODAL: PRATINJAU INVOICE WA & GAMBAR QR CODE               */}
      {/* ========================================================= */}
      {invoiceModalDebt && (() => {
        const invoiceSummary = buildCombinedInvoiceSummary(invoiceModalDebt, combinedInvoiceDebts);
        const activeQr = invoiceModalDebt.qrImageDataUrl || profile.paymentQrDataUrl;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    Invoice & QR Tagihan WhatsApp
                  </h3>
                </div>
                <button onClick={() => setInvoiceModalDebtId(null)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Combine multiple open debts of same debtor */}
              {debtorSiblingDebts.length > 1 && (
                <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 space-y-2 text-xs">
                  <p className="font-bold text-indigo-900 dark:text-indigo-200">
                    Gabungkan Piutang {invoiceModalDebt.debtorName} dalam 1 Invoice ({combinedInvoiceDebts.length}/{debtorSiblingDebts.length}):
                  </p>
                  <div className="space-y-1.5">
                    {debtorSiblingDebts.map((sib) => {
                      const isChecked = combinedInvoiceDebts.some((c) => c.id === sib.id);
                      const isPrimary = sib.id === invoiceModalDebt.id;
                      return (
                        <label key={sib.id} className="flex items-center justify-between gap-2 cursor-pointer">
                          <span className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isPrimary}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSelectedCombinedDebtIds((prev) =>
                                  checked
                                    ? Array.from(new Set([...prev, sib.id]))
                                    : prev.filter((id) => id !== sib.id || id === invoiceModalDebt.id)
                                );
                              }}
                              className="rounded accent-indigo-600"
                            />
                            <span className="truncate text-neutral-700 dark:text-neutral-300">
                              <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 mr-1">{sib.invoiceNumber}</span>
                              {sib.description}
                            </span>
                          </span>
                          <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200 shrink-0">
                            Rp {Math.max(0, sib.amount - sib.amountPaid).toLocaleString('id-ID')}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Itemized Breakdown Preview */}
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 text-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">{invoiceModalDebt.debtorName}</span>
                  <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold text-right truncate max-w-[200px]">
                    {invoiceSummary.invoiceNumbers}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Rincian Item Tagihan:
                  </p>
                  {invoiceSummary.lineItems.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="flex items-start justify-between gap-3 text-neutral-700 dark:text-neutral-300">
                      <span className="leading-snug">
                        {idx + 1}. {item.description}
                      </span>
                      <span className="font-mono font-semibold shrink-0">
                        Rp {item.amount.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 space-y-1 font-mono">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span>Total Tagihan:</span>
                    <span>Rp {invoiceSummary.totalAmount.toLocaleString('id-ID')}</span>
                  </div>
                  {invoiceSummary.totalPaid > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400">
                      <span>Sudah Dibayar:</span>
                      <span>Rp {invoiceSummary.totalPaid.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-neutral-600 dark:text-neutral-300 font-semibold">Sisa Tagihan:</span>
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      Rp {invoiceSummary.remaining.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Active QR Display & Upload Override */}
              <div className="p-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-center space-y-3">
                {activeQr ? (
                  <>
                    <img src={activeQr} alt="QR Pembayaran" className="w-40 h-40 mx-auto object-contain rounded-xl border bg-white p-1" />
                    <p className="text-[11px] text-neutral-500">
                      {invoiceModalDebt.qrImageDataUrl
                        ? 'Menggunakan gambar QR khusus untuk piutang ini.'
                        : 'Menggunakan QR Code Default dari Pengaturan Profil.'}
                    </p>
                  </>
                ) : (
                  <div className="py-4 text-neutral-400 space-y-1">
                    <QrCode className="w-8 h-8 mx-auto opacity-40" />
                    <p className="text-xs">Belum ada gambar QR Code terpasang.</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold cursor-pointer hover:bg-neutral-100">
                    <Upload className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{invoiceModalDebt.qrImageDataUrl ? 'Ganti Gambar QR' : 'Lampirkan Gambar QR'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleUploadDebtQrImage(f, invoiceModalDebt.id);
                      }}
                    />
                  </label>
                  {activeQr && (
                    <button
                      type="button"
                      onClick={() => handleDownloadQrImage(activeQr, invoiceModalDebt.invoiceNumber)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Unduh PNG QR</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => void handleShareQrWithInvoice(invoiceModalDebt, combinedInvoiceDebts)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Bagikan Gambar QR + Tagihan (HP / Share)</span>
                </button>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenWhatsAppWithInvoice(invoiceModalDebt, combinedInvoiceDebts)}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadInvoicePDF(invoiceModalDebt, combinedInvoiceDebts)}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-500" />
                    <span>PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const txt = buildInvoiceText(invoiceModalDebt, Boolean(activeQr), combinedInvoiceDebts);
                      navigator.clipboard?.writeText(txt);
                      showToast('Teks tagihan berhasil disalin!', 'success');
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Salin</span>
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 text-center">
                  WhatsApp web/link tidak mengizinkan lampiran gambar otomatis; gunakan <strong>Bagikan Gambar QR</strong> di HP atau lampirkan PNG QR saat chat terbuka.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

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
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-mono text-neutral-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={paymentInput}
                    onChange={(e) => setPaymentInput(formatCurrencyInput(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border text-sm font-mono font-bold"
                  />
                </div>
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

      {/* ========================================================= */}
      {/* MODAL: TAMBAH NOMINAL PIUTANG                              */}
      {/* ========================================================= */}
      {increasingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Tambah Nominal Piutang: {increasingDebt.debtorName}
            </h3>

            <p className="text-xs text-neutral-500">
              Piutang saat ini: <strong className="font-mono text-neutral-800 dark:text-neutral-200">Rp {increasingDebt.amount.toLocaleString('id-ID')}</strong>
            </p>

            <form onSubmit={handleSaveIncreaseDebt} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-500 mb-1">
                  Tambahan Nominal (Rp)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-mono text-neutral-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={increaseAmountInput}
                    onChange={(e) => setIncreaseAmountInput(formatCurrencyInput(e.target.value))}
                    placeholder="500.000"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border text-sm font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-500 mb-1">
                  Keterangan Penambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={increaseNoteInput}
                  onChange={(e) => setIncreaseNoteInput(e.target.value)}
                  placeholder="Misal: Tambahan project tahap 2"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIncreasingDebt(null)}
                  className="px-3 py-1.5 text-xs rounded-xl border cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
                >
                  Simpan Tambahan
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
