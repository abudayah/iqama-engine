import { Dayjs } from 'dayjs';
import { guardrailMinutes, toHHmm, toMin } from '../rules/iqama-guardrail';
import { formatHHmm } from '../rules/time-utils';
import {
  DayCtx,
  PrayerName,
  PrayerRule,
  RuleBase,
  SeasonalBase,
  SegmentStart,
  WEEKDAYS,
} from './iqama-rules.types';

/** Build a DayCtx from adhan-adapter times (seconds are dropped, as on screen). */
export function toDayCtx(date: string, azan: Dayjs, sunrise?: Dayjs): DayCtx {
  return {
    date,
    azanMin: toMin(formatHHmm(azan)),
    ...(sunrise ? { sunriseMin: toMin(formatHHmm(sunrise)) } : {}),
  };
}

const parseDate = (date: string): [number, number, number] => {
  const [y, m, d] = date.split('-').map(Number);
  return [y, m, d];
};

/** 0 = Sunday … 6 = Saturday. */
const dayOfWeek = (y: number, m: number, d: number): number =>
  new Date(Date.UTC(y, m - 1, d)).getUTCDay();

/** Day of month (1–7) of the first Friday of the month. */
export function firstFriday(year: number, month: number): number {
  return 1 + ((5 - dayOfWeek(year, month, 1) + 7) % 7);
}

const startKey = (s: SegmentStart, year: number): number => {
  const day = s.kind === 'DATE' ? s.day : firstFriday(year, s.month);
  return s.month * 100 + day; // sortable MMDD
};

function seasonalTime(base: SeasonalBase, date: string): string {
  const [y, m, d] = parseDate(date);
  const today = m * 100 + d;
  const keyed = base.segments.map((seg) => ({
    key: startKey(seg.start, y),
    time: seg.time,
  }));
  // Latest segment already started this year; before the first one, the
  // year's last segment is still running (wraps over New Year).
  const started = keyed.filter((s) => s.key <= today);
  const pool = started.length > 0 ? started : keyed;
  return pool.reduce((a, b) => (b.key > a.key ? b : a)).time;
}

function baseMinutes(base: RuleBase, day: DayCtx): number {
  switch (base.type) {
    case 'OFFSET':
      return day.azanMin + base.minutes;
    case 'FIXED_TIME':
      return toMin(base.time);
    case 'SEASONAL':
      return toMin(seasonalTime(base, day.date));
    case 'SCALED_GAP': {
      const pts = [...base.points]
        .map((p) => ({ at: toMin(p.azan), gap: p.gapMinutes }))
        .sort((a, b) => a.at - b.at);
      let gap: number;
      if (day.azanMin <= pts[0].at) gap = pts[0].gap;
      else if (day.azanMin >= pts[pts.length - 1].at)
        gap = pts[pts.length - 1].gap;
      else {
        const i = pts.findIndex((p) => p.at >= day.azanMin);
        const [a, b] = [pts[i - 1], pts[i]];
        gap = a.gap + ((b.gap - a.gap) * (day.azanMin - a.at)) / (b.at - a.at);
      }
      return day.azanMin + Math.round(gap);
    }
  }
}

const ceilTo = (v: number, step: number) => Math.ceil(v / step) * step;
const floorTo = (v: number, step: number) => Math.floor(v / step) * step;

/** base -> limits -> rounding -> weekday adjust, for one day (minutes). */
function perDay(rule: PrayerRule, day: DayCtx): number {
  const { limits, rounding } = rule;
  const minT =
    limits?.minAfterAzan !== undefined
      ? day.azanMin + limits.minAfterAzan
      : undefined;
  const maxT =
    limits?.latestBeforeSunrise !== undefined && day.sunriseMin !== undefined
      ? day.sunriseMin - limits.latestBeforeSunrise
      : undefined;

  let target = baseMinutes(rule.base, day);
  if (minT !== undefined) target = Math.max(target, minT);
  if (maxT !== undefined) target = Math.min(target, maxT); // sunrise limit wins

  let v = target;
  if (rounding) {
    const { mode, step } = rounding;
    v =
      mode === 'CEIL'
        ? ceilTo(target, step)
        : mode === 'FLOOR'
          ? floorTo(target, step)
          : Math.round(target / step) * step;
    // Rounding must not break a limit: step back the other way.
    if (maxT !== undefined && v > maxT) v = floorTo(maxT, step);
    else if (minT !== undefined && v < minT) v = ceilTo(target, step);
  }

  const [y, m, d] = parseDate(day.date);
  const adjust = rule.weekdayAdjust?.[WEEKDAYS[dayOfWeek(y, m, d)]];
  return v + (adjust ?? 0);
}

/**
 * Rule result (base + modifiers) for one day, before override and guardrails.
 * `week` is the Friday->Thursday window containing the day; it is only read
 * when the rule has weeklyLock.
 */
export function evaluateRuleMinutes(
  rule: PrayerRule,
  day: DayCtx,
  week?: DayCtx[],
): number {
  if (!rule.weeklyLock || !week || week.length === 0) return perDay(rule, day);

  let latest = Math.max(...week.map((d) => perDay(rule, d)));
  const n = rule.limits?.latestBeforeSunrise;
  if (n !== undefined) {
    // The held time must respect the limit on every day of the window.
    const caps = week
      .filter((d) => d.sunriseMin !== undefined)
      .map((d) => d.sunriseMin! - n);
    if (caps.length > 0) {
      const cap = Math.min(...caps);
      if (latest > cap) latest = floorTo(cap, rule.rounding?.step ?? 1);
    }
  }
  return latest;
}

export const evaluateRule = (
  rule: PrayerRule,
  day: DayCtx,
  week?: DayCtx[],
): string => toHHmm(evaluateRuleMinutes(rule, day, week));

/**
 * Full pipeline: rule -> admin override (HH:mm, already resolved) -> hard
 * guardrails. Guardrails (min gap after Azan; Fajr <= sunrise - 60) always run.
 */
export function evaluateIqama(
  prayer: PrayerName,
  rule: PrayerRule,
  day: DayCtx,
  week?: DayCtx[],
  override?: string,
): { iqama: string; clamped: boolean } {
  const before =
    override !== undefined
      ? toMin(override)
      : evaluateRuleMinutes(rule, day, week);
  const after = guardrailMinutes(
    before,
    day.azanMin,
    prayer === 'fajr' ? day.sunriseMin : undefined,
    rule.rounding?.mode === 'FLOOR',
  );
  return { iqama: toHHmm(after), clamped: after !== before };
}
