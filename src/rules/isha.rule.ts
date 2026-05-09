import { Dayjs } from 'dayjs';
import { ceilingToNearest5, floorToNearest5, formatHHmm } from './time-utils';

/**
 * Isha Iqama Calculation (FR4)
 *
 * Gap calculation (based on Azan time):
 *   if Azan > 22:00:  gap = 5
 *   if Azan < 20:00:  gap = 15
 *   else:             gap = 15 - 10 * (minutesSince20:00) / 120  (linear interpolation over 20:00→22:00)
 *
 * Rounding (P3):
 *   Prefer FloorToNearest5(Azan + gap) to bring the time earlier when Isha is late
 *   (convenience for the congregation in summer months).
 *   Fall back to CeilingToNearest5 only when flooring would leave less than 3 minutes
 *   after Azan (practical minimum for a very late summer Isha).
 */
export function computeIshaIqama(ishaAzan: Dayjs): string {
  // Strip seconds from Azan time for clean minute-based calculations
  const ishaAzanClean = ishaAzan.startOf('minute');

  const hour = ishaAzanClean.hour();
  const minute = ishaAzanClean.minute();
  const totalMinutes = hour * 60 + minute;

  const boundary2200 = 22 * 60; // 1320
  const boundary2000 = 20 * 60; // 1200

  let gap: number;
  if (totalMinutes > boundary2200) {
    gap = 5;
  } else if (totalMinutes < boundary2000) {
    gap = 15;
  } else {
    // Linear interpolation: 15 min at 20:00 → 5 min at 22:00 (120-minute window)
    const minutesSince2000 = totalMinutes - boundary2000;
    gap = 15 - 10 * (minutesSince2000 / 120);
  }

  const roundedGap = Math.round(gap);
  const target = ishaAzanClean.add(roundedGap, 'minute');

  // P3: prefer flooring to bring a late Isha time earlier (summer convenience).
  // Use a 3-minute minimum for the floor check — when Isha is already very late
  // (e.g. 23:17), the difference between 23:20 (+3m) and 23:25 (+8m) matters
  // more to the congregation than the strict 4-minute P0 boundary.
  // Fall back to CeilingToNearest5 only if even 3 minutes can't be maintained.
  const minIqama = ishaAzanClean.add(3, 'minute');
  const floored = floorToNearest5(target);
  const result = floored.isBefore(minIqama)
    ? ceilingToNearest5(target)
    : floored;

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

  // Compute the per-day iqama for each day and keep the latest.
  // Special handling: times after midnight (00:xx - 02:xx) are treated as
  // "later" than evening times (20:xx - 23:xx) since they occur on the next day.
  const iqamaTimes = weekDays.map((ishaAzan) => computeIshaIqama(ishaAzan));

  return iqamaTimes.reduce((latest, current) => {
    // Extract hours for comparison
    const latestHour = parseInt(latest.split(':')[0], 10);
    const currentHour = parseInt(current.split(':')[0], 10);

    // Times 00:xx-02:xx are post-midnight Isha (very late summer)
    // Times 20:xx-23:xx are evening Isha (normal range)
    const latestIsPostMidnight = latestHour >= 0 && latestHour <= 2;
    const currentIsPostMidnight = currentHour >= 0 && currentHour <= 2;

    // If one is post-midnight and the other isn't, post-midnight is later
    if (currentIsPostMidnight && !latestIsPostMidnight) {
      return current;
    }
    if (latestIsPostMidnight && !currentIsPostMidnight) {
      return latest;
    }

    // Both in same category (both post-midnight or both evening), use string comparison
    return current > latest ? current : latest;
  });
}
