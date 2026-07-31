import type { TransactionCategory } from '@/utils/types';

const CATEGORY_LIST = 'FOOD, GROCERIES, TRANSPORTATION, UTILITIES, ENTERTAINMENT, SHOPPING, HEALTH, EDUCATION, RENT, SALARY, TRANSFER, ATM, EMI, INVESTMENT, INSURANCE, OTHER';

/**
 * Build a structured prompt for extracting transaction data from an SMS.
 * Uses ChatML format for Qwen models.
 */
export function buildExtractionPrompt(smsBody: string): string {
  // Truncate SMS to prevent context overflow
  const truncated = smsBody.substring(0, 500);

  return `<|im_start|>system
You are a financial SMS parser for Indian banks. Extract transaction details from the SMS.
Respond ONLY with a single valid JSON object. No explanation, no markdown fences, no extra text.
JSON schema: {"amount": number, "type": "DEBIT" or "CREDIT", "merchant": string or null, "category": one of [${CATEGORY_LIST}], "confidence": number between 0 and 1}
Rules:
- amount is in Indian Rupees (not paise). Example: 500.00 means five hundred rupees.
- type is DEBIT if money was spent/withdrawn/debited, CREDIT if money was received/deposited/credited.
- merchant is the name of the merchant, UPI ID, or payee. null if unknown.
- category is your best guess based on the merchant name.
- confidence is how sure you are (0.0 to 1.0).
<|im_end|>
<|im_start|>user
SMS: "${truncated}"
<|im_end|>
<|im_start|>assistant
`;
}

/**
 * Build a prompt to categorize a merchant name.
 */
export function buildCategorizationPrompt(merchant: string): string {
  return `<|im_start|>system
Classify the merchant/payee into exactly ONE category from this list:
${CATEGORY_LIST}
Respond with ONLY the category name in uppercase. Nothing else.
<|im_end|>
<|im_start|>user
Merchant: "${merchant}"
<|im_end|>
<|im_start|>assistant
`;
}
