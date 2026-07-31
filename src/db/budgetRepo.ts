import { getDatabase } from './database';
import type { Budget, TransactionCategory } from '@/utils/types';

export function upsertBudget(budget: Budget): void {
  const db = getDatabase();
  db.executeSync(
    `INSERT INTO budgets (id, category, limit_paise, month)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(category, month) DO UPDATE SET limit_paise = excluded.limit_paise`,
    [budget.id, budget.category, budget.limitPaise, budget.month]
  );
}

export function getBudgetsByMonth(month: string): Budget[] {
  const db = getDatabase();
  const result = db.executeSync(
    `SELECT b.*, COALESCE(t.spent, 0) as spent_paise
     FROM budgets b
     LEFT JOIN (
       SELECT category, SUM(amount_paise) as spent
       FROM transactions
       WHERE type = 'DEBIT' AND substr(transaction_date, 1, 7) = ?
       GROUP BY category
     ) t ON b.category = t.category
     WHERE b.month = ?`,
    [month, month]
  );
  return (result.rows ?? []).map((row: any) => ({
    id: row.id as string,
    category: row.category as TransactionCategory,
    limitPaise: row.limit_paise as number,
    month: row.month as string,
    spentPaise: row.spent_paise as number,
  }));
}

export function getBudgetForCategory(category: string, month: string): Budget | null {
  const db = getDatabase();
  const result = db.executeSync(
    `SELECT b.*, COALESCE(t.spent, 0) as spent_paise
     FROM budgets b
     LEFT JOIN (
       SELECT SUM(amount_paise) as spent
       FROM transactions
       WHERE type = 'DEBIT' AND category = ? AND substr(transaction_date, 1, 7) = ?
     ) t ON 1=1
     WHERE b.category = ? AND b.month = ?`,
    [category, month, category, month]
  );
  if (!result.rows || result.rows.length === 0) return null;
  const row = result.rows[0] as any;
  return {
    id: row.id as string,
    category: row.category as TransactionCategory,
    limitPaise: row.limit_paise as number,
    month: row.month as string,
    spentPaise: row.spent_paise as number,
  };
}

export function deleteBudget(id: string): void {
  const db = getDatabase();
  db.executeSync('DELETE FROM budgets WHERE id = ?', [id]);
}
