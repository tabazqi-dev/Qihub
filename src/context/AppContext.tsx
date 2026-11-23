import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { isContraVoidTransaction } from '../utils/accounting';
import { getDebtLineItems, sanitizeSafeImageSrc } from '../utils/debtItems';
import {
  NavigationTab,
  TodoItem,
  FinanceTransaction,
  DebtReceivable,
  DebtLineItem,
  CategoryBudget,
  NoteItem,
  UserProfile,
  AuthUser,
  HabitItem,
  FinancialAccount,
  MyDebtLiability,
  DailyAuditRecord,
  AccountAuditItem,
  AccountTransferPayload,
  CoaAdjustmentPayload,
  ReimbursementItem,
  ReimburseRate,
  ReimburseRole,
  ReimburseProjectType,
  ReimburseStatus,
  LogbookEntry,
  SavedBarcode
} from '../types';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error';

interface AppContextType {
  // Cloud Sync & Auth
  user: User | null;
  authUser: AuthUser | null;
  authLoading: boolean;
  syncStatus: SyncStatus;
  signInWithGoogle: () => Promise<void>;
  signInWithUsernamePassword: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  registerWithUsernamePassword: (username: string, password: string, displayName?: string) => Promise<{ ok: boolean; error?: string }>;
  signOutGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  pushLocalWorkspaceToCloud: () => Promise<void>;

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
  addCoaAdjustment: (payload: CoaAdjustmentPayload) => void;

  // Finance Transactions & Cash / Non-Cash
  transactions: FinanceTransaction[];
  addTransaction: (tx: Omit<FinanceTransaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, updates: Partial<FinanceTransaction>) => void;
  voidTransaction: (id: string, reason?: string) => void;

  // Debts / Piutang Orang Lain ke Saya
  debts: DebtReceivable[];
  addDebt: (debt: Omit<DebtReceivable, 'id' | 'invoiceNumber'>, sourceAccountId?: string, deductFromAccount?: boolean) => void;
  updateDebt: (id: string, updates: Partial<DebtReceivable>) => void;
  deleteDebt: (id: string) => void;
  recordDebtPayment: (id: string, paymentAmount: number, destinationAccountId?: string) => void;
  increaseDebtAmount: (id: string, addedAmount: number, notes?: string, newDueDate?: string) => void;

  // Hutang Saya ke Pihak Lain (Liabilitas / Cicilan Transaksi)
  myDebts: MyDebtLiability[];
  addMyDebt: (debt: Omit<MyDebtLiability, 'id'>) => string;
  updateMyDebt: (id: string, updates: Partial<MyDebtLiability>) => void;
  deleteMyDebt: (id: string) => void;
  payMyDebt: (debtId: string, amount: number, sourceAccountId: string, notes?: string) => void;

  // Legacy Audit Records kept in context type for backup compatibility
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

  // Logbook Kerja
  logbookEntries: LogbookEntry[];
  addLogbookEntry: (entry: Omit<LogbookEntry, 'id' | 'createdAt'>) => void;
  updateLogbookEntry: (id: string, updates: Partial<LogbookEntry>) => void;
  deleteLogbookEntry: (id: string) => void;

  // Saved Barcodes & QR Codes
  savedBarcodes: SavedBarcode[];
  addSavedBarcode: (barcode: Omit<SavedBarcode, 'id' | 'createdAt'>) => void;
  deleteSavedBarcode: (id: string) => void;

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
  appName: "Q'Hub",
  appLogoUrl: undefined,
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
    accountId: 'acc-bca',
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
    accountName: 'Mandiri Payroll',
    accountId: 'acc-mandiri',
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
    accountId: 'acc-cash',
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
    accountId: 'acc-cash',
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
    accountId: 'acc-gopay',
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
    accountId: 'acc-cash',
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
    accountId: 'acc-bca',
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
    accountId: 'acc-ovo',
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
    title: "Panduan Arsitektur Modular Q'Hub",
    category: 'Architecture',
    tags: ['Framework', 'Guide', 'Scalability'],
    isPinned: true,
    createdAt: '2026-10-25',
    updatedAt: '2026-11-01',
    content: `# Arsitektur Super App Q'Hub

Q'Hub dirancang dengan prinsip **Domain-Driven Modular Architecture**:
- Pemisahan dompet Tunai (Cash) dan Non-Tunai (Rekening/E-Wallet)
- Manajemen Piutang & Generator Invoice Resmi siap kirim WhatsApp + QR Code
- Engine Remove BG client-side cepat tanpa kirim data ke luar
- General Ledger, Neraca (Balance Sheet), & Laporan Bulanan Laba-Rugi (P&L)
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
    totalDays: 2,
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

class ApiRequestError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function getBudgetDocId(category: string): string {
  const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug ? `bgt-${slug}`.slice(0, 120) : `bgt-${Date.now()}`;
}

function sanitizeImageDataUrl(val: string | undefined, maxLen = 245000): string | undefined {
  if (!val) return undefined;
  return val.length <= maxLen ? val : undefined;
}

function readStoredBranding(): { appName?: string; appLogoUrl?: string } {
  try {
    const raw = localStorage.getItem('omnihub_branding');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      appName: typeof parsed?.appName === 'string' && parsed.appName.trim() ? parsed.appName.trim() : undefined,
      appLogoUrl: sanitizeSafeImageSrc(parsed?.appLogoUrl),
    };
  } catch {
    return {};
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const localTokenRef = useRef<string | null>(null);
  const authUserRef = useRef<AuthUser | null>(null);
  authUserRef.current = authUser;
  const dbConfiguredRef = useRef<boolean>(true);
  const lastSyncedAtRef = useRef<number>(0);

  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('omnihub_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'dark';
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    const branding = readStoredBranding();
    const saved = localStorage.getItem('omnihub_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...SEED_PROFILE,
          ...parsed,
          appName: parsed.appName || branding.appName || SEED_PROFILE.appName,
          appLogoUrl: sanitizeSafeImageSrc(parsed.appLogoUrl) || branding.appLogoUrl,
        };
      } catch {
        // fallback below
      }
    }
    return {
      ...SEED_PROFILE,
      appName: branding.appName || SEED_PROFILE.appName,
      appLogoUrl: branding.appLogoUrl,
    };
  });

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

  const [debts, setDebts] = useState<DebtReceivable[]>(() => {
    const saved = localStorage.getItem('omnihub_debts');
    return saved ? JSON.parse(saved) : SEED_DEBTS;
  });

  const [myDebts, setMyDebts] = useState<MyDebtLiability[]>(() => {
    const saved = localStorage.getItem('omnihub_my_debts');
    return saved ? JSON.parse(saved) : SEED_MY_DEBTS;
  });

  const [dailyAudits, setDailyAudits] = useState<DailyAuditRecord[]>(() => {
    const saved = localStorage.getItem('omnihub_daily_audits');
    return saved ? JSON.parse(saved) : [];
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
    return Array.from(new Set([...SEED_NOTE_CATEGORIES, ...SEED_NOTES.map(n => n.category)]));
  });

  const [habits, setHabits] = useState<HabitItem[]>(() => {
    const saved = localStorage.getItem('omnihub_habits');
    return saved ? JSON.parse(saved) : SEED_HABITS;
  });

  const [logbookEntries, setLogbookEntries] = useState<LogbookEntry[]>(() => {
    const saved = localStorage.getItem('omnihub_logbook_entries');
    return saved ? JSON.parse(saved) : [
      {
        id: 'log-1',
        date: new Date().toISOString().split('T')[0],
        project: "Q'Hub Super App Development",
        hours: 8,
        category: 'Development',
        description: 'Membangun modul logbook kerja dan integrasi export Excel (.xls).',
        status: 'Completed',
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [savedBarcodes, setSavedBarcodes] = useState<SavedBarcode[]>(() => {
    const saved = localStorage.getItem('omnihub_saved_barcodes');
    return saved ? JSON.parse(saved) : [];
  });

  const [reimbursements, setReimbursements] = useState<ReimbursementItem[]>(() => {
    const saved = localStorage.getItem('omnihub_reimbursements');
    if (saved) {
      try {
        const parsed: ReimbursementItem[] = JSON.parse(saved);
        return parsed.map(item => {
          if (item.typeProject === 'Online') {
            return {
              ...item,
              totalDays: Math.max(1, Math.round((item.wdDays + item.weDays) / 2))
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

  // Latest state ref for first-login migration
  const latestStateRef = useRef({
    profile,
    theme,
    noteCategories,
    accounts,
    transactions,
    debts,
    myDebts,
    categoryBudgets,
    todos,
    notes,
    habits,
    logbookEntries,
    savedBarcodes,
    reimbursements,
    reimburseRates
  });
  latestStateRef.current = {
    profile,
    theme,
    noteCategories,
    accounts,
    transactions,
    debts,
    myDebts,
    categoryBudgets,
    todos,
    notes,
    habits,
    logbookEntries,
    savedBarcodes,
    reimbursements,
    reimburseRates
  };

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

  // Persist items locally as offline cache
  useEffect(() => { localStorage.setItem('omnihub_profile', JSON.stringify(profile)); }, [profile]);
  useEffect(() => { localStorage.setItem('omnihub_todos', JSON.stringify(todos)); }, [todos]);
  useEffect(() => { localStorage.setItem('omnihub_accounts', JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { localStorage.setItem('omnihub_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('omnihub_debts', JSON.stringify(debts)); }, [debts]);
  useEffect(() => { localStorage.setItem('omnihub_my_debts', JSON.stringify(myDebts)); }, [myDebts]);
  useEffect(() => { localStorage.setItem('omnihub_daily_audits', JSON.stringify(dailyAudits)); }, [dailyAudits]);
  useEffect(() => { localStorage.setItem('omnihub_budgets', JSON.stringify(categoryBudgets)); }, [categoryBudgets]);
  useEffect(() => { localStorage.setItem('omnihub_notes', JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem('omnihub_note_categories', JSON.stringify(noteCategories)); }, [noteCategories]);
  useEffect(() => { localStorage.setItem('omnihub_habits', JSON.stringify(habits)); }, [habits]);
  useEffect(() => { localStorage.setItem('omnihub_logbook_entries', JSON.stringify(logbookEntries)); }, [logbookEntries]);
  useEffect(() => { localStorage.setItem('omnihub_saved_barcodes', JSON.stringify(savedBarcodes)); }, [savedBarcodes]);
  useEffect(() => { localStorage.setItem('omnihub_reimbursements', JSON.stringify(reimbursements)); }, [reimbursements]);
  useEffect(() => { localStorage.setItem('omnihub_reimburse_rates', JSON.stringify(reimburseRates)); }, [reimburseRates]);

  useEffect(() => {
    const appTitle = profile.appName?.trim() || "Q'Hub";
    document.title = `${appTitle} - Personal Super App & Management Suite`;
    try {
      localStorage.setItem('omnihub_branding', JSON.stringify({
        appName: appTitle,
        appLogoUrl: sanitizeSafeImageSrc(profile.appLogoUrl) || undefined,
      }));
    } catch {
      // ignore storage quota errors
    }
  }, [profile.appName, profile.appLogoUrl]);

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

  const hasActiveSession = () => Boolean(localTokenRef.current || auth.currentUser);

  // ==================== POSTGRESQL API SYNC HELPERS ====================
  const apiFetch = async <T = any>(path: string, init?: RequestInit): Promise<T> => {
    let token = localTokenRef.current;
    if (!token && auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }
    if (!token) {
      throw new ApiRequestError(401, 'Pengguna belum masuk.', 'UNAUTHENTICATED');
    }
    const res = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });
    const text = await res.text();
    let payload: any = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = {};
    }
    if (!res.ok) {
      throw new ApiRequestError(
        res.status,
        payload?.message || payload?.error || `HTTP ${res.status}`,
        payload?.error
      );
    }
    return payload as T;
  };

  const applyWorkspaceSnapshot = (ws: any) => {
    if (!ws || typeof ws !== 'object') return;
    if (ws.profile) {
      setProfile({
        name: ws.profile.name || SEED_PROFILE.name,
        title: ws.profile.title || '',
        avatarUrl: sanitizeSafeImageSrc(ws.profile.avatarUrl) || SEED_PROFILE.avatarUrl,
        appName: ws.profile.appName || SEED_PROFILE.appName,
        appLogoUrl: sanitizeSafeImageSrc(ws.profile.appLogoUrl),
        currencySymbol: ws.profile.currencySymbol || 'Rp',
        monthlyBudget: Number(ws.profile.monthlyBudget) || 0,
        bankAccountDetails: ws.profile.bankAccountDetails || '',
        paymentQrDataUrl: sanitizeSafeImageSrc(ws.profile.paymentQrDataUrl),
      });
    }
    if (ws.preferences) {
      if (ws.preferences.theme === 'dark' || ws.preferences.theme === 'light') {
        setTheme(ws.preferences.theme);
      }
      if (Array.isArray(ws.preferences.noteCategories)) {
        setNoteCategories(ws.preferences.noteCategories);
      }
    }
    if (Array.isArray(ws.accounts)) setAccounts(ws.accounts);
    if (Array.isArray(ws.transactions)) {
      const sorted = [...ws.transactions].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.id.localeCompare(a.id);
      });
      setTransactions(sorted);
    }
    if (Array.isArray(ws.debts)) setDebts(ws.debts);
    if (Array.isArray(ws.myDebts)) setMyDebts(ws.myDebts);
    if (Array.isArray(ws.categoryBudgets)) setCategoryBudgets(ws.categoryBudgets);
    if (Array.isArray(ws.todos)) setTodos(ws.todos);
    if (Array.isArray(ws.notes)) setNotes(ws.notes);
    if (Array.isArray(ws.habits)) setHabits(ws.habits);
    if (Array.isArray(ws.logbookEntries)) setLogbookEntries(ws.logbookEntries);
    if (Array.isArray(ws.savedBarcodes)) setSavedBarcodes(ws.savedBarcodes);
    if (Array.isArray(ws.reimbursements)) setReimbursements(ws.reimbursements);
    if (Array.isArray(ws.reimburseRates)) setReimburseRates(ws.reimburseRates);
  };

  const syncFullWorkspaceToPostgres = async (options?: { overwriteExisting?: boolean; overrideWorkspace?: Record<string, unknown> }) => {
    const overwriteExisting = options?.overwriteExisting ?? true;
    await apiFetch('/api/workspace/sync', {
      method: 'POST',
      body: JSON.stringify({
        overwriteExisting,
        workspace: options?.overrideWorkspace ?? latestStateRef.current,
      }),
    });
    dbConfiguredRef.current = true;
    lastSyncedAtRef.current = Date.now();
  };

  const loadWorkspaceFromPostgres = async (options?: { silent?: boolean; seedStateOverride?: Record<string, unknown> }) => {
    if (!hasActiveSession()) return;
    if (!options?.silent) setSyncStatus('syncing');
    try {
      const data = await apiFetch<{ initialized: boolean; workspace: any }>('/api/workspace');
      dbConfiguredRef.current = true;
      if (!data.initialized) {
        await syncFullWorkspaceToPostgres({ overwriteExisting: false, overrideWorkspace: options?.seedStateOverride });
      } else {
        applyWorkspaceSnapshot(data.workspace);
      }
      lastSyncedAtRef.current = Date.now();
      setSyncStatus('synced');
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'DATABASE_NOT_CONFIGURED') {
        dbConfiguredRef.current = false;
        setSyncStatus('local');
        return;
      }
      setSyncStatus('error');
      console.error('Error loading PostgreSQL workspace:', err);
      if (!options?.silent) {
        showToast('Gagal memuat sinkronisasi PostgreSQL. Menggunakan cache lokal.', 'warning');
      }
    }
  };

  const cloudWriteDoc = async (colName: string, id: string, data: Record<string, unknown>) => {
    if (!hasActiveSession() || !dbConfiguredRef.current) return;
    setSyncStatus('syncing');
    try {
      await apiFetch(`/api/workspace/${encodeURIComponent(colName)}`, {
        method: 'POST',
        body: JSON.stringify({ ...data, id }),
      });
      lastSyncedAtRef.current = Date.now();
      setSyncStatus('synced');
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'DATABASE_NOT_CONFIGURED') {
        dbConfiguredRef.current = false;
        setSyncStatus('local');
        return;
      }
      setSyncStatus('error');
      showToast('Gagal menyimpan perubahan ke database PostgreSQL.', 'error');
      console.error('PostgreSQL CREATE failed:', colName, id, err);
    }
  };

  const cloudUpdateDoc = async (colName: string, id: string, updates: Record<string, unknown>) => {
    if (!hasActiveSession() || !dbConfiguredRef.current) return;
    setSyncStatus('syncing');
    try {
      if (colName === 'profile') {
        await apiFetch('/api/workspace/profile', {
          method: 'PUT',
          body: JSON.stringify(updates),
        });
      } else if (colName === 'preferences') {
        await apiFetch('/api/workspace/preferences', {
          method: 'PUT',
          body: JSON.stringify(updates),
        });
      } else {
        await apiFetch(`/api/workspace/${encodeURIComponent(colName)}/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(updates),
        });
      }
      lastSyncedAtRef.current = Date.now();
      setSyncStatus('synced');
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'DATABASE_NOT_CONFIGURED') {
        dbConfiguredRef.current = false;
        setSyncStatus('local');
        return;
      }
      setSyncStatus('error');
      showToast('Gagal memperbarui data di PostgreSQL.', 'error');
      console.error('PostgreSQL UPDATE failed:', colName, id, err);
    }
  };

  const cloudDeleteDoc = async (colName: string, id: string) => {
    if (!hasActiveSession() || !dbConfiguredRef.current) return;
    setSyncStatus('syncing');
    try {
      await apiFetch(`/api/workspace/${encodeURIComponent(colName)}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      lastSyncedAtRef.current = Date.now();
      setSyncStatus('synced');
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'DATABASE_NOT_CONFIGURED') {
        dbConfiguredRef.current = false;
        setSyncStatus('local');
        return;
      }
      setSyncStatus('error');
      showToast('Gagal menghapus data di PostgreSQL.', 'error');
      console.error('PostgreSQL DELETE failed:', colName, id, err);
    }
  };

  // ==================== CLOUD SYNC LIFECYCLE ====================
  useEffect(() => {
    let cancelled = false;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        // Only clear authUser if not currently signed in with local username/password
        if (!localTokenRef.current) {
          setAuthUser(null);
          setSyncStatus('local');
        }
        setAuthLoading(false);
        return;
      }

      localTokenRef.current = null;
      setUser(firebaseUser);
      setAuthUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email || undefined,
        displayName: firebaseUser.displayName || firebaseUser.email || 'Pengguna Google',
        authType: 'google',
      });
      setAuthLoading(false);
      dbConfiguredRef.current = true;
      if (!cancelled) {
        await loadWorkspaceFromPostgres();
      }
    });

    const handleResumeSync = () => {
      if (
        !hasActiveSession() ||
        !dbConfiguredRef.current ||
        document.visibilityState === 'hidden'
      ) {
        return;
      }
      if (Date.now() - lastSyncedAtRef.current > 15000) {
        void loadWorkspaceFromPostgres({ silent: true });
      }
    };

    window.addEventListener('focus', handleResumeSync);
    document.addEventListener('visibilitychange', handleResumeSync);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleResumeSync);
      document.removeEventListener('visibilitychange', handleResumeSync);
      unsubscribeAuth();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setSyncStatus('syncing');
      const result = await signInWithPopup(auth, googleProvider);
      showToast(`Berhasil masuk sebagai ${result.user.email}. Sinkronisasi Cloud aktif!`, 'success');
    } catch (err: any) {
      setSyncStatus('local');
      if (err?.code === 'auth/popup-closed-by-user') {
        showToast('Login Google dibatalkan.', 'info');
      } else {
        showToast(`Gagal masuk Google: ${err?.message || 'Silakan coba lagi'}`, 'error');
      }
    }
  };

  const resetPrivateWorkspaceToDefaults = () => {
    const branding = readStoredBranding();
    const defaultProfile: UserProfile = {
      ...SEED_PROFILE,
      appName: branding.appName || SEED_PROFILE.appName,
      appLogoUrl: branding.appLogoUrl,
    };
    const defaultNoteCategories = Array.from(new Set([...SEED_NOTE_CATEGORIES, ...SEED_NOTES.map(n => n.category)]));
    const defaultLogbook: LogbookEntry[] = [
      {
        id: 'log-1',
        date: new Date().toISOString().split('T')[0],
        project: "Q'Hub Super App Development",
        hours: 8,
        category: 'Development',
        description: 'Membangun modul logbook kerja dan integrasi export Excel (.xls).',
        status: 'Completed',
        createdAt: new Date().toISOString(),
      },
    ];

    setProfile(defaultProfile);
    setAccounts(SEED_ACCOUNTS);
    setTodos(SEED_TODOS);
    setTransactions(SEED_TRANSACTIONS);
    setDebts(SEED_DEBTS);
    setMyDebts(SEED_MY_DEBTS);
    setDailyAudits([]);
    setCategoryBudgets(SEED_CATEGORY_BUDGETS);
    setNotes(SEED_NOTES);
    setNoteCategories(defaultNoteCategories);
    setHabits(SEED_HABITS);
    setLogbookEntries(defaultLogbook);
    setSavedBarcodes([]);
    setReimbursements(SEED_REIMBURSEMENTS);
    setReimburseRates(DEFAULT_REIMBURSE_RATES);

    return {
      profile: defaultProfile,
      theme,
      noteCategories: defaultNoteCategories,
      accounts: SEED_ACCOUNTS,
      transactions: SEED_TRANSACTIONS,
      debts: SEED_DEBTS,
      myDebts: SEED_MY_DEBTS,
      categoryBudgets: SEED_CATEGORY_BUDGETS,
      todos: SEED_TODOS,
      notes: SEED_NOTES,
      habits: SEED_HABITS,
      logbookEntries: defaultLogbook,
      savedBarcodes: [],
      reimbursements: SEED_REIMBURSEMENTS,
      reimburseRates: DEFAULT_REIMBURSE_RATES,
    };
  };

  const signInWithUsernamePassword = async (
    username: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      setSyncStatus('syncing');
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.token || !data?.user) {
        setSyncStatus('local');
        const msg = data?.message || data?.error || 'Username atau password salah.';
        return { ok: false, error: msg };
      }

      if (auth.currentUser) {
        await signOut(auth).catch(() => {});
      }
      localTokenRef.current = data.token;
      dbConfiguredRef.current = true;
      setUser(null);
      setAuthUser(data.user as AuthUser);
      await loadWorkspaceFromPostgres();
      showToast(`Selamat datang kembali, ${data.user.displayName}!`, 'success');
      return { ok: true };
    } catch {
      setSyncStatus('local');
      return { ok: false, error: 'Tidak dapat terhubung ke server login.' };
    }
  };

  const registerWithUsernamePassword = async (
    username: string,
    password: string,
    displayName?: string
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      setSyncStatus('syncing');
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.token || !data?.user) {
        setSyncStatus('local');
        const msg = data?.message || data?.error || 'Gagal mendaftar akun baru.';
        return { ok: false, error: msg };
      }

      if (auth.currentUser) {
        await signOut(auth).catch(() => {});
      }
      const cleanSeed = resetPrivateWorkspaceToDefaults();
      cleanSeed.profile = { ...cleanSeed.profile, name: data.user.displayName };
      setProfile(cleanSeed.profile);

      localTokenRef.current = data.token;
      dbConfiguredRef.current = true;
      setUser(null);
      setAuthUser(data.user as AuthUser);
      await loadWorkspaceFromPostgres({ seedStateOverride: cleanSeed });
      showToast(`Akun @${data.user.username} berhasil dibuat & terhubung ke PostgreSQL!`, 'success');
      return { ok: true };
    } catch {
      setSyncStatus('local');
      return { ok: false, error: 'Tidak dapat terhubung ke server registrasi.' };
    }
  };

  const signOutUser = async () => {
    try {
      localTokenRef.current = null;
      if (auth.currentUser) {
        await signOut(auth);
      }
      setUser(null);
      setAuthUser(null);
      setSyncStatus('local');
      resetPrivateWorkspaceToDefaults();
      setActiveTab('dashboard');
      showToast('Anda telah keluar dari akun.', 'info');
    } catch (err: any) {
      showToast(`Gagal keluar: ${err?.message || 'Error'}`, 'error');
    }
  };

  const signOutGoogle = signOutUser;

  const pushLocalWorkspaceToCloud = async () => {
    if (!hasActiveSession()) {
      showToast('Silakan masuk terlebih dahulu untuk sinkronisasi ke PostgreSQL.', 'warning');
      return;
    }
    setSyncStatus('syncing');
    try {
      await syncFullWorkspaceToPostgres({ overwriteExisting: true });
      setSyncStatus('synced');
      showToast('Seluruh data berhasil disinkronkan ke PostgreSQL Cloud!', 'success');
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'DATABASE_NOT_CONFIGURED') {
        dbConfiguredRef.current = false;
        setSyncStatus('local');
        showToast('DATABASE_URL belum diatur di server. Data tetap tersimpan aman secara lokal.', 'warning');
        return;
      }
      setSyncStatus('error');
      console.error('Error pushing local workspace to PostgreSQL:', err);
      showToast('Gagal sinkronisasi ke PostgreSQL. Periksa koneksi atau coba lagi.', 'error');
    }
  };

  // ==================== ACTIONS ====================
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (hasActiveSession()) {
      void cloudUpdateDoc('preferences', 'main', { theme: nextTheme });
    }
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    const cleanedUpdates: Partial<UserProfile> = { ...updates };
    if (cleanedUpdates.avatarUrl !== undefined) {
      const safeAvatar = sanitizeSafeImageSrc(cleanedUpdates.avatarUrl);
      if (cleanedUpdates.avatarUrl && !safeAvatar) {
        showToast('Format atau ukuran foto profil tidak valid.', 'warning');
        delete cleanedUpdates.avatarUrl;
      } else if (safeAvatar) {
        cleanedUpdates.avatarUrl = safeAvatar;
      }
    }
    if ('appLogoUrl' in cleanedUpdates) {
      if (!cleanedUpdates.appLogoUrl) {
        cleanedUpdates.appLogoUrl = undefined;
      } else {
        const safeLogo = sanitizeSafeImageSrc(cleanedUpdates.appLogoUrl);
        if (!safeLogo) {
          showToast('Format atau ukuran logo aplikasi tidak valid.', 'warning');
          delete cleanedUpdates.appLogoUrl;
        } else {
          cleanedUpdates.appLogoUrl = safeLogo;
        }
      }
    }
    if (cleanedUpdates.paymentQrDataUrl !== undefined) {
      if (!cleanedUpdates.paymentQrDataUrl) {
        cleanedUpdates.paymentQrDataUrl = undefined;
      } else {
        const safeQr = sanitizeSafeImageSrc(cleanedUpdates.paymentQrDataUrl);
        if (!safeQr) {
          showToast('Ukuran atau format QR Code tidak valid.', 'warning');
          delete cleanedUpdates.paymentQrDataUrl;
        } else {
          cleanedUpdates.paymentQrDataUrl = safeQr;
        }
      }
    }
    setProfile(prev => ({ ...prev, ...cleanedUpdates }));
    if (hasActiveSession()) {
      const cloudPayload: Record<string, unknown> = { ...cleanedUpdates };
      if ('appLogoUrl' in cleanedUpdates && !cleanedUpdates.appLogoUrl) {
        cloudPayload.appLogoUrl = '';
      }
      if ('paymentQrDataUrl' in cleanedUpdates && !cleanedUpdates.paymentQrDataUrl) {
        cloudPayload.paymentQrDataUrl = '';
      }
      void cloudUpdateDoc('profile', 'main', cloudPayload);
    }
    showToast('Profil & pengaturan aplikasi diperbarui', 'success');
  };

  // Todo operations
  const addTodo = (newTodo: Omit<TodoItem, 'id'>) => {
    const id = 'td-' + Date.now();
    const item: TodoItem = { ...newTodo, id };
    setTodos(prev => [item, ...prev]);
    void cloudWriteDoc('todos', id, item as unknown as Record<string, unknown>);
    showToast(`Tugas "${newTodo.title}" berhasil ditambahkan!`, 'success');
  };

  const updateTodo = (id: string, updates: Partial<TodoItem>) => {
    setTodos(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));
    void cloudUpdateDoc('todos', id, updates as Record<string, unknown>);
    showToast('Tugas diperbarui', 'info');
  };

  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    void cloudDeleteDoc('todos', id);
    showToast('Tugas telah dihapus', 'info');
  };

  const toggleTodoStatus = (id: string) => {
    const target = todos.find(t => t.id === id);
    if (!target) return;
    const nextStatus = target.status === 'completed' ? 'pending' : 'completed';
    const nextCompletedAt = nextStatus === 'completed' ? new Date().toISOString().split('T')[0] : '';
    if (nextStatus === 'completed') {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    }
    setTodos(prev => prev.map(t => (
      t.id === id
        ? { ...t, status: nextStatus, completedAt: nextCompletedAt || undefined }
        : t
    )));
    void cloudUpdateDoc('todos', id, { status: nextStatus, completedAt: nextCompletedAt });
  };

  // Financial Accounts & Saldo Awal operations
  const addAccount = (account: Omit<FinancialAccount, 'id'>) => {
    const id = 'acc-' + Date.now();
    const createdAtIso = new Date().toISOString();
    const newAcc: FinancialAccount = { ...account, id, createdAt: createdAtIso };
    setAccounts(prev => [...prev, newAcc]);
    const { createdAt: clientCreatedAt, ...rest } = newAcc;
    void cloudWriteDoc('accounts', id, { ...rest, clientCreatedAt });
    showToast(`Akun "${account.name}" berhasil ditambahkan dengan saldo awal Rp ${account.initialBalance.toLocaleString('id-ID')}`, 'success');
  };

  const updateAccount = (id: string, updates: Partial<FinancialAccount>) => {
    const normalizedUpdates: Partial<FinancialAccount> = {
      ...updates,
      ...('accountNumber' in updates ? { accountNumber: updates.accountNumber?.trim() || undefined } : {}),
      ...('notes' in updates ? { notes: updates.notes?.trim() || undefined } : {}),
    };
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...normalizedUpdates } : a));
    const { createdAt: _c, ...restUpdates } = normalizedUpdates;
    const cloudPayload: Record<string, unknown> = {
      ...restUpdates,
      ...('accountNumber' in updates ? { accountNumber: updates.accountNumber?.trim() || '' } : {}),
      ...('notes' in updates ? { notes: updates.notes?.trim() || '' } : {}),
    };
    void cloudUpdateDoc('accounts', id, cloudPayload);
    showToast('Data akun diperbarui', 'success');
  };

  const deleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    void cloudDeleteDoc('accounts', id);
    showToast('Akun berhasil dihapus', 'info');
  };

  const updateInitialBalance = (id: string, initialBalance: number) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, initialBalance } : a));
    void cloudUpdateDoc('accounts', id, { initialBalance });
    showToast('Saldo awal berhasil diperbarui', 'success');
  };

  const importAccountsFromCSV = (csvText: string): { success: boolean; count: number; error?: string } => {
    try {
      const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) {
        return { success: false, count: 0, error: 'File CSV kosong' };
      }

      let parsedCount = 0;
      const updatedAccounts = [...accounts];
      const changedAccounts: { isNew: boolean; acc: FinancialAccount }[] = [];

      lines.forEach((line, index) => {
        if (index === 0 && (line.toLowerCase().includes('nama') || line.toLowerCase().includes('name'))) {
          return;
        }

        const parts = line.split(/[,;\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 2) {
          const name = parts[0];
          const rawType = (parts[1] || 'bank').toLowerCase();
          let type: 'bank' | 'ewallet' | 'cash' = 'bank';
          if (rawType.includes('wallet') || rawType.includes('ewallet') || rawType.includes('dana') || rawType.includes('gopay') || rawType.includes('ovo')) {
            type = 'ewallet';
          } else if (rawType.includes('cash') || rawType.includes('tunai') || rawType.includes('fisik')) {
            type = 'cash';
          }

          let balance = 0;
          let accNum = '';

          if (parts.length >= 4) {
            accNum = parts[2];
            balance = parseFloat(parts[3].replace(/[^0-9.-]/g, '')) || 0;
          } else if (parts.length === 3) {
            const possibleNum = parseFloat(parts[2].replace(/[^0-9.-]/g, ''));
            if (!isNaN(possibleNum)) {
              balance = possibleNum;
            } else {
              accNum = parts[2];
            }
          }

          const existingIndex = updatedAccounts.findIndex(a => a.name.toLowerCase() === name.toLowerCase());
          if (existingIndex >= 0) {
            const nextAcc = {
              ...updatedAccounts[existingIndex],
              type,
              initialBalance: balance,
              accountNumber: accNum || updatedAccounts[existingIndex].accountNumber
            };
            updatedAccounts[existingIndex] = nextAcc;
            changedAccounts.push({ isNew: false, acc: nextAcc });
          } else {
            const color = type === 'cash' ? '#d97706' : type === 'ewallet' ? '#059669' : '#2563eb';
            const newAcc: FinancialAccount = {
              id: 'acc-' + Date.now() + Math.random().toString(36).substring(2, 5),
              name,
              type,
              initialBalance: balance,
              accountNumber: accNum,
              color,
              createdAt: new Date().toISOString()
            };
            updatedAccounts.push(newAcc);
            changedAccounts.push({ isNew: true, acc: newAcc });
          }
          parsedCount++;
        }
      });

      if (parsedCount > 0) {
        setAccounts(updatedAccounts);
        changedAccounts.forEach(({ isNew, acc }) => {
          const { createdAt: clientCreatedAt, ...rest } = acc;
          if (isNew) {
            void cloudWriteDoc('accounts', acc.id, { ...rest, clientCreatedAt });
          } else {
            void cloudUpdateDoc('accounts', acc.id, {
              type: acc.type,
              initialBalance: acc.initialBalance,
              accountNumber: acc.accountNumber
            });
          }
        });
        showToast(`Berhasil mengimpor saldo awal untuk ${parsedCount} akun!`, 'success');
        return { success: true, count: parsedCount };
      } else {
        return { success: false, count: 0, error: 'Format kolom tidak dikenali. Gunakan: Nama Akun, Tipe, No Rekening, Saldo Awal' };
      }
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || 'Gagal memproses file CSV' };
    }
  };

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

    const baseTs = Date.now();
    const transferId = 'trf-' + baseTs;
    const txDate = date || new Date().toISOString().split('T')[0];

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

    const outTx: FinanceTransaction = {
      id: 'tx-trf-out-' + baseTs,
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

    const inTx: FinanceTransaction = {
      id: 'tx-trf-in-' + (baseTs + 1),
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

    if (adminFee > 0) {
      const feeTx: FinanceTransaction = {
        id: 'tx-trf-fee-' + (baseTs + 2),
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
    newTransactions.forEach(tx => {
      void cloudWriteDoc('transactions', tx.id, tx as unknown as Record<string, unknown>);
    });
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    showToast(successMessage, 'success');
    return { success: true, transferId };
  };

  // Adjustment Akun + Pilih COA
  const addCoaAdjustment = (payload: CoaAdjustmentPayload) => {
    const targetAcc = accounts.find(a => a.id === payload.accountId);
    if (!targetAcc || payload.amount <= 0) {
      showToast('Pilih akun dan masukkan nominal adjustment yang valid.', 'error');
      return;
    }
    const id = 'tx-adj-' + Date.now();
    const isIncrease = payload.adjustmentType === 'increase';
    const adjTx: FinanceTransaction = {
      id,
      type: isIncrease ? 'income' : 'expense',
      title: payload.description.trim() || `Adjustment ${isIncrease ? '+' : '-'} (${payload.coaName})`,
      amount: payload.amount,
      category: 'Penyesuaian COA',
      date: payload.date || new Date().toISOString().split('T')[0],
      paymentMethod: targetAcc.type === 'cash' ? 'Cash' : targetAcc.type === 'ewallet' ? 'E-Wallet' : 'Bank Transfer',
      walletType: targetAcc.type === 'cash' ? 'cash' : 'non_cash',
      accountId: targetAcc.id,
      accountName: targetAcc.name,
      isAdjustment: true,
      coaCode: payload.coaCode,
      coaName: payload.coaName,
      notes: `Adjustment Saldo ${targetAcc.name} (${isIncrease ? 'Penambahan +' : 'Pengurangan -'}) contra COA [${payload.coaCode}] ${payload.coaName}`
    };

    setTransactions(prev => [adjTx, ...prev]);
    void cloudWriteDoc('transactions', id, adjTx as unknown as Record<string, unknown>);
    showToast(
      `Adjustment ${targetAcc.name} (${isIncrease ? '+' : '-'} Rp ${payload.amount.toLocaleString('id-ID')}) contra [${payload.coaCode}] berhasil dicatat!`,
      'success'
    );
  };

  // Finance operations
  const addTransaction = (tx: Omit<FinanceTransaction, 'id'>) => {
    const id = 'tx-' + Date.now();
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
    void cloudWriteDoc('transactions', id, finalTx as unknown as Record<string, unknown>);
    showToast(`Transaksi "${tx.title}" dicatat (${resolvedAccountName || (tx.walletType === 'cash' ? 'Uang Tunai' : 'Non-Tunai')})`, 'success');
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    void cloudDeleteDoc('transactions', id);
    showToast('Transaksi dihapus', 'info');
  };

  const updateTransaction = (id: string, updates: Partial<FinanceTransaction>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    void cloudUpdateDoc('transactions', id, updates as Record<string, unknown>);
    showToast('Transaksi diperbarui', 'info');
  };

  // Void Transaction (Audit-safe cancellation creating a contra reversal transaction)
  const voidTransaction = (id: string, reason?: string) => {
    const target = transactions.find(t => t.id === id);
    if (!target || target.isVoided || isContraVoidTransaction(target)) return;

    const voidedAt = new Date().toISOString();
    const cleanReason = (reason?.trim() || 'Dibatalkan (Void) oleh pengguna').slice(0, 240);

    const targetsToVoid = target.transferId
      ? transactions.filter(
          t => t.transferId === target.transferId && !t.isVoided && !isContraVoidTransaction(t)
        )
      : [target];

    if (targetsToVoid.length === 0) return;

    const baseTs = Date.now();
    const contraTxs: FinanceTransaction[] = [];
    const voidMetaById: Record<string, { contraId: string; voidReason: string }> = {};

    targetsToVoid.forEach((orig, idx) => {
      const contraId = `tx-void-${baseTs}${idx > 0 ? `-${idx}` : ''}`;
      const contraTx: FinanceTransaction = {
        id: contraId,
        type: orig.type === 'income' ? 'expense' : 'income',
        title: `[VOID] ${orig.title}`.slice(0, 200),
        amount: orig.amount,
        category: orig.category,
        date: orig.date,
        paymentMethod: orig.paymentMethod,
        walletType: orig.walletType,
        accountId: orig.accountId,
        accountName: orig.accountName,
        transferId: orig.transferId ? `void-${orig.transferId}` : undefined,
        transferType: orig.transferType,
        targetAccountId: orig.targetAccountId,
        targetAccountName: orig.targetAccountName,
        isAdjustment: orig.isAdjustment,
        coaCode: orig.coaCode,
        coaName: orig.coaName,
        debitAccountCode: orig.creditAccountCode,
        debitAccountName: orig.creditAccountName,
        creditAccountCode: orig.debitAccountCode,
        creditAccountName: orig.debitAccountName,
        isVoided: false,
        notes: `Transaksi lawan (Void) dari "${orig.title}"${cleanReason ? ` — Alasan: ${cleanReason}` : ''}`.slice(0, 950),
      };
      contraTxs.push(contraTx);
      voidMetaById[orig.id] = {
        contraId,
        voidReason: `[CONTRA:${contraId}] ${cleanReason}`.slice(0, 300),
      };
    });

    setTransactions(prev => [
      ...contraTxs,
      ...prev.map(t => {
        const meta = voidMetaById[t.id];
        return meta ? { ...t, isVoided: true, voidedAt, voidReason: meta.voidReason } : t;
      }),
    ]);

    targetsToVoid.forEach(orig => {
      const meta = voidMetaById[orig.id];
      void cloudUpdateDoc('transactions', orig.id, {
        isVoided: true,
        voidedAt,
        voidReason: meta.voidReason,
      });
    });

    contraTxs.forEach(contra => {
      void cloudWriteDoc('transactions', contra.id, contra as unknown as Record<string, unknown>);
    });

    showToast(
      targetsToVoid.length > 1
        ? `Transaksi transfer (${targetsToVoid.length} entri) di-VOID & dibuatkan ${contraTxs.length} transaksi lawannya.`
        : `Transaksi "${target.title}" di-VOID & transaksi lawannya berhasil dibuat.`,
      'warning'
    );
  };

  // Hutang Saya (Liabilitas / PayLater / Cicilan) operations
  const addMyDebt = (debt: Omit<MyDebtLiability, 'id'>): string => {
    const id = 'mdeb-' + Date.now();
    const newDebt: MyDebtLiability = { ...debt, id };
    setMyDebts(prev => [newDebt, ...prev]);
    void cloudWriteDoc('myDebts', id, newDebt as unknown as Record<string, unknown>);
    showToast(`Hutang baru kepada "${debt.creditorName}" berhasil dicatat!`, 'warning');
    return id;
  };

  const updateMyDebt = (id: string, updates: Partial<MyDebtLiability>) => {
    setMyDebts(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    void cloudUpdateDoc('myDebts', id, updates as Record<string, unknown>);
    showToast('Data hutang diperbarui', 'info');
  };

  const deleteMyDebt = (id: string) => {
    setMyDebts(prev => prev.filter(d => d.id !== id));
    void cloudDeleteDoc('myDebts', id);
    showToast('Hutang dihapus', 'info');
  };

  const payMyDebt = (debtId: string, amount: number, sourceAccountId: string, notes?: string) => {
    const targetDebt = myDebts.find(d => d.id === debtId);
    if (!targetDebt) return;

    const sourceAcc = accounts.find(a => a.id === sourceAccountId);
    const sourceAccName = sourceAcc ? sourceAcc.name : 'Rekening';

    const nextPaid = Math.min(targetDebt.amount, targetDebt.amountPaid + amount);
    const nextStatus = nextPaid >= targetDebt.amount ? 'paid' : nextPaid > 0 ? 'partial' : 'unpaid';

    setMyDebts(prev => prev.map(d => (
      d.id === debtId ? { ...d, amountPaid: nextPaid, status: nextStatus } : d
    )));
    void cloudUpdateDoc('myDebts', debtId, { amountPaid: nextPaid, status: nextStatus });

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
    void cloudWriteDoc('transactions', txId, paymentTx as unknown as Record<string, unknown>);

    if (nextStatus === 'paid') {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
      showToast(`Hutang ke "${targetDebt.creditorName}" telah LUNAS! Saldo ${sourceAccName} terpotong Rp ${amount.toLocaleString('id-ID')}`, 'success');
    } else {
      showToast(`Cicilan sebesar Rp ${amount.toLocaleString('id-ID')} berhasil dibayar via ${sourceAccName}.`, 'success');
    }
  };

  // Legacy daily audit methods preserved for compatibility
  const saveDailyAudit = (audit: Omit<DailyAuditRecord, 'id' | 'verifiedAt'>) => {
    const id = 'audit-' + Date.now();
    const newRecord: DailyAuditRecord = { ...audit, id, verifiedAt: new Date().toISOString() };
    setDailyAudits(prev => [newRecord, ...prev]);
  };
  const deleteDailyAudit = (id: string) => {
    setDailyAudits(prev => prev.filter(a => a.id !== id));
  };
  const autoReconcileDifference = (_auditItem: AccountAuditItem, _date: string) => {};

  // Debt & Invoice operations
  const addDebt = (
    debt: Omit<DebtReceivable, 'id' | 'invoiceNumber'>,
    sourceAccountId?: string,
    deductFromAccount: boolean = false
  ) => {
    const baseTs = Date.now();
    const id = 'dbt-' + baseTs;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(debts.length + 1).padStart(3, '0')}`;

    let disbursementTxId: string | undefined = undefined;
    let chosenAccName: string | undefined = undefined;

    if (deductFromAccount && sourceAccountId) {
      const sourceAcc = accounts.find(a => a.id === sourceAccountId);
      if (sourceAcc) {
        chosenAccName = sourceAcc.name;
        disbursementTxId = 'tx-' + (baseTs + 1);
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
        void cloudWriteDoc('transactions', disbursementTxId, disbursementTx as unknown as Record<string, unknown>);
      }
    }

    const initialItems: DebtLineItem[] =
      Array.isArray(debt.items) && debt.items.length > 0
        ? debt.items
        : [
            {
              id: 'di-' + baseTs,
              description: debt.description || 'Pinjaman / Tagihan Jasa',
              amount: debt.amount,
              date: debt.issuedDate || new Date().toISOString().split('T')[0],
            },
          ];

    const newDebt: DebtReceivable = {
      ...debt,
      id,
      invoiceNumber,
      sourceAccountId,
      sourceAccountName: chosenAccName,
      deductFromAccount: !!deductFromAccount,
      disbursementTransactionId: disbursementTxId,
      qrImageDataUrl: sanitizeSafeImageSrc(debt.qrImageDataUrl),
      items: initialItems,
    };

    setDebts(prev => [newDebt, ...prev]);
    void cloudWriteDoc('debts', id, newDebt as unknown as Record<string, unknown>);

    if (disbursementTxId && chosenAccName) {
      showToast(`Piutang atas nama "${debt.debtorName}" (${invoiceNumber}) dicatat & saldo ${chosenAccName} terpotong Rp ${debt.amount.toLocaleString('id-ID')}!`, 'success');
    } else {
      showToast(`Piutang atas nama "${debt.debtorName}" dan invoice ${invoiceNumber} berhasil dibuat!`, 'success');
    }
  };

  const updateDebt = (id: string, updates: Partial<DebtReceivable>) => {
    const cleanUpdates = { ...updates };
    if (cleanUpdates.qrImageDataUrl && !sanitizeSafeImageSrc(cleanUpdates.qrImageDataUrl)) {
      showToast('Ukuran atau format gambar QR tidak valid.', 'warning');
      delete cleanUpdates.qrImageDataUrl;
    }
    setDebts(prev => prev.map(d => d.id === id ? { ...d, ...cleanUpdates } : d));
    void cloudUpdateDoc('debts', id, cleanUpdates as Record<string, unknown>);
    showToast('Data piutang diperbarui', 'info');
  };

  const increaseDebtAmount = (id: string, addedAmount: number, notes?: string, newDueDate?: string) => {
    const target = debts.find(d => d.id === id);
    if (!target || addedAmount <= 0) return;

    const existingItems = getDebtLineItems(target);
    const addedItem: DebtLineItem = {
      id: 'di-' + Date.now(),
      description: notes?.trim() || 'Tambahan Piutang',
      amount: addedAmount,
      date: new Date().toISOString().split('T')[0],
    };
    const nextItems = [...existingItems, addedItem];

    const nextAmount = target.amount + addedAmount;
    const nextStatus = target.amountPaid >= nextAmount ? 'paid' : target.amountPaid > 0 ? 'partial' : 'unpaid';
    const nextDueDate = newDueDate || target.dueDate;
    const extraNote = notes?.trim()
      ? (target.notes ? `${target.notes}\n+ Tambahan Rp ${addedAmount.toLocaleString('id-ID')}: ${notes.trim()}` : `+ Tambahan Rp ${addedAmount.toLocaleString('id-ID')}: ${notes.trim()}`)
      : target.notes;

    setDebts(prev => prev.map(d => (
      d.id === id
        ? { ...d, amount: nextAmount, status: nextStatus, dueDate: nextDueDate, notes: extraNote, items: nextItems }
        : d
    )));

    void cloudUpdateDoc('debts', id, {
      amount: nextAmount,
      status: nextStatus,
      dueDate: nextDueDate,
      notes: extraNote,
      items: nextItems,
    });
    showToast(`Nominal piutang ${target.debtorName} bertambah Rp ${addedAmount.toLocaleString('id-ID')}`, 'success');
  };

  const deleteDebt = (id: string) => {
    const target = debts.find(d => d.id === id);
    if (target?.disbursementTransactionId) {
      const removedIds = transactions
        .filter(t => t.id === target.disbursementTransactionId || t.relatedDebtId === id)
        .map(t => t.id);
      setTransactions(prev => prev.filter(t => !removedIds.includes(t.id)));
      removedIds.forEach(txId => void cloudDeleteDoc('transactions', txId));
    }
    setDebts(prev => prev.filter(d => d.id !== id));
    void cloudDeleteDoc('debts', id);
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
        void cloudWriteDoc('transactions', txId, repaymentTx as unknown as Record<string, unknown>);
      }
    }

    const nextPaid = Math.min(target.amount, target.amountPaid + paymentAmount);
    const nextStatus = nextPaid >= target.amount ? 'paid' : nextPaid > 0 ? 'partial' : 'unpaid';
    if (nextStatus === 'paid') {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
    }

    setDebts(prev => prev.map(d => (
      d.id === id ? { ...d, amountPaid: nextPaid, status: nextStatus } : d
    )));
    void cloudUpdateDoc('debts', id, { amountPaid: nextPaid, status: nextStatus });

    if (destAccName) {
      showToast(`Pembayaran Rp ${paymentAmount.toLocaleString('id-ID')} dicatat & saldo ${destAccName} bertambah!`, 'success');
    } else {
      showToast(`Pembayaran sebesar Rp ${paymentAmount.toLocaleString('id-ID')} berhasil dicatat!`, 'success');
    }
  };

  const updateCategoryBudget = (category: string, limit: number) => {
    const exists = categoryBudgets.some(b => b.category === category);
    setCategoryBudgets(prev => (
      exists
        ? prev.map(b => b.category === category ? { ...b, limit } : b)
        : [...prev, { category, limit }]
    ));

    const budgetId = getBudgetDocId(category);
    if (exists) {
      void cloudUpdateDoc('categoryBudgets', budgetId, { limit, category });
    } else {
      void cloudWriteDoc('categoryBudgets', budgetId, { category, limit });
    }
    showToast(`Batas anggaran kategori "${category}" diperbarui`, 'success');
  };

  // Notes operations
  const addNote = (note: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const today = new Date().toISOString().split('T')[0];
    const id = 'nt-' + Date.now();
    const newNote: NoteItem = { ...note, id, createdAt: today, updatedAt: today };
    setNotes(prev => [newNote, ...prev]);
    const { createdAt: clientCreatedAt, updatedAt: clientUpdatedAt, ...rest } = newNote;
    void cloudWriteDoc('notes', id, { ...rest, clientCreatedAt, clientUpdatedAt });
    showToast(`Catatan "${note.title}" disimpan`, 'success');
  };

  const updateNote = (id: string, updates: Partial<NoteItem>) => {
    const today = new Date().toISOString().split('T')[0];
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: today } : n));
    const { createdAt: _c, updatedAt: _u, ...rest } = updates;
    void cloudUpdateDoc('notes', id, { ...rest, clientUpdatedAt: today });
    showToast('Catatan diperbarui', 'info');
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    void cloudDeleteDoc('notes', id);
    showToast('Catatan dihapus', 'info');
  };

  const togglePinNote = (id: string) => {
    const target = notes.find(n => n.id === id);
    if (!target) return;
    const today = new Date().toISOString().split('T')[0];
    const nextPinned = !target.isPinned;
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: nextPinned } : n));
    void cloudUpdateDoc('notes', id, { isPinned: nextPinned, clientUpdatedAt: today });
  };

  const addNoteCategory = (category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    const nextCats = noteCategories.includes(trimmed) ? noteCategories : [...noteCategories, trimmed];
    setNoteCategories(nextCats);
    void cloudUpdateDoc('preferences', 'main', { noteCategories: nextCats.slice(0, 50) });
    showToast(`Kategori "${trimmed}" berhasil ditambahkan!`, 'success');
  };

  const deleteNoteCategory = (category: string) => {
    const nextCats = noteCategories.filter(c => c !== category);
    setNoteCategories(nextCats);
    void cloudUpdateDoc('preferences', 'main', { noteCategories: nextCats.slice(0, 50) });
    showToast(`Kategori "${category}" dihapus`, 'info');
  };

  // Reimbursement Module Operations
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
    const { createdAt: clientCreatedAt, ...rest } = newItem;
    void cloudWriteDoc('reimbursements', id, { ...rest, clientCreatedAt });
    showToast(`Klaim reimburse untuk "${item.property}" berhasil ditambahkan!`, 'success');
    return id;
  };

  const updateReimbursement = (id: string, updates: Partial<ReimbursementItem>) => {
    const existingItem = reimbursements.find(r => r.id === id);
    if (!existingItem) return;
    const merged = { ...existingItem, ...updates };
    if (merged.typeProject === 'Online') {
      merged.totalDays = Math.max(1, Math.round((merged.wdDays + merged.weDays) / 2));
    }
    setReimbursements(prev => prev.map(r => r.id === id ? merged : r));
    const { createdAt: _c, id: _i, no: _n, ...rest } = merged;
    void cloudUpdateDoc('reimbursements', id, rest as unknown as Record<string, unknown>);
    showToast('Data reimburse diperbarui', 'info');
  };

  const deleteReimbursement = (id: string) => {
    setReimbursements(prev => prev.filter(r => r.id !== id));
    void cloudDeleteDoc('reimbursements', id);
    showToast('Klaim reimburse telah dihapus', 'info');
  };

  const updateReimburseStatus = (id: string, status: ReimburseStatus, paymentAccountId?: string) => {
    const item = reimbursements.find(r => r.id === id);
    if (!item) return;

    const now = new Date();
    const formattedDeliveryDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const nextDeliveryDate = status === 'Done' ? (item.deliveryDate || formattedDeliveryDate) : item.deliveryDate;
    const nextPaymentAccId = paymentAccountId || item.paymentAccountId;

    setReimbursements(prev => prev.map(r => (
      r.id === id
        ? { ...r, status, deliveryDate: nextDeliveryDate, paymentAccountId: nextPaymentAccId }
        : r
    )));

    void cloudUpdateDoc('reimbursements', id, {
      status,
      deliveryDate: nextDeliveryDate,
      paymentAccountId: nextPaymentAccId
    });

    if (status === 'Done') {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
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
        void cloudWriteDoc('transactions', txId, depositTx as unknown as Record<string, unknown>);
        showToast(`Reimburse "${item.property}" cair! Rp ${item.totalAmount.toLocaleString('id-ID')} masuk ke ${targetAcc?.name || 'rekening'}.`, 'success');
      } else {
        showToast(`Status klaim reimburse "${item.property}" selesai (Done)!`, 'success');
      }
    } else {
      showToast(`Status reimburse "${item.property}" diubah ke "${status}"`, 'info');
    }
  };

  const updateReimburseRate = (role: ReimburseRole, type: ReimburseProjectType, wdRate: number, weRate: number) => {
    const target = reimburseRates.find(r => r.role === role && r.type === type);
    setReimburseRates(prev => prev.map(r => (
      r.role === role && r.type === type ? { ...r, wdRate, weRate } : r
    )));
    if (target) {
      void cloudUpdateDoc('reimburseRates', target.id, { wdRate, weRate });
    }
    showToast(`Tarif reimburse untuk ${role} (${type}) berhasil diperbarui!`, 'success');
  };

  const resetReimburseRatesToDefault = () => {
    setReimburseRates(DEFAULT_REIMBURSE_RATES);
    DEFAULT_REIMBURSE_RATES.forEach(rt => {
      void cloudUpdateDoc('reimburseRates', rt.id, { wdRate: rt.wdRate, weRate: rt.weRate });
    });
    showToast('Tarif reimburse dikembalikan ke standar awal', 'info');
  };

  // Habit operations
  const toggleHabitDay = (habitId: string, dateStr: string) => {
    const target = habits.find(h => h.id === habitId);
    if (!target) return;
    const exists = target.completedDays.includes(dateStr);
    const updatedDays = exists
      ? target.completedDays.filter(d => d !== dateStr)
      : [...target.completedDays, dateStr];
    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, completedDays: updatedDays } : h));
    void cloudUpdateDoc('habits', habitId, { completedDays: updatedDays });
  };

  const addHabit = (title: string, color: string) => {
    const id = 'hb-' + Date.now();
    const newHabit: HabitItem = { id, title, targetPerWeek: 5, completedDays: [], color };
    setHabits(prev => [...prev, newHabit]);
    void cloudWriteDoc('habits', id, newHabit as unknown as Record<string, unknown>);
    showToast(`Habit "${title}" dibuat`, 'success');
  };

  const deleteHabit = (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
    void cloudDeleteDoc('habits', id);
  };

  // Logbook Kerja operations
  const addLogbookEntry = (entry: Omit<LogbookEntry, 'id' | 'createdAt'>) => {
    const id = 'log-' + Date.now();
    const createdAtIso = new Date().toISOString();
    const newEntry: LogbookEntry = { ...entry, id, createdAt: createdAtIso };
    setLogbookEntries(prev => [newEntry, ...prev]);
    const { createdAt: clientCreatedAt, ...rest } = newEntry;
    void cloudWriteDoc('logbook', id, { ...rest, clientCreatedAt });
    showToast('Catatan logbook berhasil ditambahkan!', 'success');
  };

  const updateLogbookEntry = (id: string, updates: Partial<LogbookEntry>) => {
    setLogbookEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    const { createdAt: _c, ...rest } = updates;
    void cloudUpdateDoc('logbook', id, rest as Record<string, unknown>);
    showToast('Logbook diperbarui', 'info');
  };

  const deleteLogbookEntry = (id: string) => {
    setLogbookEntries(prev => prev.filter(e => e.id !== id));
    void cloudDeleteDoc('logbook', id);
    showToast('Catatan logbook dihapus', 'info');
  };

  // Saved Barcodes operations
  const addSavedBarcode = (barcode: Omit<SavedBarcode, 'id' | 'createdAt'>) => {
    const id = 'bc-' + Date.now();
    const createdAtIso = new Date().toISOString();
    const newBc: SavedBarcode = {
      ...barcode,
      dataUrl: sanitizeImageDataUrl(barcode.dataUrl),
      id,
      createdAt: createdAtIso
    };
    setSavedBarcodes(prev => [newBc, ...prev]);
    const { createdAt: clientCreatedAt, ...rest } = newBc;
    void cloudWriteDoc('barcodes', id, { ...rest, clientCreatedAt });
    showToast(`"${barcode.title}" berhasil disimpan ke sistem!`, 'success');
  };

  const deleteSavedBarcode = (id: string) => {
    setSavedBarcodes(prev => prev.filter(b => b.id !== id));
    void cloudDeleteDoc('barcodes', id);
    showToast('Kode tersimpan dihapus', 'info');
  };

  // Export / Import / Reset
  const exportDataJSON = () => {
    const payload = {
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      profile,
      accounts,
      todos,
      transactions,
      debts,
      myDebts,
      categoryBudgets,
      notes,
      habits,
      logbookEntries,
      savedBarcodes,
      reimbursements,
      reimburseRates
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qhub-backup-${new Date().toISOString().split('T')[0]}.json`;
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
      if (Array.isArray(data.categoryBudgets)) setCategoryBudgets(data.categoryBudgets);
      if (Array.isArray(data.notes)) setNotes(data.notes);
      if (Array.isArray(data.habits)) setHabits(data.habits);
      if (Array.isArray(data.logbookEntries)) setLogbookEntries(data.logbookEntries);
      if (Array.isArray(data.savedBarcodes)) setSavedBarcodes(data.savedBarcodes);
      if (Array.isArray(data.reimbursements)) setReimbursements(data.reimbursements);
      if (Array.isArray(data.reimburseRates)) setReimburseRates(data.reimburseRates);

      if (hasActiveSession()) {
        setTimeout(() => {
          if (hasActiveSession()) {
            void syncFullWorkspaceToPostgres({ overwriteExisting: true }).catch((err) => {
              if (!(err instanceof ApiRequestError && err.code === 'DATABASE_NOT_CONFIGURED')) {
                console.error('Error syncing imported backup:', err);
              }
            });
          }
        }, 120);
      }
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
    setCategoryBudgets(SEED_CATEGORY_BUDGETS);
    setNotes(SEED_NOTES);
    setHabits(SEED_HABITS);
    showToast('Data lokal dikembalikan ke template bawaan', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        authUser,
        authLoading,
        syncStatus,
        signInWithGoogle,
        signInWithUsernamePassword,
        registerWithUsernamePassword,
        signOutGoogle,
        signOutUser,
        pushLocalWorkspaceToCloud,
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
        addCoaAdjustment,
        todos,
        addTodo,
        updateTodo,
        deleteTodo,
        toggleTodoStatus,
        transactions,
        addTransaction,
        deleteTransaction,
        updateTransaction,
        voidTransaction,
        debts,
        addDebt,
        updateDebt,
        deleteDebt,
        recordDebtPayment,
        increaseDebtAmount,
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
        logbookEntries,
        addLogbookEntry,
        updateLogbookEntry,
        deleteLogbookEntry,
        savedBarcodes,
        addSavedBarcode,
        deleteSavedBarcode,
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
