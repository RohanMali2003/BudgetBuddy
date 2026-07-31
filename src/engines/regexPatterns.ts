import type { ParsedSms } from '@/utils/types';
import { parseToPaise } from '@/utils/currency';
import { normalizeDateToISO } from '@/utils/dateUtils';

interface RegexPatternDef {
  name: string;
  pattern: RegExp;
  type: 'DEBIT' | 'CREDIT' | 'DETECT'; // DETECT = determine from match
}

// Helper to build ParsedSms from regex match
function buildResult(
  match: RegExpMatchArray,
  forcedType?: 'DEBIT' | 'CREDIT'
): ParsedSms | null {
  const amountStr = match.groups?.amount;
  if (!amountStr) return null;

  const amount = parseToPaise(amountStr);
  if (amount === null || amount <= 0) return null;

  let type: 'DEBIT' | 'CREDIT';
  if (forcedType) {
    type = forcedType;
  } else {
    const typeStr = match.groups?.type?.toLowerCase() ?? '';
    if (typeStr.includes('credit') || typeStr.includes('received') || typeStr.includes('deposited')) {
      type = 'CREDIT';
    } else {
      type = 'DEBIT';
    }
  }

  const merchantRaw = match.groups?.merchant ?? null;
  const merchant = merchantRaw ? merchantRaw.replace(/[.\s]+$/, '').trim() : null;

  const accountTail = match.groups?.account ?? null;

  const balanceStr = match.groups?.balance ?? null;
  const balance = balanceStr ? parseToPaise(balanceStr) : null;

  const dateStr = match.groups?.date ?? null;
  const transactionDate = dateStr
    ? normalizeDateToISO(dateStr) ?? new Date().toISOString()
    : new Date().toISOString();

  return { amount, type, merchantOrVpa: merchant, accountTail, balance, transactionDate };
}

// ==================== PATTERN DEFINITIONS ====================

const PATTERNS: RegexPatternDef[] = [
  // ----- DEBIT PATTERNS -----

  // "Your a/c XX1234 debited by Rs.500.00 on 30-Jul-26"
  {
    name: 'DEBIT_AC_DEBITED_BY',
    pattern: /a\/c\s*(?:XX|xx|X+)?(?<account>\d{3,4})\s*(?:is\s*)?(?:debited|deducted)\s*(?:by|for|with)\s*(?:Rs\.?|INR\.?|₹)\s*(?<amount>[\d,]+\.?\d*)\s*(?:on\s*(?<date>[\w\/\-]+))?/i,
    type: 'DEBIT',
  },

  // "INR 200.00 spent on HDFC Bank Card XX9012 at AMAZON on 2026-07-30"
  {
    name: 'DEBIT_SPENT_ON_CARD',
    pattern: /(?:Rs\.?|INR\.?|₹)\s*(?<amount>[\d,]+\.?\d*)\s*spent\s*(?:on\s*.*?Card\s*(?:XX)?(?<account>\d{3,4}))?\s*at\s*(?<merchant>[A-Za-z0-9\s\-&']+?)\s+\bon\b\s+(?<date>[\w\/\-]+)/i,
    type: 'DEBIT',
  },

  // "Acct XX1234 debited with Rs 750 on 30-Jul-26; Merchant: SWIGGY"
  {
    name: 'DEBIT_ACCT_WITH_MERCHANT',
    pattern: /(?:Acct?|Account)\s*(?:XX|xx)?(?<account>\d{3,4})\s*(?:debited|deducted)\s*(?:with|by|for)\s*(?:Rs\.?|INR\.?|₹)\s*(?<amount>[\d,]+\.?\d*)\s*(?:on\s*(?<date>[\w\/\-]+))?.*?(?:Merchant|at|to)[:;\s]*(?<merchant>[A-Za-z0-9\s\-&@.']+)/i,
    type: 'DEBIT',
  },

  // "Paid Rs.150.00 to merchant@upi from A/c XX1234"
  {
    name: 'DEBIT_PAID_TO',
    pattern: /[Pp]aid\s*(?:Rs\.?|INR\.?|₹)\s*(?<amount>[\d,]+\.?\d*)\s*to\s*(?<merchant>[A-Za-z0-9@.\-_]+)\s*(?:from\s*(?:a\/c|acct?)\s*(?:XX)?(?<account>\d{3,4}))?/i,
    type: 'DEBIT',
  },

  // "Rs.500.00 debited from a/c XX1234 on 30-Jul-26 for UPI txn to name@upi"
  {
    name: 'DEBIT_RS_DEBITED_FROM',
    pattern: /(?:Rs\.?|INR\.?|₹)\s*(?<amount>[\d,]+\.?\d*)\s*(?:debited|deducted)\s*from\s*(?:a\/c|acct?|account)\s*(?:XX|xx)?(?<account>\d{3,4})(?:\s*on\s*(?<date>[\w\/\-]+))?(?:.*?(?:to|for)\s*(?:UPI\s*)?(?:txn\s*)?(?:to\s*)?(?<merchant>[A-Za-z0-9@.\-_\s]+))?/i,
    type: 'DEBIT',
  },

  // "Dear Customer, Your A/c X1234 is debited for Rs.350.00 on 30Jul26 trf to JOHN-UPI"
  {
    name: 'DEBIT_DEAR_CUSTOMER',
    pattern: /[Aa]\/c\s*[Xx]*(?<account>\d{3,4})\s*(?:is\s*)?(?:debited|deducted)\s*(?:for|by|with)\s*(?:Rs\.?|INR\.?|₹)\s*(?<amount>[\d,]+\.?\d*)\s*(?:on\s*(?<date>[\w\/\-]+))?.*?(?:trf\s*to|to|UPI)\s*(?<merchant>[A-Za-z0-9@.\-_\s]+)/i,
    type: 'DEBIT',
  },

  // "ATM withdrawal Rs.2000 from a/c XX1234"
  {
    name: 'DEBIT_ATM',
    pattern: /ATM\s*(?:withdrawal|WDL|cash)\s*(?:of\s*)?(?:Rs\.?|INR\.?|₹)\s*(?<amount>[\d,]+\.?\d*)\s*(?:from\s*(?:a\/c|acct?)\s*(?:XX)?(?<account>\d{3,4}))?/i,
    type: 'DEBIT',
  },

  // Generic debit: contains "debited" or "debit" with an amount
  {
    name: 'DEBIT_GENERIC',
    pattern: /(?:(?:debited|deducted|debit)\s*(?:by|for|with|of)?\s*(?:Rs\.?|INR\.?|₹)\s*(?<amount>[\d,]+\.?\d*)|(?:Rs\.?|INR\.?|₹)\s*(?<amount>[\d,]+\.?\d*)\s*(?:debited|deducted|debit))/i,
    type: 'DEBIT',
  },

  // ----- CREDIT PATTERNS -----

  // "Rs 1,500.00 credited to a/c XX5678 on 30-JUL-26 by NEFT"
  {
    name: 'CREDIT_RS_CREDITED_TO',
    pattern: /(?:Rs\.?|INR\.?|₹)\s*(?<amount>[\d,]+\.?\d*)\s*(?:credited|deposited|received)\s*(?:to|in)\s*(?:a\/c|acct?|account)\s*(?:XX|xx)?(?<account>\d{3,4})\s*(?:on\s*(?<date>[\w\/\-]+))?.*?(?:by|from|via)\s*(?<merchant>[A-Za-z0-9\s\-&@.']+)/i,
    type: 'CREDIT',
  },

  // "Received Rs.500.00 from name@okaxis to A/c XX5678"
  {
    name: 'CREDIT_RECEIVED_FROM',
    pattern: /[Rr]eceived\s*(?:Rs\.?|INR\.?|₹)\s*(?<amount>[\d,]+\.?\d*)\s*from\s*(?<merchant>[A-Za-z0-9@.\-_]+)\s*(?:to\s*(?:a\/c|acct?)\s*(?:XX)?(?<account>\d{3,4}))?/i,
    type: 'CREDIT',
  },

  // "Your account XX1234 has been credited by Rs.25000.00"
  {
    name: 'CREDIT_ACCOUNT_CREDITED',
    pattern: /(?:a\/c|acct?|account)\s*(?:XX|xx)?(?<account>\d{3,4})\s*(?:has\s*been\s*|is\s*)?(?:credited|deposited)\s*(?:by|with|for)\s*(?:Rs\.?|INR\.?|₹)\s*(?<amount>[\d,]+\.?\d*)/i,
    type: 'CREDIT',
  },

  // "ICICI Bank Acct XX4321 credited Rs.5000.00 on 30-Jul-2026"
  {
    name: 'CREDIT_BANK_ACCT',
    pattern: /(?:Acct?|Account)\s*(?:XX|xx)?(?<account>\d{3,4})\s*(?:credited|deposited)\s*(?:Rs\.?|INR\.?|₹)\s*(?<amount>[\d,]+\.?\d*)\s*(?:on\s*(?<date>[\w\/\-]+))?/i,
    type: 'CREDIT',
  },

  // Generic credit: contains "credited" or "credit" with an amount
  {
    name: 'CREDIT_GENERIC',
    pattern: /(?:(?:credited|credit|deposited)\s*(?:by|with|of|for)?\s*(?:Rs\.?|INR\.?|₹)\s*(?<amount>[\d,]+\.?\d*)|(?:Rs\.?|INR\.?|₹)\s*(?<amount>[\d,]+\.?\d*)\s*(?:credited|credit|deposited))/i,
    type: 'CREDIT',
  },
];

// Standalone balance pattern — applied after a main pattern matches
const BALANCE_PATTERN = /(?:(?:Avl?\.?\s*)?[Bb]al(?:ance)?|Available\s*[Bb]al)(?:\s*(?:is|:))?\s*(?:Rs\.?|INR\.?|₹)\s*(?<balance>[\d,]+\.?\d*)/i;

// Standalone date pattern — fallback if main pattern didn't capture date
const DATE_PATTERN = /(?:on\s*|dated?\s*[:;]?\s*)(?<date>\d{1,2}[\/-]?\w{3}[\/-]?\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/i;

// Standalone account pattern — fallback
const ACCOUNT_PATTERN = /(?:a\/c|acct?|account|card)\s*(?:no\.?\s*)?(?:XX|xx|X+|ending\s*)?(?<account>\d{3,4})/i;

export { PATTERNS, BALANCE_PATTERN, DATE_PATTERN, ACCOUNT_PATTERN, buildResult };
