import express from 'express';
import { workspaceRouter } from './workspace.ts';
import { requireAuth } from './auth.ts';
import { getChartOfAccounts, createJournalEntry, getGeneralLedger, getTrialBalance } from '../db/queries.ts';
import { isDatabaseConfigured } from '../db/index.ts';

export const app = express();

app.use(express.json({ limit: '4mb' }));

// Q'Hub PostgreSQL Workspace & Sync API
app.use('/api', workspaceRouter);

// Protected Legacy Accounting API routes
app.get('/api/accounts', requireAuth, async (_req, res) => {
  if (!isDatabaseConfigured()) return res.json([]);
  try {
    res.json(await getChartOfAccounts());
  } catch {
    res.json([]);
  }
});

app.post('/api/journal', requireAuth, async (req, res) => {
  if (!isDatabaseConfigured()) return res.status(503).json({ error: 'DATABASE_NOT_CONFIGURED' });
  try {
    const { entry, items } = req.body;
    await createJournalEntry(entry, items);
    res.status(201).json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to create journal' });
  }
});

app.get('/api/ledger/:accountId', requireAuth, async (req, res) => {
  if (!isDatabaseConfigured()) return res.json([]);
  try {
    const accountId = Number(req.params.accountId);
    if (!Number.isInteger(accountId) || accountId <= 0) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }
    res.json(await getGeneralLedger(accountId));
  } catch {
    res.json([]);
  }
});

app.get('/api/trial-balance', requireAuth, async (_req, res) => {
  if (!isDatabaseConfigured()) return res.json([]);
  try {
    res.json(await getTrialBalance());
  } catch {
    res.json([]);
  }
});

export default app;
