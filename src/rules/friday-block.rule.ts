import dayjs from '../dayjs';

/**
 * FR5 — Friday Block Shift
 *
 * Returns the date itself if it is a Friday, otherwise returns the most recent
 * preceding Friday's date. The returned date is in YYYY-MM-DD format.
 *
 * dayjs day-of-week: 0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday
 */
export function getPrecedingFridayDate(date: string, tz: string): string {
  const d = dayjs.tz(date, tz);
  const dayOfWeek = d.day(); // 0=Sun, 5=Fri

  // Formula: (dayOfWeek + 7 - 5) % 7 gives days since the most recent Friday
  // dayOfWeek 5 (Fri) → 0, 6 (Sat) → 1, 0 (Sun) → 2, 1 (Mon) → 3, etc.
  const daysSinceFriday = (dayOfWeek + 7 - 5) % 7;

  return d.subtract(daysSinceFriday, 'day').format('YYYY-MM-DD');
}
