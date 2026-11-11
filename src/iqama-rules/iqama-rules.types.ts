/**
 * Iqama rule model (Phase 1).
 *
 * Fixed pipeline per prayer:
 *   base -> limits -> rounding -> weekday adjust -> weekly lock
 *        -> admin override -> hard guardrails (constants in iqama-guardrail.ts)
 * Guardrails are NOT part of the rule model and have no admin setting.
 */

export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export const PRAYER_NAMES: readonly PrayerName[] = [
  'fajr',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
];

/**
 * Prayers with a weekly lock: Maghrib never. Their rules may only change on
 * a Friday (validator error). For Dhuhr/Asr this affects effective dates only,
 * not how the day's time is computed (see PrayerRule.weeklyLock).
 */
export const LOCKABLE_PRAYERS: readonly PrayerName[] = [
  'fajr',
  'dhuhr',
  'asr',
  'isha',
];

export type Weekday = 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
export const WEEKDAYS: readonly Weekday[] = [
  'SUN',
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
];

/** Iqama = Azan + minutes. */
export interface OffsetBase {
  type: 'OFFSET';
  minutes: number;
}

/** Iqama = a fixed clock time, HH:mm. */
export interface FixedTimeBase {
  type: 'FIXED_TIME';
  time: string;
}

/**
 * Gap after Azan scales linearly with the Azan clock time between points.
 * Outside the first/last point the gap is held flat. Gap is rounded to a
 * whole minute.
 */
export interface ScaledGapBase {
  type: 'SCALED_GAP';
  points: { azan: string; gapMinutes: number }[];
}

/** A segment starts on a calendar date or on the first Friday of a month. */
export type SegmentStart =
  | { kind: 'DATE'; month: number; day: number }
  | { kind: 'FIRST_FRIDAY'; month: number };

/**
 * Yearly-repeating fixed times. A segment holds until the next segment's
 * start; the last segment of the year wraps over New Year.
 */
export interface SeasonalBase {
  type: 'SEASONAL';
  segments: { start: SegmentStart; time: string }[];
}

export type RuleBase =
  | OffsetBase
  | FixedTimeBase
  | ScaledGapBase
  | SeasonalBase;

export interface Limits {
  /** Iqama is at least this many minutes after Azan. */
  minAfterAzan?: number;
  /** Fajr only: Iqama is at most (sunrise - N) minutes. */
  latestBeforeSunrise?: number;
}

export type RoundingMode = 'CEIL' | 'FLOOR' | 'NEAREST';
export interface Rounding {
  mode: RoundingMode;
  /** Minutes: 5, 10, 15, 30 or 60 (multiples of the 5-minute guardrail step). */
  step: number;
}

export interface PrayerRule {
  base: RuleBase;
  limits?: Limits;
  rounding?: Rounding;
  /** Minutes added on given weekdays, e.g. { FRI: -5 }. */
  weekdayAdjust?: Partial<Record<Weekday, number>>;
  /**
   * Computation switch: hold the result for the Friday->Thursday window
   * (latest per-day wins). Used by Fajr and Isha today; independent of the
   * Friday-start rule above.
   */
  weeklyLock?: boolean;
}

export type RuleSet = Record<PrayerName, PrayerRule>;

/** Inputs for one day, minutes since midnight in the masjid's local time. */
export interface DayCtx {
  date: string; // YYYY-MM-DD
  azanMin: number;
  sunriseMin?: number;
}

export interface ValidationIssue {
  path: string; // e.g. "fajr.limits.minAfterAzan"
  message: string;
}
export interface ValidationResult {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/** A stored rule version (mirrors the IqamaRuleVersion table). */
export interface IqamaRuleVersionRecord {
  id: number;
  effectiveFrom: string; // YYYY-MM-DD
  settings: string; // JSON (RuleSet)
  createdBy: string;
  reason?: string | null; // why the change was made (max 500 chars)
  createdAt: Date;
}

export type IqamaRulesMode = 'legacy' | 'shadow' | 'db';
