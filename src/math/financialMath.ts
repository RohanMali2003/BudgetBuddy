import type { Transaction } from '@/utils/types';

/**
 * All functions use PAISE (integer). No floating point for money.
 */

export function sumTransactionAmounts(transactions: Transaction[]): number {
  return transactions.reduce((sum, tx) => sum + tx.amount, 0);
}

export function sumDebitAmounts(transactions: Transaction[]): number {
  return transactions
    .filter(tx => tx.type === 'DEBIT')
    .reduce((sum, tx) => sum + tx.amount, 0);
}

export function sumCreditAmounts(transactions: Transaction[]): number {
  return transactions
    .filter(tx => tx.type === 'CREDIT')
    .reduce((sum, tx) => sum + tx.amount, 0);
}

export function netBalance(transactions: Transaction[]): number {
  return transactions.reduce((net, tx) => {
    return tx.type === 'CREDIT' ? net + tx.amount : net - tx.amount;
  }, 0);
}

export function budgetRemaining(limitPaise: number, spentPaise: number): number {
  return limitPaise - spentPaise;
}

export function budgetPercentUsed(limitPaise: number, spentPaise: number): number {
  if (limitPaise === 0) return 0;
  return Math.round((spentPaise / limitPaise) * 100);
}

export function averageDailySpend(totalDebitPaise: number, daysInMonth: number): number {
  if (daysInMonth === 0) return 0;
  return Math.round(totalDebitPaise / daysInMonth);
}

export function projectedMonthlySpend(
  totalDebitPaise: number,
  daysSoFar: number,
  daysInMonth: number
): number {
  if (daysSoFar === 0) return 0;
  return Math.round((totalDebitPaise / daysSoFar) * daysInMonth);
}
