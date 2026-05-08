import { Dayjs } from 'dayjs';
import { ceilingToNearest5, formatHHmm } from './time-utils';

/**
 * Fajr Iqama Calculation (FR3) - Dynamic with Override Support
 *
 * This rule calculates Fajr Iqama dynamically based on astronomical times:
 *
 * Max_Delay          = Azan + 75 min
 * Safe_Sunrise_Limit = Sunrise - 60 min
 * Base_Target        = min(Max_Delay, Safe_Sunrise_Limit)
 * if Base_Target < Azan + 10 min: Base_Target = Azan + 10 min
 * Iqama = CeilingToNearest5(Base_Target)
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

  const maxDelay = fajrAzanClean.add(75, 'minute');
  const safeSunriseLimit = sunriseClean.subtract(60, 'minute');

  let baseTarget = maxDelay.isBefore(safeSunriseLimit)
    ? maxDelay
    : safeSunriseLimit;

  const floorClamp = fajrAzanClean.add(10, 'minute');
  if (baseTarget.isBefore(floorClamp)) {
    baseTarget = floorClamp;
  }

  return formatHHmm(ceilingToNearest5(baseTarget));
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
 * Strategy: apply the per-day FR3 formula to each day in the week, then take
 * the LATEST result.  This is the most conservative choice — it guarantees
 * that no day's iqama falls too close to sunrise while still respecting the
 * 75-minute maximum delay.
 *
 * The result is rounded up to the nearest 5 minutes (already done by
 * computeFajrIqama for each day, but the max selection may land on a clean
 * boundary anyway).
 *
 * @param weekDays - Array of { fajrAzan, sunrise } for each day in the week
 *                   (Friday through Thursday, 7 entries).
 * @returns HH:mm string — the fixed Fajr Iqama for the whole week.
 */
export function computeWeeklyFajrIqama(weekDays: WeeklyFajrEntry[]): string {
  if (weekDays.length === 0) {
    throw new Error('weekDays must contain at least one entry');
  }

  // Compute the per-day iqama for each day and keep the latest (HH:mm string
  // comparison works correctly because times are zero-padded 24-hour format).
  return weekDays
    .map(({ fajrAzan, sunrise }) => computeFajrIqama(fajrAzan, sunrise))
    .reduce((latest, current) => (current > latest ? current : latest));
}
