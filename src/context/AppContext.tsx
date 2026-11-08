import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  NavigationTab, 
  TodoItem, 
  FinanceTransaction, 
  DebtReceivable,
  CategoryBudget,
  NoteItem, 
  UserProfile, 
  HabitItem,
  FinancialAccount,
  MyDebtLiability,
  DailyAuditRecord,
  AccountAuditItem,
  AccountTransferPayload,
  ReimbursementItem,
  ReimburseRate,
  ReimburseRole,
  ReimburseProjectType,
  ReimburseStatus
} from '../types';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface AppContextType {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  profile: UserProfile;
  updateProfile: (profile: Partial<UserProfile>) => void;
  
  // Todos
  todos: TodoItem[];
  addTodo: (todo: Omit<TodoItem, 'id'>) => void;
  updateTodo: (id: string, updates: Partial<TodoItem>) => void;
  deleteTodo: (id: string) => void;
  toggleTodoStatus: (id: string) => void;
  
  // Financial Accounts & Saldo Awal (Bank, E-Wallet, Cash)
  accounts: FinancialAccount[];
  addAccount: (account: Omit<FinancialAccount, 'id'>) => void;
  updateAccount: (id: string, updates: Partial<FinancialAccount>) => void;
  deleteAccount: (id: string) => void;
  updateInitialBalance: (id: string, initialBalance: number) => void;
  importAccountsFromCSV: (csvText: string) => { success: boolean; count: number; error?: string };
  transferBetweenAccounts: (payload: AccountTransferPayload) => { success: boolean; transferId?: string; error?: string };

  // Finance Transactions & Cash / Non-Cash
  transactions: FinanceTransaction[];
  addTransaction: (tx: Omit<FinanceTransaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, updates: Partial<FinanceTransaction>) => void;

  // Debts / Piutang Orang Lain ke Saya
  debts: DebtReceivable[];
  addDebt: (debt: Omit<DebtReceivable, 'id' | 'invoiceNumber'>, sourceAccountId?: string, deductFromAccount?: boolean) => void;
  updateDebt: (id: string, updates: Partial<DebtReceivable>) => void;
  deleteDebt: (id: string) => void;
  recordDebtPayment: (id: string, paymentAmount: number, destinationAccountId?: string) => void;

  // Hutang Saya ke Pihak Lain (Liabilitas / Cicilan Transaksi)
  myDebts: MyDebtLiability[];
  addMyDebt: (debt: Omit<MyDebtLiability, 'id'>) => string;
  updateMyDebt: (id: string, updates: Partial<MyDebtLiability>) => void;
  deleteMyDebt: (id: string) => void;
  payMyDebt: (debtId: string, amount: number, sourceAccountId: string, notes?: string) => void;

  // Cek Harian & Rekonsiliasi Saldo (Daily Audit)
  dailyAudits: DailyAuditRecord[];
  saveDailyAudit: (audit: Omit<DailyAuditRecord, 'id' | 'verifiedAt'>) => void;
  deleteDailyAudit: (id: string) => void;
  autoReconcileDifference: (auditItem: AccountAuditItem, date: string) => void;

  // Category Budgets for Overbudget detection
  categoryBudgets: CategoryBudget[];
  updateCategoryBudget: (category: string, limit: number) => void;
  
  // Notes
  notes: NoteItem[];
  noteCategories: string[];
  addNote: (note: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNote: (id: string, updates: Partial<NoteItem>) => void;
  deleteNote: (id: string) => void;
  togglePinNote: (id: string) => void;
  addNoteCategory: (category: string) => void;
  deleteNoteCategory: (category: string) => void;

  // Reimbursement Module (Rate Matrix & Project Claims)
  reimbursements: ReimbursementItem[];
  reimburseRates: ReimburseRate[];
  addReimbursement: (item: Omit<ReimbursementItem, 'id' | 'no' | 'createdAt'>) => string;
  updateReimbursement: (id: string, updates: Partial<ReimbursementItem>) => void;
  deleteReimbursement: (id: string) => void;
  updateReimburseStatus: (id: string, status: ReimburseStatus, paymentAccountId?: string) => void;
  updateReimburseRate: (role: ReimburseRole, type: ReimburseProjectType, wdRate: number, weRate: number) => void;
  resetReimburseRatesToDefault: () => void;

  // Habits
  habits: HabitItem[];
  toggleHabitDay: (habitId: string, dateStr: string) => void;
  addHabit: (title: string, color: string) => void;
  deleteHabit: (id: string) => void;

  // Global Toast
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;

  // Storage Utilities
  exportDataJSON: () => void;
  importDataJSON: (jsonString: string) => boolean;
  resetAllData: () => void;
  
  // Global search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const SEED_PROFILE: UserProfile = {
  name: 'Alif Pratama',
  title: 'Lead Product Engineer & Creative Tech',
  avatarUrl: '/src/assets/images/user_avatar_1793517278515.jpg',
  currencySymbol: 'Rp',
  monthlyBudget: 15000000,
  bankAccountDetails: 'BCA: 873-049-2189 a/n Alif Pratama\nMandiri: 137-00-1982736-1\nGoPay/OVO: 0812-8899-7721'
};

const SEED_TODOS: TodoItem[] = [
  {
    id: 'td-1',
    title: 'Review System Design & API Contract Q4',
    description: 'Pastikan endpoint modularitas super-app dan integrasi client-side library sesuai spesifikasi.',
    dueDate: '2026-11-01',
    dueTime: '14:00',
    priority: 'high',
    status: 'in_progress',
    category: 'Work',
    tags: ['Architecture', 'Tech Lead'],
    subtasks: [
      { id: 'st-1', text: 'Periksa dokumentasi types', completed: true },
      { id: 'st-2', text: 'Validasi kompatibilitas PDF Lib & QR', completed: true },
      { id: 'st-3', text: 'Review performa Lighthouse', completed: false }
    ]
  },
  {
    id: 'td-2',
    title: 'Generate QR & Barcode inventaris lab',
    description: 'Cetak barcode Code128 dan QR code untuk 25 hardware periferal baru.',
    dueDate: '2026-11-02',
    priority: 'medium',
    status: 'pending',
    category: 'Operations',
    tags: ['Barcode', 'Inventory']
  },
  {
    id: 'td-3',
    title: 'Kirim Invoice Penagihan Desain UI ke Budi Santoso',
    description: 'Follow up piutang proyek freelance bulan Oktober via WhatsApp.',
    dueDate: '2026-11-01',
    dueTime: '15:30',
    priority: 'high',
    status: 'pending',
    category: 'Finance',
    tags: ['Invoice', 'Piutang']
  }
];

const SEED_TRANSACTIONS: FinanceTransaction[] = [
  {
    id: 'tx-1',
    type: 'income',
    title: 'Gaji Bulanan Software Engineering',
    amount: 28500000,
    category: 'Salary',
    date: '2026-11-01',
    paymentMethod: 'Bank Transfer',
    walletType: 'non_cash',
    accountName: 'BCA Utama',
    notes: 'Transfer otomatis payroll.'
  },
  {
    id: 'tx-2',
    type: 'expense',
    title: 'Langganan Cloud Server & Database',
    amount: 1450000,
    category: 'Work & Software',
    date: '2026-11-01',
    paymentMethod: 'Credit Card',
    walletType: 'non_cash',
    accountName: 'Kartu Kredit Mandiri',
    notes: 'Google Cloud & Vercel'
  },
  {
    id: 'tx-3',
    type: 'expense',
    title: 'Tarik Tunai ATM untuk Kas Harian',
    amount: 1500000,
    category: 'Cash Withdrawal',
    date: '2026-10-31',
    paymentMethod: 'Cash',
    walletType: 'cash',
    accountName: 'Dompet Tunai Fisik',
    notes: 'Tarik tunai ATM BCA'
  },
  {
    id: 'tx-4',
    type: 'expense',
    title: 'Belanja Sayur & Buah di Pasar Tradisional',
    amount: 350000,
    category: 'Groceries',
    date: '2026-10-31',
    paymentMethod: 'Cash',
    walletType: 'cash',
    accountName: 'Dompet Tunai Fisik',
    notes: 'Pembayaran uang tunai'
  },
  {
    id: 'tx-5',
    type: 'expense',
    title: 'Makan Malam Resto & Coffee Meetup',
    amount: 680000,
    category: 'Food & Dining',
    date: '2026-10-30',
    paymentMethod: 'E-Wallet',
    walletType: 'non_cash',
    accountName: 'GoPay',
    notes: 'Dinner dengan klien'
  },
  {
    id: 'tx-6',
    type: 'expense',
    title: 'Bensin & Tol Mobil Operasional',
    amount: 450000,
    category: 'Transport',
    date: '2026-10-29',
    paymentMethod: 'Cash',
    walletType: 'cash',
    accountName: 'Dompet Tunai Fisik',
    notes: 'Uang bensin cash'
  },
  {
    id: 'tx-7',
    type: 'income',
    title: 'Pembayaran DP Proyek Landing Page SaaS',
    amount: 5000000,
    category: 'Freelance',
    date: '2026-10-28',
    paymentMethod: 'Bank Transfer',
    walletType: 'non_cash',
    accountName: 'BCA Utama',
    notes: 'DP 50% dari klien'
  },
  {
    id: 'tx-8',
    type: 'expense',
    title: 'Supermarket Belanja Bulanan',
    amount: 2200000,
    category: 'Groceries',
    date: '2026-10-27',
    paymentMethod: 'E-Wallet',
    walletType: 'non_cash',
    accountName: 'OVO',
    notes: 'Groceries bulanan'
  }
];

const SEED_DEBTS: DebtReceivable[] = [
  {
    id: 'dbt-1',
    debtorName: 'Budi Santoso (Studio Visual)',
    debtorPhone: '6281234567890',
    debtorEmail: 'budi.santoso@studiovisual.id',
    amount: 4500000,
    amountPaid: 1500000,
    dueDate: '2026-11-05',
    issuedDate: '2026-10-15',
    description: 'Pelunasan Desain Sistem UI/UX & Redesain Dashboard Web',
    status: 'partial',
    invoiceNumber: 'INV-2026-001',
    notes: 'Sudah DP 1.5jt, sisa 3jt dibayarkan sebelum tanggal 5 Nov.'
  },
  {
    id: 'dbt-2',
    debtorName: 'Rian Hidayat',
    debtorPhone: '6285711223344',
    debtorEmail: 'rian.hidayat@gmail.com',
    amount: 1200000,
    amountPaid: 0,
    dueDate: '2026-11-03',
    issuedDate: '2026-10-20',
    description: 'Pinjaman Talangan Pembelian Hardware Monitor Dell',
    status: 'unpaid',
    invoiceNumber: 'INV-2026-002',
    notes: 'Janji bayar awal bulan saat gajian.'
  },
  {
    id: 'dbt-3',
    debtorName: 'Siti Rahma (CV Maju Digital)',
    debtorPhone: '6281988776655',
    debtorEmail: 'siti@majudigital.co.id',
    amount: 3000000,
    amountPaid: 3000000,
    dueDate: '2026-10-28',
    issuedDate: '2026-10-10',
    description: 'Konsultasi Optimasi Performa Web & SEO',
    status: 'paid',
    invoiceNumber: 'INV-2026-003',
    notes: 'Sudah lunas ditransfer ke rekening BCA.'
  }
];

const SEED_CATEGORY_BUDGETS: CategoryBudget[] = [
  { category: 'Food & Dining', limit: 2500000 },
  { category: 'Groceries', limit: 2000000 },
  { category: 'Work & Software', limit: 1200000 },
  { category: 'Transport', limit: 800000 },
  { category: 'Utilities', limit: 1000000 },
  { category: 'Entertainment', limit: 1000000 },
];

const SEED_NOTES: NoteItem[] = [
  {
    id: 'nt-1',
    title: 'Panduan Arsitektur Modular OmniHub',
    category: 'Architecture',
    tags: ['Framework', 'Guide', 'Scalability'],
    isPinned: true,
    createdAt: '2026-10-25',
    updatedAt: '2026-11-01',
    content: `# Arsitektur Super App OmniHub

OmniHub dirancang dengan prinsip **Domain-Driven Modular Architecture**:
- Pemisahan dompet Tunai (Cash) dan Non-Tunai (Rekening/E-Wallet)
- Manajemen Piutang & Generator Invoice Resmi siap kirim WhatsApp
- Engine Remove BG client-side cepat tanpa kirim data ke luar
- Laporan Bulanan Laba-Rugi (P&L) dengan alarm deteksi overbudget otomatis
`
  }
];

const SEED_HABITS: HabitItem[] = [
  { id: 'hb-1', title: 'Deep Work 2 Sesi (90 Menit)', targetPerWeek: 5, completedDays: ['2026-10-28', '2026-10-29', '2026-10-31', '2026-11-01'], color: 'indigo' },
  { id: 'hb-2', title: 'Minum Air Mineral 2.5 Liter', targetPerWeek: 7, completedDays: ['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'], color: 'cyan' },
];

const SEED_ACCOUNTS: FinancialAccount[] = [
  {
    id: 'acc-bca',
    name: 'BCA Utama',
    type: 'bank',
    initialBalance: 18500000,
    accountNumber: '8830129841',
    color: '#2563eb',
    notes: 'Rekening tabungan utama & payroll'
  },
  {
    id: 'acc-mandiri',
    name: 'Mandiri Payroll',
    type: 'bank',
    initialBalance: 7200000,
    accountNumber: '1370019283741',
    color: '#0891b2',
    notes: 'Rekening operasional & kartu kredit'
  },
  {
    id: 'acc-gopay',
    name: 'GoPay',
    type: 'ewallet',
    initialBalance: 850000,
    accountNumber: '081234567890',
    color: '#059669',
    notes: 'E-Wallet harian & GoFood'
  },
  {
    id: 'acc-dana',
    name: 'DANA',
    type: 'ewallet',
    initialBalance: 600000,
    accountNumber: '081234567890',
    color: '#0284c7',
    notes: 'E-Wallet tagihan & belanja'
  },
  {
    id: 'acc-ovo',
    name: 'OVO',
    type: 'ewallet',
    initialBalance: 450000,
    accountNumber: '081234567890',
    color: '#7c3aed',
    notes: 'E-Wallet transportasi'
  },
  {
    id: 'acc-cash',
    name: 'Dompet Tunai Fisik',
    type: 'cash',
    initialBalance: 750000,
    color: '#d97706',
    notes: 'Uang fisik di dompet & kas kecil'
  }
];

const SEED_MY_DEBTS: MyDebtLiability[] = [
  {
    id: 'mdeb-1',
    creditorName: 'GoPay Later',
    description: 'Pembelian Meja Kerja Ergonomis & Monitor Stand',
    amount: 3600000,
    amountPaid: 1200000,
    dueDate: '2026-11-15',
    issuedDate: '2026-10-15',
    status: 'partial',
    sourceAccountId: 'acc-gopay',
    category: 'Work & Software',
    notes: 'Cicilan 3 bulan, sisa 2 bulan.'
  },
  {
    id: 'mdeb-2',
    creditorName: 'Bank BCA (Kartu Kredit)',
    description: 'Tiket Pesawat & Akomodasi Konferensi Tech',
    amount: 4200000,
    amountPaid: 0,
    dueDate: '2026-11-20',
    issuedDate: '2026-10-25',
    status: 'unpaid',
    sourceAccountId: 'acc-bca',
    category: 'Work & Software',
    notes: 'Jatuh tempo 20 November.'
  },
  {
    id: 'mdeb-3',
    creditorName: 'Hendra Wijaya (Rekan Kerja)',
    description: 'Talangan Service Mobil Dinas',
    amount: 800000,
    amountPaid: 800000,
    dueDate: '2026-10-30',
    issuedDate: '2026-10-10',
    status: 'paid',
    sourceAccountId: 'acc-bca',
    category: 'Operations',
    notes: 'Sudah lunas ditransfer kembali.'
  }
];

const SEED_DAILY_AUDITS: DailyAuditRecord[] = [
  {
    id: 'audit-1',
    date: '2026-11-01',
    verifiedAt: '2026-11-01T21:00:00.000Z',
    accountAudits: [
      { accountId: 'acc-bca', accountName: 'BCA Utama', accountType: 'bank', systemBalance: 46500000, actualBalance: 46500000, difference: 0 },
      { accountId: 'acc-mandiri', accountName: 'Mandiri Payroll', accountType: 'bank', systemBalance: 5750000, actualBalance: 5750000, difference: 0 },
      { accountId: 'acc-gopay', accountName: 'GoPay', accountType: 'ewallet', systemBalance: 170000, actualBalance: 170000, difference: 0 },
      { accountId: 'acc-dana', accountName: 'DANA', accountType: 'ewallet', systemBalance: 600000, actualBalance: 600000, difference: 0 },
      { accountId: 'acc-ovo', accountName: 'OVO', accountType: 'ewallet', systemBalance: 450000, actualBalance: 450000, difference: 0 },
      { accountId: 'acc-cash', accountName: 'Dompet Tunai Fisik', accountType: 'cash', systemBalance: 1450000, actualBalance: 1450000, difference: 0 }
    ],
    totalSystemBalance: 54920000,
    totalActualBalance: 54920000,
    totalDifference: 0,
    isBalanced: true,
    notes: 'Semua saldo bank, e-wallet, dan uang fisik cocok 100%.'
  }
];

const SEED_NOTE_CATEGORIES = ['Umum', 'Ide & Konsep', 'Materi & Riset', 'Work', 'Meeting', 'Arsitektur'];

export const DEFAULT_REIMBURSE_RATES: ReimburseRate[] = [
  { id: 'rate-1', role: 'M', type: 'Onsite', wdRate: 44500, weRate: 69500 },
  { id: 'rate-2', role: 'M', type: 'Online', wdRate: 18750, weRate: 37500 },
  { id: 'rate-3', role: 'TPM', type: 'Onsite', wdRate: 75750, weRate: 100750 },
  { id: 'rate-4', role: 'TPM', type: 'Online', wdRate: 33750, weRate: 52500 },
  { id: 'rate-5', role: 'PM', type: 'Onsite', wdRate: 132000, weRate: 157000 },
  { id: 'rate-6', role: 'PM', type: 'Online', wdRate: 60000, weRate: 78750 },
];

export const SEED_REIMBURSEMENTS: ReimbursementItem[] = [
  {
    id: 'rmb-1',
    no: 1,
    submissionDate: '2026-08-12',
    property: 'Swiss-Belinn-Yogyakarta',
    typeProject: 'Onsite',
    role: 'M',
    startDate: '2026-09-26',
    endDate: '2026-09-25',
    wdDays: 22,
    weDays: 2,
    totalDays: 24,
    description: 'Swiss-Belinn-Yogyakarta, Onsite, WD=22, WE=2, Project: 26/09/2026 - 25/09/2026',
    wdRate: 44500,
    weRate: 69500,
    wdAmount: 979000,
    weAmount: 139000,
    totalAmount: 1118000,
    status: 'Done',
    deliveryDate: '11/4/2026 21:36:49',
    createdAt: '2026-08-12T08:00:00.000Z'
  },
  {
    id: 'rmb-2',
    no: 2,
    submissionDate: '2026-08-12',
    property: 'Metland Marron Tomohon',
    typeProject: 'Onsite',
    role: 'M',
    startDate: '2026-09-01',
    endDate: '2026-09-17',
    wdDays: 19,
    weDays: 4,
    totalDays: 23,
    description: 'Metland Marron Tomohon, Onsite, WD=19, WE=4, Project: 01/09/2026 - 17/09/2026',
    wdRate: 44500,
    weRate: 69500,
    wdAmount: 845500,
    weAmount: 278000,
    totalAmount: 1123500,
    status: 'Done',
    deliveryDate: '11/4/2026 21:36:49',
    createdAt: '2026-08-12T09:30:00.000Z'
  },
  {
    id: 'rmb-3',
    no: 3,
    submissionDate: '2026-08-14',
    property: 'Metland Marron Tomohon',
    typeProject: 'Online',
    role: 'M',
    startDate: '2026-09-29',
    endDate: '2026-09-30',
    wdDays: 4,
    weDays: 0,
    totalDays: 2, // 2 hari kerja (sehari 2 sesi -> 4 sesi WD)
    description: 'Metland Marron Tomohon, Online, WD=4, WE=0, Project: 29/09/2026 - 30/09/2026',
    wdRate: 18750,
    weRate: 37500,
    wdAmount: 75000,
    weAmount: 0,
    totalAmount: 75000,
    status: 'Done',
    deliveryDate: '11/4/2026 21:36:49',
    createdAt: '2026-08-14T10:15:00.000Z'
  },
  {
    id: 'rmb-4',
    no: 4,
    submissionDate: '2026-08-15',
    property: 'Adhisthana Hotel Yogyakarta',
    typeProject: 'Onsite',
    role: 'M',
    startDate: '2026-10-01',
    endDate: '2026-10-19',
    wdDays: 13,
    weDays: 3,
    totalDays: 16,
    description: 'Adhisthana Hotel Yogyakarta, Onsite, WD=13, WE=3, Project: 01/10/2026 - 19/10/2026',
    wdRate: 44500,
    weRate: 69500,
    wdAmount: 578500,
    weAmount: 208500,
    totalAmount: 787000,
    status: 'Submitted',
    deliveryDate: '11/4/2026 21:36:49',
    createdAt: '2026-08-15T14:20:00.000Z'
  }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('omnihub_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'dark';
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('omnihub_profile');
    return saved ? JSON.parse(saved) : SEED_PROFILE;
  });

  // Financial Accounts (Bank, E-Wallet, Cash) with initial balances
  const [accounts, setAccounts] = useState<FinancialAccount[]>(() => {
    const saved = localStorage.getItem('omnihub_accounts');
    return saved ? JSON.parse(saved) : SEED_ACCOUNTS;
  });

  const [todos, setTodos] = useState<TodoItem[]>(() => {
    const saved = localStorage.getItem('omnihub_todos');
    return saved ? JSON.parse(saved) : SEED_TODOS;
  });

  const [transactions, setTransactions] = useState<FinanceTransaction[]>(() => {
    const saved = localStorage.getItem('omnihub_transactions');
    return saved ? JSON.parse(saved) : SEED_TRANSACTIONS;
  });

  // Piutang Orang ke Saya
  const [debts, setDebts] = useState<DebtReceivable[]>(() => {
    const saved = localStorage.getItem('omnihub_debts');
    return saved ? JSON.parse(saved) : SEED_DEBTS;
  });

  // Hutang Saya ke Pihak Lain (Liabilitas / PayLater / Cicilan)
  const [myDebts, setMyDebts] = useState<MyDebtLiability[]>(() => {
    const saved = localStorage.getItem('omnihub_my_debts');
    return saved ? JSON.parse(saved) : SEED_MY_DEBTS;
  });

  // Cek Harian & Rekonsiliasi Saldo
  const [dailyAudits, setDailyAudits] = useState<DailyAuditRecord[]>(() => {
    const saved = localStorage.getItem('omnihub_daily_audits');
    return saved ? JSON.parse(saved) : SEED_DAILY_AUDITS;
  });

  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>(() => {
    const saved = localStorage.getItem('omnihub_budgets');
    return saved ? JSON.parse(saved) : SEED_CATEGORY_BUDGETS;
  });

  const [notes, setNotes] = useState<NoteItem[]>(() => {
    const saved = localStorage.getItem('omnihub_notes');
    return saved ? JSON.parse(saved) : SEED_NOTES;
  });

  const [noteCategories, setNoteCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('omnihub_note_categories');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    // Collect from seed notes and defaults
    const combined = Array.from(new Set([...SEED_NOTE_CATEGORIES, ...SEED_NOTES.map(n => n.category)]));
    return combined;
  });

  const [habits, setHabits] = useState<HabitItem[]>(() => {
    const saved = localStorage.getItem('omnihub_habits');
    return saved ? JSON.parse(saved) : SEED_HABITS;
  });

  // Reimbursement Module State (Rates & Claims from Excel)
  const [reimbursements, setReimbursements] = useState<ReimbursementItem[]>(() => {
    const saved = localStorage.getItem('omnihub_reimbursements');
    if (saved) {
      try {
        const parsed: ReimbursementItem[] = JSON.parse(saved);
        // Self-heal / migrate: Khusus Online, sehari dianggap 2 sesi, jadi # Hari Kerja = total sesi / 2
        return parsed.map(item => {
          if (item.typeProject === 'Online') {
            const calculatedHari = Math.max(1, Math.round((item.wdDays + item.weDays) / 2));
            return {
              ...item,
              totalDays: calculatedHari
            };
          }
          return item;
        });
      } catch {
        return SEED_REIMBURSEMENTS;
      }
    }
    return SEED_REIMBURSEMENTS;
  });

  const [reimburseRates, setReimburseRates] = useState<ReimburseRate[]>(() => {
    const saved = localStorage.getItem('omnihub_reimburse_rates');
    return saved ? JSON.parse(saved) : DEFAULT_REIMBURSE_RATES;
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('omnihub_theme', theme);
  }, [theme]);

  // Persist items
  useEffect(() => {
    localStorage.setItem('omnihub_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('omnihub_todos', JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem('omnihub_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('omnihub_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('omnihub_debts', JSON.stringify(debts));
  }, [debts]);

  useEffect(() => {
    localStorage.setItem('omnihub_my_debts', JSON.stringify(myDebts));
  }, [myDebts]);

  useEffect(() => {
    localStorage.setItem('omnihub_daily_audits', JSON.stringify(dailyAudits));
  }, [dailyAudits]);

  useEffect(() => {
    localStorage.setItem('omnihub_budgets', JSON.stringify(categoryBudgets));
  }, [categoryBudgets]);

  useEffect(() => {
    localStorage.setItem('omnihub_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('omnihub_note_categories', JSON.stringify(noteCategories));
  }, [noteCategories]);

  useEffect(() => {
    localStorage.setItem('omnihub_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('omnihub_reimbursements', JSON.stringify(reimbursements));
  }, [reimbursements]);

  useEffect(() => {
    localStorage.setItem('omnihub_reimburse_rates', JSON.stringify(reimburseRates));
  }, [reimburseRates]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3800);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
    showToast('Profil dan informasi pembayaran diperbarui', 'success');
  };

  // Todo operations
  const addTodo = (newTodo: Omit<TodoItem, 'id'>) => {
    const id = 'td-' + Date.now();
    setTodos(prev => [ { ...newTodo, id }, ...prev ]);
    showToast(`Tugas "${newTodo.title}" berhasil ditambahkan!`, 'success');
  };

  const updateTodo = (id: string, updates: Partial<TodoItem>) => {
    setTodos(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));
    showToast('Tugas diperbarui', 'info');
  };

  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    showToast('Tugas telah dihapus', 'info');
  };

  const toggleTodoStatus = (id: string) => {
    setTodos(prev => prev.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'completed' ? 'pending' : 'completed';
        if (nextStatus === 'completed') {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
        }
        return {
          ...t,
          status: nextStatus,
          completedAt: nextStatus === 'completed' ? new Date().toISOString().split('T')[0] : undefined
        };
      }
      return t;
    }));
  };

  // Financial Accounts & Saldo Awal operations
  const addAccount = (account: Omit<FinancialAccount, 'id'>) => {
    const id = 'acc-' + Date.now();
    const newAcc: FinancialAccount = { ...account, id, createdAt: new Date().toISOString() };
    setAccounts(prev => [...prev, newAcc]);
    showToast(`Akun "${account.name}" berhasil ditambahkan dengan saldo awal Rp ${account.initialBalance.toLocaleString('id-ID')}`, 'success');
  };

  const updateAccount = (id: string, updates: Partial<FinancialAccount>) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    showToast('Data akun diperbarui', 'info');
  };

  const deleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    showToast('Akun berhasil dihapus', 'info');
  };

  const updateInitialBalance = (id: string, initialBalance: number) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, initialBalance } : a));
    showToast('Saldo awal berhasil diperbarui', 'success');
  };

  // Upload / Import CSV Saldo Awal Bank, E-Wallet, Cash
  const importAccountsFromCSV = (csvText: string): { success: boolean; count: number; error?: string } => {
    try {
      const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) {
        return { success: false, count: 0, error: 'File CSV kosong' };
      }

      let parsedCount = 0;
      const updatedAccounts = [...accounts];

      lines.forEach((line, index) => {
        // Skip header if contains 'nama' or 'name'
        if (index === 0 && (line.toLowerCase().includes('nama') || line.toLowerCase().includes('name'))) {
          return;
        }

        // Parse comma or semicolon separated
        const parts = line.split(/[,;\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 2) {
          const name = parts[0];
          let rawType = (parts[1] || 'bank').toLowerCase();
          let type: 'bank' | 'ewallet' | 'cash' = 'bank';
          if (rawType.includes('wallet') || rawType.includes('ewallet') || rawType.includes('dana') || rawType.includes('gopay') || rawType.includes('ovo')) {
            type = 'ewallet';
          } else if (rawType.includes('cash') || rawType.includes('tunai') || rawType.includes('fisik')) {
            type = 'cash';
          }

          // Balance can be 3rd or 4th part
          let balance = 0;
          let accNum = '';

          if (parts.length >= 4) {
            accNum = parts[2];
            balance = parseFloat(parts[3].replace(/[^0-9.-]/g, '')) || 0;
          } else if (parts.length === 3) {
            // Check if parts[2] is number
            const possibleNum = parseFloat(parts[2].replace(/[^0-9.-]/g, ''));
            if (!isNaN(possibleNum)) {
              balance = possibleNum;
            } else {
              accNum = parts[2];
            }
          }

          const existingIndex = updatedAccounts.findIndex(a => a.name.toLowerCase() === name.toLowerCase());
          if (existingIndex >= 0) {
            // Update initial balance
            updatedAccounts[existingIndex] = {
              ...updatedAccounts[existingIndex],
              type,
              initialBalance: balance,
              accountNumber: accNum || updatedAccounts[existingIndex].accountNumber
            };
          } else {
            // Insert new account
            const color = type === 'cash' ? '#d97706' : type === 'ewallet' ? '#059669' : '#2563eb';
            updatedAccounts.push({
              id: 'acc-' + Date.now() + Math.random().toString(36).substring(2, 5),
              name,
              type,
              initialBalance: balance,
              accountNumber: accNum,
              color,
              createdAt: new Date().toISOString()
            });
          }
          parsedCount++;
        }
      });

      if (parsedCount > 0) {
        setAccounts(updatedAccounts);
        showToast(`Berhasil mengimpor saldo awal untuk ${parsedCount} akun!`, 'success');
        return { success: true, count: parsedCount };
      } else {
        return { success: false, count: 0, error: 'Format kolom tidak dikenali. Gunakan: Nama Akun, Tipe, No Rekening, Saldo Awal' };
      }
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || 'Gagal memproses file CSV' };
    }
  };

  // Transfer Antar Akun & Tarik Tunai
  const transferBetweenAccounts = (payload: AccountTransferPayload): { success: boolean; transferId?: string; error?: string } => {
    const { sourceAccountId, targetAccountId, amount, adminFee = 0, date, transferType, notes } = payload;
    
    if (sourceAccountId === targetAccountId) {
      showToast('Akun asal dan akun tujuan tidak boleh sama!', 'error');
      return { success: false, error: 'Akun asal dan tujuan sama' };
    }

    if (amount <= 0) {
      showToast('Nominal transfer harus lebih besar dari 0!', 'error');
      return { success: false, error: 'Nominal tidak valid' };
    }

    const sourceAcc = accounts.find(a => a.id === sourceAccountId);
    const targetAcc = accounts.find(a => a.id === targetAccountId);

    if (!sourceAcc || !targetAcc) {
      showToast('Akun asal atau akun tujuan tidak ditemukan!', 'error');
      return { success: false, error: 'Akun tidak ditemukan' };
    }

    const transferId = 'trf-' + Date.now();
    const txDate = date || new Date().toISOString().split('T')[0];

    // Descriptive labels
    let outTitle = `Transfer ke ${targetAcc.name}`;
    let inTitle = `Transfer dari ${sourceAcc.name}`;
    let successMessage = `Transfer Rp ${amount.toLocaleString('id-ID')} dari ${sourceAcc.name} ke ${targetAcc.name} berhasil!`;

    if (transferType === 'cash_withdrawal') {
      outTitle = `Tarik Tunai ke ${targetAcc.name}`;
      inTitle = `Tarik Tunai dari ${sourceAcc.name}`;
      successMessage = `Tarik Tunai Rp ${amount.toLocaleString('id-ID')} dari ${sourceAcc.name} ke ${targetAcc.name} berhasil!`;
    } else if (transferType === 'cash_deposit') {
      outTitle = `Setor Tunai ke ${targetAcc.name}`;
      inTitle = `Setor Tunai dari ${sourceAcc.name}`;
      successMessage = `Setor Tunai Rp ${amount.toLocaleString('id-ID')} ke ${targetAcc.name} berhasil!`;
    } else if (transferType === 'ewallet_topup') {
      outTitle = `Top Up ${targetAcc.name}`;
      inTitle = `Top Up dari ${sourceAcc.name}`;
      successMessage = `Top Up ${targetAcc.name} sebesar Rp ${amount.toLocaleString('id-ID')} berhasil!`;
    }

    const newTransactions: FinanceTransaction[] = [];

    // 1. Mutasi Keluar di Akun Asal
    const outTx: FinanceTransaction = {
      id: 'tx-trf-out-' + Date.now(),
      type: 'expense',
      title: outTitle,
      amount,
      category: 'Transfer & Tarik Tunai',
      date: txDate,
      paymentMethod: sourceAcc.type === 'cash' ? 'Cash' : sourceAcc.type === 'ewallet' ? 'E-Wallet' : 'Bank Transfer',
      walletType: sourceAcc.type === 'cash' ? 'cash' : 'non_cash',
      accountId: sourceAcc.id,
      accountName: sourceAcc.name,
      transferId,
      transferType,
      targetAccountId: targetAcc.id,
      targetAccountName: targetAcc.name,
      notes: notes || `Transfer antar akun dari ${sourceAcc.name} ke ${targetAcc.name}`
    };
    newTransactions.push(outTx);

    // 2. Mutasi Masuk di Akun Tujuan
    const inTx: FinanceTransaction = {
      id: 'tx-trf-in-' + (Date.now() + 1),
      type: 'income',
      title: inTitle,
      amount,
      category: 'Transfer & Tarik Tunai',
      date: txDate,
      paymentMethod: targetAcc.type === 'cash' ? 'Cash' : targetAcc.type === 'ewallet' ? 'E-Wallet' : 'Bank Transfer',
      walletType: targetAcc.type === 'cash' ? 'cash' : 'non_cash',
      accountId: targetAcc.id,
      accountName: targetAcc.name,
      transferId,
      transferType,
      targetAccountId: sourceAcc.id,
      targetAccountName: sourceAcc.name,
      notes: notes || `Penerimaan transfer dari ${sourceAcc.name}`
    };
    newTransactions.push(inTx);

    // 3. Biaya Admin di Akun Asal (jika ada)
    if (adminFee > 0) {
      const feeTx: FinanceTransaction = {
        id: 'tx-trf-fee-' + (Date.now() + 2),
        type: 'expense',
        title: `Biaya Admin ${transferType === 'cash_withdrawal' ? 'Tarik Tunai' : 'Transfer'} (${sourceAcc.name})`,
        amount: adminFee,
        category: 'Biaya Admin & Transfer',
        date: txDate,
        paymentMethod: sourceAcc.type === 'cash' ? 'Cash' : sourceAcc.type === 'ewallet' ? 'E-Wallet' : 'Bank Transfer',
        walletType: sourceAcc.type === 'cash' ? 'cash' : 'non_cash',
        accountId: sourceAcc.id,
        accountName: sourceAcc.name,
        transferId,
        notes: `Biaya admin transfer ${sourceAcc.name} ke ${targetAcc.name}`
      };
      newTransactions.push(feeTx);
    }

    setTransactions(prev => [...newTransactions, ...prev]);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    showToast(successMessage, 'success');
    return { success: true, transferId };
  };

  // Finance operations
  const addTransaction = (tx: Omit<FinanceTransaction, 'id'>) => {
    const id = 'tx-' + Date.now();
    // Resolve account if accountId or accountName is passed
    const matchedAccount = accounts.find(a => a.id === tx.accountId) || accounts.find(a => a.name === tx.accountName);
    const resolvedWalletType = matchedAccount ? (matchedAccount.type === 'cash' ? 'cash' : 'non_cash') : tx.walletType;
    const resolvedAccountName = matchedAccount ? matchedAccount.name : tx.accountName;
    const resolvedAccountId = matchedAccount ? matchedAccount.id : tx.accountId;

    const finalTx: FinanceTransaction = {
      ...tx,
      id,
      walletType: resolvedWalletType,
      accountName: resolvedAccountName,
      accountId: resolvedAccountId
    };

    setTransactions(prev => [finalTx, ...prev]);
    showToast(`Transaksi "${tx.title}" dicatat (${resolvedAccountName || (tx.walletType === 'cash' ? 'Uang Tunai' : 'Non-Tunai')})`, 'success');
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    showToast('Transaksi dihapus', 'info');
  };

  const updateTransaction = (id: string, updates: Partial<FinanceTransaction>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    showToast('Transaksi diperbarui', 'info');
  };

  // Hutang Saya (Liabilitas / PayLater / Cicilan) operations
  const addMyDebt = (debt: Omit<MyDebtLiability, 'id'>): string => {
    const id = 'mdeb-' + Date.now();
    const newDebt: MyDebtLiability = { ...debt, id };
    setMyDebts(prev => [newDebt, ...prev]);
    showToast(`Hutang baru kepada "${debt.creditorName}" berhasil dicatat!`, 'warning');
    return id;
  };

  const updateMyDebt = (id: string, updates: Partial<MyDebtLiability>) => {
    setMyDebts(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    showToast('Data hutang diperbarui', 'info');
  };

  const deleteMyDebt = (id: string) => {
    setMyDebts(prev => prev.filter(d => d.id !== id));
    showToast('Hutang dihapus', 'info');
  };

  // Bayar Hutang Saya: mencatat pelunasan & otomatis mengurangi saldo akun yang dipilih
  const payMyDebt = (debtId: string, amount: number, sourceAccountId: string, notes?: string) => {
    const targetDebt = myDebts.find(d => d.id === debtId);
    if (!targetDebt) return;

    const sourceAcc = accounts.find(a => a.id === sourceAccountId);
    const sourceAccName = sourceAcc ? sourceAcc.name : 'Rekening';

    // 1. Update status hutang
    const nextPaid = targetDebt.amountPaid + amount;
    const nextStatus = nextPaid >= targetDebt.amount ? 'paid' : nextPaid > 0 ? 'partial' : 'unpaid';

    setMyDebts(prev => prev.map(d => {
      if (d.id === debtId) {
        return {
          ...d,
          amountPaid: nextPaid,
          status: nextStatus
        };
      }
      return d;
    }));

    // 2. Otomatis catat pengeluaran di transaksi dari akun tersebut
    const txId = 'tx-' + Date.now();
    const paymentTx: FinanceTransaction = {
      id: txId,
      type: 'expense',
      title: `Bayar Hutang: ${targetDebt.creditorName} (${targetDebt.description})`,
      amount,
      category: 'Cicilan & Hutang',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: sourceAcc?.type === 'cash' ? 'Cash' : sourceAcc?.type === 'ewallet' ? 'E-Wallet' : 'Bank Transfer',
      walletType: sourceAcc?.type === 'cash' ? 'cash' : 'non_cash',
      accountId: sourceAcc?.id,
      accountName: sourceAccName,
      relatedDebtId: debtId,
      notes: notes || `Pembayaran cicilan hutang ke ${targetDebt.creditorName}`
    };

    setTransactions(prev => [paymentTx, ...prev]);

    if (nextStatus === 'paid') {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
      showToast(`Hutang ke "${targetDebt.creditorName}" telah LUNAS! Saldo ${sourceAccName} terpotong Rp ${amount.toLocaleString('id-ID')}`, 'success');
    } else {
      showToast(`Cicilan sebesar Rp ${amount.toLocaleString('id-ID')} berhasil dibayar via ${sourceAccName}. Sisa hutang: Rp ${(targetDebt.amount - nextPaid).toLocaleString('id-ID')}`, 'success');
    }
  };

  // Cek Harian & Rekonsiliasi Saldo (Daily Audit)
  const saveDailyAudit = (audit: Omit<DailyAuditRecord, 'id' | 'verifiedAt'>) => {
    const id = 'audit-' + Date.now();
    const newRecord: DailyAuditRecord = {
      ...audit,
      id,
      verifiedAt: new Date().toISOString()
    };

    // Replace if already audited for this date, or prepend
    setDailyAudits(prev => {
      const existsIndex = prev.findIndex(a => a.date === audit.date);
      if (existsIndex >= 0) {
        const copy = [...prev];
        copy[existsIndex] = newRecord;
        return copy;
      }
      return [newRecord, ...prev];
    });

    if (audit.isBalanced) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.75 } });
      showToast(`Cek Harian tanggal ${audit.date} berhasil disimpan! Saldo sistem dan riil 100% COCOK.`, 'success');
    } else {
      showToast(`Cek Harian tanggal ${audit.date} disimpan. Terdapat selisih Rp ${Math.abs(audit.totalDifference).toLocaleString('id-ID')}.`, 'warning');
    }
  };

  const deleteDailyAudit = (id: string) => {
    setDailyAudits(prev => prev.filter(a => a.id !== id));
    showToast('Catatan audit harian dihapus', 'info');
  };

  // Rekonsiliasi Cepat: Membuat transaksi penyesuaian agar saldo sistem sama dengan saldo riil
  const autoReconcileDifference = (auditItem: AccountAuditItem, date: string) => {
    const diff = auditItem.difference;
    if (diff === 0) return;

    const targetAcc = accounts.find(a => a.id === auditItem.accountId);
    const accName = targetAcc ? targetAcc.name : auditItem.accountName;
    const isSurplus = diff > 0; // actual > system => butuh income adjustment

    const txId = 'tx-' + Date.now();
    const adjustmentTx: FinanceTransaction = {
      id: txId,
      type: isSurplus ? 'income' : 'expense',
      title: `Penyesuaian Opname Saldo: ${accName}`,
      amount: Math.abs(diff),
      category: 'Penyesuaian Saldo',
      date,
      paymentMethod: targetAcc?.type === 'cash' ? 'Cash' : targetAcc?.type === 'ewallet' ? 'E-Wallet' : 'Bank Transfer',
      walletType: targetAcc?.type === 'cash' ? 'cash' : 'non_cash',
      accountId: targetAcc?.id,
      accountName: accName,
      notes: `Otomatis dibuat dari Rekonsiliasi Harian agar saldo sistem cocok dengan saldo riil ${accName}`
    };

    setTransactions(prev => [adjustmentTx, ...prev]);

    // Update daily audit state for this account to difference 0
    setDailyAudits(prev => prev.map(audit => {
      if (audit.date === date) {
        const updatedItems = audit.accountAudits.map(item => {
          if (item.accountId === auditItem.accountId) {
            return {
              ...item,
              systemBalance: item.actualBalance,
              difference: 0
            };
          }
          return item;
        });
        const totalDiff = updatedItems.reduce((s, it) => s + Math.abs(it.difference), 0);
        return {
          ...audit,
          accountAudits: updatedItems,
          totalSystemBalance: updatedItems.reduce((s, it) => s + it.systemBalance, 0),
          totalDifference: totalDiff,
          isBalanced: totalDiff === 0
        };
      }
      return audit;
    }));

    showToast(`Saldo ${accName} berhasil direkonsiliasi! Transaksi penyesuaian Rp ${Math.abs(diff).toLocaleString('id-ID')} dibuat.`, 'success');
  };

  // Debt & Invoice operations
  const addDebt = (
    debt: Omit<DebtReceivable, 'id' | 'invoiceNumber'>,
    sourceAccountId?: string,
    deductFromAccount: boolean = false
  ) => {
    const id = 'dbt-' + Date.now();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(debts.length + 1).padStart(3, '0')}`;
    
    let disbursementTxId: string | undefined = undefined;
    let chosenAccName: string | undefined = undefined;

    // If deduction from account is requested and sourceAccountId is selected
    if (deductFromAccount && sourceAccountId) {
      const sourceAcc = accounts.find(a => a.id === sourceAccountId);
      if (sourceAcc) {
        chosenAccName = sourceAcc.name;
        disbursementTxId = 'tx-' + Date.now();
        const disbursementTx: FinanceTransaction = {
          id: disbursementTxId,
          type: 'expense',
          title: `Pinjaman Piutang: ${debt.debtorName} (${debt.description || 'Pemberian Piutang'})`,
          amount: debt.amount,
          category: 'Pinjaman & Piutang',
          date: debt.issuedDate || new Date().toISOString().split('T')[0],
          paymentMethod: sourceAcc.type === 'cash' ? 'Cash' : sourceAcc.type === 'ewallet' ? 'E-Wallet' : 'Bank Transfer',
          walletType: sourceAcc.type === 'cash' ? 'cash' : 'non_cash',
          accountId: sourceAcc.id,
          accountName: sourceAcc.name,
          relatedDebtId: id,
          notes: `Dana pinjaman piutang dipotong dari ${sourceAcc.name} untuk ${debt.debtorName}`
        };
        setTransactions(prev => [disbursementTx, ...prev]);
      }
    }

    const newDebt: DebtReceivable = {
      ...debt,
      id,
      invoiceNumber,
      sourceAccountId,
      sourceAccountName: chosenAccName,
      deductFromAccount: !!deductFromAccount,
      disbursementTransactionId: disbursementTxId
    };

    setDebts(prev => [newDebt, ...prev]);

    if (disbursementTxId && chosenAccName) {
      showToast(`Piutang atas nama "${debt.debtorName}" (${invoiceNumber}) dicatat & saldo ${chosenAccName} terpotong Rp ${debt.amount.toLocaleString('id-ID')}!`, 'success');
    } else {
      showToast(`Piutang atas nama "${debt.debtorName}" dan invoice ${invoiceNumber} berhasil dibuat!`, 'success');
    }
  };

  const updateDebt = (id: string, updates: Partial<DebtReceivable>) => {
    setDebts(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    showToast('Data piutang diperbarui', 'info');
  };

  const deleteDebt = (id: string) => {
    const target = debts.find(d => d.id === id);
    if (target?.disbursementTransactionId) {
      setTransactions(prev => prev.filter(t => t.id !== target.disbursementTransactionId && t.relatedDebtId !== id));
    }
    setDebts(prev => prev.filter(d => d.id !== id));
    showToast('Data piutang telah dihapus', 'info');
  };

  const recordDebtPayment = (id: string, paymentAmount: number, destinationAccountId?: string) => {
    const target = debts.find(d => d.id === id);
    if (!target) return;

    let destAccName: string | undefined = undefined;
    if (destinationAccountId) {
      const destAcc = accounts.find(a => a.id === destinationAccountId);
      if (destAcc) {
        destAccName = destAcc.name;
        const txId = 'tx-' + Date.now();
        const repaymentTx: FinanceTransaction = {
          id: txId,
          type: 'income',
          title: `Pelunasan Piutang dari ${target.debtorName} (${target.invoiceNumber})`,
          amount: paymentAmount,
          category: 'Pelunasan Piutang',
          date: new Date().toISOString().split('T')[0],
          paymentMethod: destAcc.type === 'cash' ? 'Cash' : destAcc.type === 'ewallet' ? 'E-Wallet' : 'Bank Transfer',
          walletType: destAcc.type === 'cash' ? 'cash' : 'non_cash',
          accountId: destAcc.id,
          accountName: destAcc.name,
          relatedDebtId: id,
          notes: `Penerimaan dana pelunasan piutang ke ${destAcc.name}`
        };
        setTransactions(prev => [repaymentTx, ...prev]);
      }
    }

    setDebts(prev => prev.map(d => {
      if (d.id === id) {
        const nextPaid = d.amountPaid + paymentAmount;
        const nextStatus = nextPaid >= d.amount ? 'paid' : nextPaid > 0 ? 'partial' : 'unpaid';
        if (nextStatus === 'paid') {
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
        }
        return {
          ...d,
          amountPaid: nextPaid,
          status: nextStatus
        };
      }
      return d;
    }));

    if (destAccName) {
      showToast(`Pembayaran Rp ${paymentAmount.toLocaleString('id-ID')} dicatat & saldo ${destAccName} bertambah!`, 'success');
    } else {
      showToast(`Pembayaran sebesar Rp ${paymentAmount.toLocaleString('id-ID')} berhasil dicatat!`, 'success');
    }
  };

  const updateCategoryBudget = (category: string, limit: number) => {
    setCategoryBudgets(prev => {
      const exists = prev.some(b => b.category === category);
      if (exists) {
        return prev.map(b => b.category === category ? { ...b, limit } : b);
      }
      return [...prev, { category, limit }];
    });
    showToast(`Batas anggaran kategori "${category}" diperbarui`, 'success');
  };

  // Notes operations
  const addNote = (note: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const today = new Date().toISOString().split('T')[0];
    const newNote: NoteItem = {
      ...note,
      id: 'nt-' + Date.now(),
      createdAt: today,
      updatedAt: today
    };
    setNotes(prev => [newNote, ...prev]);
    showToast(`Catatan "${note.title}" disimpan`, 'success');
  };

  const updateNote = (id: string, updates: Partial<NoteItem>) => {
    const today = new Date().toISOString().split('T')[0];
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: today } : n));
    showToast('Catatan diperbarui', 'info');
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    showToast('Catatan dihapus', 'info');
  };

  const togglePinNote = (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n));
  };

  const addNoteCategory = (category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    setNoteCategories(prev => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed];
    });
    showToast(`Kategori "${trimmed}" berhasil ditambahkan!`, 'success');
  };

  const deleteNoteCategory = (category: string) => {
    setNoteCategories(prev => prev.filter(c => c !== category));
    showToast(`Kategori "${category}" dihapus`, 'info');
  };

  // Reimbursement Module Operations (Excel Rate Matrix & Claims)
  const addReimbursement = (item: Omit<ReimbursementItem, 'id' | 'no' | 'createdAt'>): string => {
    const id = 'rmb-' + Date.now();
    const nextNo = (reimbursements.length > 0 ? Math.max(...reimbursements.map(r => r.no)) : 0) + 1;
    const effectiveTotalDays = item.typeProject === 'Online'
      ? Math.max(1, Math.round((item.wdDays + item.weDays) / 2))
      : item.totalDays;

    const newItem: ReimbursementItem = {
      ...item,
      totalDays: effectiveTotalDays,
      id,
      no: nextNo,
      createdAt: new Date().toISOString()
    };
    setReimbursements(prev => [newItem, ...prev]);
    showToast(`Klaim reimburse untuk "${item.property}" berhasil ditambahkan!`, 'success');
    return id;
  };

  const updateReimbursement = (id: string, updates: Partial<ReimbursementItem>) => {
    setReimbursements(prev => prev.map(r => {
      if (r.id === id) {
        const merged = { ...r, ...updates };
        if (merged.typeProject === 'Online') {
          merged.totalDays = Math.max(1, Math.round((merged.wdDays + merged.weDays) / 2));
        }
        return merged;
      }
      return r;
    }));
    showToast('Data reimburse diperbarui', 'info');
  };

  const deleteReimbursement = (id: string) => {
    setReimbursements(prev => prev.filter(r => r.id !== id));
    showToast('Klaim reimburse telah dihapus', 'info');
  };

  const updateReimburseStatus = (id: string, status: ReimburseStatus, paymentAccountId?: string) => {
    const item = reimbursements.find(r => r.id === id);
    if (!item) return;

    const now = new Date();
    const formattedDeliveryDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    setReimbursements(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status,
          deliveryDate: status === 'Done' ? (r.deliveryDate || formattedDeliveryDate) : r.deliveryDate,
          paymentAccountId: paymentAccountId || r.paymentAccountId
        };
      }
      return r;
    }));

    if (status === 'Done') {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
      
      // If paymentAccountId is passed, deposit funds to financial account
      if (paymentAccountId) {
        const targetAcc = accounts.find(a => a.id === paymentAccountId);
        const txId = 'tx-rmb-' + Date.now();
        const depositTx: FinanceTransaction = {
          id: txId,
          type: 'income',
          title: `Pencairan Reimburse: ${item.property} (${item.role} ${item.typeProject})`,
          amount: item.totalAmount,
          category: 'Reimburse & Klaim Proyek',
          date: now.toISOString().split('T')[0],
          paymentMethod: targetAcc?.type === 'cash' ? 'Cash' : targetAcc?.type === 'ewallet' ? 'E-Wallet' : 'Bank Transfer',
          walletType: targetAcc?.type === 'cash' ? 'cash' : 'non_cash',
          accountId: targetAcc?.id,
          accountName: targetAcc?.name,
          notes: `Pencairan klaim reimburse #${item.no} (${item.description}) ke ${targetAcc?.name || 'Rekening'}`
        };
        setTransactions(prev => [depositTx, ...prev]);
        showToast(`Reimburse "${item.property}" cair! Rp ${item.totalAmount.toLocaleString('id-ID')} masuk ke ${targetAcc?.name || 'rekening'}.`, 'success');
      } else {
        showToast(`Status klaim reimburse "${item.property}" selesai (Done)!`, 'success');
      }
    } else {
      showToast(`Status reimburse "${item.property}" diubah ke "${status}"`, 'info');
    }
  };

  const updateReimburseRate = (role: ReimburseRole, type: ReimburseProjectType, wdRate: number, weRate: number) => {
    setReimburseRates(prev => prev.map(r => {
      if (r.role === role && r.type === type) {
        return { ...r, wdRate, weRate };
      }
      return r;
    }));
    showToast(`Tarif reimburse untuk ${role} (${type}) berhasil diperbarui!`, 'success');
  };

  const resetReimburseRatesToDefault = () => {
    setReimburseRates(DEFAULT_REIMBURSE_RATES);
    showToast('Tarif reimburse dikembalikan ke standar awal', 'info');
  };

  // Habit operations
  const toggleHabitDay = (habitId: string, dateStr: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        const exists = h.completedDays.includes(dateStr);
        const updatedDays = exists 
          ? h.completedDays.filter(d => d !== dateStr) 
          : [...h.completedDays, dateStr];
        return { ...h, completedDays: updatedDays };
      }
      return h;
    }));
  };

  const addHabit = (title: string, color: string) => {
    const id = 'hb-' + Date.now();
    setHabits(prev => [...prev, { id, title, targetPerWeek: 5, completedDays: [], color }]);
    showToast(`Habit "${title}" dibuat`, 'success');
  };

  const deleteHabit = (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  // Export / Import / Reset
  const exportDataJSON = () => {
    const payload = {
      version: '1.2.0',
      exportedAt: new Date().toISOString(),
      profile,
      accounts,
      todos,
      transactions,
      debts,
      myDebts,
      dailyAudits,
      categoryBudgets,
      notes,
      habits
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omnihub-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data berhasil diekspor sebagai JSON backup', 'success');
  };

  const importDataJSON = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.profile) setProfile(data.profile);
      if (Array.isArray(data.accounts)) setAccounts(data.accounts);
      if (Array.isArray(data.todos)) setTodos(data.todos);
      if (Array.isArray(data.transactions)) setTransactions(data.transactions);
      if (Array.isArray(data.debts)) setDebts(data.debts);
      if (Array.isArray(data.myDebts)) setMyDebts(data.myDebts);
      if (Array.isArray(data.dailyAudits)) setDailyAudits(data.dailyAudits);
      if (Array.isArray(data.categoryBudgets)) setCategoryBudgets(data.categoryBudgets);
      if (Array.isArray(data.notes)) setNotes(data.notes);
      if (Array.isArray(data.habits)) setHabits(data.habits);
      showToast('Data backup berhasil diimpor & disinkronkan!', 'success');
      return true;
    } catch {
      showToast('Gagal mengimpor file. Format JSON tidak valid.', 'error');
      return false;
    }
  };

  const resetAllData = () => {
    setProfile(SEED_PROFILE);
    setAccounts(SEED_ACCOUNTS);
    setTodos(SEED_TODOS);
    setTransactions(SEED_TRANSACTIONS);
    setDebts(SEED_DEBTS);
    setMyDebts(SEED_MY_DEBTS);
    setDailyAudits(SEED_DAILY_AUDITS);
    setCategoryBudgets(SEED_CATEGORY_BUDGETS);
    setNotes(SEED_NOTES);
    setHabits(SEED_HABITS);
    showToast('Data berhasil dikembalikan ke default template', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        theme,
        toggleTheme,
        profile,
        updateProfile,
        accounts,
        addAccount,
        updateAccount,
        deleteAccount,
        updateInitialBalance,
        importAccountsFromCSV,
        transferBetweenAccounts,
        todos,
        addTodo,
        updateTodo,
        deleteTodo,
        toggleTodoStatus,
        transactions,
        addTransaction,
        deleteTransaction,
        updateTransaction,
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
        notes,
        noteCategories,
        addNote,
        updateNote,
        deleteNote,
        togglePinNote,
        addNoteCategory,
        deleteNoteCategory,
        reimbursements,
        reimburseRates,
        addReimbursement,
        updateReimbursement,
        deleteReimbursement,
        updateReimburseStatus,
        updateReimburseRate,
        resetReimburseRatesToDefault,
        habits,
        toggleHabitDay,
        addHabit,
        deleteHabit,
        toasts,
        showToast,
        removeToast,
        exportDataJSON,
        importDataJSON,
        resetAllData,
        searchQuery,
        setSearchQuery
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
