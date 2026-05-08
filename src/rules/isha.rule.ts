import { Dayjs } from 'dayjs';
import { ceilingToNearest5, formatHHmm } from './time-utils';

/**
 * Isha Iqama Calculation (FR4)
 *
 * if Azan > 22:30:  gap = 5
 * if Azan < 20:00:  gap = 15
 * else:             gap = 15 - 10 * (minutesSince20:00) / 150  (linear interpolation)
 * Iqama = CeilingToNearest5(Azan + gap)
 */
export function computeIshaIqama(ishaAzan: Dayjs): string {
  // Strip seconds from Azan time for clean minute-based calculations
  const ishaAzanClean = ishaAzan.startOf('minute');

  const hour = ishaAzanClean.hour();
  const minute = ishaAzanClean.minute();
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

  const roundedGap = Math.round(gap);
  const result = ceilingToNearest5(ishaAzanClean.add(roundedGap, 'minute'));

  return formatHHmm(result);
}

/**
 * Weekly Isha Iqama Calculation (FR4-W)
 *
 * Analyses the Isha Azan times for a Friday-to-Thursday week and returns a
 * single fixed Iqama time that is practical for every day in that window.
 *
 * Strategy: apply the per-day FR4 formula to each day in the week, then take
 * the LATEST result.  This is the most conservative choice — it guarantees
 * that every day has an adequate gap between Azan and Iqama while avoiding
 * unreasonably late times.
 *
 * The result is rounded up to the nearest 5 minutes (already done by
 * computeIshaIqama for each day, but the max selection may land on a clean
 * boundary anyway).
 *
 * @param weekDays - Array of Isha Azan times for each day in the week
 *                   (Friday through Thursday, 7 entries).
 * @returns HH:mm string — the fixed Isha Iqama for the whole week.
 */
export function computeWeeklyIshaIqama(weekDays: Dayjs[]): string {
  if (weekDays.length === 0) {
    throw new Error('weekDays must contain at least one entry');
  }

  // Compute the per-day iqama for each day and keep the latest (HH:mm string
  // comparison works correctly because times are zero-padded 24-hour format).
  return weekDays
    .map((ishaAzan) => computeIshaIqama(ishaAzan))
    .reduce((latest, current) => (current > latest ? current : latest));
}
