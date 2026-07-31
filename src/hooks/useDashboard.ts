import { useState, useCallback, useEffect } from 'react';
import { getMonthlyTotalByType, getCategoryTotals } from '@/db/transactionRepo';
import { getWarningCategories, getOverBudgetCategories, type BudgetStatus } from '@/math/budgetTracker';
import { eventBus, EVENTS } from '@/utils/eventBus';

interface DashboardData {
  totalDebitPaise: number;
  totalCreditPaise: number;
  categoryTotals: { category: string; totalPaise: number }[];
  budgetWarnings: BudgetStatus[];
  budgetOverages: BudgetStatus[];
}

export function useDashboard(month: string) {
  const [data, setData] = useState<DashboardData>({
    totalDebitPaise: 0,
    totalCreditPaise: 0,
    categoryTotals: [],
    budgetWarnings: [],
    budgetOverages: [],
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    try {
      setData({
        totalDebitPaise: getMonthlyTotalByType(month, 'DEBIT'),
        totalCreditPaise: getMonthlyTotalByType(month, 'CREDIT'),
        categoryTotals: getCategoryTotals(month),
        budgetWarnings: getWarningCategories(month),
        budgetOverages: getOverBudgetCategories(month),
      });
    } catch (error) {
      console.error('[useDashboard] Failed to load:', error);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    refresh();
    const unsub1 = eventBus.on(EVENTS.TRANSACTION_ADDED, refresh);
    const unsub2 = eventBus.on(EVENTS.BUDGET_UPDATED, refresh);
    return () => { unsub1(); unsub2(); };
  }, [refresh]);

  return { data, loading, refresh };
}
