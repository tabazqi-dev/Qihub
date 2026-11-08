import { db } from './index.ts';
import { journalEntries, journalItems, chartOfAccounts } from './schema.ts';
import { eq, sql, and, gte, lte } from 'drizzle-orm';

export async function getChartOfAccounts() {
  return await db.select().from(chartOfAccounts);
}

export async function createJournalEntry(entry: typeof journalEntries.$inferInsert, items: (typeof journalItems.$inferInsert)[]) {
  return await db.transaction(async (tx) => {
    const [newEntry] = await tx.insert(journalEntries).values(entry).returning();
    const itemsWithEntryId = items.map(item => ({ ...item, journalEntryId: newEntry.id }));
    await tx.insert(journalItems).values(itemsWithEntryId);
    return newEntry;
  });
}

export async function getGeneralLedger(accountId: number, startDate?: string, endDate?: string) {
  const query = db
    .select({
      date: journalEntries.date,
      description: journalEntries.description,
      debit: journalItems.debit,
      credit: journalItems.credit,
    })
    .from(journalItems)
    .innerJoin(journalEntries, eq(journalItems.journalEntryId, journalEntries.id))
    .where(eq(journalItems.accountId, accountId))
    .orderBy(journalEntries.date);
    
    // Add date filtering if needed
    return await query;
}

export async function getTrialBalance() {
  return await db
    .select({
      accountId: chartOfAccounts.id,
      accountCode: chartOfAccounts.code,
      accountName: chartOfAccounts.name,
      totalDebit: sql<number>`SUM(CAST(${journalItems.debit} AS NUMERIC))`,
      totalCredit: sql<number>`SUM(CAST(${journalItems.credit} AS NUMERIC))`,
    })
    .from(chartOfAccounts)
    .leftJoin(journalItems, eq(chartOfAccounts.id, journalItems.accountId))
    .groupBy(chartOfAccounts.id);
}
