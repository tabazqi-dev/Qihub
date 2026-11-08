import { relations } from 'drizzle-orm';
import { pgTable, serial, text, timestamp, integer, decimal } from 'drizzle-orm/pg-core';

// 1. Chart of Accounts
export const chartOfAccounts = pgTable('chart_of_accounts', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // E.g., 1001, 2001
  name: text('name').notNull(),
  type: text('type', { enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] }).notNull(),
});

// 2. Journal Entries (Header)
export const journalEntries = pgTable('journal_entries', {
  id: serial('id').primaryKey(),
  date: timestamp('date').defaultNow().notNull(),
  description: text('description').notNull(),
  reference: text('reference'), // E.g., 'reimburse-123'
});

// 3. Journal Items (Details - Debit/Credit)
export const journalItems = pgTable('journal_items', {
  id: serial('id').primaryKey(),
  journalEntryId: integer('journal_entry_id').references(() => journalEntries.id, { onDelete: 'cascade' }).notNull(),
  accountId: integer('account_id').references(() => chartOfAccounts.id).notNull(),
  debit: decimal('debit', { precision: 15, scale: 2 }).default('0').notNull(),
  credit: decimal('credit', { precision: 15, scale: 2 }).default('0').notNull(),
});

// Relationships
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
