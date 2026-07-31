import {
  sumTransactionAmounts,
  sumDebitAmounts,
  sumCreditAmounts,
  netBalance,
  budgetRemaining,
  budgetPercentUsed,
  averageDailySpend,
  projectedMonthlySpend,
} from '@/math/financialMath';
import type { Transaction } from '@/utils/types';

describe('Financial Math Engine', () => {
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      rawSms: '',
      senderAddress: 'TEST',
      amount: 150000, // ₹1,500.00
      type: 'DEBIT',
      merchantOrVpa: 'Zomato',
      category: 'FOOD',
      accountTail: '1234',
      balance: 1000000,
      parsedBy: 'REGEX',
      confidence: 1.0,
      transactionDate: '2026-07-01T10:00:00Z',
      createdAt: '2026-07-01T10:00:00Z',
    },
    {
      id: '2',
      rawSms: '',
      senderAddress: 'TEST',
      amount: 500000, // ₹5,000.00
      type: 'CREDIT',
      merchantOrVpa: 'Salary',
      category: 'SALARY',
      accountTail: '1234',
      balance: 1500000,
      parsedBy: 'REGEX',
      confidence: 1.0,
      transactionDate: '2026-07-02T10:00:00Z',
      createdAt: '2026-07-02T10:00:00Z',
    },
    {
      id: '3',
      rawSms: '',
      senderAddress: 'TEST',
      amount: 50000, // ₹500.00
      type: 'DEBIT',
      merchantOrVpa: 'Uber',
      category: 'TRANSPORTATION',
      accountTail: '1234',
      balance: 1450000,
      parsedBy: 'REGEX',
      confidence: 1.0,
      transactionDate: '2026-07-03T10:00:00Z',
      createdAt: '2026-07-03T10:00:00Z',
    },
  ];

  it('calculates sum of transaction amounts in paise', () => {
    expect(sumTransactionAmounts(mockTransactions)).toBe(700000);
  });

  it('calculates sum of debit amounts in paise', () => {
    expect(sumDebitAmounts(mockTransactions)).toBe(200000);
  });

  it('calculates sum of credit amounts in paise', () => {
    expect(sumCreditAmounts(mockTransactions)).toBe(500000);
  });

  it('calculates net balance accurately', () => {
    expect(netBalance(mockTransactions)).toBe(300000); // 500,000 credit - 200,000 debit
  });

  it('calculates budget remaining in paise', () => {
    expect(budgetRemaining(1000000, 400000)).toBe(600000);
    expect(budgetRemaining(500000, 600000)).toBe(-100000);
  });

  it('calculates budget percent used', () => {
    expect(budgetPercentUsed(1000000, 400000)).toBe(40);
    expect(budgetPercentUsed(0, 50000)).toBe(0);
    expect(budgetPercentUsed(100, 85)).toBe(85);
  });

  it('calculates average daily spend', () => {
    expect(averageDailySpend(300000, 30)).toBe(10000);
    expect(averageDailySpend(300000, 0)).toBe(0);
  });

  it('calculates projected monthly spend', () => {
    expect(projectedMonthlySpend(150000, 15, 30)).toBe(300000);
    expect(projectedMonthlySpend(150000, 0, 30)).toBe(0);
  });
});
