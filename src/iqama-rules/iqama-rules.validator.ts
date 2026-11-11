import {
  FAJR_SUNRISE_BUFFER_MIN,
  MIN_IQAMA_GAP_MIN,
  toMin,
} from '../rules/iqama-guardrail';
import { RANGES } from './iqama-rules.catalog';
import {
  LOCKABLE_PRAYERS,
  PRAYER_NAMES,
  PrayerName,
  PrayerRule,
  RuleSet,
  ValidationIssue,
  ValidationResult,
  WEEKDAYS,
} from './iqama-rules.types';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ROUND_STEPS: readonly number[] = RANGES.roundingSteps;
const isInt = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n);
const inRange = (n: unknown, lo: number, hi: number): n is number =>
  isInt(n) && n >= lo && n <= hi;

/** Days in a month, leap-safe for Feb 29 (a yearly rule may hit a leap year). */
const maxDay = (month: number) =>
  [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];

function validatePrayer(
  prayer: PrayerName,
  rule: PrayerRule | undefined,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
): void {
  const err = (path: string, message: string) =>
    errors.push({ path: `${prayer}${path}`, message });
  const warn = (path: string, message: string) =>
    warnings.push({ path: `${prayer}${path}`, message });

  if (!rule || typeof rule !== 'object' || !rule.base) {
    err('', 'rule with a base is required');
    return;
  }

  // ── base ────────────────────────────────────────────────────────────────
  const b = rule.base;
  switch (b.type) {
    case 'OFFSET':
      if (
        !inRange(b.minutes, RANGES.offsetMinutes.min, RANGES.offsetMinutes.max)
      )
        err('.base.minutes', 'must be a whole number from -120 to 120');
      break;
    case 'FIXED_TIME':
      if (!HHMM.test(b.time ?? '')) err('.base.time', 'must be HH:mm');
      break;
    case 'SCALED_GAP': {
      const pts = b.points;
      if (!Array.isArray(pts) || pts.length < RANGES.scaledGapMinPoints) {
        err('.base.points', 'at least 2 points are required');
        break;
      }
      pts.forEach((p, i) => {
        if (!HHMM.test(p?.azan ?? ''))
          err(`.base.points[${i}].azan`, 'must be HH:mm');
        if (
          !inRange(p?.gapMinutes, RANGES.gapMinutes.min, RANGES.gapMinutes.max)
        )
          err(
            `.base.points[${i}].gapMinutes`,
            'must be a whole number from 0 to 120',
          );
      });
      const times = pts.map((p) =>
        HHMM.test(p?.azan ?? '') ? toMin(p.azan) : NaN,
      );
      if (
        times.every((t) => !Number.isNaN(t)) &&
        times.some((t, i) => i > 0 && t <= times[i - 1])
      )
        err('.base.points', 'azan times must be strictly increasing');
      break;
    }
    case 'SEASONAL': {
      const segs = b.segments;
      if (!Array.isArray(segs) || segs.length < 1) {
        err('.base.segments', 'at least 1 segment is required');
        break;
      }
      const seen = new Set<string>();
      segs.forEach((s, i) => {
        const p = `.base.segments[${i}]`;
        if (!HHMM.test(s?.time ?? '')) err(`${p}.time`, 'must be HH:mm');
        const st = s?.start;
        if (!st || !inRange(st.month, 1, 12)) {
          err(`${p}.start.month`, 'must be 1-12');
          return;
        }
        if (st.kind === 'DATE') {
          if (!inRange(st.day, 1, maxDay(st.month)))
            err(
              `${p}.start.day`,
              `must be 1-${maxDay(st.month)} for month ${st.month}`,
            );
        } else if (st.kind !== 'FIRST_FRIDAY') {
          err(`${p}.start.kind`, "must be 'DATE' or 'FIRST_FRIDAY'");
          return;
        }
        const key =
          st.kind === 'DATE' ? `D${st.month}-${st.day}` : `F${st.month}`;
        if (seen.has(key)) err(`${p}.start`, 'duplicate segment start');
        seen.add(key);
      });
      break;
    }
    default:
      err('.base.type', 'unknown base type');
  }

  // ── limits ──────────────────────────────────────────────────────────────
  const lim = rule.limits;
  if (lim) {
    if (lim.minAfterAzan !== undefined) {
      if (
        !inRange(
          lim.minAfterAzan,
          RANGES.minAfterAzan.min,
          RANGES.minAfterAzan.max,
        )
      )
        err('.limits.minAfterAzan', 'must be a whole number from 0 to 120');
      else if (lim.minAfterAzan < MIN_IQAMA_GAP_MIN)
        warn(
          '.limits.minAfterAzan',
          `below the ${MIN_IQAMA_GAP_MIN}-minute hard guardrail; the guardrail will raise it`,
        );
    }
    if (lim.latestBeforeSunrise !== undefined) {
      if (prayer !== 'fajr')
        err('.limits.latestBeforeSunrise', 'only Fajr has a sunrise limit');
      else if (
        !inRange(
          lim.latestBeforeSunrise,
          RANGES.latestBeforeSunrise.min,
          RANGES.latestBeforeSunrise.max,
        )
      )
        err(
          '.limits.latestBeforeSunrise',
          'must be a whole number from 0 to 240',
        );
      else if (lim.latestBeforeSunrise < FAJR_SUNRISE_BUFFER_MIN)
        warn(
          '.limits.latestBeforeSunrise',
          `below the ${FAJR_SUNRISE_BUFFER_MIN}-minute hard guardrail; the guardrail will cap it`,
        );
    }
  }

  // ── rounding ────────────────────────────────────────────────────────────
  if (rule.rounding) {
    if (!['CEIL', 'FLOOR', 'NEAREST'].includes(rule.rounding.mode))
      err('.rounding.mode', 'must be CEIL, FLOOR or NEAREST');
    if (!ROUND_STEPS.includes(rule.rounding.step))
      err('.rounding.step', `must be one of ${ROUND_STEPS.join(', ')}`);
  }

  // ── weekday adjust ──────────────────────────────────────────────────────
  if (rule.weekdayAdjust) {
    for (const [k, v] of Object.entries(rule.weekdayAdjust)) {
      if (!(WEEKDAYS as readonly string[]).includes(k))
        err(`.weekdayAdjust.${k}`, 'unknown weekday');
      else if (!inRange(v, RANGES.weekdayAdjust.min, RANGES.weekdayAdjust.max))
        err(`.weekdayAdjust.${k}`, 'must be a whole number from -60 to 60');
    }
  }

  // ── weekly lock ─────────────────────────────────────────────────────────
  if (rule.weeklyLock) {
    if (!LOCKABLE_PRAYERS.includes(prayer)) {
      err('.weeklyLock', 'weekly lock is not available for this prayer');
    } else {
      if (rule.weekdayAdjust && Object.keys(rule.weekdayAdjust).length > 0)
        warn(
          '.weekdayAdjust',
          'weekly lock holds the latest day of the week, so a weekday adjustment has little or no effect',
        );
    }
  }
}

/**
 * Validate a rule set. Errors block saving; warnings are advice only.
 * `effectiveFrom` (YYYY-MM-DD) is optional. When given, any of Fajr/Dhuhr/Asr/Isha
 * that differs from `previous` (or all four when `previous` is omitted) must
 * start on a Friday; that is an error, not a warning.
 */
export function validateRuleSet(
  rules: RuleSet,
  effectiveFrom?: string,
  previous?: RuleSet,
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (effectiveFrom !== undefined) {
    const ok =
      /^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom) &&
      !Number.isNaN(Date.parse(`${effectiveFrom}T00:00:00Z`)) &&
      new Date(`${effectiveFrom}T00:00:00Z`).toISOString().slice(0, 10) ===
        effectiveFrom;
    if (!ok) {
      errors.push({
        path: 'effectiveFrom',
        message: 'must be a valid YYYY-MM-DD date',
      });
      effectiveFrom = undefined;
    }
  }
  for (const prayer of PRAYER_NAMES) {
    validatePrayer(prayer, rules?.[prayer], errors, warnings);
    // Fajr, Dhuhr, Asr and Isha may only change on a Friday (weekly lock).
    // Maghrib may start on any day. Unchanged prayers are not checked.
    if (
      effectiveFrom &&
      LOCKABLE_PRAYERS.includes(prayer) &&
      new Date(`${effectiveFrom}T00:00:00Z`).getUTCDay() !== 5 &&
      (!previous ||
        JSON.stringify(previous[prayer]) !== JSON.stringify(rules?.[prayer]))
    ) {
      errors.push({
        path: `${prayer}.effectiveFrom`,
        message: `${prayer} changes must start on a Friday (got ${effectiveFrom})`,
      });
    }
  }
  return { errors, warnings };
}
