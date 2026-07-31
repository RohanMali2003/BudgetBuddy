/**
 * Normalize various Indian bank date formats to ISO 8601.
 * Handles: 30-Jul-26, 30-JUL-2026, 30Jul26, 2026-07-30, 30/07/2026, 30/07/26
 */

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

export function normalizeDateToISO(dateStr: string): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  // Format: 2026-07-30 (already ISO)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch && isoMatch[1] && isoMatch[2] && isoMatch[3]) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00.000Z`;
  }

  // Format: 30-Jul-26 or 30-JUL-2026
  const dmy1 = trimmed.match(/^(\d{1,2})[-\/]([A-Za-z]{3})[-\/](\d{2,4})$/);
  if (dmy1 && dmy1[1] && dmy1[2] && dmy1[3]) {
    const day = dmy1[1].padStart(2, '0');
    const mon = MONTHS[dmy1[2].toLowerCase()];
    if (!mon) return null;
    let year = dmy1[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${mon}-${day}T00:00:00.000Z`;
  }

  // Format: 30Jul26 (no separators)
  const dmy2 = trimmed.match(/^(\d{1,2})([A-Za-z]{3})(\d{2,4})$/);
  if (dmy2 && dmy2[1] && dmy2[2] && dmy2[3]) {
    const day = dmy2[1].padStart(2, '0');
    const mon = MONTHS[dmy2[2].toLowerCase()];
    if (!mon) return null;
    let year = dmy2[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${mon}-${day}T00:00:00.000Z`;
  }

  // Format: 30/07/2026 or 30/07/26
  const dmy3 = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
  if (dmy3 && dmy3[1] && dmy3[2] && dmy3[3]) {
    const day = dmy3[1].padStart(2, '0');
    const mon = dmy3[2].padStart(2, '0');
    let year = dmy3[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${mon}-${day}T00:00:00.000Z`;
  }

  return null;
}
