import { getDatabase } from './database';
import type { Transaction, TransactionCategory } from '@/utils/types';
import { DEDUP_WINDOW_SECONDS } from '@/utils/constants';

export function insertTransaction(tx: Transaction): void {
  const db = getDatabase();
  db.executeSync(
    `INSERT INTO transactions (id, raw_sms, sender_address, amount_paise, type, merchant_or_vpa, category, account_tail, balance_paise, parsed_by, confidence, transaction_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tx.id, tx.rawSms, tx.senderAddress, tx.amount, tx.type, tx.merchantOrVpa, tx.category, tx.accountTail, tx.balance, tx.parsedBy, tx.confidence, tx.transactionDate, tx.createdAt]
  );
}

export function getTransactionsByMonth(month: string): Transaction[] {
  const db = getDatabase();
  const result = db.executeSync(
    `SELECT * FROM transactions WHERE substr(transaction_date, 1, 7) = ? ORDER BY transaction_date DESC`,
    [month]
  );
  return (result.rows ?? []).map(rowToTransaction);
}

export function getTransactionsByCategory(category: string, month: string): Transaction[] {
  const db = getDatabase();
  const result = db.executeSync(
    `SELECT * FROM transactions WHERE category = ? AND substr(transaction_date, 1, 7) = ? ORDER BY transaction_date DESC`,
    [category, month]
  );
  return (result.rows ?? []).map(rowToTransaction);
}

export function getMonthlyTotalByType(month: string, type: 'DEBIT' | 'CREDIT'): number {
  const db = getDatabase();
  const result = db.executeSync(
    `SELECT COALESCE(SUM(amount_paise), 0) as total FROM transactions WHERE substr(transaction_date, 1, 7) = ? AND type = ?`,
    [month, type]
  );
  return (result.rows?.[0]?.total as number) ?? 0;
}

export function getCategoryTotals(month: string): { category: string; totalPaise: number }[] {
  const db = getDatabase();
  const result = db.executeSync(
    `SELECT category, COALESCE(SUM(amount_paise), 0) as total FROM transactions WHERE substr(transaction_date, 1, 7) = ? AND type = 'DEBIT' GROUP BY category ORDER BY total DESC`,
    [month]
  );
  return (result.rows ?? []).map((row: any) => ({
    category: row.category as string,
    totalPaise: row.total as number,
  }));
}

export function getRecentTransactions(limit: number): Transaction[] {
  const db = getDatabase();
  const result = db.executeSync(
    `SELECT * FROM transactions ORDER BY transaction_date DESC, created_at DESC LIMIT ?`,
    [limit]
  );
  return (result.rows ?? []).map(rowToTransaction);
}

export function isDuplicate(senderAddress: string, amountPaise: number, transactionDate: string): boolean {
  const db = getDatabase();
  // Check if a transaction with the same sender, amount, and date (within 60 seconds) already exists
  const result = db.executeSync(
    `SELECT COUNT(*) as cnt FROM transactions
     WHERE sender_address = ? AND amount_paise = ?
     AND abs(strftime('%s', transaction_date) - strftime('%s', ?)) < ?`,
    [senderAddress, amountPaise, transactionDate, DEDUP_WINDOW_SECONDS]
  );
  return ((result.rows?.[0]?.cnt as number) ?? 0) > 0;
}

export function updateTransactionCategory(id: string, category: TransactionCategory): void {
  const db = getDatabase();
  db.executeSync('UPDATE transactions SET category = ? WHERE id = ?', [category, id]);
}

function rowToTransaction(row: any): Transaction {
  return {
    id: row.id as string,
    rawSms: row.raw_sms as string,
    senderAddress: row.sender_address as string,
    amount: row.amount_paise as number,
    type: row.type as 'DEBIT' | 'CREDIT',
    merchantOrVpa: (row.merchant_or_vpa as string) ?? null,
    category: (row.category as TransactionCategory) ?? null,
    accountTail: (row.account_tail as string) ?? null,
    balance: (row.balance_paise as number) ?? null,
    parsedBy: row.parsed_by as 'REGEX' | 'SLM',
    confidence: row.confidence as number,
    transactionDate: row.transaction_date as string,
    createdAt: row.created_at as string,
  };
}
