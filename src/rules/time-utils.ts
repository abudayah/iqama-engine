import { Dayjs } from 'dayjs';

/**
 * Round minutes up to the nearest 5-minute boundary.
 * Sub-minute seconds are bumped to the next minute before rounding.
 */
export function ceilingToNearest5(dayjsObj: Dayjs): Dayjs {
  const m = dayjsObj.minute();
  const s = dayjsObj.second();
  const totalMinutes = m + (s > 0 ? 1 : 0); // sub-minute → next minute
  const rounded = Math.ceil(totalMinutes / 5) * 5;
  return dayjsObj.startOf('minute').minute(rounded).second(0);
}

/**
 * Round minutes up to the nearest 30-minute boundary (:00 or :30).
 * Sub-minute seconds are bumped to the next minute before rounding.
 */
export function ceilingToNearest30(dayjsObj: Dayjs): Dayjs {
  const m = dayjsObj.minute();
  const s = dayjsObj.second();
  const totalMinutes = m + (s > 0 ? 1 : 0); // sub-minute → next minute
  const rounded = Math.ceil(totalMinutes / 30) * 30;
  return dayjsObj.startOf('minute').minute(rounded).second(0);
}

/**
 * Format a dayjs object to HH:mm.
 * The timezone conversion is already done before calling this function
 * (the dayjs object is already in the correct timezone from the AdhanAdapter).
 */
export function formatHHmm(dayjsObj: Dayjs): string {
  return dayjsObj.format('HH:mm');
}
