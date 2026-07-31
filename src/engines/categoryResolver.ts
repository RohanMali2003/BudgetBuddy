import { slmEngine } from './slmEngine';
import { buildCategorizationPrompt } from './slmPrompts';
import { getCachedMerchantCategory, cacheMerchantCategory } from '@/db/categoryRepo';
import { VALID_CATEGORIES, type TransactionCategory } from '@/utils/types';

/**
 * Hardcoded merchant → category map for common Indian merchants.
 * This avoids SLM calls for well-known merchants.
 */
const KNOWN_MERCHANTS: Record<string, TransactionCategory> = {
  // Food & Restaurants
  'SWIGGY': 'FOOD', 'ZOMATO': 'FOOD', 'DOMINOS': 'FOOD', 'MCDONALDS': 'FOOD',
  'KFC': 'FOOD', 'PIZZA HUT': 'FOOD', 'STARBUCKS': 'FOOD', 'BURGER KING': 'FOOD',
  'SUBWAY': 'FOOD', 'DUNKIN': 'FOOD', 'HALDIRAMS': 'FOOD', 'BARBEQUE NATION': 'FOOD',

  // Groceries
  'BIGBASKET': 'GROCERIES', 'BLINKIT': 'GROCERIES', 'ZEPTO': 'GROCERIES',
  'DMART': 'GROCERIES', 'RELIANCE FRESH': 'GROCERIES', 'MORE RETAIL': 'GROCERIES',
  'JIOMART': 'GROCERIES', 'GROFERS': 'GROCERIES', 'INSTAMART': 'GROCERIES',

  // Transportation
  'UBER': 'TRANSPORTATION', 'OLA': 'TRANSPORTATION', 'RAPIDO': 'TRANSPORTATION',
  'IRCTC': 'TRANSPORTATION', 'MAKEMYTRIP': 'TRANSPORTATION', 'REDBUS': 'TRANSPORTATION',
  'METRO': 'TRANSPORTATION', 'PETROL': 'TRANSPORTATION', 'DIESEL': 'TRANSPORTATION',
  'HP PETROL': 'TRANSPORTATION', 'INDIAN OIL': 'TRANSPORTATION', 'BPCL': 'TRANSPORTATION',

  // Utilities
  'ELECTRICITY': 'UTILITIES', 'WATER BILL': 'UTILITIES', 'GAS BILL': 'UTILITIES',
  'AIRTEL': 'UTILITIES', 'JIO': 'UTILITIES', 'VI': 'UTILITIES', 'BSNL': 'UTILITIES',
  'TATA POWER': 'UTILITIES', 'ADANI GAS': 'UTILITIES', 'MAHANAGAR GAS': 'UTILITIES',

  // Entertainment
  'NETFLIX': 'ENTERTAINMENT', 'AMAZON PRIME': 'ENTERTAINMENT', 'HOTSTAR': 'ENTERTAINMENT',
  'SPOTIFY': 'ENTERTAINMENT', 'YOUTUBE': 'ENTERTAINMENT', 'BOOKMYSHOW': 'ENTERTAINMENT',
  'PVR': 'ENTERTAINMENT', 'INOX': 'ENTERTAINMENT', 'DISNEY': 'ENTERTAINMENT',

  // Shopping
  'AMAZON': 'SHOPPING', 'FLIPKART': 'SHOPPING', 'MYNTRA': 'SHOPPING',
  'AJIO': 'SHOPPING', 'NYKAA': 'SHOPPING', 'MEESHO': 'SHOPPING',
  'CROMA': 'SHOPPING', 'RELIANCE DIGITAL': 'SHOPPING',

  // Health
  'APOLLO': 'HEALTH', 'PHARMEASY': 'HEALTH', '1MG': 'HEALTH',
  'NETMEDS': 'HEALTH', 'PRACTO': 'HEALTH', 'MEDPLUS': 'HEALTH',

  // Education
  'UDEMY': 'EDUCATION', 'COURSERA': 'EDUCATION', 'UNACADEMY': 'EDUCATION',
  'BYJUS': 'EDUCATION', 'SCHOOL': 'EDUCATION', 'COLLEGE': 'EDUCATION',

  // ATM
  'ATM': 'ATM', 'CASH WITHDRAWAL': 'ATM',

  // Transfer keywords
  'NEFT': 'TRANSFER', 'IMPS': 'TRANSFER', 'RTGS': 'TRANSFER', 'UPI': 'TRANSFER',
};

/**
 * Resolve a merchant name to a category.
 * Priority: 1) Hardcoded map  2) SQLite cache  3) SLM inference (cached after)
 */
export async function resolveCategory(merchant: string): Promise<TransactionCategory> {
  const normalized = merchant.toUpperCase().trim();

  // 1. Check hardcoded map (substring match)
  for (const [key, category] of Object.entries(KNOWN_MERCHANTS)) {
    if (normalized.includes(key)) return category;
  }

  // 2. Check SQLite cache
  const cached = getCachedMerchantCategory(merchant);
  if (cached) return cached;

  // 3. Fall back to SLM
  if (!slmEngine.isModelAvailable()) return 'OTHER';

  try {
    await slmEngine.acquire();
    const prompt = buildCategorizationPrompt(merchant);
    const rawOutput = await slmEngine.complete(prompt);
    const category = rawOutput.trim().toUpperCase() as TransactionCategory;

    if (VALID_CATEGORIES.includes(category)) {
      // Cache for next time
      cacheMerchantCategory(merchant, category);
      return category;
    }

    return 'OTHER';
  } catch (error) {
    console.warn('[CategoryResolver] SLM categorization failed:', error);
    return 'OTHER';
  } finally {
    slmEngine.release();
  }
}
