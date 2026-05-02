import { Dayjs } from 'dayjs';

/**
 * Asr Iqama Calculation (FR4) - Simplified Static Seasonal Times
 *
 * Uses fixed seasonal times for predictability and ease of communication:
 * - Spring/Summer (Mar 15 - Sep 15): 6:00 PM
 * - Fall (Sep 16 - Nov 15):          5:00 PM
 * - Early Winter (Nov 16 - Jan 15):  3:00 PM
 * - Late Winter (Jan 16 - Mar 14):   4:00 PM
 *
 * This reduces changes from 13 times/year to 4 times/year (seasonal).
 * Admin can use overrides for special adjustments if needed.
 */
export function computeAsrIqama(asrAzan: Dayjs): string {
  const month = asrAzan.month() + 1; // dayjs months are 0-indexed
  const day = asrAzan.date();

  // Spring/Summer: March 15 - September 15
  if (
    (month === 3 && day >= 15) ||
    (month >= 4 && month <= 8) ||
    (month === 9 && day <= 15)
  ) {
    return '18:00'; // 6:00 PM
  }

  // Fall: September 16 - November 15
  if (
    (month === 9 && day >= 16) ||
    month === 10 ||
    (month === 11 && day <= 15)
  ) {
    return '17:00'; // 5:00 PM
  }

  // Early Winter: November 16 - January 15
  if (
    (month === 11 && day >= 16) ||
    month === 12 ||
    (month === 1 && day <= 15)
  ) {
    return '15:00'; // 3:00 PM
  }

  // Late Winter: January 16 - March 14
  return '16:00'; // 4:00 PM
}
