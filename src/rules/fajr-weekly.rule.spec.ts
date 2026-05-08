import {
  computeFajrIqama,
  computeWeeklyFajrIqama,
  WeeklyFajrEntry,
} from './fajr.rule';
import dayjs from '../dayjs';

const TZ = 'America/Vancouver';

/** Helper: build a WeeklyFajrEntry for a given date string and times. */
function entry(
  date: string,
  fajrTime: string,
  sunriseTime: string,
): WeeklyFajrEntry {
  return {
    fajrAzan: dayjs.tz(`${date} ${fajrTime}`, TZ),
    sunrise: dayjs.tz(`${date} ${sunriseTime}`, TZ),
  };
}

describe('computeWeeklyFajrIqama (FR3-W)', () => {
  it('returns the latest per-day iqama across the week', () => {
    // Winter week: late sunrise, Fajr around 06:30
    // Day 1 (Fri): Fajr 06:30, Sunrise 09:00 → per-day iqama = 07:45
    // Day 2 (Sat): Fajr 06:32, Sunrise 09:01 → per-day iqama = 07:50
    // Day 3 (Sun): Fajr 06:28, Sunrise 08:58 → per-day iqama = 07:45
    const week: WeeklyFajrEntry[] = [
      entry('2025-12-12', '06:30', '09:00'), // Fri
      entry('2025-12-13', '06:32', '09:01'), // Sat — latest iqama
      entry('2025-12-14', '06:28', '08:58'), // Sun
      entry('2025-12-15', '06:29', '08:59'), // Mon
      entry('2025-12-16', '06:31', '09:00'), // Tue
      entry('2025-12-17', '06:33', '09:02'), // Wed — also 07:50 but not later
      entry('2025-12-18', '06:27', '08:57'), // Thu
    ];

    const result = computeWeeklyFajrIqama(week);

    // Day 2 and Day 6 both produce 07:50; weekly result must be 07:50
    expect(result).toBe('07:50');
  });

  it('returns the single entry when the week has one day', () => {
    const week: WeeklyFajrEntry[] = [entry('2025-12-15', '06:30', '09:00')];
    // per-day: max_delay=07:45, safe_limit=08:00 → 07:45
    expect(computeWeeklyFajrIqama(week)).toBe('07:45');
  });

  it('respects the sunrise safety buffer across the week', () => {
    // Summer week: early sunrise, Fajr around 03:15
    // The safe limit (sunrise - 60 min) is the binding constraint
    const week: WeeklyFajrEntry[] = [
      entry('2025-06-20', '03:14', '05:03'), // Fri  safe=04:03, max=04:29 → 04:05
      entry('2025-06-21', '03:16', '05:05'), // Sat  safe=04:05, max=04:31 → 04:05
      entry('2025-06-22', '03:17', '05:05'), // Sun  safe=04:05, max=04:32 → 04:05
      entry('2025-06-23', '03:18', '05:06'), // Mon  safe=04:06, max=04:33 → 04:10
      entry('2025-06-24', '03:19', '05:07'), // Tue  safe=04:07, max=04:34 → 04:10
      entry('2025-06-25', '03:20', '05:08'), // Wed  safe=04:08, max=04:35 → 04:10
      entry('2025-06-26', '03:21', '05:09'), // Thu  safe=04:09, max=04:36 → 04:10
    ];

    const result = computeWeeklyFajrIqama(week);

    // Latest per-day iqama is 04:10 (Mon–Thu)
    expect(result).toBe('04:10');
  });

  it('throws when given an empty array', () => {
    expect(() => computeWeeklyFajrIqama([])).toThrow();
  });

  it('all days in the week share the same fixed iqama time', () => {
    // Property: every day's per-day iqama must be <= the weekly result
    const week: WeeklyFajrEntry[] = [
      entry('2025-12-12', '06:30', '09:00'),
      entry('2025-12-13', '06:32', '09:01'),
      entry('2025-12-14', '06:28', '08:58'),
      entry('2025-12-15', '06:29', '08:59'),
      entry('2025-12-16', '06:31', '09:00'),
      entry('2025-12-17', '06:33', '09:02'),
      entry('2025-12-18', '06:27', '08:57'),
    ];

    const weeklyIqama = computeWeeklyFajrIqama(week);

    for (const { fajrAzan, sunrise } of week) {
      const perDay = computeFajrIqama(fajrAzan, sunrise);
      expect(weeklyIqama >= perDay).toBe(true);
    }
  });
});
