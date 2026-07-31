// All amounts in PAISE (integer). ₹1 = 100 paise.
export interface Transaction {
  id: string;
  rawSms: string;
  senderAddress: string;
  amount: number;          // PAISE — integer only
  type: 'DEBIT' | 'CREDIT';
  merchantOrVpa: string | null;
  category: TransactionCategory | null;
  accountTail: string | null;
  balance: number | null;  // Post-transaction balance in PAISE
  parsedBy: 'REGEX' | 'SLM';
  confidence: number;      // 0-1, regex always = 1.0
  transactionDate: string; // ISO 8601
  createdAt: string;       // ISO 8601
}

export type TransactionCategory =
  | 'FOOD' | 'GROCERIES' | 'TRANSPORTATION' | 'UTILITIES'
  | 'ENTERTAINMENT' | 'SHOPPING' | 'HEALTH' | 'EDUCATION'
  | 'RENT' | 'SALARY' | 'TRANSFER' | 'ATM' | 'EMI'
  | 'INVESTMENT' | 'INSURANCE' | 'OTHER';

export const VALID_CATEGORIES: TransactionCategory[] = [
  'FOOD', 'GROCERIES', 'TRANSPORTATION', 'UTILITIES',
  'ENTERTAINMENT', 'SHOPPING', 'HEALTH', 'EDUCATION',
  'RENT', 'SALARY', 'TRANSFER', 'ATM', 'EMI',
  'INVESTMENT', 'INSURANCE', 'OTHER',
];

export interface Budget {
  id: string;
  category: TransactionCategory;
  limitPaise: number;
  month: string;           // "2026-07"
  spentPaise: number;      // Computed at query time, not stored
}

export interface ParsedSms {
  amount: number;          // PAISE
  type: 'DEBIT' | 'CREDIT';
  merchantOrVpa: string | null;
  accountTail: string | null;
  balance: number | null;  // PAISE
  transactionDate: string; // ISO 8601
}

export interface SlmExtractionResult {
  amount: number;          // PAISE
  type: 'DEBIT' | 'CREDIT';
  merchantOrVpa: string | null;
  category: TransactionCategory;
  confidence: number;
}

export interface RawBankSms {
  sender: string;
  body: string;
  timestamp: number;
}
