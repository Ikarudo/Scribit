/**
 * Parse a YYYY-MM-DD date string as local date (avoids UTC/timezone shift).
 * Using new Date("2025-02-10") parses as UTC midnight, which can become
 * the previous day in western timezones.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date();
  }
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return new Date();
  }
  const [year, month, day] = parts.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return new Date();
  }
  return new Date(year, month - 1, day);
}
