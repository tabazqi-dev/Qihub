export type NavigationTab = 
  | 'dashboard' 
  | 'todos' 
  | 'finance' 
  | 'reimburse'
  | 'removebg'
  | 'notes' 
  | 'pdftools' 
  | 'barcode' 
  | 'focus' 
  | 'architecture';

export type PriorityLevel = 'low' | 'medium' | 'high';
export type TodoStatus = 'pending' | 'in_progress' | 'completed';

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  priority: PriorityLevel;
  status: TodoStatus;
  category: string;
  tags: string[];
  subtasks?: { id: string; text: string; completed: boolean }[];
  completedAt?: string;
}

export type WalletType = 'cash' | 'non_cash';
export type AccountType = 'bank' | 'ewallet' | 'cash';

// Standard Accounting Chart of Accounts (COA)
export type CoaClass = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type NormalBalance = 'debit' | 'credit';

export interface ChartOfAccount {
  code: string; // e.g., '1-1100', '1-1201', '2-1100', '4-1100', '5-1100'
  name: string; // e.g., 'Kas Tunai di Tangan', 'Bank BCA Utama', 'Beban Makanan'
  category: CoaClass; // 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  subCategory: string; // e.g., 'Kas & Bank', 'Piutang', 'Kewajiban Lancar', 'Pendapatan Usaha', 'Beban Operasional'
  normalBalance: NormalBalance; // 'debit' | 'credit'
  description?: string;
  linkedAccountId?: string; // ID of FinancialAccount if mapped
  isCustom?: boolean;
}

export interface JournalLine {
  accountCode: string;
  accountName: string;
  category: CoaClass;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  transactionId?: string;
  date: string;
  referenceNo: string;
  description: string;
  sourceType: 'transaction' | 'initial_balance' | 'debt' | 'my_debt' | 'audit_adjustment' | 'transfer';
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

export interface FinancialAccount {
  id: string;
  name: string; // e.g. 'BCA Utama', 'Mandiri Payroll', 'GoPay Pribadi', 'DANA', 'Dompet Tunai'
  type: AccountType; // 'bank' | 'ewallet' | 'cash'
  initialBalance: number; // Saldo awal yang di-set / di-upload
  accountNumber?: string; // No rekening / No HP
  color?: string; // hex color for card badge
  coaCode?: string; // Associated COA code, e.g. '1-1201'
  notes?: string;
  createdAt?: string;
}

export type TransferType = 'transfer' | 'cash_withdrawal' | 'cash_deposit' | 'ewallet_topup';

export interface AccountTransferPayload {
  sourceAccountId: string;
  targetAccountId: string;
  amount: number;
  adminFee?: number;
  date: string; // YYYY-MM-DD
  transferType: TransferType;
  notes?: string;
}

export interface FinanceTransaction {
  id: string;
  type: 'income' | 'expense';
  title: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  paymentMethod: 'Bank Transfer' | 'E-Wallet' | 'Cash' | 'Credit Card';
  walletType: WalletType; // Cash vs Non-Cash
  accountName?: string; // e.g., 'Dompet Tunai', 'BCA', 'GoPay', 'Mandiri'
  accountId?: string; // ID of the FinancialAccount
  relatedDebtId?: string; // Linked debt ID if debt payment or credit transaction
  // Transfer antar akun & Tarik Tunai
  transferId?: string; // Grouping ID for paired transfer transactions
  transferType?: TransferType;
  targetAccountId?: string;
  targetAccountName?: string;
  notes?: string;
  // Standard Accounting COA mapping
  debitAccountCode?: string;
  debitAccountName?: string;
  creditAccountCode?: string;
  creditAccountName?: string;
}

// Hutang Orang Lain ke Saya (Piutang / Receivables)
export interface DebtReceivable {
  id: string;
  debtorName: string;
  debtorPhone?: string; // For WhatsApp
  debtorEmail?: string; // For Email
  amount: number;
  amountPaid: number;
  dueDate: string;
  issuedDate: string;
  description: string;
  status: 'unpaid' | 'partial' | 'paid';
  invoiceNumber: string;
  sourceAccountId?: string; // Akun yang dananya dipinjamkan / dikurangi saldo
  sourceAccountName?: string; // Nama akun
  deductFromAccount?: boolean; // Apakah dipotong dari saldo akun saat dicatat
  disbursementTransactionId?: string; // ID transaksi pengeluaran terkait
  notes?: string;
}

// Hutang Saya ke Pihak Lain (Kewajiban / Payables / Liabilitas dari transaksi)
export interface MyDebtLiability {
  id: string;
  creditorName: string; // Bank, PayLater (GoPay Later, Spaylater), Kartu Kredit, atau Teman
  description: string; // misal: "Beli Meja Kerja Ergonomis", "Cicilan Gadget"
  amount: number; // Total hutang
  amountPaid: number; // Sudah dicicil/dibayar
  dueDate: string; // YYYY-MM-DD
  issuedDate: string; // YYYY-MM-DD
  status: 'unpaid' | 'partial' | 'paid';
  sourceTransactionId?: string; // ID transaksi pengeluaran kredit yang menimbulkan hutang ini
  sourceAccountId?: string; // Akun yang digunakan/terkait
  category?: string;
  notes?: string;
}

// Cek Harian & Rekonsiliasi Saldo Riil vs Sistem
export interface AccountAuditItem {
  accountId: string;
  accountName: string;
  accountType: AccountType;
  systemBalance: number; // Saldo kalkulasi di sistem
  actualBalance: number; // Saldo riil yang dimasukkan user saat cek harian
  difference: number; // actualBalance - systemBalance
}

export interface DailyAuditRecord {
  id: string;
  date: string; // YYYY-MM-DD
  verifiedAt: string; // ISO timestamp
  accountAudits: AccountAuditItem[];
  totalSystemBalance: number;
  totalActualBalance: number;
  totalDifference: number; // 0 = match
  isBalanced: boolean;
  notes?: string;
}

export interface CategoryBudget {
  category: string;
  limit: number;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isPinned: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface UserProfile {
  name: string;
  title: string;
  avatarUrl: string;
  currencySymbol: string;
  monthlyBudget: number;
  bankAccountDetails?: string; // for Invoices
}

export interface HabitItem {
  id: string;
  title: string;
  targetPerWeek: number;
  completedDays: string[];
  color: string;
}

// ================= REIMBURSEMENT MODULE =================
export type ReimburseRole = 'M' | 'TPM' | 'PM';
export type ReimburseProjectType = 'Onsite' | 'Online';
export type ReimburseStatus = 'Draft' | 'Submitted' | 'Approved' | 'Done' | 'Rejected';

export interface ReimburseRate {
  id: string;
  role: ReimburseRole;
  type: ReimburseProjectType;
  wdRate: number; // Weekdays rate (Rp)
  weRate: number; // Weekends rate (Rp)
}

export interface ReimbursementItem {
  id: string;
  no: number;
  submissionDate: string; // YYYY-MM-DD
  property: string; // Hotel / Property / Client name
  typeProject: ReimburseProjectType;
  role: ReimburseRole;
  startDate: string; // YYYY-MM-DD (Mulai Project)
  endDate: string; // YYYY-MM-DD (Selesai Project)
  wdDays: number; // # WD
  weDays: number; // # WE
  totalDays: number; // # Hari Kerja = # WD + # WE
  description: string;
  wdRate: number; // Snapshot of rate used
  weRate: number; // Snapshot of rate used
  wdAmount: number; // # WD * wdRate
  weAmount: number; // # WE * weRate
  totalAmount: number; // wdAmount + weAmount
  status: ReimburseStatus;
  deliveryDate?: string; // Timestamp / date
  paymentAccountId?: string; // Bank / E-Wallet / Cash where funds were received
  selectedDates?: string[]; // Array of YYYY-MM-DD dates clicked by user
  notes?: string;
  createdAt: string;
}
