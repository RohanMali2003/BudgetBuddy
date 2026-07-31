import type { ParsedSms } from '@/utils/types';
import { parseToPaise } from '@/utils/currency';
import { normalizeDateToISO } from '@/utils/dateUtils';
import { PATTERNS, BALANCE_PATTERN, DATE_PATTERN, ACCOUNT_PATTERN, buildResult } from './regexPatterns';

/**
 * Engine A: Deterministic regex-based SMS parser.
 * Returns ParsedSms if successfully parsed, null if regex can't handle it.
 */
export function parseWithRegex(smsBody: string): ParsedSms | null {
  for (const patternDef of PATTERNS) {
    const match = smsBody.match(patternDef.pattern);
    if (!match) continue;

    const forcedType = patternDef.type === 'DETECT' ? undefined : patternDef.type;
    const result = buildResult(match, forcedType);
    if (!result) continue; // Amount extraction failed, try next pattern

    // Supplement with standalone patterns if fields are missing
    if (!result.balance) {
      const balMatch = smsBody.match(BALANCE_PATTERN);
      if (balMatch?.groups?.balance) {
        result.balance = parseToPaise(balMatch.groups.balance);
      }
    }

    if (result.transactionDate === new Date().toISOString() || !result.transactionDate) {
      const dateMatch = smsBody.match(DATE_PATTERN);
      if (dateMatch?.groups?.date) {
        const normalized = normalizeDateToISO(dateMatch.groups.date);
        if (normalized) result.transactionDate = normalized;
      }
    }

    if (!result.accountTail) {
      const acctMatch = smsBody.match(ACCOUNT_PATTERN);
      if (acctMatch?.groups?.account) {
        result.accountTail = acctMatch.groups.account;
      }
    }

    return result;
  }

  return null; // No pattern matched → route to Engine B
}
