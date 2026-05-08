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
