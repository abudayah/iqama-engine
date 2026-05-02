import { Dayjs } from 'dayjs';
import { ceilingToNearest30, formatHHmm } from './time-utils';

/**
 * Asr Iqama Calculation (FR4)
 *
 * Iqama = CeilingToNearest30(Azan + 15 min)
 */
export function computeAsrIqama(asrAzan: Dayjs): string {
  // Strip seconds for clean minute-based calculations
  const asrAzanClean = asrAzan.startOf('minute');
  return formatHHmm(ceilingToNearest30(asrAzanClean.add(15, 'minute')));
}
