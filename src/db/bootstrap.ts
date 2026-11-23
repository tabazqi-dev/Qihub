import { getPool } from './index.ts';

declare global {
  var _qhubSchemaPromise: Promise<void> | undefined;
}

const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS qhub_users (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qhub_local_accounts (
  username TEXT PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE REFERENCES qhub_users(uid) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qhub_profiles (
  user_id TEXT PRIMARY KEY REFERENCES qhub_users(uid) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL,
  app_name TEXT,
  app_logo_url TEXT,
  currency_symbol TEXT NOT NULL DEFAULT 'Rp',
  monthly_budget DOUBLE PRECISION NOT NULL DEFAULT 0,
  bank_account_details TEXT,
  payment_qr_data_url TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qhub_preferences (
  user_id TEXT PRIMARY KEY REFERENCES qhub_users(uid) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'dark',
  note_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  initialized BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qhub_accounts (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES qhub_users(uid) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  initial_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
  account_number TEXT,
  color TEXT,
  coa_code TEXT,
  notes TEXT,
  client_created_at TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS qhub_transactions (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES qhub_users(uid) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  wallet_type TEXT NOT NULL,
  account_name TEXT,
  account_id TEXT,
  related_debt_id TEXT,
  transfer_id TEXT,
  transfer_type TEXT,
  target_account_id TEXT,
  target_account_name TEXT,
  notes TEXT,
  debit_account_code TEXT,
  debit_account_name TEXT,
  credit_account_code TEXT,
  credit_account_name TEXT,
  is_adjustment BOOLEAN,
  coa_code TEXT,
  coa_name TEXT,
  is_voided BOOLEAN DEFAULT FALSE,
  voided_at TEXT,
  void_reason TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS qhub_debts (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES qhub_users(uid) ON DELETE CASCADE,
  debtor_name TEXT NOT NULL,
  debtor_phone TEXT,
  debtor_email TEXT,
  amount DOUBLE PRECISION NOT NULL,
  amount_paid DOUBLE PRECISION NOT NULL DEFAULT 0,
  due_date TEXT NOT NULL,
  issued_date TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  source_account_id TEXT,
  source_account_name TEXT,
  deduct_from_account BOOLEAN,
  disbursement_transaction_id TEXT,
  qr_image_data_url TEXT,
  items JSONB,
  notes TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS qhub_my_debts (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES qhub_users(uid) ON DELETE CASCADE,
  creditor_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount DOUBLE PRECISION NOT NULL,
  amount_paid DOUBLE PRECISION NOT NULL DEFAULT 0,
  due_date TEXT NOT NULL,
  issued_date TEXT NOT NULL,
  status TEXT NOT NULL,
  source_transaction_id TEXT,
  source_account_id TEXT,
  category TEXT,
  notes TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS qhub_category_budgets (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES qhub_users(uid) ON DELETE CASCADE,
  category TEXT NOT NULL,
  "limit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS qhub_todos (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES qhub_users(uid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT NOT NULL,
  due_time TEXT,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Work',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtasks JSONB,
  completed_at TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS qhub_notes (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES qhub_users(uid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Umum',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  client_created_at TEXT NOT NULL,
  client_updated_at TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS qhub_habits (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES qhub_users(uid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_per_week INTEGER NOT NULL DEFAULT 5,
  completed_days JSONB NOT NULL DEFAULT '[]'::jsonb,
  color TEXT NOT NULL DEFAULT 'indigo',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS qhub_logbook_entries (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES qhub_users(uid) ON DELETE CASCADE,
  date TEXT NOT NULL,
  project TEXT NOT NULL DEFAULT 'Daily Log',
  hours DOUBLE PRECISION NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Daily',
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Completed',
  client_created_at TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS qhub_saved_barcodes (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES qhub_users(uid) ON DELETE CASCADE,
  type TEXT NOT NULL,
  text TEXT NOT NULL,
  title TEXT NOT NULL,
  data_url TEXT,
  client_created_at TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS qhub_reimbursements (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES qhub_users(uid) ON DELETE CASCADE,
  no INTEGER NOT NULL DEFAULT 1,
  submission_date TEXT NOT NULL,
  property TEXT NOT NULL,
  type_project TEXT NOT NULL,
  role TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  wd_days DOUBLE PRECISION NOT NULL DEFAULT 0,
  we_days DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_days DOUBLE PRECISION NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  wd_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  we_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  wd_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  we_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  delivery_date TEXT,
  payment_account_id TEXT,
  selected_dates JSONB,
  notes TEXT,
  client_created_at TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS qhub_reimburse_rates (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES qhub_users(uid) ON DELETE CASCADE,
  role TEXT NOT NULL,
  type TEXT NOT NULL,
  wd_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  we_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

ALTER TABLE qhub_profiles ADD COLUMN IF NOT EXISTS app_name TEXT;
ALTER TABLE qhub_profiles ADD COLUMN IF NOT EXISTS app_logo_url TEXT;
ALTER TABLE qhub_debts ADD COLUMN IF NOT EXISTS items JSONB;
`;

export async function ensurePostgresSchema(): Promise<void> {
  const pool = getPool();
  if (!pool) {
    throw new Error('DATABASE_NOT_CONFIGURED');
  }
  if (!global._qhubSchemaPromise) {
    global._qhubSchemaPromise = pool
      .query(BOOTSTRAP_SQL)
      .then(() => undefined)
      .catch((err) => {
        global._qhubSchemaPromise = undefined;
        throw err;
      });
  }
  return global._qhubSchemaPromise;
}
