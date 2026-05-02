import { Dayjs } from 'dayjs';
import { ceilingToNearest5, formatHHmm } from './time-utils';

/**
 * Fajr Iqama Calculation (FR3)
 *
 * Max_Delay          = Azan + 75 min
 * Safe_Sunrise_Limit = Sunrise - 45 min
 * Base_Target        = min(Max_Delay, Safe_Sunrise_Limit)
 * if Base_Target < Azan + 10 min: Base_Target = Azan + 10 min
 * Iqama = CeilingToNearest5(Base_Target)
 */
export function computeFajrIqama(fajrAzan: Dayjs, sunrise: Dayjs): string {
  // Strip seconds for clean minute-based calculations
  const fajrAzanClean = fajrAzan.startOf('minute');
  const sunriseClean = sunrise.startOf('minute');

  const maxDelay = fajrAzanClean.add(75, 'minute');
  const safeSunriseLimit = sunriseClean.subtract(45, 'minute');

  let baseTarget = maxDelay.isBefore(safeSunriseLimit)
    ? maxDelay
    : safeSunriseLimit;

  const floorClamp = fajrAzanClean.add(10, 'minute');
  if (baseTarget.isBefore(floorClamp)) {
    baseTarget = floorClamp;
  }

  return formatHHmm(ceilingToNearest5(baseTarget));
}
