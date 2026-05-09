import { computeWeeklyIshaIqama, computeIshaIqama } from './isha.rule';
import dayjs from '../dayjs';

const TZ = 'America/Vancouver';

describe('computeWeeklyIshaIqama (FR4-W)', () => {
  it('returns the latest per-day iqama across the week', () => {
    // Winter week: Isha before 20:00 → gap = 15 min for all days
    // Day 1 (Fri): 18:15 + 15 = 18:30
    // Day 2 (Sat): 18:20 + 15 = 18:35
    // Day 3 (Sun): 18:10 + 15 = 18:25
    // …
    // Day 7 (Thu): 18:25 + 15 = 18:40  ← latest
    const week = [
      dayjs.tz('2025-12-12 18:15', TZ), // Fri
      dayjs.tz('2025-12-13 18:20', TZ), // Sat
      dayjs.tz('2025-12-14 18:10', TZ), // Sun
      dayjs.tz('2025-12-15 18:12', TZ), // Mon
      dayjs.tz('2025-12-16 18:18', TZ), // Tue
      dayjs.tz('2025-12-17 18:22', TZ), // Wed
      dayjs.tz('2025-12-18 18:25', TZ), // Thu — latest
    ];

    const result = computeWeeklyIshaIqama(week);

    // 18:25 + 15 = 18:40 (already on 5-min boundary)
    expect(result).toBe('18:40');
  });

  it('returns the single entry when the week has one day', () => {
    const week = [dayjs.tz('2025-12-15 18:15', TZ)];
    // 18:15 + 15 = 18:30
    expect(computeWeeklyIshaIqama(week)).toBe('18:30');
  });

  it('handles a summer week where Isha is after 22:30 (gap = 5 min)', () => {
    const week = [
      dayjs.tz('2025-06-20 23:45', TZ), // Fri  → 23:50
      dayjs.tz('2025-06-21 23:50', TZ), // Sat  → 23:55  ← latest
      dayjs.tz('2025-06-22 23:48', TZ), // Sun  → 23:55  (tie)
      dayjs.tz('2025-06-23 23:46', TZ), // Mon  → 23:55  (tie)
      dayjs.tz('2025-06-24 23:44', TZ), // Tue  → 23:50
      dayjs.tz('2025-06-25 23:42', TZ), // Wed  → 23:50
      dayjs.tz('2025-06-26 23:40', TZ), // Thu  → 23:45
    ];

    const result = computeWeeklyIshaIqama(week);

    expect(result).toBe('23:55');
  });

  it('handles a mixed week spanning the 20:00 boundary', () => {
    // Some days before 20:00 (gap=15), some in the interpolation zone
    const week = [
      dayjs.tz('2025-04-11 19:50', TZ), // Fri  < 20:00 → gap=15 → 20:05
      dayjs.tz('2025-04-12 20:00', TZ), // Sat  = 20:00 → gap=15 → 20:15
      dayjs.tz('2025-04-13 20:15', TZ), // Sun  interpolation → ~20:25
      dayjs.tz('2025-04-14 20:30', TZ), // Mon  interpolation → ~20:40
      dayjs.tz('2025-04-15 20:45', TZ), // Tue  interpolation → ~20:55
      dayjs.tz('2025-04-16 21:00', TZ), // Wed  interpolation → ~21:05
      dayjs.tz('2025-04-17 21:15', TZ), // Thu  interpolation → ~21:20
    ];

    const result = computeWeeklyIshaIqama(week);

    // Weekly result must be >= every per-day result
    for (const ishaAzan of week) {
      const perDay = computeIshaIqama(ishaAzan);
      expect(result >= perDay).toBe(true);
    }
  });

  it('throws when given an empty array', () => {
    expect(() => computeWeeklyIshaIqama([])).toThrow();
  });

  it('all days in the week share the same fixed iqama time (invariant)', () => {
    // Property: weekly iqama >= every per-day iqama
    const week = [
      dayjs.tz('2025-09-05 20:10', TZ),
      dayjs.tz('2025-09-06 20:15', TZ),
      dayjs.tz('2025-09-07 20:20', TZ),
      dayjs.tz('2025-09-08 20:25', TZ),
      dayjs.tz('2025-09-09 20:30', TZ),
      dayjs.tz('2025-09-10 20:35', TZ),
      dayjs.tz('2025-09-11 20:40', TZ),
    ];

    const weeklyIqama = computeWeeklyIshaIqama(week);

    for (const ishaAzan of week) {
      const perDay = computeIshaIqama(ishaAzan);
      expect(weeklyIqama >= perDay).toBe(true);
    }
  });
});
