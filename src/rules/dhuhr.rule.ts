import dayjs from '../dayjs';

/**
 * Dhuhr Iqama Calculation (FR2)
 *
 * Returns "13:45" if DST is active on the given date, "12:45" otherwise.
 * DST detection: UTC offset of the date > UTC offset of Jan 1 of the same year.
 * No Friday Block applied. Ignores raw Azan.
 */
export function computeDhuhrIqama(date: string, tz: string): string {
  const d = dayjs.tz(date, tz);
  const jan1 = d.startOf('year');
  const isDst = d.utcOffset() > jan1.utcOffset();
  return isDst ? '13:45' : '12:45';
}

/**
 * Determine if DST is active for a given date and timezone.
 */
export function isDstActive(date: string, tz: string): boolean {
  const d = dayjs.tz(date, tz);
  const jan1 = d.startOf('year');
  return d.utcOffset() > jan1.utcOffset();
}
