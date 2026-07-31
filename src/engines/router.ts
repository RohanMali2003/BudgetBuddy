import { parseWithRegex } from './regexParser';
import { slmEngine, parseSlmOutput } from './slmEngine';
import { buildExtractionPrompt } from './slmPrompts';
import { resolveCategory } from './categoryResolver';
import { insertTransaction, isDuplicate } from '@/db/transactionRepo';
import type { RawBankSms, Transaction, TransactionCategory } from '@/utils/types';
import uuid from 'react-native-uuid';

/**
 * Process a single bank SMS through the dual-engine pipeline.
 * Returns the saved Transaction, or null if the SMS was unparseable or a duplicate.
 */
export async function processBankSms(sms: RawBankSms): Promise<Transaction | null> {
  try {
    // === Edge Case Check 1: SMS empty or too short (< 20 chars) ===
    if (!sms.body || sms.body.length < 20) {
      console.log('[Router] SMS body empty or shorter than 20 characters, skipping');
      return null;
    }

    // === STEP 1: Try Engine A (Regex) ===
    const regexResult = parseWithRegex(sms.body);

    let amount: number;
    let type: 'DEBIT' | 'CREDIT';
    let merchantOrVpa: string | null;
    let category: TransactionCategory | null = null;
    let accountTail: string | null;
    let balance: number | null;
    let transactionDate: string;
    let parsedBy: 'REGEX' | 'SLM' = 'REGEX';
    let confidence: number = 1.0;

    if (regexResult) {
      // Engine A succeeded — use its results
      amount = regexResult.amount;
      type = regexResult.type;
      merchantOrVpa = regexResult.merchantOrVpa;
      accountTail = regexResult.accountTail;
      balance = regexResult.balance;
      transactionDate = regexResult.transactionDate;
      console.log('[Router] Engine A parsed SMS successfully');
    } else {
      // === STEP 2: Fall back to Engine B (SLM) ===
      parsedBy = 'SLM';
      console.log('[Router] Engine A failed, falling back to Engine B');

      if (!slmEngine.isModelAvailable()) {
        console.warn('[Router] SLM model not available, skipping SMS');
        return null;
      }

      // Edge Case Check 2: Truncate SMS body to 500 chars before sending to SLM
      const bodyForSlm = sms.body.length > 500 ? sms.body.substring(0, 500) : sms.body;

      try {
        await slmEngine.acquire();
        const prompt = buildExtractionPrompt(bodyForSlm);
        const rawOutput = await slmEngine.complete(prompt);
        const slmResult = parseSlmOutput(rawOutput);

        if (!slmResult) {
          console.warn('[Router] SLM failed to parse SMS:', sms.body.substring(0, 100));
          return null;
        }

        amount = slmResult.amount;
        type = slmResult.type;
        merchantOrVpa = slmResult.merchantOrVpa;
        category = slmResult.category;
        confidence = slmResult.confidence;
        accountTail = null;
        balance = null;
        transactionDate = new Date(sms.timestamp).toISOString();
      } catch (error) {
        console.error('[Router] SLM error, force-unloading:', error, 'SMS:', sms.body.substring(0, 100));
        await slmEngine.forceUnload();
        return null;  // Skip this SMS
      } finally {
        slmEngine.release();
      }
    }

    // === STEP 3: Deduplication ===
    if (isDuplicate(sms.sender, amount, transactionDate)) {
      console.log('[Router] Duplicate SMS detected, skipping');
      return null;
    }

    // === STEP 4: Categorization (if not already done by SLM) ===
    if (!category && merchantOrVpa) {
      category = await resolveCategory(merchantOrVpa);
    }
    if (!category) {
      category = 'OTHER';
    }

    // === STEP 5: Build and persist transaction ===
    const transaction: Transaction = {
      id: uuid.v4() as string,
      rawSms: sms.body,
      senderAddress: sms.sender,
      amount,
      type,
      merchantOrVpa,
      category,
      accountTail,
      balance,
      parsedBy,
      confidence,
      transactionDate,
      createdAt: new Date().toISOString(),
    };

    insertTransaction(transaction);
    console.log(`[Router] Transaction saved: ${type} ${amount} paise (${parsedBy})`);

    return transaction;
  } catch (error) {
    console.error('[Router] Failed to process SMS:', error, 'SMS:', sms.body.substring(0, 100));
    return null;
  }
}
