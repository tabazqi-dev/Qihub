import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '../db/index.ts';
import { ensurePostgresSchema } from '../db/bootstrap.ts';
import {
  qhubAppSettings,
  qhubUsers,
  qhubProfiles,
  qhubPreferences,
  qhubAccounts,
  qhubTransactions,
  qhubDebts,
  qhubMyDebts,
  qhubCategoryBudgets,
  qhubTodos,
  qhubNotes,
  qhubHabits,
  qhubLogbookEntries,
  qhubSavedBarcodes,
  qhubReimbursements,
  qhubReimburseRates
} from '../db/schema.ts';
import { requireAuth, type AuthRequest } from './auth.ts';

export const workspaceRouter = Router();

const MAX_IMAGE_DATA_URL = 245000;

function sanitizeStr(val: unknown, maxLen: number, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  return val.slice(0, maxLen);
}

function sanitizeOptStr(val: unknown, maxLen: number): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeOptImage(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed.length > MAX_IMAGE_DATA_URL) return null;
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    (trimmed.startsWith('/') && !trimmed.startsWith('//')) ||
    /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)
  ) {
    return trimmed;
  }
  return null;
}

function sanitizeDebtItems(val: unknown): { id: string; description: string; amount: number; date: string }[] | null {
  if (!Array.isArray(val)) return null;
  const items = val
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .slice(0, 100)
    .map((item, idx) => ({
      id: sanitizeId(item.id, `di-${idx}`),
      description: sanitizeStr(item.description, 300, 'Rincian Tagihan') || 'Rincian Tagihan',
      amount: sanitizeNum(item.amount, 0, 0),
      date: sanitizeDate(item.date),
    }))
    .filter((item) => item.amount > 0 || item.description.trim().length > 0);
  return items.length > 0 ? items : null;
}

function sanitizeNum(val: unknown, fallback = 0, min = -1e12, max = 1e12): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitizeId(val: unknown, prefix: string): string {
  const raw = typeof val === 'string' ? val.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128) : '';
  return raw.length > 0 ? raw : `${prefix}-${Date.now()}`;
}

function sanitizeDate(val: unknown, fallback = new Date().toISOString().split('T')[0]): string {
  const s = typeof val === 'string' ? val.trim() : '';
  return s.length >= 8 && s.length <= 20 ? s : fallback;
}

function sanitizeStrArray(val: unknown, maxItems = 50, maxItemLen = 80): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .map(v => String(v ?? '').trim().slice(0, maxItemLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function getBudgetDocId(category: string): string {
  const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug ? `bgt-${slug}`.slice(0, 120) : `bgt-${Date.now()}`;
}

const requireDatabase = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({
      error: 'DATABASE_NOT_CONFIGURED',
      message: 'DATABASE_URL belum dikonfigurasi di environment server.'
    });
  }
  try {
    await ensurePostgresSchema();
    return next();
  } catch (err) {
    console.error('Database bootstrap failed:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'DATABASE_INIT_FAILED' });
  }
};

async function ensureUserRecord(uid: string, email?: string, name?: string) {
  const db = getDb();
  const safeEmail = (email || 'user@qhub.app').slice(0, 254);
  const safeName = (name || 'Pengguna QHub').slice(0, 120);

  await db
    .insert(qhubUsers)
    .values({
      uid,
      email: safeEmail,
      displayName: safeName,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: qhubUsers.uid,
      set: {
        email: safeEmail,
        displayName: safeName,
        updatedAt: new Date(),
      },
    });
}

// Public health check (no secrets exposed)
workspaceRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    database: 'postgresql',
    configured: isDatabaseConfigured(),
  });
});

// Public global app branding (decoupled from individual user accounts)
workspaceRouter.get('/branding', async (_req, res) => {
  if (!isDatabaseConfigured()) {
    return res.json({ appName: "Q'Hub", appLogoUrl: null });
  }
  try {
    await ensurePostgresSchema();
    const db = getDb();
    const rows = await db
      .select()
      .from(qhubAppSettings)
      .where(eq(qhubAppSettings.id, 'global'));

    if (rows[0]) {
      return res.json({
        appName: rows[0].appName || "Q'Hub",
        appLogoUrl: rows[0].appLogoUrl || null,
      });
    }

    // One-time seamless migration if branding was previously stored in legacy profile row
    const legacyProfiles = await db
      .select({
        appName: qhubProfiles.appName,
        appLogoUrl: qhubProfiles.appLogoUrl,
      })
      .from(qhubProfiles)
      .orderBy(desc(qhubProfiles.updatedAt))
      .limit(10);

    const legacyWithBranding = legacyProfiles.find(
      (p) => Boolean(p.appLogoUrl) || (p.appName && p.appName.trim() !== "Q'Hub")
    );
    const initialName = sanitizeOptStr(legacyWithBranding?.appName, 80) || "Q'Hub";
    const initialLogo = sanitizeOptImage(legacyWithBranding?.appLogoUrl);

    await db
      .insert(qhubAppSettings)
      .values({
        id: 'global',
        appName: initialName,
        appLogoUrl: initialLogo,
        updatedAt: new Date(),
      })
      .onConflictDoNothing();

    return res.json({
      appName: initialName,
      appLogoUrl: initialLogo,
    });
  } catch (err) {
    console.error('Failed to load global branding:', err instanceof Error ? err.message : err);
    return res.json({ appName: "Q'Hub", appLogoUrl: null });
  }
});

// Update global app branding (authenticated users, global singleton independent of user profile)
workspaceRouter.put('/branding', requireAuth, requireDatabase, async (req: AuthRequest, res) => {
  const b = req.body || {};
  try {
    const db = getDb();
    const existing = await db
      .select()
      .from(qhubAppSettings)
      .where(eq(qhubAppSettings.id, 'global'));
    const cur = existing[0];

    const appName =
      b.appName !== undefined
        ? (sanitizeOptStr(b.appName, 80) || "Q'Hub")
        : (cur?.appName || "Q'Hub");

    let appLogoUrl: string | null = cur?.appLogoUrl ?? null;
    if ('appLogoUrl' in b) {
      if (!b.appLogoUrl) {
        appLogoUrl = null;
      } else {
        const sanitized = sanitizeOptImage(b.appLogoUrl);
        if (!sanitized) {
          return res.status(400).json({ error: 'Format atau ukuran gambar logo tidak valid.' });
        }
        appLogoUrl = sanitized;
      }
    }

    await db
      .insert(qhubAppSettings)
      .values({
        id: 'global',
        appName,
        appLogoUrl,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: qhubAppSettings.id,
        set: {
          appName,
          appLogoUrl,
          updatedAt: new Date(),
        },
      });

    return res.json({
      success: true,
      branding: {
        appName,
        appLogoUrl,
      },
    });
  } catch (err) {
    console.error('Failed to update global branding:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Gagal memperbarui logo aplikasi global' });
  }
});

// Load entire workspace for authenticated user
workspaceRouter.get('/workspace', requireAuth, requireDatabase, async (req: AuthRequest, res) => {
  const uid = req.user!.uid;
  try {
    await ensureUserRecord(uid, req.user?.email, req.user?.name);
    const db = getDb();

    const [
      profileRows,
      prefRows,
      accountRows,
      txRows,
      debtRows,
      myDebtRows,
      budgetRows,
      todoRows,
      noteRows,
      habitRows,
      logbookRows,
      barcodeRows,
      reimburseRows,
      rateRows,
    ] = await Promise.all([
      db.select().from(qhubProfiles).where(eq(qhubProfiles.userId, uid)),
      db.select().from(qhubPreferences).where(eq(qhubPreferences.userId, uid)),
      db.select().from(qhubAccounts).where(eq(qhubAccounts.userId, uid)),
      db.select().from(qhubTransactions).where(eq(qhubTransactions.userId, uid)),
      db.select().from(qhubDebts).where(eq(qhubDebts.userId, uid)),
      db.select().from(qhubMyDebts).where(eq(qhubMyDebts.userId, uid)),
      db.select().from(qhubCategoryBudgets).where(eq(qhubCategoryBudgets.userId, uid)),
      db.select().from(qhubTodos).where(eq(qhubTodos.userId, uid)),
      db.select().from(qhubNotes).where(eq(qhubNotes.userId, uid)),
      db.select().from(qhubHabits).where(eq(qhubHabits.userId, uid)),
      db.select().from(qhubLogbookEntries).where(eq(qhubLogbookEntries.userId, uid)).orderBy(desc(qhubLogbookEntries.date)),
      db.select().from(qhubSavedBarcodes).where(eq(qhubSavedBarcodes.userId, uid)),
      db.select().from(qhubReimbursements).where(eq(qhubReimbursements.userId, uid)),
      db.select().from(qhubReimburseRates).where(eq(qhubReimburseRates.userId, uid)),
    ]);

    const pref = prefRows[0];
    const initialized = Boolean(pref?.initialized);

    const sortedTxs = [...txRows].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.id.localeCompare(a.id);
    });

    res.json({
      initialized,
      workspace: {
        profile: profileRows[0]
          ? {
              name: profileRows[0].name,
              title: profileRows[0].title,
              avatarUrl: profileRows[0].avatarUrl,
              currencySymbol: profileRows[0].currencySymbol,
              monthlyBudget: Number(profileRows[0].monthlyBudget) || 0,
              bankAccountDetails: profileRows[0].bankAccountDetails || '',
              paymentQrDataUrl: profileRows[0].paymentQrDataUrl || undefined,
            }
          : null,
        preferences: pref
          ? {
              theme: pref.theme === 'light' ? 'light' : 'dark',
              noteCategories: Array.isArray(pref.noteCategories) ? pref.noteCategories : [],
              initialized: pref.initialized,
            }
          : null,
        accounts: accountRows.map(a => ({
          id: a.id,
          name: a.name,
          type: a.type,
          initialBalance: Number(a.initialBalance) || 0,
          accountNumber: a.accountNumber || undefined,
          color: a.color || undefined,
          coaCode: a.coaCode || undefined,
          notes: a.notes || undefined,
          createdAt: a.clientCreatedAt || undefined,
        })),
        transactions: sortedTxs.map(t => ({
          id: t.id,
          type: t.type,
          title: t.title,
          amount: Number(t.amount) || 0,
          category: t.category,
          date: t.date,
          paymentMethod: t.paymentMethod,
          walletType: t.walletType,
          accountName: t.accountName || undefined,
          accountId: t.accountId || undefined,
          relatedDebtId: t.relatedDebtId || undefined,
          transferId: t.transferId || undefined,
          transferType: t.transferType || undefined,
          targetAccountId: t.targetAccountId || undefined,
          targetAccountName: t.targetAccountName || undefined,
          notes: t.notes || undefined,
          debitAccountCode: t.debitAccountCode || undefined,
          debitAccountName: t.debitAccountName || undefined,
          creditAccountCode: t.creditAccountCode || undefined,
          creditAccountName: t.creditAccountName || undefined,
          isAdjustment: t.isAdjustment ?? undefined,
          coaCode: t.coaCode || undefined,
          coaName: t.coaName || undefined,
          isVoided: t.isVoided ?? undefined,
          voidedAt: t.voidedAt || undefined,
          voidReason: t.voidReason || undefined,
        })),
        debts: debtRows.map(d => ({
          id: d.id,
          debtorName: d.debtorName,
          debtorPhone: d.debtorPhone || undefined,
          debtorEmail: d.debtorEmail || undefined,
          amount: Number(d.amount) || 0,
          amountPaid: Number(d.amountPaid) || 0,
          dueDate: d.dueDate,
          issuedDate: d.issuedDate,
          description: d.description,
          status: d.status,
          invoiceNumber: d.invoiceNumber,
          sourceAccountId: d.sourceAccountId || undefined,
          sourceAccountName: d.sourceAccountName || undefined,
          deductFromAccount: d.deductFromAccount ?? undefined,
          disbursementTransactionId: d.disbursementTransactionId || undefined,
          qrImageDataUrl: d.qrImageDataUrl || undefined,
          items: Array.isArray(d.items) ? d.items : undefined,
          notes: d.notes || undefined,
        })),
        myDebts: myDebtRows.map(md => ({
          id: md.id,
          creditorName: md.creditorName,
          description: md.description,
          amount: Number(md.amount) || 0,
          amountPaid: Number(md.amountPaid) || 0,
          dueDate: md.dueDate,
          issuedDate: md.issuedDate,
          status: md.status,
          sourceTransactionId: md.sourceTransactionId || undefined,
          sourceAccountId: md.sourceAccountId || undefined,
          category: md.category || undefined,
          notes: md.notes || undefined,
        })),
        categoryBudgets: budgetRows.map(b => ({
          category: b.category,
          limit: Number(b.limit) || 0,
        })),
        todos: todoRows.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description || undefined,
          dueDate: t.dueDate,
          dueTime: t.dueTime || undefined,
          priority: t.priority,
          status: t.status,
          category: t.category,
          tags: Array.isArray(t.tags) ? t.tags : [],
          subtasks: Array.isArray(t.subtasks) ? t.subtasks : undefined,
          completedAt: t.completedAt || undefined,
        })),
        notes: noteRows.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content,
          category: n.category,
          tags: Array.isArray(n.tags) ? n.tags : [],
          isPinned: n.isPinned,
          createdAt: n.clientCreatedAt,
          updatedAt: n.clientUpdatedAt,
        })),
        habits: habitRows.map(h => ({
          id: h.id,
          title: h.title,
          targetPerWeek: h.targetPerWeek,
          completedDays: Array.isArray(h.completedDays) ? h.completedDays : [],
          color: h.color,
        })),
        logbookEntries: logbookRows.map(l => ({
          id: l.id,
          date: l.date,
          project: l.project,
          hours: Number(l.hours) || 0,
          category: l.category,
          description: l.description,
          status: l.status,
          createdAt: l.clientCreatedAt,
        })),
        savedBarcodes: barcodeRows.map(bc => ({
          id: bc.id,
          type: bc.type,
          text: bc.text,
          title: bc.title,
          createdAt: bc.clientCreatedAt,
          dataUrl: bc.dataUrl || undefined,
        })),
        reimbursements: reimburseRows.map(r => ({
          id: r.id,
          no: r.no,
          submissionDate: r.submissionDate,
          property: r.property,
          typeProject: r.typeProject,
          role: r.role,
          startDate: r.startDate,
          endDate: r.endDate,
          wdDays: Number(r.wdDays) || 0,
          weDays: Number(r.weDays) || 0,
          totalDays: Number(r.totalDays) || 0,
          description: r.description,
          wdRate: Number(r.wdRate) || 0,
          weRate: Number(r.weRate) || 0,
          wdAmount: Number(r.wdAmount) || 0,
          weAmount: Number(r.weAmount) || 0,
          totalAmount: Number(r.totalAmount) || 0,
          status: r.status,
          deliveryDate: r.deliveryDate || undefined,
          paymentAccountId: r.paymentAccountId || undefined,
          selectedDates: Array.isArray(r.selectedDates) ? r.selectedDates : undefined,
          notes: r.notes || undefined,
          createdAt: r.clientCreatedAt,
        })),
        reimburseRates: rateRows.map(rt => ({
          id: rt.id,
          role: rt.role,
          type: rt.type,
          wdRate: Number(rt.wdRate) || 0,
          weRate: Number(rt.weRate) || 0,
        })),
      },
    });
  } catch (err) {
    console.error('Failed to load PostgreSQL workspace:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Gagal memuat workspace dari PostgreSQL' });
  }
});

// Sync / seed full workspace into PostgreSQL
workspaceRouter.post('/workspace/sync', requireAuth, requireDatabase, async (req: AuthRequest, res) => {
  const uid = req.user!.uid;
  const body = req.body || {};
  const overwriteExisting = Boolean(body.overwriteExisting);
  const ws = body.workspace || {};

  try {
    await ensureUserRecord(uid, req.user?.email, req.user?.name);
    const db = getDb();

    await db.transaction(async (tx) => {
      const existingPref = await tx.select().from(qhubPreferences).where(eq(qhubPreferences.userId, uid));
      const alreadyInitialized = Boolean(existingPref[0]?.initialized);

      // On auto-first-login, never overwrite an already-initialized cloud workspace
      if (alreadyInitialized && !overwriteExisting) {
        return;
      }

      if (ws.profile) {
        const p = ws.profile;
        await tx
          .insert(qhubProfiles)
          .values({
            userId: uid,
            name: sanitizeStr(p.name, 120, 'Pengguna QHub') || 'Pengguna QHub',
            title: sanitizeStr(p.title, 160),
            avatarUrl: sanitizeOptImage(p.avatarUrl) || '/src/assets/images/user_avatar_1793517278515.jpg',
            currencySymbol: sanitizeStr(p.currencySymbol, 10, 'Rp') || 'Rp',
            monthlyBudget: sanitizeNum(p.monthlyBudget, 0, 0),
            bankAccountDetails: sanitizeOptStr(p.bankAccountDetails, 1000),
            paymentQrDataUrl: sanitizeOptImage(p.paymentQrDataUrl),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: qhubProfiles.userId,
            set: {
              name: sanitizeStr(p.name, 120, 'Pengguna QHub') || 'Pengguna QHub',
              title: sanitizeStr(p.title, 160),
              avatarUrl: sanitizeOptImage(p.avatarUrl) || '/src/assets/images/user_avatar_1793517278515.jpg',
              currencySymbol: sanitizeStr(p.currencySymbol, 10, 'Rp') || 'Rp',
              monthlyBudget: sanitizeNum(p.monthlyBudget, 0, 0),
              bankAccountDetails: sanitizeOptStr(p.bankAccountDetails, 1000),
              paymentQrDataUrl: sanitizeOptImage(p.paymentQrDataUrl),
              updatedAt: new Date(),
            },
          });
      }

      await tx
        .insert(qhubPreferences)
        .values({
          userId: uid,
          theme: ws.theme === 'light' ? 'light' : 'dark',
          noteCategories: sanitizeStrArray(ws.noteCategories, 50, 80),
          initialized: true,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: qhubPreferences.userId,
          set: {
            theme: ws.theme === 'light' ? 'light' : 'dark',
            noteCategories: sanitizeStrArray(ws.noteCategories, 50, 80),
            initialized: true,
            updatedAt: new Date(),
          },
        });

      const upsertMany = async <T extends Record<string, any>>(
        items: unknown,
        fn: (item: T) => Promise<void>
      ) => {
        if (!Array.isArray(items)) return;
        for (const item of items) {
          if (item && typeof item === 'object') {
            await fn(item as T);
          }
        }
      };

      await upsertMany(ws.accounts, async (acc) => {
        const id = sanitizeId(acc.id, 'acc');
        const values = {
          id,
          userId: uid,
          name: sanitizeStr(acc.name, 120, 'Akun') || 'Akun',
          type: ['bank', 'ewallet', 'cash'].includes(acc.type) ? acc.type : 'bank',
          initialBalance: sanitizeNum(acc.initialBalance, 0),
          accountNumber: sanitizeOptStr(acc.accountNumber, 64),
          color: sanitizeOptStr(acc.color, 32),
          coaCode: sanitizeOptStr(acc.coaCode, 32),
          notes: sanitizeOptStr(acc.notes, 500),
          clientCreatedAt: sanitizeOptStr(acc.createdAt, 64),
          updatedAt: new Date(),
        };
        await tx.insert(qhubAccounts).values(values).onConflictDoUpdate({
          target: [qhubAccounts.userId, qhubAccounts.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
      });

      await upsertMany(ws.transactions, async (t) => {
        const id = sanitizeId(t.id, 'tx');
        const values = {
          id,
          userId: uid,
          type: t.type === 'income' ? 'income' : 'expense',
          title: sanitizeStr(t.title, 200, 'Transaksi') || 'Transaksi',
          amount: sanitizeNum(t.amount, 0, 0),
          category: sanitizeStr(t.category, 80, 'Lainnya') || 'Lainnya',
          date: sanitizeDate(t.date),
          paymentMethod: ['Bank Transfer', 'E-Wallet', 'Cash', 'Credit Card'].includes(t.paymentMethod) ? t.paymentMethod : 'Bank Transfer',
          walletType: t.walletType === 'cash' ? 'cash' : 'non_cash',
          accountName: sanitizeOptStr(t.accountName, 120),
          accountId: sanitizeOptStr(t.accountId, 128),
          relatedDebtId: sanitizeOptStr(t.relatedDebtId, 128),
          transferId: sanitizeOptStr(t.transferId, 128),
          transferType: sanitizeOptStr(t.transferType, 32),
          targetAccountId: sanitizeOptStr(t.targetAccountId, 128),
          targetAccountName: sanitizeOptStr(t.targetAccountName, 120),
          notes: sanitizeOptStr(t.notes, 1000),
          debitAccountCode: sanitizeOptStr(t.debitAccountCode, 32),
          debitAccountName: sanitizeOptStr(t.debitAccountName, 160),
          creditAccountCode: sanitizeOptStr(t.creditAccountCode, 32),
          creditAccountName: sanitizeOptStr(t.creditAccountName, 160),
          isAdjustment: typeof t.isAdjustment === 'boolean' ? t.isAdjustment : null,
          coaCode: sanitizeOptStr(t.coaCode, 32),
          coaName: sanitizeOptStr(t.coaName, 160),
          isVoided: Boolean(t.isVoided),
          voidedAt: sanitizeOptStr(t.voidedAt, 64),
          voidReason: sanitizeOptStr(t.voidReason, 300),
          updatedAt: new Date(),
        };
        await tx.insert(qhubTransactions).values(values).onConflictDoUpdate({
          target: [qhubTransactions.userId, qhubTransactions.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
      });

      await upsertMany(ws.debts, async (d) => {
        const id = sanitizeId(d.id, 'dbt');
        const amount = sanitizeNum(d.amount, 1, 1);
        const amountPaid = Math.min(amount, sanitizeNum(d.amountPaid, 0, 0));
        const values = {
          id,
          userId: uid,
          debtorName: sanitizeStr(d.debtorName, 140, 'Klien') || 'Klien',
          debtorPhone: sanitizeOptStr(d.debtorPhone, 32),
          debtorEmail: sanitizeOptStr(d.debtorEmail, 254),
          amount,
          amountPaid,
          dueDate: sanitizeDate(d.dueDate),
          issuedDate: sanitizeDate(d.issuedDate),
          description: sanitizeStr(d.description, 500),
          status: ['unpaid', 'partial', 'paid'].includes(d.status) ? d.status : 'unpaid',
          invoiceNumber: sanitizeStr(d.invoiceNumber, 64, `INV-${id}`),
          sourceAccountId: sanitizeOptStr(d.sourceAccountId, 128),
          sourceAccountName: sanitizeOptStr(d.sourceAccountName, 120),
          deductFromAccount: typeof d.deductFromAccount === 'boolean' ? d.deductFromAccount : null,
          disbursementTransactionId: sanitizeOptStr(d.disbursementTransactionId, 128),
          qrImageDataUrl: sanitizeOptImage(d.qrImageDataUrl),
          items: sanitizeDebtItems(d.items),
          notes: sanitizeOptStr(d.notes, 1000),
          updatedAt: new Date(),
        };
        await tx.insert(qhubDebts).values(values).onConflictDoUpdate({
          target: [qhubDebts.userId, qhubDebts.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
      });

      await upsertMany(ws.myDebts, async (md) => {
        const id = sanitizeId(md.id, 'mdeb');
        const amount = sanitizeNum(md.amount, 1, 1);
        const amountPaid = Math.min(amount, sanitizeNum(md.amountPaid, 0, 0));
        const values = {
          id,
          userId: uid,
          creditorName: sanitizeStr(md.creditorName, 140, 'Kreditur') || 'Kreditur',
          description: sanitizeStr(md.description, 500),
          amount,
          amountPaid,
          dueDate: sanitizeDate(md.dueDate),
          issuedDate: sanitizeDate(md.issuedDate),
          status: ['unpaid', 'partial', 'paid'].includes(md.status) ? md.status : 'unpaid',
          sourceTransactionId: sanitizeOptStr(md.sourceTransactionId, 128),
          sourceAccountId: sanitizeOptStr(md.sourceAccountId, 128),
          category: sanitizeOptStr(md.category, 80),
          notes: sanitizeOptStr(md.notes, 1000),
          updatedAt: new Date(),
        };
        await tx.insert(qhubMyDebts).values(values).onConflictDoUpdate({
          target: [qhubMyDebts.userId, qhubMyDebts.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
      });

      await upsertMany(ws.categoryBudgets, async (b) => {
        const cat = sanitizeStr(b.category, 80, 'Lainnya') || 'Lainnya';
        const id = getBudgetDocId(cat);
        const limit = sanitizeNum(b.limit, 0, 0);
        await tx.insert(qhubCategoryBudgets).values({
          id,
          userId: uid,
          category: cat,
          limit,
          updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: [qhubCategoryBudgets.userId, qhubCategoryBudgets.id],
          set: { category: cat, limit, updatedAt: new Date() },
        });
      });

      await upsertMany(ws.todos, async (t) => {
        const id = sanitizeId(t.id, 'td');
        const values = {
          id,
          userId: uid,
          title: sanitizeStr(t.title, 200, 'Tugas') || 'Tugas',
          description: sanitizeOptStr(t.description, 2000),
          dueDate: sanitizeDate(t.dueDate),
          dueTime: sanitizeOptStr(t.dueTime, 16),
          priority: ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium',
          status: ['pending', 'in_progress', 'completed'].includes(t.status) ? t.status : 'pending',
          category: sanitizeStr(t.category, 80, 'Work') || 'Work',
          tags: sanitizeStrArray(t.tags, 25, 60),
          subtasks: Array.isArray(t.subtasks) ? t.subtasks.slice(0, 50) : null,
          completedAt: sanitizeOptStr(t.completedAt, 32),
          updatedAt: new Date(),
        };
        await tx.insert(qhubTodos).values(values).onConflictDoUpdate({
          target: [qhubTodos.userId, qhubTodos.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
      });

      await upsertMany(ws.notes, async (n) => {
        const id = sanitizeId(n.id, 'nt');
        const today = new Date().toISOString().split('T')[0];
        const values = {
          id,
          userId: uid,
          title: sanitizeStr(n.title, 240, 'Catatan') || 'Catatan',
          content: sanitizeStr(n.content, 100000),
          category: sanitizeStr(n.category, 80, 'Umum') || 'Umum',
          tags: sanitizeStrArray(n.tags, 25, 60),
          isPinned: Boolean(n.isPinned),
          clientCreatedAt: sanitizeStr(n.createdAt, 64, today) || today,
          clientUpdatedAt: sanitizeStr(n.updatedAt, 64, today) || today,
          updatedAt: new Date(),
        };
        await tx.insert(qhubNotes).values(values).onConflictDoUpdate({
          target: [qhubNotes.userId, qhubNotes.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
      });

      await upsertMany(ws.habits, async (h) => {
        const id = sanitizeId(h.id, 'hb');
        const values = {
          id,
          userId: uid,
          title: sanitizeStr(h.title, 160, 'Habit') || 'Habit',
          targetPerWeek: Math.round(sanitizeNum(h.targetPerWeek, 5, 1, 7)),
          completedDays: sanitizeStrArray(h.completedDays, 400, 20),
          color: sanitizeStr(h.color, 32, 'indigo') || 'indigo',
          updatedAt: new Date(),
        };
        await tx.insert(qhubHabits).values(values).onConflictDoUpdate({
          target: [qhubHabits.userId, qhubHabits.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
      });

      await upsertMany(ws.logbookEntries, async (l) => {
        const id = sanitizeId(l.id, 'log');
        const values = {
          id,
          userId: uid,
          date: sanitizeDate(l.date),
          project: sanitizeStr(l.project, 160, 'Daily Log') || 'Daily Log',
          hours: sanitizeNum(l.hours, 0, 0, 24),
          category: sanitizeStr(l.category, 80, 'Daily') || 'Daily',
          description: sanitizeStr(l.description, 2000),
          status: l.status === 'In Progress' ? 'In Progress' : 'Completed',
          clientCreatedAt: sanitizeStr(l.createdAt, 64, new Date().toISOString()),
          updatedAt: new Date(),
        };
        await tx.insert(qhubLogbookEntries).values(values).onConflictDoUpdate({
          target: [qhubLogbookEntries.userId, qhubLogbookEntries.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
      });

      await upsertMany(ws.savedBarcodes, async (bc) => {
        const id = sanitizeId(bc.id, 'bc');
        const values = {
          id,
          userId: uid,
          type: bc.type === 'barcode' ? 'barcode' : 'qr',
          text: sanitizeStr(bc.text, 2000, 'QHub') || 'QHub',
          title: sanitizeStr(bc.title, 200, 'QR Code') || 'QR Code',
          dataUrl: sanitizeOptImage(bc.dataUrl),
          clientCreatedAt: sanitizeStr(bc.createdAt, 64, new Date().toISOString()),
          updatedAt: new Date(),
        };
        await tx.insert(qhubSavedBarcodes).values(values).onConflictDoUpdate({
          target: [qhubSavedBarcodes.userId, qhubSavedBarcodes.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
      });

      await upsertMany(ws.reimbursements, async (r) => {
        const id = sanitizeId(r.id, 'rmb');
        const values = {
          id,
          userId: uid,
          no: Math.round(sanitizeNum(r.no, 1, 0, 1000000)),
          submissionDate: sanitizeDate(r.submissionDate),
          property: sanitizeStr(r.property, 200, 'Proyek') || 'Proyek',
          typeProject: r.typeProject === 'Online' ? 'Online' : 'Onsite',
          role: ['M', 'TPM', 'PM'].includes(r.role) ? r.role : 'M',
          startDate: sanitizeDate(r.startDate),
          endDate: sanitizeDate(r.endDate),
          wdDays: sanitizeNum(r.wdDays, 0, 0, 366),
          weDays: sanitizeNum(r.weDays, 0, 0, 366),
          totalDays: sanitizeNum(r.totalDays, 0, 0, 366),
          description: sanitizeStr(r.description, 500),
          wdRate: sanitizeNum(r.wdRate, 0, 0, 1e9),
          weRate: sanitizeNum(r.weRate, 0, 0, 1e9),
          wdAmount: sanitizeNum(r.wdAmount, 0, 0, 1e11),
          weAmount: sanitizeNum(r.weAmount, 0, 0, 1e11),
          totalAmount: sanitizeNum(r.totalAmount, 0, 0, 1e11),
          status: ['Draft', 'Submitted', 'Approved', 'Done', 'Rejected'].includes(r.status) ? r.status : 'Draft',
          deliveryDate: sanitizeOptStr(r.deliveryDate, 40),
          paymentAccountId: sanitizeOptStr(r.paymentAccountId, 128),
          selectedDates: Array.isArray(r.selectedDates) ? sanitizeStrArray(r.selectedDates, 366, 20) : null,
          notes: sanitizeOptStr(r.notes, 500),
          clientCreatedAt: sanitizeStr(r.createdAt, 64, new Date().toISOString()),
          updatedAt: new Date(),
        };
        await tx.insert(qhubReimbursements).values(values).onConflictDoUpdate({
          target: [qhubReimbursements.userId, qhubReimbursements.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
      });

      await upsertMany(ws.reimburseRates, async (rt) => {
        const id = sanitizeId(rt.id, 'rate');
        const values = {
          id,
          userId: uid,
          role: ['M', 'TPM', 'PM'].includes(rt.role) ? rt.role : 'M',
          type: rt.type === 'Online' ? 'Online' : 'Onsite',
          wdRate: sanitizeNum(rt.wdRate, 0, 0, 1e9),
          weRate: sanitizeNum(rt.weRate, 0, 0, 1e9),
          updatedAt: new Date(),
        };
        await tx.insert(qhubReimburseRates).values(values).onConflictDoUpdate({
          target: [qhubReimburseRates.userId, qhubReimburseRates.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
      });
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('Failed to sync workspace to PostgreSQL:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Gagal menyinkronkan workspace ke PostgreSQL' });
  }
});

// Profile update
workspaceRouter.put('/workspace/profile', requireAuth, requireDatabase, async (req: AuthRequest, res) => {
  const uid = req.user!.uid;
  const p = req.body || {};
  try {
    await ensureUserRecord(uid, req.user?.email, req.user?.name);
    const db = getDb();
    const existing = await db.select().from(qhubProfiles).where(eq(qhubProfiles.userId, uid));
    const cur = existing[0];

    const values = {
      userId: uid,
      name: p.name !== undefined ? sanitizeStr(p.name, 120, 'Pengguna QHub') : (cur?.name || 'Pengguna QHub'),
      title: p.title !== undefined ? sanitizeStr(p.title, 160) : (cur?.title || ''),
      avatarUrl: p.avatarUrl !== undefined ? (sanitizeOptImage(p.avatarUrl) || cur?.avatarUrl || '/src/assets/images/user_avatar_1793517278515.jpg') : (cur?.avatarUrl || '/src/assets/images/user_avatar_1793517278515.jpg'),
      currencySymbol: p.currencySymbol !== undefined ? sanitizeStr(p.currencySymbol, 10, 'Rp') : (cur?.currencySymbol || 'Rp'),
      monthlyBudget: p.monthlyBudget !== undefined ? sanitizeNum(p.monthlyBudget, 0, 0) : (cur?.monthlyBudget ?? 0),
      bankAccountDetails: p.bankAccountDetails !== undefined ? sanitizeOptStr(p.bankAccountDetails, 1000) : (cur?.bankAccountDetails ?? null),
      paymentQrDataUrl: p.paymentQrDataUrl !== undefined ? sanitizeOptImage(p.paymentQrDataUrl) : (cur?.paymentQrDataUrl ?? null),
      updatedAt: new Date(),
    };

    await db.insert(qhubProfiles).values(values).onConflictDoUpdate({
      target: qhubProfiles.userId,
      set: {
        name: values.name,
        title: values.title,
        avatarUrl: values.avatarUrl,
        currencySymbol: values.currencySymbol,
        monthlyBudget: values.monthlyBudget,
        bankAccountDetails: values.bankAccountDetails,
        paymentQrDataUrl: values.paymentQrDataUrl,
        updatedAt: values.updatedAt,
      },
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('Failed to update profile:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Gagal memperbarui profil' });
  }
});

// Preferences update
workspaceRouter.put('/workspace/preferences', requireAuth, requireDatabase, async (req: AuthRequest, res) => {
  const uid = req.user!.uid;
  const p = req.body || {};
  try {
    await ensureUserRecord(uid, req.user?.email, req.user?.name);
    const db = getDb();
    const existing = await db.select().from(qhubPreferences).where(eq(qhubPreferences.userId, uid));
    const cur = existing[0];

    const theme = p.theme !== undefined ? (p.theme === 'light' ? 'light' : 'dark') : (cur?.theme || 'dark');
    const noteCategories = p.noteCategories !== undefined ? sanitizeStrArray(p.noteCategories, 50, 80) : (cur?.noteCategories || []);
    const initialized = p.initialized !== undefined ? Boolean(p.initialized) : (cur?.initialized ?? true);

    await db.insert(qhubPreferences).values({
      userId: uid,
      theme,
      noteCategories,
      initialized,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: qhubPreferences.userId,
      set: { theme, noteCategories, initialized, updatedAt: new Date() },
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('Failed to update preferences:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Gagal memperbarui preferensi' });
  }
});

// Collection CRUD
type SupportedCollection =
  | 'accounts'
  | 'transactions'
  | 'debts'
  | 'myDebts'
  | 'categoryBudgets'
  | 'todos'
  | 'notes'
  | 'habits'
  | 'logbook'
  | 'barcodes'
  | 'reimbursements'
  | 'reimburseRates';

const COLLECTIONS_SET = new Set<string>([
  'accounts',
  'transactions',
  'debts',
  'myDebts',
  'categoryBudgets',
  'todos',
  'notes',
  'habits',
  'logbook',
  'barcodes',
  'reimbursements',
  'reimburseRates',
]);

workspaceRouter.post('/workspace/:collection', requireAuth, requireDatabase, async (req: AuthRequest, res) => {
  const col = req.params.collection;
  if (!COLLECTIONS_SET.has(col)) {
    return res.status(400).json({ error: 'Koleksi tidak dikenali' });
  }
  const uid = req.user!.uid;
  const d = req.body || {};

  try {
    await ensureUserRecord(uid, req.user?.email, req.user?.name);
    const db = getDb();
    const typedCol = col as SupportedCollection;

    switch (typedCol) {
      case 'accounts': {
        const id = sanitizeId(d.id, 'acc');
        const values = {
          id,
          userId: uid,
          name: sanitizeStr(d.name, 120, 'Akun') || 'Akun',
          type: ['bank', 'ewallet', 'cash'].includes(d.type) ? d.type : 'bank',
          initialBalance: sanitizeNum(d.initialBalance, 0),
          accountNumber: sanitizeOptStr(d.accountNumber, 64),
          color: sanitizeOptStr(d.color, 32),
          coaCode: sanitizeOptStr(d.coaCode, 32),
          notes: sanitizeOptStr(d.notes, 500),
          clientCreatedAt: sanitizeOptStr(d.clientCreatedAt ?? d.createdAt, 64),
          updatedAt: new Date(),
        };
        await db.insert(qhubAccounts).values(values).onConflictDoUpdate({
          target: [qhubAccounts.userId, qhubAccounts.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
        break;
      }
      case 'transactions': {
        const id = sanitizeId(d.id, 'tx');
        const values = {
          id,
          userId: uid,
          type: d.type === 'income' ? 'income' : 'expense',
          title: sanitizeStr(d.title, 200, 'Transaksi') || 'Transaksi',
          amount: sanitizeNum(d.amount, 0, 0),
          category: sanitizeStr(d.category, 80, 'Lainnya') || 'Lainnya',
          date: sanitizeDate(d.date),
          paymentMethod: ['Bank Transfer', 'E-Wallet', 'Cash', 'Credit Card'].includes(d.paymentMethod) ? d.paymentMethod : 'Bank Transfer',
          walletType: d.walletType === 'cash' ? 'cash' : 'non_cash',
          accountName: sanitizeOptStr(d.accountName, 120),
          accountId: sanitizeOptStr(d.accountId, 128),
          relatedDebtId: sanitizeOptStr(d.relatedDebtId, 128),
          transferId: sanitizeOptStr(d.transferId, 128),
          transferType: sanitizeOptStr(d.transferType, 32),
          targetAccountId: sanitizeOptStr(d.targetAccountId, 128),
          targetAccountName: sanitizeOptStr(d.targetAccountName, 120),
          notes: sanitizeOptStr(d.notes, 1000),
          debitAccountCode: sanitizeOptStr(d.debitAccountCode, 32),
          debitAccountName: sanitizeOptStr(d.debitAccountName, 160),
          creditAccountCode: sanitizeOptStr(d.creditAccountCode, 32),
          creditAccountName: sanitizeOptStr(d.creditAccountName, 160),
          isAdjustment: typeof d.isAdjustment === 'boolean' ? d.isAdjustment : null,
          coaCode: sanitizeOptStr(d.coaCode, 32),
          coaName: sanitizeOptStr(d.coaName, 160),
          isVoided: Boolean(d.isVoided),
          voidedAt: sanitizeOptStr(d.voidedAt, 64),
          voidReason: sanitizeOptStr(d.voidReason, 300),
          updatedAt: new Date(),
        };
        await db.insert(qhubTransactions).values(values).onConflictDoUpdate({
          target: [qhubTransactions.userId, qhubTransactions.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
        break;
      }
      case 'debts': {
        const id = sanitizeId(d.id, 'dbt');
        const amount = sanitizeNum(d.amount, 1, 1);
        const amountPaid = Math.min(amount, sanitizeNum(d.amountPaid, 0, 0));
        const values = {
          id,
          userId: uid,
          debtorName: sanitizeStr(d.debtorName, 140, 'Klien') || 'Klien',
          debtorPhone: sanitizeOptStr(d.debtorPhone, 32),
          debtorEmail: sanitizeOptStr(d.debtorEmail, 254),
          amount,
          amountPaid,
          dueDate: sanitizeDate(d.dueDate),
          issuedDate: sanitizeDate(d.issuedDate),
          description: sanitizeStr(d.description, 500),
          status: ['unpaid', 'partial', 'paid'].includes(d.status) ? d.status : 'unpaid',
          invoiceNumber: sanitizeStr(d.invoiceNumber, 64, `INV-${id}`),
          sourceAccountId: sanitizeOptStr(d.sourceAccountId, 128),
          sourceAccountName: sanitizeOptStr(d.sourceAccountName, 120),
          deductFromAccount: typeof d.deductFromAccount === 'boolean' ? d.deductFromAccount : null,
          disbursementTransactionId: sanitizeOptStr(d.disbursementTransactionId, 128),
          qrImageDataUrl: sanitizeOptImage(d.qrImageDataUrl),
          items: sanitizeDebtItems(d.items),
          notes: sanitizeOptStr(d.notes, 1000),
          updatedAt: new Date(),
        };
        await db.insert(qhubDebts).values(values).onConflictDoUpdate({
          target: [qhubDebts.userId, qhubDebts.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
        break;
      }
      case 'myDebts': {
        const id = sanitizeId(d.id, 'mdeb');
        const amount = sanitizeNum(d.amount, 1, 1);
        const amountPaid = Math.min(amount, sanitizeNum(d.amountPaid, 0, 0));
        const values = {
          id,
          userId: uid,
          creditorName: sanitizeStr(d.creditorName, 140, 'Kreditur') || 'Kreditur',
          description: sanitizeStr(d.description, 500),
          amount,
          amountPaid,
          dueDate: sanitizeDate(d.dueDate),
          issuedDate: sanitizeDate(d.issuedDate),
          status: ['unpaid', 'partial', 'paid'].includes(d.status) ? d.status : 'unpaid',
          sourceTransactionId: sanitizeOptStr(d.sourceTransactionId, 128),
          sourceAccountId: sanitizeOptStr(d.sourceAccountId, 128),
          category: sanitizeOptStr(d.category, 80),
          notes: sanitizeOptStr(d.notes, 1000),
          updatedAt: new Date(),
        };
        await db.insert(qhubMyDebts).values(values).onConflictDoUpdate({
          target: [qhubMyDebts.userId, qhubMyDebts.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
        break;
      }
      case 'categoryBudgets': {
        const cat = sanitizeStr(d.category, 80, 'Lainnya') || 'Lainnya';
        const id = sanitizeId(d.id || getBudgetDocId(cat), 'bgt');
        const limit = sanitizeNum(d.limit, 0, 0);
        await db.insert(qhubCategoryBudgets).values({
          id,
          userId: uid,
          category: cat,
          limit,
          updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: [qhubCategoryBudgets.userId, qhubCategoryBudgets.id],
          set: { category: cat, limit, updatedAt: new Date() },
        });
        break;
      }
      case 'todos': {
        const id = sanitizeId(d.id, 'td');
        const values = {
          id,
          userId: uid,
          title: sanitizeStr(d.title, 200, 'Tugas') || 'Tugas',
          description: sanitizeOptStr(d.description, 2000),
          dueDate: sanitizeDate(d.dueDate),
          dueTime: sanitizeOptStr(d.dueTime, 16),
          priority: ['low', 'medium', 'high'].includes(d.priority) ? d.priority : 'medium',
          status: ['pending', 'in_progress', 'completed'].includes(d.status) ? d.status : 'pending',
          category: sanitizeStr(d.category, 80, 'Work') || 'Work',
          tags: sanitizeStrArray(d.tags, 25, 60),
          subtasks: Array.isArray(d.subtasks) ? d.subtasks.slice(0, 50) : null,
          completedAt: sanitizeOptStr(d.completedAt, 32),
          updatedAt: new Date(),
        };
        await db.insert(qhubTodos).values(values).onConflictDoUpdate({
          target: [qhubTodos.userId, qhubTodos.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
        break;
      }
      case 'notes': {
        const id = sanitizeId(d.id, 'nt');
        const today = new Date().toISOString().split('T')[0];
        const values = {
          id,
          userId: uid,
          title: sanitizeStr(d.title, 240, 'Catatan') || 'Catatan',
          content: sanitizeStr(d.content, 100000),
          category: sanitizeStr(d.category, 80, 'Umum') || 'Umum',
          tags: sanitizeStrArray(d.tags, 25, 60),
          isPinned: Boolean(d.isPinned),
          clientCreatedAt: sanitizeStr(d.clientCreatedAt ?? d.createdAt, 64, today) || today,
          clientUpdatedAt: sanitizeStr(d.clientUpdatedAt ?? d.updatedAt, 64, today) || today,
          updatedAt: new Date(),
        };
        await db.insert(qhubNotes).values(values).onConflictDoUpdate({
          target: [qhubNotes.userId, qhubNotes.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
        break;
      }
      case 'habits': {
        const id = sanitizeId(d.id, 'hb');
        const values = {
          id,
          userId: uid,
          title: sanitizeStr(d.title, 160, 'Habit') || 'Habit',
          targetPerWeek: Math.round(sanitizeNum(d.targetPerWeek, 5, 1, 7)),
          completedDays: sanitizeStrArray(d.completedDays, 400, 20),
          color: sanitizeStr(d.color, 32, 'indigo') || 'indigo',
          updatedAt: new Date(),
        };
        await db.insert(qhubHabits).values(values).onConflictDoUpdate({
          target: [qhubHabits.userId, qhubHabits.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
        break;
      }
      case 'logbook': {
        const id = sanitizeId(d.id, 'log');
        const values = {
          id,
          userId: uid,
          date: sanitizeDate(d.date),
          project: sanitizeStr(d.project, 160, 'Daily Log') || 'Daily Log',
          hours: sanitizeNum(d.hours, 0, 0, 24),
          category: sanitizeStr(d.category, 80, 'Daily') || 'Daily',
          description: sanitizeStr(d.description, 2000),
          status: d.status === 'In Progress' ? 'In Progress' : 'Completed',
          clientCreatedAt: sanitizeStr(d.clientCreatedAt ?? d.createdAt, 64, new Date().toISOString()),
          updatedAt: new Date(),
        };
        await db.insert(qhubLogbookEntries).values(values).onConflictDoUpdate({
          target: [qhubLogbookEntries.userId, qhubLogbookEntries.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
        break;
      }
      case 'barcodes': {
        const id = sanitizeId(d.id, 'bc');
        const values = {
          id,
          userId: uid,
          type: d.type === 'barcode' ? 'barcode' : 'qr',
          text: sanitizeStr(d.text, 2000, 'QHub') || 'QHub',
          title: sanitizeStr(d.title, 200, 'QR Code') || 'QR Code',
          dataUrl: sanitizeOptImage(d.dataUrl),
          clientCreatedAt: sanitizeStr(d.clientCreatedAt ?? d.createdAt, 64, new Date().toISOString()),
          updatedAt: new Date(),
        };
        await db.insert(qhubSavedBarcodes).values(values).onConflictDoUpdate({
          target: [qhubSavedBarcodes.userId, qhubSavedBarcodes.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
        break;
      }
      case 'reimbursements': {
        const id = sanitizeId(d.id, 'rmb');
        const values = {
          id,
          userId: uid,
          no: Math.round(sanitizeNum(d.no, 1, 0, 1000000)),
          submissionDate: sanitizeDate(d.submissionDate),
          property: sanitizeStr(d.property, 200, 'Proyek') || 'Proyek',
          typeProject: d.typeProject === 'Online' ? 'Online' : 'Onsite',
          role: ['M', 'TPM', 'PM'].includes(d.role) ? d.role : 'M',
          startDate: sanitizeDate(d.startDate),
          endDate: sanitizeDate(d.endDate),
          wdDays: sanitizeNum(d.wdDays, 0, 0, 366),
          weDays: sanitizeNum(d.weDays, 0, 0, 366),
          totalDays: sanitizeNum(d.totalDays, 0, 0, 366),
          description: sanitizeStr(d.description, 500),
          wdRate: sanitizeNum(d.wdRate, 0, 0, 1e9),
          weRate: sanitizeNum(d.weRate, 0, 0, 1e9),
          wdAmount: sanitizeNum(d.wdAmount, 0, 0, 1e11),
          weAmount: sanitizeNum(d.weAmount, 0, 0, 1e11),
          totalAmount: sanitizeNum(d.totalAmount, 0, 0, 1e11),
          status: ['Draft', 'Submitted', 'Approved', 'Done', 'Rejected'].includes(d.status) ? d.status : 'Draft',
          deliveryDate: sanitizeOptStr(d.deliveryDate, 40),
          paymentAccountId: sanitizeOptStr(d.paymentAccountId, 128),
          selectedDates: Array.isArray(d.selectedDates) ? sanitizeStrArray(d.selectedDates, 366, 20) : null,
          notes: sanitizeOptStr(d.notes, 500),
          clientCreatedAt: sanitizeStr(d.clientCreatedAt ?? d.createdAt, 64, new Date().toISOString()),
          updatedAt: new Date(),
        };
        await db.insert(qhubReimbursements).values(values).onConflictDoUpdate({
          target: [qhubReimbursements.userId, qhubReimbursements.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
        break;
      }
      case 'reimburseRates': {
        const id = sanitizeId(d.id, 'rate');
        const values = {
          id,
          userId: uid,
          role: ['M', 'TPM', 'PM'].includes(d.role) ? d.role : 'M',
          type: d.type === 'Online' ? 'Online' : 'Onsite',
          wdRate: sanitizeNum(d.wdRate, 0, 0, 1e9),
          weRate: sanitizeNum(d.weRate, 0, 0, 1e9),
          updatedAt: new Date(),
        };
        await db.insert(qhubReimburseRates).values(values).onConflictDoUpdate({
          target: [qhubReimburseRates.userId, qhubReimburseRates.id],
          set: { ...values, userId: undefined, id: undefined } as any,
        });
        break;
      }
    }

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error(`Failed to write ${col}:`, err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Gagal menyimpan data' });
  }
});

workspaceRouter.patch('/workspace/:collection/:id', requireAuth, requireDatabase, async (req: AuthRequest, res) => {
  const col = req.params.collection;
  const id = sanitizeId(req.params.id, 'doc');
  if (!COLLECTIONS_SET.has(col)) {
    return res.status(400).json({ error: 'Koleksi tidak dikenali' });
  }
  const uid = req.user!.uid;
  const d = req.body || {};

  try {
    const db = getDb();
    const typedCol = col as SupportedCollection;

    switch (typedCol) {
      case 'accounts': {
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (d.name !== undefined) patch.name = sanitizeStr(d.name, 120, 'Akun');
        if (d.type !== undefined && ['bank', 'ewallet', 'cash'].includes(d.type)) patch.type = d.type;
        if (d.initialBalance !== undefined) patch.initialBalance = sanitizeNum(d.initialBalance, 0);
        if (d.accountNumber !== undefined) patch.accountNumber = sanitizeOptStr(d.accountNumber, 64);
        if (d.color !== undefined) patch.color = sanitizeOptStr(d.color, 32);
        if (d.coaCode !== undefined) patch.coaCode = sanitizeOptStr(d.coaCode, 32);
        if (d.notes !== undefined) patch.notes = sanitizeOptStr(d.notes, 500);
        await db.update(qhubAccounts).set(patch).where(and(eq(qhubAccounts.userId, uid), eq(qhubAccounts.id, id)));
        break;
      }
      case 'transactions': {
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (d.title !== undefined) patch.title = sanitizeStr(d.title, 200, 'Transaksi');
        if (d.amount !== undefined) patch.amount = sanitizeNum(d.amount, 0, 0);
        if (d.category !== undefined) patch.category = sanitizeStr(d.category, 80, 'Lainnya');
        if (d.date !== undefined) patch.date = sanitizeDate(d.date);
        if (d.paymentMethod !== undefined && ['Bank Transfer', 'E-Wallet', 'Cash', 'Credit Card'].includes(d.paymentMethod)) patch.paymentMethod = d.paymentMethod;
        if (d.walletType !== undefined) patch.walletType = d.walletType === 'cash' ? 'cash' : 'non_cash';
        if (d.accountName !== undefined) patch.accountName = sanitizeOptStr(d.accountName, 120);
        if (d.accountId !== undefined) patch.accountId = sanitizeOptStr(d.accountId, 128);
        if (d.notes !== undefined) patch.notes = sanitizeOptStr(d.notes, 1000);
        if (d.coaCode !== undefined) patch.coaCode = sanitizeOptStr(d.coaCode, 32);
        if (d.coaName !== undefined) patch.coaName = sanitizeOptStr(d.coaName, 160);
        if (d.isVoided !== undefined) patch.isVoided = Boolean(d.isVoided);
        if (d.voidedAt !== undefined) patch.voidedAt = sanitizeOptStr(d.voidedAt, 64);
        if (d.voidReason !== undefined) patch.voidReason = sanitizeOptStr(d.voidReason, 300);
        await db.update(qhubTransactions).set(patch).where(and(eq(qhubTransactions.userId, uid), eq(qhubTransactions.id, id)));
        break;
      }
      case 'debts': {
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (d.debtorName !== undefined) patch.debtorName = sanitizeStr(d.debtorName, 140, 'Klien');
        if (d.debtorPhone !== undefined) patch.debtorPhone = sanitizeOptStr(d.debtorPhone, 32);
        if (d.debtorEmail !== undefined) patch.debtorEmail = sanitizeOptStr(d.debtorEmail, 254);
        if (d.amount !== undefined) patch.amount = sanitizeNum(d.amount, 1, 1);
        if (d.amountPaid !== undefined) patch.amountPaid = sanitizeNum(d.amountPaid, 0, 0);
        if (d.dueDate !== undefined) patch.dueDate = sanitizeDate(d.dueDate);
        if (d.description !== undefined) patch.description = sanitizeStr(d.description, 500);
        if (d.status !== undefined && ['unpaid', 'partial', 'paid'].includes(d.status)) patch.status = d.status;
        if (d.qrImageDataUrl !== undefined) patch.qrImageDataUrl = sanitizeOptImage(d.qrImageDataUrl);
        if (d.items !== undefined) patch.items = sanitizeDebtItems(d.items);
        if (d.notes !== undefined) patch.notes = sanitizeOptStr(d.notes, 1000);
        await db.update(qhubDebts).set(patch).where(and(eq(qhubDebts.userId, uid), eq(qhubDebts.id, id)));
        break;
      }
      case 'myDebts': {
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (d.creditorName !== undefined) patch.creditorName = sanitizeStr(d.creditorName, 140, 'Kreditur');
        if (d.description !== undefined) patch.description = sanitizeStr(d.description, 500);
        if (d.amount !== undefined) patch.amount = sanitizeNum(d.amount, 1, 1);
        if (d.amountPaid !== undefined) patch.amountPaid = sanitizeNum(d.amountPaid, 0, 0);
        if (d.dueDate !== undefined) patch.dueDate = sanitizeDate(d.dueDate);
        if (d.status !== undefined && ['unpaid', 'partial', 'paid'].includes(d.status)) patch.status = d.status;
        if (d.category !== undefined) patch.category = sanitizeOptStr(d.category, 80);
        if (d.notes !== undefined) patch.notes = sanitizeOptStr(d.notes, 1000);
        await db.update(qhubMyDebts).set(patch).where(and(eq(qhubMyDebts.userId, uid), eq(qhubMyDebts.id, id)));
        break;
      }
      case 'categoryBudgets': {
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (d.category !== undefined) patch.category = sanitizeStr(d.category, 80, 'Lainnya');
        if (d.limit !== undefined) patch.limit = sanitizeNum(d.limit, 0, 0);
        await db.update(qhubCategoryBudgets).set(patch).where(and(eq(qhubCategoryBudgets.userId, uid), eq(qhubCategoryBudgets.id, id)));
        break;
      }
      case 'todos': {
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (d.title !== undefined) patch.title = sanitizeStr(d.title, 200, 'Tugas');
        if (d.description !== undefined) patch.description = sanitizeOptStr(d.description, 2000);
        if (d.dueDate !== undefined) patch.dueDate = sanitizeDate(d.dueDate);
        if (d.dueTime !== undefined) patch.dueTime = sanitizeOptStr(d.dueTime, 16);
        if (d.priority !== undefined && ['low', 'medium', 'high'].includes(d.priority)) patch.priority = d.priority;
        if (d.status !== undefined && ['pending', 'in_progress', 'completed'].includes(d.status)) patch.status = d.status;
        if (d.category !== undefined) patch.category = sanitizeStr(d.category, 80, 'Work');
        if (d.tags !== undefined) patch.tags = sanitizeStrArray(d.tags, 25, 60);
        if (d.subtasks !== undefined) patch.subtasks = Array.isArray(d.subtasks) ? d.subtasks.slice(0, 50) : null;
        if (d.completedAt !== undefined) patch.completedAt = sanitizeOptStr(d.completedAt, 32);
        await db.update(qhubTodos).set(patch).where(and(eq(qhubTodos.userId, uid), eq(qhubTodos.id, id)));
        break;
      }
      case 'notes': {
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (d.title !== undefined) patch.title = sanitizeStr(d.title, 240, 'Catatan');
        if (d.content !== undefined) patch.content = sanitizeStr(d.content, 100000);
        if (d.category !== undefined) patch.category = sanitizeStr(d.category, 80, 'Umum');
        if (d.tags !== undefined) patch.tags = sanitizeStrArray(d.tags, 25, 60);
        if (d.isPinned !== undefined) patch.isPinned = Boolean(d.isPinned);
        if (d.clientUpdatedAt !== undefined) patch.clientUpdatedAt = sanitizeStr(d.clientUpdatedAt, 64);
        await db.update(qhubNotes).set(patch).where(and(eq(qhubNotes.userId, uid), eq(qhubNotes.id, id)));
        break;
      }
      case 'habits': {
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (d.title !== undefined) patch.title = sanitizeStr(d.title, 160, 'Habit');
        if (d.targetPerWeek !== undefined) patch.targetPerWeek = Math.round(sanitizeNum(d.targetPerWeek, 5, 1, 7));
        if (d.completedDays !== undefined) patch.completedDays = sanitizeStrArray(d.completedDays, 400, 20);
        if (d.color !== undefined) patch.color = sanitizeStr(d.color, 32, 'indigo');
        await db.update(qhubHabits).set(patch).where(and(eq(qhubHabits.userId, uid), eq(qhubHabits.id, id)));
        break;
      }
      case 'logbook': {
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (d.date !== undefined) patch.date = sanitizeDate(d.date);
        if (d.project !== undefined) patch.project = sanitizeStr(d.project, 160, 'Daily Log');
        if (d.hours !== undefined) patch.hours = sanitizeNum(d.hours, 0, 0, 24);
        if (d.category !== undefined) patch.category = sanitizeStr(d.category, 80, 'Daily');
        if (d.description !== undefined) patch.description = sanitizeStr(d.description, 2000);
        if (d.status !== undefined) patch.status = d.status === 'In Progress' ? 'In Progress' : 'Completed';
        await db.update(qhubLogbookEntries).set(patch).where(and(eq(qhubLogbookEntries.userId, uid), eq(qhubLogbookEntries.id, id)));
        break;
      }
      case 'barcodes': {
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (d.title !== undefined) patch.title = sanitizeStr(d.title, 200, 'QR Code');
        if (d.text !== undefined) patch.text = sanitizeStr(d.text, 2000, 'QHub');
        if (d.dataUrl !== undefined) patch.dataUrl = sanitizeOptImage(d.dataUrl);
        await db.update(qhubSavedBarcodes).set(patch).where(and(eq(qhubSavedBarcodes.userId, uid), eq(qhubSavedBarcodes.id, id)));
        break;
      }
      case 'reimbursements': {
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (d.submissionDate !== undefined) patch.submissionDate = sanitizeDate(d.submissionDate);
        if (d.property !== undefined) patch.property = sanitizeStr(d.property, 200, 'Proyek');
        if (d.typeProject !== undefined) patch.typeProject = d.typeProject === 'Online' ? 'Online' : 'Onsite';
        if (d.role !== undefined && ['M', 'TPM', 'PM'].includes(d.role)) patch.role = d.role;
        if (d.startDate !== undefined) patch.startDate = sanitizeDate(d.startDate);
        if (d.endDate !== undefined) patch.endDate = sanitizeDate(d.endDate);
        if (d.wdDays !== undefined) patch.wdDays = sanitizeNum(d.wdDays, 0, 0, 366);
        if (d.weDays !== undefined) patch.weDays = sanitizeNum(d.weDays, 0, 0, 366);
        if (d.totalDays !== undefined) patch.totalDays = sanitizeNum(d.totalDays, 0, 0, 366);
        if (d.description !== undefined) patch.description = sanitizeStr(d.description, 500);
        if (d.wdRate !== undefined) patch.wdRate = sanitizeNum(d.wdRate, 0, 0, 1e9);
        if (d.weRate !== undefined) patch.weRate = sanitizeNum(d.weRate, 0, 0, 1e9);
        if (d.wdAmount !== undefined) patch.wdAmount = sanitizeNum(d.wdAmount, 0, 0, 1e11);
        if (d.weAmount !== undefined) patch.weAmount = sanitizeNum(d.weAmount, 0, 0, 1e11);
        if (d.totalAmount !== undefined) patch.totalAmount = sanitizeNum(d.totalAmount, 0, 0, 1e11);
        if (d.status !== undefined && ['Draft', 'Submitted', 'Approved', 'Done', 'Rejected'].includes(d.status)) patch.status = d.status;
        if (d.deliveryDate !== undefined) patch.deliveryDate = sanitizeOptStr(d.deliveryDate, 40);
        if (d.paymentAccountId !== undefined) patch.paymentAccountId = sanitizeOptStr(d.paymentAccountId, 128);
        if (d.selectedDates !== undefined) patch.selectedDates = Array.isArray(d.selectedDates) ? sanitizeStrArray(d.selectedDates, 366, 20) : null;
        if (d.notes !== undefined) patch.notes = sanitizeOptStr(d.notes, 500);
        await db.update(qhubReimbursements).set(patch).where(and(eq(qhubReimbursements.userId, uid), eq(qhubReimbursements.id, id)));
        break;
      }
      case 'reimburseRates': {
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (d.role !== undefined && ['M', 'TPM', 'PM'].includes(d.role)) patch.role = d.role;
        if (d.type !== undefined) patch.type = d.type === 'Online' ? 'Online' : 'Onsite';
        if (d.wdRate !== undefined) patch.wdRate = sanitizeNum(d.wdRate, 0, 0, 1e9);
        if (d.weRate !== undefined) patch.weRate = sanitizeNum(d.weRate, 0, 0, 1e9);
        await db.update(qhubReimburseRates).set(patch).where(and(eq(qhubReimburseRates.userId, uid), eq(qhubReimburseRates.id, id)));
        break;
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(`Failed to update ${col}/${id}:`, err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Gagal memperbarui data' });
  }
});

workspaceRouter.delete('/workspace/:collection/:id', requireAuth, requireDatabase, async (req: AuthRequest, res) => {
  const col = req.params.collection;
  const id = sanitizeId(req.params.id, 'doc');
  if (!COLLECTIONS_SET.has(col)) {
    return res.status(400).json({ error: 'Koleksi tidak dikenali' });
  }
  const uid = req.user!.uid;

  try {
    const db = getDb();
    const typedCol = col as SupportedCollection;

    switch (typedCol) {
      case 'accounts':
        await db.delete(qhubAccounts).where(and(eq(qhubAccounts.userId, uid), eq(qhubAccounts.id, id)));
        break;
      case 'transactions':
        await db.delete(qhubTransactions).where(and(eq(qhubTransactions.userId, uid), eq(qhubTransactions.id, id)));
        break;
      case 'debts':
        await db.delete(qhubDebts).where(and(eq(qhubDebts.userId, uid), eq(qhubDebts.id, id)));
        break;
      case 'myDebts':
        await db.delete(qhubMyDebts).where(and(eq(qhubMyDebts.userId, uid), eq(qhubMyDebts.id, id)));
        break;
      case 'categoryBudgets':
        await db.delete(qhubCategoryBudgets).where(and(eq(qhubCategoryBudgets.userId, uid), eq(qhubCategoryBudgets.id, id)));
        break;
      case 'todos':
        await db.delete(qhubTodos).where(and(eq(qhubTodos.userId, uid), eq(qhubTodos.id, id)));
        break;
      case 'notes':
        await db.delete(qhubNotes).where(and(eq(qhubNotes.userId, uid), eq(qhubNotes.id, id)));
        break;
      case 'habits':
        await db.delete(qhubHabits).where(and(eq(qhubHabits.userId, uid), eq(qhubHabits.id, id)));
        break;
      case 'logbook':
        await db.delete(qhubLogbookEntries).where(and(eq(qhubLogbookEntries.userId, uid), eq(qhubLogbookEntries.id, id)));
        break;
      case 'barcodes':
        await db.delete(qhubSavedBarcodes).where(and(eq(qhubSavedBarcodes.userId, uid), eq(qhubSavedBarcodes.id, id)));
        break;
      case 'reimbursements':
        await db.delete(qhubReimbursements).where(and(eq(qhubReimbursements.userId, uid), eq(qhubReimbursements.id, id)));
        break;
      case 'reimburseRates':
        await db.delete(qhubReimburseRates).where(and(eq(qhubReimburseRates.userId, uid), eq(qhubReimburseRates.id, id)));
        break;
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(`Failed to delete ${col}/${id}:`, err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Gagal menghapus data' });
  }
});
