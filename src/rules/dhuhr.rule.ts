import dayjs from '../dayjs';

/**
 * Dhuhr Iqama Calculation (FR2)
 *
 * Fixed 13:45 year-round. B.C. stopped clock changes after 2026-03-08
 * (UTC-7 all year), so there is no DST branch.
 *
 * Friday (Jumu'ah) rule: The iqama column shows the Khutbah start time,
 * which is 5 minutes before the actual prayer → Friday 13:40.
 */
export function computeDhuhrIqama(date: string, tz: string): string {
  const d = dayjs.tz(date, tz);
  const baseTime = '13:45';

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
 * Display-only: whether the date's UTC offset exceeds Jan 1's (the `is_dst`
 * schedule field). Not used by any iqama rule.
 */
export function isDstActive(date: string, tz: string): boolean {
  const d = dayjs.tz(date, tz);
  const jan1 = d.startOf('year');
  return d.utcOffset() > jan1.utcOffset();
}
