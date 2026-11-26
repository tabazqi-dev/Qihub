import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  decimal,
  doublePrecision,
  boolean,
  jsonb,
  primaryKey
} from 'drizzle-orm/pg-core';

// ==================== LEGACY / OPTIONAL ACCOUNTING TABLES ====================

export const chartOfAccounts = pgTable('chart_of_accounts', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: text('type', { enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] }).notNull(),
});

export const journalEntries = pgTable('journal_entries', {
  id: serial('id').primaryKey(),
  date: timestamp('date').defaultNow().notNull(),
  description: text('description').notNull(),
  reference: text('reference'),
});

export const journalItems = pgTable('journal_items', {
  id: serial('id').primaryKey(),
  journalEntryId: integer('journal_entry_id').references(() => journalEntries.id, { onDelete: 'cascade' }).notNull(),
  accountId: integer('account_id').references(() => chartOfAccounts.id).notNull(),
  debit: decimal('debit', { precision: 15, scale: 2 }).default('0').notNull(),
  credit: decimal('credit', { precision: 15, scale: 2 }).default('0').notNull(),
});

export const journalEntriesRelations = relations(journalEntries, ({ many }) => ({
  items: many(journalItems),
}));

export const journalItemsRelations = relations(journalItems, ({ one }) => ({
  journal: one(journalEntries, {
    fields: [journalItems.journalEntryId],
    references: [journalEntries.id],
  }),
  account: one(chartOfAccounts, {
    fields: [journalItems.accountId],
    references: [chartOfAccounts.id],
  }),
}));

// ==================== GLOBAL APP SETTINGS (DECOUPLED FROM USER) ====================

export const qhubAppSettings = pgTable('qhub_app_settings', {
  id: text('id').primaryKey(),
  appName: text('app_name').notNull().default("Q'Hub"),
  appLogoUrl: text('app_logo_url'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==================== Q'HUB FULL POSTGRESQL WORKSPACE TABLES ====================

export const qhubUsers = pgTable('qhub_users', {
  uid: text('uid').primaryKey(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  googleUid: text('google_uid').unique(),
  googleEmail: text('google_email'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const qhubLocalAccounts = pgTable('qhub_local_accounts', {
  username: text('username').primaryKey(),
  uid: text('uid').notNull().unique().references(() => qhubUsers.uid, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const qhubProfiles = pgTable('qhub_profiles', {
  userId: text('user_id').primaryKey().references(() => qhubUsers.uid, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  title: text('title').notNull().default(''),
  avatarUrl: text('avatar_url').notNull(),
  appName: text('app_name'),
  appLogoUrl: text('app_logo_url'),
  currencySymbol: text('currency_symbol').notNull().default('Rp'),
  monthlyBudget: doublePrecision('monthly_budget').notNull().default(0),
  monthlyCutoffDay: integer('monthly_cutoff_day').notNull().default(26),
  bankAccountDetails: text('bank_account_details'),
  paymentQrDataUrl: text('payment_qr_data_url'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export interface StoredCustomCoa {
  code: string;
  name: string;
  category: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  subCategory: string;
  normalBalance: 'debit' | 'credit';
  description?: string;
  linkedAccountId?: string;
  isCustom?: boolean;
}

export const qhubPreferences = pgTable('qhub_preferences', {
  userId: text('user_id').primaryKey().references(() => qhubUsers.uid, { onDelete: 'cascade' }),
  theme: text('theme').notNull().default('dark'),
  noteCategories: jsonb('note_categories').$type<string[]>().notNull().default([]),
  customCoa: jsonb('custom_coa').$type<StoredCustomCoa[]>().notNull().default([]),
  initialized: boolean('initialized').notNull().default(false),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const qhubAccounts = pgTable('qhub_accounts', {
  id: text('id').notNull(),
  userId: text('user_id').notNull().references(() => qhubUsers.uid, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  initialBalance: doublePrecision('initial_balance').notNull().default(0),
  accountNumber: text('account_number'),
  color: text('color'),
  coaCode: text('coa_code'),
  notes: text('notes'),
  clientCreatedAt: text('client_created_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.id] })]);

export const qhubTransactions = pgTable('qhub_transactions', {
  id: text('id').notNull(),
  userId: text('user_id').notNull().references(() => qhubUsers.uid, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  amount: doublePrecision('amount').notNull().default(0),
  category: text('category').notNull(),
  date: text('date').notNull(),
  paymentMethod: text('payment_method').notNull(),
  walletType: text('wallet_type').notNull(),
  accountName: text('account_name'),
  accountId: text('account_id'),
  relatedDebtId: text('related_debt_id'),
  transferId: text('transfer_id'),
  transferType: text('transfer_type'),
  targetAccountId: text('target_account_id'),
  targetAccountName: text('target_account_name'),
  notes: text('notes'),
  debitAccountCode: text('debit_account_code'),
  debitAccountName: text('debit_account_name'),
  creditAccountCode: text('credit_account_code'),
  creditAccountName: text('credit_account_name'),
  isAdjustment: boolean('is_adjustment'),
  coaCode: text('coa_code'),
  coaName: text('coa_name'),
  isVoided: boolean('is_voided').default(false),
  voidedAt: text('voided_at'),
  voidReason: text('void_reason'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.id] })]);

export const qhubDebts = pgTable('qhub_debts', {
  id: text('id').notNull(),
  userId: text('user_id').notNull().references(() => qhubUsers.uid, { onDelete: 'cascade' }),
  debtorName: text('debtor_name').notNull(),
  debtorPhone: text('debtor_phone'),
  debtorEmail: text('debtor_email'),
  amount: doublePrecision('amount').notNull(),
  amountPaid: doublePrecision('amount_paid').notNull().default(0),
  dueDate: text('due_date').notNull(),
  issuedDate: text('issued_date').notNull(),
  description: text('description').notNull().default(''),
  status: text('status').notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  sourceAccountId: text('source_account_id'),
  sourceAccountName: text('source_account_name'),
  deductFromAccount: boolean('deduct_from_account'),
  disbursementTransactionId: text('disbursement_transaction_id'),
  qrImageDataUrl: text('qr_image_data_url'),
  items: jsonb('items').$type<{ id: string; description: string; amount: number; date: string }[]>(),
  notes: text('notes'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.id] })]);

export const qhubMyDebts = pgTable('qhub_my_debts', {
  id: text('id').notNull(),
  userId: text('user_id').notNull().references(() => qhubUsers.uid, { onDelete: 'cascade' }),
  creditorName: text('creditor_name').notNull(),
  description: text('description').notNull().default(''),
  amount: doublePrecision('amount').notNull(),
  amountPaid: doublePrecision('amount_paid').notNull().default(0),
  dueDate: text('due_date').notNull(),
  issuedDate: text('issued_date').notNull(),
  status: text('status').notNull(),
  sourceTransactionId: text('source_transaction_id'),
  sourceAccountId: text('source_account_id'),
  addToAccount: boolean('add_to_account'),
  category: text('category'),
  notes: text('notes'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.id] })]);

export const qhubCategoryBudgets = pgTable('qhub_category_budgets', {
  id: text('id').notNull(),
  userId: text('user_id').notNull().references(() => qhubUsers.uid, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  limit: doublePrecision('limit').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.id] })]);

export const qhubTodos = pgTable('qhub_todos', {
  id: text('id').notNull(),
  userId: text('user_id').notNull().references(() => qhubUsers.uid, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: text('due_date').notNull(),
  dueTime: text('due_time'),
  priority: text('priority').notNull(),
  status: text('status').notNull(),
  category: text('category').notNull().default('Work'),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  subtasks: jsonb('subtasks').$type<{ id: string; text: string; completed: boolean }[]>(),
  completedAt: text('completed_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.id] })]);

export const qhubNotes = pgTable('qhub_notes', {
  id: text('id').notNull(),
  userId: text('user_id').notNull().references(() => qhubUsers.uid, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  category: text('category').notNull().default('Umum'),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  isPinned: boolean('is_pinned').notNull().default(false),
  clientCreatedAt: text('client_created_at').notNull(),
  clientUpdatedAt: text('client_updated_at').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.id] })]);

export const qhubHabits = pgTable('qhub_habits', {
  id: text('id').notNull(),
  userId: text('user_id').notNull().references(() => qhubUsers.uid, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  targetPerWeek: integer('target_per_week').notNull().default(5),
  completedDays: jsonb('completed_days').$type<string[]>().notNull().default([]),
  color: text('color').notNull().default('indigo'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.id] })]);

export const qhubLogbookEntries = pgTable('qhub_logbook_entries', {
  id: text('id').notNull(),
  userId: text('user_id').notNull().references(() => qhubUsers.uid, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  project: text('project').notNull().default('Daily Log'),
  hours: doublePrecision('hours').notNull().default(0),
  category: text('category').notNull().default('Daily'),
  description: text('description').notNull(),
  status: text('status').notNull().default('Completed'),
  clientCreatedAt: text('client_created_at').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.id] })]);

export const qhubSavedBarcodes = pgTable('qhub_saved_barcodes', {
  id: text('id').notNull(),
  userId: text('user_id').notNull().references(() => qhubUsers.uid, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  text: text('text').notNull(),
  title: text('title').notNull(),
  dataUrl: text('data_url'),
  clientCreatedAt: text('client_created_at').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.id] })]);

export const qhubReimbursements = pgTable('qhub_reimbursements', {
  id: text('id').notNull(),
  userId: text('user_id').notNull().references(() => qhubUsers.uid, { onDelete: 'cascade' }),
  no: integer('no').notNull().default(1),
  submissionDate: text('submission_date').notNull(),
  property: text('property').notNull(),
  typeProject: text('type_project').notNull(),
  role: text('role').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  wdDays: doublePrecision('wd_days').notNull().default(0),
  weDays: doublePrecision('we_days').notNull().default(0),
  totalDays: doublePrecision('total_days').notNull().default(0),
  description: text('description').notNull().default(''),
  wdRate: doublePrecision('wd_rate').notNull().default(0),
  weRate: doublePrecision('we_rate').notNull().default(0),
  wdAmount: doublePrecision('wd_amount').notNull().default(0),
  weAmount: doublePrecision('we_amount').notNull().default(0),
  totalAmount: doublePrecision('total_amount').notNull().default(0),
  status: text('status').notNull(),
  deliveryDate: text('delivery_date'),
  paymentAccountId: text('payment_account_id'),
  selectedDates: jsonb('selected_dates').$type<string[]>(),
  notes: text('notes'),
  clientCreatedAt: text('client_created_at').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.id] })]);

export const qhubReimburseRates = pgTable('qhub_reimburse_rates', {
  id: text('id').notNull(),
  userId: text('user_id').notNull().references(() => qhubUsers.uid, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  type: text('type').notNull(),
  wdRate: doublePrecision('wd_rate').notNull().default(0),
  weRate: doublePrecision('we_rate').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.id] })]);
