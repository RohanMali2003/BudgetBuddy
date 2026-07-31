import { useState, useCallback, useEffect } from 'react';
import { getTransactionsByMonth, getRecentTransactions } from '@/db/transactionRepo';
import { eventBus, EVENTS } from '@/utils/eventBus';
import type { Transaction } from '@/utils/types';

export function useTransactions(month: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    try {
      const txs = getTransactionsByMonth(month);
      setTransactions(txs);
    } catch (error) {
      console.error('[useTransactions] Failed to load:', error);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    refresh();
    const unsubscribe = eventBus.on(EVENTS.TRANSACTION_ADDED, refresh);
    return unsubscribe;
  }, [refresh]);

  return { transactions, loading, refresh };
}

export function useRecentTransactions(limit: number = 5) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const refresh = useCallback(() => {
    try {
      setTransactions(getRecentTransactions(limit));
    } catch (error) {
      console.error('[useRecentTransactions] Failed to load:', error);
    }
  }, [limit]);

  useEffect(() => {
    refresh();
    const unsubscribe = eventBus.on(EVENTS.TRANSACTION_ADDED, refresh);
    return unsubscribe;
  }, [refresh]);

  return { transactions, refresh };
}
