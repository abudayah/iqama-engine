import { RuleSet } from './iqama-rules.types';

/** Seed rules: the five rules production has run since 2026-11-13 (the former hard-coded rules). */
export const DEFAULT_RULE_SET: RuleSet = {
  // Azan+75, at least Azan+10, ends at least 60 min before sunrise, round up to 5; held per week.
  fajr: {
    base: { type: 'OFFSET', minutes: 75 },
    limits: { minAfterAzan: 10, latestBeforeSunrise: 60 },
    rounding: { mode: 'CEIL', step: 5 },
    weeklyLock: true,
  },
  // 13:45 year-round; Friday shows the Khutbah start (-5).
  dhuhr: {
    base: { type: 'FIXED_TIME', time: '13:45' },
    weekdayAdjust: { FRI: -5 },
  },
  // Changes only on first Fridays (Mar 15 is a fixed date).
  asr: {
    base: {
      type: 'SEASONAL',
      segments: [
        { start: { kind: 'FIRST_FRIDAY', month: 1 }, time: '16:00' },
        { start: { kind: 'DATE', month: 3, day: 15 }, time: '18:00' },
        { start: { kind: 'FIRST_FRIDAY', month: 9 }, time: '17:00' },
        { start: { kind: 'FIRST_FRIDAY', month: 10 }, time: '16:30' },
        { start: { kind: 'FIRST_FRIDAY', month: 11 }, time: '15:45' },
      ],
    },
  },
  maghrib: {
    base: { type: 'OFFSET', minutes: 5 },
    rounding: { mode: 'CEIL', step: 5 },
  },
  // 15 min gap before 20:00, 5 min after 22:00, linear between; floor to 5.
  isha: {
    base: {
      type: 'SCALED_GAP',
      points: [
        { azan: '20:00', gapMinutes: 15 },
        { azan: '22:00', gapMinutes: 5 },
      ],
    },
    limits: { minAfterAzan: 3 },
    rounding: { mode: 'FLOOR', step: 5 },
    weeklyLock: true,
  },
};
