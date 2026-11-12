import dayjs from '../dayjs';

/**
 * Display-only: whether the date's UTC offset exceeds Jan 1's. Drives the
 * `is_dst` schedule field. No Iqama rule depends on it (B.C. stopped clock
 * changes after 2026-03-08, so this is false from 2027 on).
 */
export function isDstActive(date: string, tz: string): boolean {
  const d = dayjs.tz(date, tz);
  const jan1 = d.startOf('year');
  return d.utcOffset() > jan1.utcOffset();
}
