import dayjs from '../dayjs';

/**
 * Dhuhr Iqama Calculation (FR2)
 *
 * Returns "13:45" if DST is active on the given date, "12:45" otherwise.
 * DST detection: UTC offset of the date > UTC offset of Jan 1 of the same year.
 *
 * Friday (Jumu'ah) rule: The iqama column shows the Khutbah start time,
 * which is 5 minutes before the actual prayer.
 * e.g. DST Friday → 13:40, Standard Time Friday → 12:40
 */
export function computeDhuhrIqama(date: string, tz: string): string {
  const d = dayjs.tz(date, tz);
  const jan1 = d.startOf('year');
  const isDst = d.utcOffset() > jan1.utcOffset();
  const baseTime = isDst ? '13:45' : '12:45';

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
 * Determine if DST is active for a given date and timezone.
 */
export function isDstActive(date: string, tz: string): boolean {
  const d = dayjs.tz(date, tz);
  const jan1 = d.startOf('year');
  return d.utcOffset() > jan1.utcOffset();
}
