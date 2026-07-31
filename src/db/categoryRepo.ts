import { getDatabase } from './database';
import { VALID_CATEGORIES, type TransactionCategory } from '@/utils/types';

const CATEGORY_ICONS: Record<TransactionCategory, string> = {
  FOOD: '🍔',
  GROCERIES: '🛒',
  TRANSPORTATION: '🚗',
  UTILITIES: '💡',
  ENTERTAINMENT: '🎬',
  SHOPPING: '🛍️',
  HEALTH: '🏥',
  EDUCATION: '📚',
  RENT: '🏠',
  SALARY: '💰',
  TRANSFER: '🔄',
  ATM: '🏧',
  EMI: '📋',
  INVESTMENT: '📈',
  INSURANCE: '🛡️',
  OTHER: '📦',
};

export function getAllCategories(): TransactionCategory[] {
  return [...VALID_CATEGORIES];
}

export function getCategoryIcon(category: TransactionCategory): string {
  return CATEGORY_ICONS[category] ?? '📦';
}

export function getCachedMerchantCategory(merchant: string): TransactionCategory | null {
  const db = getDatabase();
  const result = db.executeSync(
    'SELECT category FROM merchant_categories WHERE merchant = ?',
    [merchant.toUpperCase().trim()]
  );
  if (!result.rows || result.rows.length === 0) return null;
  return (result.rows[0] as any).category as TransactionCategory;
}

export function cacheMerchantCategory(merchant: string, category: TransactionCategory): void {
  const db = getDatabase();
  db.executeSync(
    `INSERT INTO merchant_categories (merchant, category, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(merchant) DO UPDATE SET category = excluded.category, updated_at = datetime('now')`,
    [merchant.toUpperCase().trim(), category]
  );
}
