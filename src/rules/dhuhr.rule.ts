import dayjs from '../dayjs';

/**
 * Dhuhr Iqama Calculation (FR2)
 *
 * From `cutover` (IQAMA_RULES_CUTOVER, default 2026-11-13) on: fixed 13:45
 * year-round. B.C. stopped clock changes after 2026-03-08 (UTC-7 all year),
 * so there is no DST branch.
 *
 * Before `cutover`: the historical rule is kept so past dates do not change.
 * 13:45 if DST is active (UTC offset of the date > offset of Jan 1 of that
 * year), otherwise 12:45.
 *
 * Friday (Jumu'ah) rule: The iqama column shows the Khutbah start time,
 * which is 5 minutes before the actual prayer → Friday 13:40 (12:40 in the
 * historical standard-time case).
 */
export function computeDhuhrIqama(
  date: string,
  tz: string,
  cutover: string,
): string {
  const d = dayjs.tz(date, tz);
  const baseTime = date < cutover && !isDstActive(date, tz) ? '12:45' : '13:45';

  // On Fridays, subtract 5 minutes — iqama shows Khutbah start time
  if (d.day() === 5) {
    const [hours, minutes] = baseTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes - 5;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  return baseTime;
}

/**
 * Whether the date's UTC offset exceeds Jan 1's. Drives the `is_dst` schedule
 * field and, for dates before the cutover only, the historical Dhuhr time.
 */
export function isDstActive(date: string, tz: string): boolean {
  const d = dayjs.tz(date, tz);
  const jan1 = d.startOf('year');
  return d.utcOffset() > jan1.utcOffset();
}
