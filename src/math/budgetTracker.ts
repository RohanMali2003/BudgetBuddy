import { getBudgetsByMonth } from '@/db/budgetRepo';
import { budgetRemaining, budgetPercentUsed } from './financialMath';
import type { TransactionCategory } from '@/utils/types';

export interface BudgetStatus {
  id: string;
  category: TransactionCategory;
  limitPaise: number;
  spentPaise: number;
  remainingPaise: number;
  percentUsed: number;
  isOverBudget: boolean;
  isWarning: boolean;  // > 80% used
}

export function computeBudgetStatuses(month: string): BudgetStatus[] {
  const budgets = getBudgetsByMonth(month);

  return budgets.map(budget => {
    const remaining = budgetRemaining(budget.limitPaise, budget.spentPaise);
    const percent = budgetPercentUsed(budget.limitPaise, budget.spentPaise);

    return {
      id: budget.id,
      category: budget.category,
      limitPaise: budget.limitPaise,
      spentPaise: budget.spentPaise,
      remainingPaise: remaining,
      percentUsed: percent,
      isOverBudget: remaining < 0,
      isWarning: percent >= 80 && percent < 100,
    };
  });
}

export function getOverBudgetCategories(month: string): BudgetStatus[] {
  return computeBudgetStatuses(month).filter(b => b.isOverBudget);
}

export function getWarningCategories(month: string): BudgetStatus[] {
  return computeBudgetStatuses(month).filter(b => b.isWarning);
}
