import { Dayjs } from 'dayjs';
import { ceilingToNearest30, formatHHmm } from './time-utils';

/**
 * Asr Iqama Calculation (FR4)
 *
 * Iqama = CeilingToNearest30(Azan + 15 min)
 */
export function computeAsrIqama(asrAzan: Dayjs): string {
  return formatHHmm(ceilingToNearest30(asrAzan.add(15, 'minute')));
}
