import { Dayjs } from 'dayjs';
import { ceilingToNearest5, formatHHmm } from './time-utils';

/**
 * Maghrib Iqama Calculation (FR1)
 *
 * Iqama = CeilingToNearest5(Azan + 5 minutes)
 * No Friday Block applied. Uses the date's own Azan.
 */
export function computeMaghribIqama(maghribAzan: Dayjs): string {
  // Strip seconds for clean minute-based calculations
  const maghribAzanClean = maghribAzan.startOf('minute');
  return formatHHmm(ceilingToNearest5(maghribAzanClean.add(5, 'minute')));
}
