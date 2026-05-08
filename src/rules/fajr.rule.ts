import { Dayjs } from 'dayjs';
import { ceilingToNearest5, floorToNearest5, formatHHmm } from './time-utils';

/**
 * Fajr Iqama Calculation (FR3) - Dynamic with Override Support
 *
 * Priority order:
 *   P0 (safety):    Safe_Sunrise_Limit = Sunrise - 60 min  — hard ceiling, never exceeded
 *   P1 (override):  Admin overrides handled by the caller before invoking this function
 *   P2 (logic):     Base_Target = min(Max_Delay, Safe_Sunrise_Limit)
 *                   Max_Delay = Azan + 75 min
 *                   if Base_Target < Azan + 10 min: Base_Target = Azan + 10 min
 *                   (floor clamp is re-capped to Safe_Sunrise_Limit so P0 always wins)
 *   P3 (rounding):  Iqama = CeilingToNearest5(Base_Target)
 *                   (result is re-capped to Safe_Sunrise_Limit so rounding never breaches P0)
 *
 * ADMIN OVERRIDES:
 * For periods where you want fixed times (e.g., Ramadan, summer months),
 * use the admin override API to set specific Fajr Iqama times.
 * Overrides take precedence over this calculation.
 */
export function computeFajrIqama(fajrAzan: Dayjs, sunrise: Dayjs): string {
  // Strip seconds for clean minute-based calculations
  const fajrAzanClean = fajrAzan.startOf('minute');
  const sunriseClean = sunrise.startOf('minute');

  // P0: hard safety ceiling — Iqama must never reach within 60 min of sunrise
  const safeSunriseLimit = sunriseClean.subtract(60, 'minute');

  // P2: core calculation
  const maxDelay = fajrAzanClean.add(75, 'minute');

  let baseTarget = maxDelay.isBefore(safeSunriseLimit)
    ? maxDelay
    : safeSunriseLimit;

  // P2: floor clamp — at least 10 min after Azan, but never past the P0 ceiling
  const floorClamp = fajrAzanClean.add(10, 'minute');
  if (baseTarget.isBefore(floorClamp)) {
    baseTarget = floorClamp.isBefore(safeSunriseLimit)
      ? floorClamp
      : safeSunriseLimit; // P0 wins over floor clamp
  }

  // P3: round up to nearest 5 min.
  // If rounding up would breach the P0 ceiling, floor down to nearest 5 instead
  // so the result is always a clean 5-min boundary while still respecting P0.
  const rounded = ceilingToNearest5(baseTarget);
  const result = rounded.isAfter(safeSunriseLimit)
    ? floorToNearest5(safeSunriseLimit)
    : rounded;

  return formatHHmm(result);
}

export interface WeeklyFajrEntry {
  fajrAzan: Dayjs;
  sunrise: Dayjs;
}

/**
 * Weekly Fajr Iqama Calculation (FR3-W)
 *
 * Analyses the Fajr Azan times for a Friday-to-Thursday week and returns a
 * single fixed Iqama time that is safe for every day in that window.
 *
 * Strategy:
 *   1. Apply the per-day FR3 formula to each day → gives the ideal per-day time.
 *   2. Take the LATEST result across the week (most conservative for the congregation).
 *   3. P0 re-cap: the weekly fixed time must be <= every day's safeSunriseLimit
 *      (Sunrise - 60 min). Find the minimum safeLimit string across all days and
 *      cap the weekly result against it.
 *      If the cap lands on a non-5-min boundary, floor down to nearest 5 so the
 *      published weekly time is always a clean boundary while still respecting P0.
 *
 * @param weekDays - Array of { fajrAzan, sunrise } for each day in the week
 *                   (Friday through Thursday, 7 entries).
 * @returns HH:mm string — the fixed Fajr Iqama for the whole week.
 */
export function computeWeeklyFajrIqama(weekDays: WeeklyFajrEntry[]): string {
  if (weekDays.length === 0) {
    throw new Error('weekDays must contain at least one entry');
  }

  // Step 1 & 2: latest per-day iqama across the week
  const latest = weekDays
    .map(({ fajrAzan, sunrise }) => computeFajrIqama(fajrAzan, sunrise))
    .reduce((acc, current) => (current > acc ? current : acc));

  // Step 3 (P0): find the minimum safeSunriseLimit string across all days.
  // HH:mm string comparison is safe here (zero-padded 24-hour format).
  // This is the hard ceiling the weekly fixed time must never exceed.
  const minSafeLimitStr = weekDays
    .map(({ sunrise }) =>
      formatHHmm(sunrise.startOf('minute').subtract(60, 'minute')),
    )
    .reduce((min, current) => (current < min ? current : min));

  if (latest <= minSafeLimitStr) {
    // Latest per-day is already within P0 for every day — use it as-is.
    return latest;
  }

  // Weekly result exceeds P0 for at least one day.
  // Floor down to nearest 5 within the minimum safe limit so the result is
  // always a clean 5-min boundary while still respecting P0 for every day.
  const [h, m] = minSafeLimitStr.split(':').map(Number);
  const floored = Math.floor(m / 5) * 5;
  return `${String(h).padStart(2, '0')}:${String(floored).padStart(2, '0')}`;
}
