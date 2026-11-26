import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { isContraVoidTransaction, BASE_CHART_OF_ACCOUNTS, inferLiabilityCoaCode } from '../utils/accounting';
import { getDebtLineItems, sanitizeSafeImageSrc } from '../utils/debtItems';
import { findClosedPeriodForDate } from '../utils/billingPeriod';
import {
  NavigationTab,
  TodoItem,
  FinanceTransaction,
  DebtReceivable,
  DebtLineItem,
  CategoryBudget,
  NoteItem,
  UserProfile,
  AppBranding,
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
  SavedBarcode,
  ChartOfAccount,
  ClosedPeriodRecord
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
  linkUsernamePassword: (username: string, password: string, currentPassword?: string) => Promise<{ ok: boolean; error?: string }>;
  linkGoogleAccount: () => Promise<{ ok: boolean; error?: string }>;
  signOutGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  pushLocalWorkspaceToCloud: () => Promise<void>;

  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  appBranding: AppBranding;
  updateAppBranding: (updates: Partial<AppBranding>) => Promise<void>;
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
  customCoaAccounts: ChartOfAccount[];
  upsertCoaAccount: (coa: ChartOfAccount) => void;
  deleteCustomCoaAccount: (code: string) => void;
  closedPeriods: ClosedPeriodRecord[];
  closePeriod: (record: Omit<ClosedPeriodRecord, 'closedAt'>) => void;
  reopenPeriod: (periodId: string) => void;
  isDateClosed: (dateStr: string) => ClosedPeriodRecord | undefined;

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

const DEFAULT_AVATAR_URL = '/src/assets/images/user_avatar_1793517278515.jpg';

const DEFAULT_PROFILE: UserProfile = {
  name: 'Pengguna Baru',
  title: '',
  avatarUrl: DEFAULT_AVATAR_URL,
  currencySymbol: 'Rp',
  monthlyBudget: 0,
  monthlyCutoffDay: 26,
  bankAccountDetails: '',
  paymentQrDataUrl: undefined,
};

const DEFAULT_NOTE_CATEGORIES = ['Umum', 'Ide & Konsep', 'Materi & Riset', 'Work', 'Meeting'];

export const DEFAULT_REIMBURSE_RATES: ReimburseRate[] = [
  { id: 'rate-1', role: 'M', type: 'Onsite', wdRate: 44500, weRate: 69500 },
  { id: 'rate-2', role: 'M', type: 'Online', wdRate: 18750, weRate: 37500 },
  { id: 'rate-3', role: 'TPM', type: 'Onsite', wdRate: 75750, weRate: 100750 },
  { id: 'rate-4', role: 'TPM', type: 'Online', wdRate: 33750, weRate: 52500 },
  { id: 'rate-5', role: 'PM', type: 'Onsite', wdRate: 132000, weRate: 157000 },
  { id: 'rate-6', role: 'PM', type: 'Online', wdRate: 60000, weRate: 78750 },
];

const USER_STORAGE_KEYS = [
  'omnihub_profile',
  'omnihub_accounts',
  'omnihub_todos',
  'omnihub_transactions',
  'omnihub_debts',
  'omnihub_my_debts',
  'omnihub_daily_audits',
  'omnihub_budgets',
  'omnihub_notes',
  'omnihub_note_categories',
  'omnihub_habits',
  'omnihub_logbook_entries',
  'omnihub_saved_barcodes',
  'omnihub_reimbursements',
  'omnihub_reimburse_rates',
  'omnihub_custom_coa',
  'omnihub_closed_periods',
];

function clearUserWorkspaceStorage() {
  USER_STORAGE_KEYS.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      // ignore storage errors
    }
  });
}

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

function readStoredBranding(): AppBranding {
  try {
    const raw = localStorage.getItem('omnihub_branding');
    if (!raw) return { appName: "Q'Hub", appLogoUrl: undefined };
    const parsed = JSON.parse(raw);
    return {
      appName: typeof parsed?.appName === 'string' && parsed.appName.trim() ? parsed.appName.trim() : "Q'Hub",
      appLogoUrl: sanitizeSafeImageSrc(parsed?.appLogoUrl),
    };
  } catch {
    return { appName: "Q'Hub", appLogoUrl: undefined };
  }
}

function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const localTokenRef = useRef<string | null>(null);
  const isLinkingGoogleRef = useRef<boolean>(false);
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

  // Global app branding (independent from user accounts)
  const [appBranding, setAppBranding] = useState<AppBranding>(() => readStoredBranding());

  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('omnihub_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_PROFILE,
          ...parsed,
          avatarUrl: sanitizeSafeImageSrc(parsed.avatarUrl) || DEFAULT_AVATAR_URL,
          paymentQrDataUrl: sanitizeSafeImageSrc(parsed.paymentQrDataUrl),
        };
      } catch {
        // fallback below
      }
    }
    return { ...DEFAULT_PROFILE };
  });

  const [accounts, setAccounts] = useState<FinancialAccount[]>(() =>
    readJsonStorage<FinancialAccount[]>('omnihub_accounts', [])
  );
  const [todos, setTodos] = useState<TodoItem[]>(() =>
    readJsonStorage<TodoItem[]>('omnihub_todos', [])
  );
  const [transactions, setTransactions] = useState<FinanceTransaction[]>(() =>
    readJsonStorage<FinanceTransaction[]>('omnihub_transactions', [])
  );
  const [debts, setDebts] = useState<DebtReceivable[]>(() =>
    readJsonStorage<DebtReceivable[]>('omnihub_debts', [])
  );
  const [myDebts, setMyDebts] = useState<MyDebtLiability[]>(() =>
    readJsonStorage<MyDebtLiability[]>('omnihub_my_debts', [])
  );
  const [dailyAudits, setDailyAudits] = useState<DailyAuditRecord[]>(() =>
    readJsonStorage<DailyAuditRecord[]>('omnihub_daily_audits', [])
  );
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>(() =>
    readJsonStorage<CategoryBudget[]>('omnihub_budgets', [])
  );
  const [notes, setNotes] = useState<NoteItem[]>(() =>
    readJsonStorage<NoteItem[]>('omnihub_notes', [])
  );
  const [noteCategories, setNoteCategories] = useState<string[]>(() =>
    readJsonStorage<string[]>('omnihub_note_categories', DEFAULT_NOTE_CATEGORIES)
  );
  const [habits, setHabits] = useState<HabitItem[]>(() =>
    readJsonStorage<HabitItem[]>('omnihub_habits', [])
  );
  const [logbookEntries, setLogbookEntries] = useState<LogbookEntry[]>(() =>
    readJsonStorage<LogbookEntry[]>('omnihub_logbook_entries', [])
  );
  const [savedBarcodes, setSavedBarcodes] = useState<SavedBarcode[]>(() =>
    readJsonStorage<SavedBarcode[]>('omnihub_saved_barcodes', [])
  );
  const [reimbursements, setReimbursements] = useState<ReimbursementItem[]>(() => {
    const parsed = readJsonStorage<ReimbursementItem[]>('omnihub_reimbursements', []);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(item => {
      if (item.typeProject === 'Online') {
        return {
          ...item,
          totalDays: Math.max(1, Math.round((item.wdDays + item.weDays) / 2))
        };
      }
      return item;
    });
  });

  const [reimburseRates, setReimburseRates] = useState<ReimburseRate[]>(() =>
    readJsonStorage<ReimburseRate[]>('omnihub_reimburse_rates', DEFAULT_REIMBURSE_RATES)
  );
  const [customCoaAccounts, setCustomCoaAccounts] = useState<ChartOfAccount[]>(() =>
    readJsonStorage<ChartOfAccount[]>('omnihub_custom_coa', [])
  );
  const [closedPeriods, setClosedPeriods] = useState<ClosedPeriodRecord[]>(() =>
    readJsonStorage<ClosedPeriodRecord[]>('omnihub_closed_periods', [])
  );

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Latest state ref for first-login migration
  const latestStateRef = useRef({
    profile,
    theme,
    noteCategories,
    customCoa: customCoaAccounts,
    closedPeriods,
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
    customCoa: customCoaAccounts,
    closedPeriods,
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

  // Fetch global branding from PostgreSQL on mount (public, works before login)
  useEffect(() => {
    let active = true;
    fetch('/api/branding')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data || typeof data !== 'object') return;
        setAppBranding({
          appName: typeof data.appName === 'string' && data.appName.trim() ? data.appName.trim() : "Q'Hub",
          appLogoUrl: sanitizeSafeImageSrc(data.appLogoUrl || undefined),
        });
      })
      .catch(() => {
        // fallback to local cache
      });
    return () => {
      active = false;
    };
  }, []);

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
  useEffect(() => { localStorage.setItem('omnihub_custom_coa', JSON.stringify(customCoaAccounts)); }, [customCoaAccounts]);
  useEffect(() => { localStorage.setItem('omnihub_closed_periods', JSON.stringify(closedPeriods)); }, [closedPeriods]);

  useEffect(() => {
    const appTitle = appBranding.appName?.trim() || "Q'Hub";
    document.title = `${appTitle} - Personal Super App & Management Suite`;
    try {
      localStorage.setItem('omnihub_branding', JSON.stringify({
        appName: appTitle,
        appLogoUrl: sanitizeSafeImageSrc(appBranding.appLogoUrl) || undefined,
      }));
    } catch {
      // ignore storage quota errors
    }
  }, [appBranding.appName, appBranding.appLogoUrl]);

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
        name: ws.profile.name || DEFAULT_PROFILE.name,
        title: ws.profile.title || '',
        avatarUrl: sanitizeSafeImageSrc(ws.profile.avatarUrl) || DEFAULT_AVATAR_URL,
        currencySymbol: ws.profile.currencySymbol || 'Rp',
        monthlyBudget: Number(ws.profile.monthlyBudget) || 0,
        monthlyCutoffDay: Math.min(31, Math.max(1, Math.floor(Number(ws.profile.monthlyCutoffDay) || 26))),
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
      if (Array.isArray(ws.preferences.customCoa)) {
        setCustomCoaAccounts(ws.preferences.customCoa);
      }
      if (Array.isArray(ws.preferences.closedPeriods)) {
        setClosedPeriods(ws.preferences.closedPeriods);
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

  const resetPrivateWorkspaceToDefaults = (displayName?: string) => {
    clearUserWorkspaceStorage();
    const defaultProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      name: displayName?.trim() || DEFAULT_PROFILE.name,
    };

    setProfile(defaultProfile);
    setAccounts([]);
    setTodos([]);
    setTransactions([]);
    setDebts([]);
    setMyDebts([]);
    setDailyAudits([]);
    setCategoryBudgets([]);
    setNotes([]);
    setNoteCategories(DEFAULT_NOTE_CATEGORIES);
    setCustomCoaAccounts([]);
    setClosedPeriods([]);
    setHabits([]);
    setLogbookEntries([]);
    setSavedBarcodes([]);
    setReimbursements([]);
    setReimburseRates(DEFAULT_REIMBURSE_RATES);

    return {
      profile: defaultProfile,
      theme,
      noteCategories: DEFAULT_NOTE_CATEGORIES,
      customCoa: [],
      closedPeriods: [],
      accounts: [],
      transactions: [],
      debts: [],
      myDebts: [],
      categoryBudgets: [],
      todos: [],
      notes: [],
      habits: [],
      logbookEntries: [],
      savedBarcodes: [],
      reimbursements: [],
      reimburseRates: DEFAULT_REIMBURSE_RATES,
    };
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

  const loadWorkspaceFromPostgres = async (options?: {
    silent?: boolean;
    seedStateOverride?: Record<string, unknown>;
    displayName?: string;
  }) => {
    if (!hasActiveSession()) return;
    if (!options?.silent) setSyncStatus('syncing');
    try {
      const data = await apiFetch<{ initialized: boolean; workspace: any }>('/api/workspace');
      dbConfiguredRef.current = true;
      if (!data.initialized) {
        const cleanSeed = options?.seedStateOverride ?? resetPrivateWorkspaceToDefaults(options?.displayName);
        await syncFullWorkspaceToPostgres({ overwriteExisting: false, overrideWorkspace: cleanSeed });
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
      if (isLinkingGoogleRef.current) {
        return;
      }

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

      const fallbackDisplayName = firebaseUser.displayName || firebaseUser.email || 'Pengguna Google';
      let resolvedAuthUser: AuthUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || undefined,
        googleEmail: firebaseUser.email || undefined,
        displayName: fallbackDisplayName,
        authType: 'google',
        hasGoogle: true,
        hasPassword: false,
      };

      try {
        const fbToken = await firebaseUser.getIdToken();
        const meRes = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${fbToken}` },
        });
        if (meRes.ok) {
          const meData = await meRes.json().catch(() => null);
          if (meData?.user?.uid) {
            resolvedAuthUser = meData.user as AuthUser;
          }
        }
      } catch {
        // Fallback to Firebase profile if /api/auth/me is temporarily unreachable
      }

      const effectiveUid = resolvedAuthUser.uid || firebaseUser.uid;
      const effectiveDisplayName = resolvedAuthUser.displayName || fallbackDisplayName;
      const prevUid = localStorage.getItem('omnihub_active_uid');
      if (prevUid !== effectiveUid) {
        resetPrivateWorkspaceToDefaults(effectiveDisplayName);
      }
      localStorage.setItem('omnihub_active_uid', effectiveUid);

      localTokenRef.current = null;
      setUser(firebaseUser);
      setAuthUser(resolvedAuthUser);
      setAuthLoading(false);
      dbConfiguredRef.current = true;
      if (!cancelled) {
        await loadWorkspaceFromPostgres({ displayName: effectiveDisplayName });
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
      const prevUid = localStorage.getItem('omnihub_active_uid');
      if (prevUid !== data.user.uid) {
        resetPrivateWorkspaceToDefaults(data.user.displayName);
      }
      localStorage.setItem('omnihub_active_uid', data.user.uid);

      localTokenRef.current = data.token;
      dbConfiguredRef.current = true;
      setUser(null);
      setAuthUser(data.user as AuthUser);
      await loadWorkspaceFromPostgres({ displayName: data.user.displayName });
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
      const cleanSeed = resetPrivateWorkspaceToDefaults(data.user.displayName);
      localStorage.setItem('omnihub_active_uid', data.user.uid);

      localTokenRef.current = data.token;
      dbConfiguredRef.current = true;
      setUser(null);
      setAuthUser(data.user as AuthUser);
      await loadWorkspaceFromPostgres({ seedStateOverride: cleanSeed, displayName: data.user.displayName });
      showToast(`Akun @${data.user.username} berhasil dibuat dengan data bersih (0)!`, 'success');
      return { ok: true };
    } catch {
      setSyncStatus('local');
      return { ok: false, error: 'Tidak dapat terhubung ke server registrasi.' };
    }
  };

  const linkUsernamePassword = async (
    username: string,
    password: string,
    currentPassword?: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!hasActiveSession()) {
      return { ok: false, error: 'Silakan masuk terlebih dahulu.' };
    }
    try {
      const data = await apiFetch<{ user: AuthUser; token?: string }>('/api/auth/link-credentials', {
        method: 'POST',
        body: JSON.stringify({ username, password, currentPassword }),
      });
      if (data?.user) {
        setAuthUser(data.user);
        showToast(
          `Login username @${data.user.username} berhasil ditautkan ke akun ini!`,
          'success'
        );
        return { ok: true };
      }
      return { ok: false, error: 'Gagal menautkan username & password.' };
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Tidak dapat menautkan kredensial.';
      showToast(msg, 'error');
      return { ok: false, error: msg };
    }
  };

  const linkGoogleAccount = async (): Promise<{ ok: boolean; error?: string }> => {
    if (!hasActiveSession()) {
      return { ok: false, error: 'Silakan masuk terlebih dahulu.' };
    }
    const hadLocalSession = Boolean(localTokenRef.current);
    isLinkingGoogleRef.current = true;
    try {
      const popupResult = await signInWithPopup(auth, googleProvider);
      const googleIdToken = await popupResult.user.getIdToken();
      const data = await apiFetch<{ user: AuthUser }>('/api/auth/link-google', {
        method: 'POST',
        body: JSON.stringify({ googleIdToken }),
      });

      if (hadLocalSession && auth.currentUser) {
        await signOut(auth).catch(() => {});
      } else if (popupResult.user) {
        setUser(popupResult.user);
      }

      if (data?.user) {
        setAuthUser(data.user);
        showToast(
          `Akun Google (${data.user.googleEmail || popupResult.user.email}) berhasil dihubungkan ke workspace ini!`,
          'success'
        );
        return { ok: true };
      }
      return { ok: false, error: 'Gagal menghubungkan akun Google.' };
    } catch (err: any) {
      if (hadLocalSession && auth.currentUser) {
        await signOut(auth).catch(() => {});
      }
      if (err?.code === 'auth/popup-closed-by-user') {
        showToast('Penautan akun Google dibatalkan.', 'info');
        return { ok: false, error: 'Penautan dibatalkan.' };
      }
      const msg = err instanceof ApiRequestError
        ? err.message
        : err?.message || 'Gagal menghubungkan akun Google.';
      showToast(msg, 'error');
      return { ok: false, error: msg };
    } finally {
      isLinkingGoogleRef.current = false;
    }
  };

  const signOutUser = async () => {
    try {
      localTokenRef.current = null;
      localStorage.removeItem('omnihub_active_uid');
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

  const updateAppBranding = async (updates: Partial<AppBranding>) => {
    const nextBranding: AppBranding = { ...appBranding };
    if (updates.appName !== undefined) {
      nextBranding.appName = updates.appName.trim() || "Q'Hub";
    }
    if ('appLogoUrl' in updates) {
      if (!updates.appLogoUrl) {
        nextBranding.appLogoUrl = undefined;
      } else {
        const safeLogo = sanitizeSafeImageSrc(updates.appLogoUrl);
        if (!safeLogo) {
          showToast('Format atau ukuran logo aplikasi tidak valid.', 'warning');
          return;
        }
        nextBranding.appLogoUrl = safeLogo;
      }
    }

    setAppBranding(nextBranding);

    if (hasActiveSession()) {
      try {
        await apiFetch('/api/branding', {
          method: 'PUT',
          body: JSON.stringify({
            appName: nextBranding.appName,
            appLogoUrl: nextBranding.appLogoUrl ?? '',
          }),
        });
        showToast('Logo & nama aplikasi global diperbarui!', 'success');
      } catch (err) {
        if (err instanceof ApiRequestError && err.code === 'DATABASE_NOT_CONFIGURED') {
          showToast('Logo aplikasi diperbarui secara lokal.', 'success');
        } else {
          showToast('Gagal menyimpan logo aplikasi global ke database.', 'error');
        }
      }
    } else {
      showToast('Logo & nama aplikasi diperbarui', 'success');
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
      if ('paymentQrDataUrl' in cleanedUpdates && !cleanedUpdates.paymentQrDataUrl) {
        cloudPayload.paymentQrDataUrl = '';
      }
      void cloudUpdateDoc('profile', 'main', cloudPayload);
    }
    showToast('Profil & pengaturan akun diperbarui', 'success');
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

    const lockedPeriod = findClosedPeriodForDate(txDate, closedPeriods);
    if (lockedPeriod) {
      showToast(`Tanggal ${txDate} berada di periode terkunci (${lockedPeriod.label}). Buka kembali (Reopen) di Tutup Buku jika ingin mengubah.`, 'warning');
      return { success: false, error: 'Periode sudah tutup buku' };
    }

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
    const adjDate = payload.date || new Date().toISOString().split('T')[0];
    const lockedPeriod = findClosedPeriodForDate(adjDate, closedPeriods);
    if (lockedPeriod) {
      showToast(`Tanggal ${adjDate} berada di periode terkunci (${lockedPeriod.label}). Buka kembali (Reopen) terlebih dahulu.`, 'warning');
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

  // Custom / Edited COA operations
  const upsertCoaAccount = (coa: ChartOfAccount) => {
    const cleanCode = coa.code.trim();
    const cleanName = coa.name.trim();
    if (!cleanCode || !cleanName) return;

    const normalized: ChartOfAccount = {
      code: cleanCode,
      name: cleanName,
      category: coa.category,
      subCategory: coa.subCategory.trim() || 'Kustom',
      normalBalance: coa.normalBalance,
      description: coa.description?.trim() || undefined,
      linkedAccountId: coa.linkedAccountId,
      isCustom: true,
    };

    const nextList = customCoaAccounts.some(c => c.code === cleanCode)
      ? customCoaAccounts.map(c => (c.code === cleanCode ? normalized : c))
      : [...customCoaAccounts, normalized];

    setCustomCoaAccounts(nextList);
    if (hasActiveSession()) {
      void cloudUpdateDoc('preferences', 'main', { customCoa: nextList });
    }
    showToast(`COA [${cleanCode}] ${cleanName} berhasil disimpan!`, 'success');
  };

  const deleteCustomCoaAccount = (code: string) => {
    const cleanCode = code.trim();
    const nextList = customCoaAccounts.filter(c => c.code !== cleanCode);
    setCustomCoaAccounts(nextList);
    if (hasActiveSession()) {
      void cloudUpdateDoc('preferences', 'main', { customCoa: nextList });
    }
    showToast(`Perubahan/akun kustom COA [${cleanCode}] dihapus.`, 'info');
  };

  // Closing Month & Closing Year operations
  const isDateClosed = (dateStr: string): ClosedPeriodRecord | undefined => {
    return findClosedPeriodForDate(dateStr, closedPeriods);
  };

  const closePeriod = (record: Omit<ClosedPeriodRecord, 'closedAt'>) => {
    const fullRecord: ClosedPeriodRecord = {
      ...record,
      closedAt: new Date().toISOString(),
    };
    const nextList = [
      ...closedPeriods.filter(cp => cp.id !== fullRecord.id),
      fullRecord,
    ].sort((a, b) => b.endDate.localeCompare(a.endDate));
    setClosedPeriods(nextList);
    if (hasActiveSession()) {
      void cloudUpdateDoc('preferences', 'main', { closedPeriods: nextList });
    }
    confetti({ particleCount: 55, spread: 60, origin: { y: 0.7 } });
    showToast(
      `${fullRecord.periodType === 'year' ? 'Tutup Buku Tahunan' : 'Tutup Buku Bulanan'} "${fullRecord.label}" berhasil & diposting ke [${fullRecord.retainedCoaCode}] ${fullRecord.retainedCoaName}.`,
      'success'
    );
  };

  const reopenPeriod = (periodId: string) => {
    const target = closedPeriods.find(cp => cp.id === periodId);
    if (!target) return;
    const nextList = closedPeriods.filter(cp => cp.id !== periodId);
    setClosedPeriods(nextList);
    if (hasActiveSession()) {
      void cloudUpdateDoc('preferences', 'main', { closedPeriods: nextList });
    }
    showToast(`Periode "${target.label}" dibuka kembali (Reopened). Jurnal penutup otomatis ditarik.`, 'info');
  };

  // Finance operations
  const addTransaction = (tx: Omit<FinanceTransaction, 'id'>) => {
    const lockedPeriod = findClosedPeriodForDate(tx.date, closedPeriods);
    if (lockedPeriod) {
      showToast(`Tanggal ${tx.date} berada di periode yang sudah Tutup Buku (${lockedPeriod.label}). Buka kembali periode di tab Tutup Buku jika ingin menambah transaksi.`, 'warning');
      return;
    }

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
    const target = transactions.find(t => t.id === id);
    if (target) {
      const lockedPeriod = findClosedPeriodForDate(target.date, closedPeriods);
      if (lockedPeriod) {
        showToast(`Transaksi ini berada di periode terkunci (${lockedPeriod.label}). Buka kembali periode tersebut jika ingin menghapus.`, 'warning');
        return;
      }
    }
    setTransactions(prev => prev.filter(t => t.id !== id));
    void cloudDeleteDoc('transactions', id);
    showToast('Transaksi dihapus', 'info');
  };

  const updateTransaction = (id: string, updates: Partial<FinanceTransaction>) => {
    const target = transactions.find(t => t.id === id);
    if (target) {
      const lockedOrig = findClosedPeriodForDate(target.date, closedPeriods);
      if (lockedOrig) {
        showToast(`Transaksi ini berada di periode terkunci (${lockedOrig.label}). Buka kembali periode tersebut jika ingin mengubah.`, 'warning');
        return;
      }
    }
    if (updates.date) {
      const lockedNew = findClosedPeriodForDate(updates.date, closedPeriods);
      if (lockedNew) {
        showToast(`Tanggal tujuan ${updates.date} berada di periode terkunci (${lockedNew.label}).`, 'warning');
        return;
      }
    }
    const cleanStateUpdates: Partial<FinanceTransaction> = { ...updates };
    if ((cleanStateUpdates as Record<string, unknown>).coaCode === null) cleanStateUpdates.coaCode = undefined;
    if ((cleanStateUpdates as Record<string, unknown>).coaName === null) cleanStateUpdates.coaName = undefined;
    if ((cleanStateUpdates as Record<string, unknown>).notes === null) cleanStateUpdates.notes = undefined;
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...cleanStateUpdates } : t));
    void cloudUpdateDoc('transactions', id, updates as Record<string, unknown>);
    showToast('Transaksi diperbarui', 'info');
  };

  // Void Transaction (Audit-safe cancellation creating a contra reversal transaction)
  const voidTransaction = (id: string, reason?: string) => {
    const target = transactions.find(t => t.id === id);
    if (!target || target.isVoided || isContraVoidTransaction(target)) return;
    const lockedPeriod = findClosedPeriodForDate(target.date, closedPeriods);
    if (lockedPeriod) {
      showToast(`Transaksi ini berada di periode terkunci (${lockedPeriod.label}). Buka kembali periode tersebut sebelum melakukan Void.`, 'warning');
      return;
    }

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
    const baseTs = Date.now();
    const id = 'mdeb-' + baseTs;

    let sourceTransactionId = debt.sourceTransactionId;
    let resolvedAccountName = debt.sourceAccountName;
    const shouldAddToAccount = Boolean(debt.addToAccount && debt.sourceAccountId);

    if (shouldAddToAccount && debt.sourceAccountId) {
      const targetAcc = accounts.find(a => a.id === debt.sourceAccountId);
      if (targetAcc) {
        resolvedAccountName = targetAcc.name;
        sourceTransactionId = 'tx-' + (baseTs + 1);
        const liabilityCode = inferLiabilityCoaCode(`${debt.creditorName} ${debt.description}`);
        const liabilityCoa =
          customCoaAccounts.find(c => c.code === liabilityCode) ||
          BASE_CHART_OF_ACCOUNTS.find(c => c.code === liabilityCode);
        const inflowTx: FinanceTransaction = {
          id: sourceTransactionId,
          type: 'income',
          title: `Pencairan Hutang: ${debt.creditorName} (${debt.description || 'Pinjaman'})`,
          amount: debt.amount,
          category: 'Pencairan Hutang',
          date: debt.issuedDate || new Date().toISOString().split('T')[0],
          paymentMethod: targetAcc.type === 'cash' ? 'Cash' : targetAcc.type === 'ewallet' ? 'E-Wallet' : 'Bank Transfer',
          walletType: targetAcc.type === 'cash' ? 'cash' : 'non_cash',
          accountId: targetAcc.id,
          accountName: targetAcc.name,
          relatedDebtId: id,
          coaCode: liabilityCode,
          coaName: liabilityCoa?.name || 'Utang Pribadi Jangka Pendek',
          notes: `Dana pinjaman / hutang dari ${debt.creditorName} ditambahkan ke saldo ${targetAcc.name}`,
        };
        setTransactions(prev => [inflowTx, ...prev]);
        void cloudWriteDoc('transactions', sourceTransactionId, inflowTx as unknown as Record<string, unknown>);
      }
    }

    const newDebt: MyDebtLiability = {
      ...debt,
      id,
      addToAccount: shouldAddToAccount,
      sourceAccountName: resolvedAccountName,
      sourceTransactionId,
    };

    setMyDebts(prev => [newDebt, ...prev]);
    void cloudWriteDoc('myDebts', id, newDebt as unknown as Record<string, unknown>);

    if (sourceTransactionId && resolvedAccountName) {
      showToast(
        `Hutang kepada "${debt.creditorName}" dicatat & saldo ${resolvedAccountName} bertambah Rp ${debt.amount.toLocaleString('id-ID')}!`,
        'success'
      );
    } else {
      showToast(`Hutang baru kepada "${debt.creditorName}" berhasil dicatat!`, 'warning');
    }
    return id;
  };

  const updateMyDebt = (id: string, updates: Partial<MyDebtLiability>) => {
    setMyDebts(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    void cloudUpdateDoc('myDebts', id, updates as Record<string, unknown>);
    showToast('Data hutang diperbarui', 'info');
  };

  const deleteMyDebt = (id: string) => {
    const target = myDebts.find(d => d.id === id);
    if (target?.sourceTransactionId) {
      setTransactions(prev => prev.filter(t => t.id !== target.sourceTransactionId));
      void cloudDeleteDoc('transactions', target.sourceTransactionId);
    }
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
      reimburseRates,
      customCoa: customCoaAccounts,
      closedPeriods
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
      if (data.profile) {
        setProfile({
          ...DEFAULT_PROFILE,
          ...data.profile,
          monthlyCutoffDay: Math.min(31, Math.max(1, Math.floor(Number(data.profile.monthlyCutoffDay) || 26))),
        });
      }
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
      if (Array.isArray(data.customCoa)) setCustomCoaAccounts(data.customCoa);
      if (Array.isArray(data.closedPeriods)) setClosedPeriods(data.closedPeriods);

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
    const cleanSeed = resetPrivateWorkspaceToDefaults(authUser?.displayName || profile.name);
    if (hasActiveSession()) {
      void syncFullWorkspaceToPostgres({ overwriteExisting: true, overrideWorkspace: cleanSeed }).catch(() => {});
    }
    showToast('Semua data workspace direset ke 0 (kosong). Logo aplikasi tetap terjaga.', 'info');
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
        linkUsernamePassword,
        linkGoogleAccount,
        signOutGoogle,
        signOutUser,
        pushLocalWorkspaceToCloud,
        activeTab,
        setActiveTab,
        theme,
        toggleTheme,
        appBranding,
        updateAppBranding,
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
        customCoaAccounts,
        upsertCoaAccount,
        deleteCustomCoaAccount,
        closedPeriods,
        closePeriod,
        reopenPeriod,
        isDateClosed,
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
