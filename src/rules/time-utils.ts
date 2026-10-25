import dayjsBase, { Dayjs } from 'dayjs';

/**
 * dayjs-hijri overwrites the .set() method and drops $x.$timezone metadata,
 * so any setter call (.second(), .minute(), .hour(), .startOf()) on a
 * timezone-aware dayjs object will silently break timezone-aware formatting.
 *
 * Use this helper instead of bare .second(n) / .minute(n) / .hour(n) setters
 * when the object was created via dayjs.tz() and must continue formatting in
 * the correct timezone after the setter.
 *
 * It works by reading the timezone name from the source object, formatting the
 * date part (YYYY-MM-DD) in that timezone, then constructing a new dayjs.tz()
 * object from a full datetime string — bypassing .set() entirely.
 */
export function setTimeInTz(
  dayjsObj: Dayjs,
  hours: number,
  minutes: number,
  seconds = 0,
): Dayjs {
  const tz: string | undefined = (
    dayjsObj as Dayjs & { $x?: { $timezone?: string } }
  ).$x?.$timezone;
  if (!tz) {
    // No tz context: fall back to plain setters (best effort)
    return dayjsObj
      .set('hour', hours)
      .set('minute', minutes)
      .set('second', seconds);
  }
  const dateStr = dayjsObj.tz(tz).format('YYYY-MM-DD');
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return dayjsBase.tz(`${dateStr} ${hh}:${mm}:${ss}`, tz);
}

/**
 * Strip sub-minute precision (seconds + milliseconds) from a dayjs object.
 *
 * Uses subtract() rather than the .second(0)/.millisecond(0) setters because
 * those setters can strip the dayjs-timezone plugin's $x.$timezone context
 * when dayjs-hijri is loaded (the hijri plugin overwrites .set() and drops
 * the $x metadata). subtract()/add() preserve the timezone.
 *
 * If the incoming object already has a stripped tz context (e.g. it was
 * created via dayjs.tz() then had .second() called on it before reaching
 * here), we cannot recover the tz name — callers must use tzSafeSet() to
 * avoid that situation in the first place.
 */
function stripSubMinute(dayjsObj: Dayjs): Dayjs {
  return dayjsObj
    .subtract(dayjsObj.second(), 'second')
    .subtract(dayjsObj.millisecond(), 'millisecond');
}

/**
 * Round minutes up to the nearest 5-minute boundary.
 * Sub-minute seconds are bumped to the next minute before rounding.
 *
 * Uses add() instead of .minute(n) so timezone context is preserved when
 * the rounding crosses an hour boundary.
 */
export function ceilingToNearest5(dayjsObj: Dayjs): Dayjs {
  const base = stripSubMinute(dayjsObj);
  // Bump sub-minute seconds to the next minute
  const bumped =
    dayjsObj.second() > 0 || dayjsObj.millisecond() > 0
      ? base.add(1, 'minute')
      : base;
  const m = bumped.minute();
  const remainder = m % 5;
  if (remainder === 0) return bumped;
  return bumped.add(5 - remainder, 'minute');
}

/**
 * Round minutes DOWN to the nearest 5-minute boundary.
 * Used when rounding up would breach a hard ceiling (e.g. P0 safeSunriseLimit).
 */
export function floorToNearest5(dayjsObj: Dayjs): Dayjs {
  const base = stripSubMinute(dayjsObj);
  const m = base.minute();
  const remainder = m % 5;
  if (remainder === 0) return base;
  return base.subtract(remainder, 'minute');
}

/**
 * Round minutes up to the nearest 30-minute boundary (:00 or :30).
 * Sub-minute seconds are bumped to the next minute before rounding.
 */
export function ceilingToNearest30(dayjsObj: Dayjs): Dayjs {
  const base = stripSubMinute(dayjsObj);
  const bumped =
    dayjsObj.second() > 0 || dayjsObj.millisecond() > 0
      ? base.add(1, 'minute')
      : base;
  const m = bumped.minute();
  const remainder = m % 30;
  if (remainder === 0) return bumped;
  return bumped.add(30 - remainder, 'minute');
}

/**
 * Format a dayjs object to HH:mm.
 * The timezone conversion is already done before calling this function
 * (the dayjs object is already in the correct timezone from the AdhanAdapter).
 */
export function formatHHmm(dayjsObj: Dayjs): string {
  return dayjsObj.format('HH:mm');
}
