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
 *
 * When Friday Block is active, fajrAzan and sunrise are from the preceding Friday.
 */
export function computeFajrIqama(fajrAzan: Dayjs, sunrise: Dayjs): string {
  const maxDelay = fajrAzan.add(75, 'minute');
  const safeSunriseLimit = sunrise.subtract(45, 'minute');

  let baseTarget = maxDelay.isBefore(safeSunriseLimit)
    ? maxDelay
    : safeSunriseLimit;

  const floorClamp = fajrAzan.add(10, 'minute');
  if (baseTarget.isBefore(floorClamp)) {
    baseTarget = floorClamp;
  }

  return formatHHmm(ceilingToNearest5(baseTarget));
}
