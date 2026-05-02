import { Dayjs } from 'dayjs';
import { ceilingToNearest5, formatHHmm } from './time-utils';

/**
 * Isha Iqama Calculation (FR4)
 *
 * if Azan > 22:30:  gap = 5
 * if Azan < 20:00:  gap = 15
 * else:             gap = 15 - 10 * (minutesSince20:00) / 150  (linear interpolation)
 * Iqama = CeilingToNearest5(Azan + gap)
 *
 * When Friday Block is active, Azan is from the preceding Friday's Isha time.
 */
export function computeIshaIqama(ishaAzan: Dayjs): string {
  const hour = ishaAzan.hour();
  const minute = ishaAzan.minute();
  const totalMinutes = hour * 60 + minute;

  const boundary2230 = 22 * 60 + 30; // 1350
  const boundary2000 = 20 * 60; // 1200

  let gap: number;
  if (totalMinutes > boundary2230) {
    gap = 5;
  } else if (totalMinutes < boundary2000) {
    gap = 15;
  } else {
    const minutesSince2000 = totalMinutes - boundary2000;
    gap = 15 - 10 * (minutesSince2000 / 150);
  }

  return formatHHmm(ceilingToNearest5(ishaAzan.add(gap, 'minute')));
}
