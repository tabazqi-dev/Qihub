import express from 'express';
import { getChartOfAccounts, createJournalEntry, getGeneralLedger, getTrialBalance } from './src/db/queries.ts';

const app = express();
app.use(express.json());

app.get('/api/accounts', async (req, res) => {
  res.json(await getChartOfAccounts());
});

app.post('/api/journal', async (req, res) => {
  try {
    const { entry, items } = req.body;
    await createJournalEntry(entry, items);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create journal' });
  }
});

app.get('/api/ledger/:accountId', async (req, res) => {
  res.json(await getGeneralLedger(parseInt(req.params.accountId)));
});

app.get('/api/trial-balance', async (req, res) => {
  res.json(await getTrialBalance());
});

app.listen(3001, () => console.log('Server running on port 3001'));
