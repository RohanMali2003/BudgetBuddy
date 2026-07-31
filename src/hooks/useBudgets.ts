import { useState, useCallback, useEffect } from 'react';
import { computeBudgetStatuses, type BudgetStatus } from '@/math/budgetTracker';
import { eventBus, EVENTS } from '@/utils/eventBus';

export function useBudgets(month: string) {
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    try {
      setBudgets(computeBudgetStatuses(month));
    } catch (error) {
      console.error('[useBudgets] Failed to load:', error);
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

  return { budgets, loading, refresh };
}
