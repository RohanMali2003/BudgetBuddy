/**
 * Parse a rupee string like "1,234.56" or "1234" into PAISE (integer).
 * This is the ONLY place float→int conversion happens for currency.
 * Returns null if parsing fails.
 */
export function parseToPaise(amountStr: string): number | null {
  const cleaned = amountStr.replace(/[,\s₹Rs.INR]/gi, '').trim();
  // After removing "Rs." and ".", we might have eaten a decimal dot.
  // Re-extract from original with a targeted regex:
  const match = amountStr.match(/[\d,]+\.?\d*/);
  if (!match) return null;
  const numStr = match[0].replace(/,/g, '');
  const parsed = parseFloat(numStr);
  if (isNaN(parsed)) return null;
  return Math.round(parsed * 100);
}

/**
 * Format paise integer back to display string: "₹1,234.56"
 */
export function formatCurrency(paise: number): string {
  const rupees = paise / 100;
  return '₹' + rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
