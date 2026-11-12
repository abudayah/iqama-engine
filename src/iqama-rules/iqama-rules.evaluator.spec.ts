import { DEFAULT_RULE_SET } from './iqama-rules.seed';
import {
  evaluateIqama,
  evaluateRule,
  firstFriday,
} from './iqama-rules.evaluator';
import { DayCtx, PrayerRule } from './iqama-rules.types';

const day = (date: string, azan: string, sunrise?: string): DayCtx => {
  const m = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  return {
    date,
    azanMin: m(azan),
    ...(sunrise ? { sunriseMin: m(sunrise) } : {}),
  };
};

describe('iqama-rules evaluator', () => {
  it('firstFriday', () => {
    expect(firstFriday(2026, 9)).toBe(4);
    expect(firstFriday(2027, 1)).toBe(1);
    expect(firstFriday(2026, 10)).toBe(2);
  });

  it('OFFSET + CEIL', () => {
    expect(
      evaluateRule(DEFAULT_RULE_SET.maghrib, day('2026-06-10', '21:02')),
    ).toBe('21:10');
  });

  it('FIXED_TIME with Friday -5', () => {
    expect(
      evaluateRule(DEFAULT_RULE_SET.dhuhr, day('2027-01-01', '12:10')),
    ).toBe('13:40');
    expect(
      evaluateRule(DEFAULT_RULE_SET.dhuhr, day('2027-01-04', '12:10')),
    ).toBe('13:45');
  });

  it('SCALED_GAP interpolates and holds flat outside the points', () => {
    const r: PrayerRule = {
      base: {
        type: 'SCALED_GAP',
        points: [
          { azan: '20:00', gapMinutes: 15 },
          { azan: '22:00', gapMinutes: 5 },
        ],
      },
    };
    expect(evaluateRule(r, day('2026-06-10', '19:00'))).toBe('19:15');
    expect(evaluateRule(r, day('2026-06-10', '21:00'))).toBe('21:10');
    expect(evaluateRule(r, day('2026-06-10', '23:00'))).toBe('23:05');
  });

  it('SEASONAL starts on the first Friday and wraps over New Year', () => {
    const asr = DEFAULT_RULE_SET.asr;
    const t = (d: string) => evaluateRule(asr, day(d, '15:00'));
    expect(t('2026-09-03')).toBe('18:00');
    expect(t('2026-09-04')).toBe('17:00'); // first Friday of Sep 2026
    expect(t('2026-10-01')).toBe('17:00');
    expect(t('2026-10-02')).toBe('16:30');
    expect(t('2026-12-31')).toBe('15:45');
    expect(t('2027-01-01')).toBe('16:00'); // Fri = first Friday
    expect(t('2027-03-14')).toBe('16:00');
    expect(t('2027-03-15')).toBe('18:00');
    expect(t('2026-01-01')).toBe('15:45'); // Thu, before Jan 2 (first Friday)
  });

  it('Fajr: sunrise limit caps, weekly lock holds the latest day', () => {
    const week = [
      day('2026-12-04', '06:00', '07:55'),
      day('2026-12-05', '06:02', '07:56'),
      day('2026-12-06', '06:04', '07:57'),
      day('2026-12-07', '06:06', '07:58'),
      day('2026-12-08', '06:08', '07:59'),
      day('2026-12-09', '06:10', '08:00'),
      day('2026-12-10', '06:12', '08:01'),
    ];
    // Azan+75 is far past sunrise-60 -> capped at 06:55 on the earliest day.
    expect(evaluateRule(DEFAULT_RULE_SET.fajr, week[0], week)).toBe('06:55');
  });

  it('override replaces the rule, then guardrails clamp it', () => {
    const d = day('2026-06-10', '13:10');
    expect(
      evaluateIqama('dhuhr', DEFAULT_RULE_SET.dhuhr, d, undefined, '13:30'),
    ).toEqual({ iqama: '13:30', clamped: false });
    expect(
      evaluateIqama('dhuhr', DEFAULT_RULE_SET.dhuhr, d, undefined, '12:00'),
    ).toEqual({ iqama: '13:15', clamped: true });
  });

  it('guardrail clamps a rule result (Asr Late Winter after clocks stopped)', () => {
    const r = evaluateIqama(
      'asr',
      DEFAULT_RULE_SET.asr,
      day('2027-03-14', '16:34'),
    );
    expect(r).toEqual({ iqama: '16:40', clamped: true });
  });
});

describe('evaluateIqama: 5-minute mark guardrail', () => {
  // Friday adjust -2 pushes the rounded value off the 5-minute grid.
  const rule = (mode: 'FLOOR' | 'CEIL'): PrayerRule => ({
    base: { type: 'FIXED_TIME', time: '13:45' },
    rounding: { mode, step: 5 },
    weekdayAdjust: { FRI: -2 },
  });
  const fri = day('2027-01-01', '12:10');

  it('FLOOR rule stays floor (13:43 -> 13:40)', () => {
    expect(evaluateIqama('dhuhr', rule('FLOOR'), fri)).toEqual({
      iqama: '13:40',
      clamped: true,
    });
  });

  it('CEIL rule rounds up (13:43 -> 13:45)', () => {
    expect(evaluateIqama('dhuhr', rule('CEIL'), fri)).toEqual({
      iqama: '13:45',
      clamped: true,
    });
  });

  it('an override off the grid goes up: 09:04 -> 09:05', () => {
    const d = day('2027-01-04', '08:00');
    expect(
      evaluateIqama('dhuhr', DEFAULT_RULE_SET.dhuhr, d, undefined, '09:04'),
    ).toEqual({ iqama: '09:05', clamped: true });
  });

  it('Fajr sunrise conflict: last mark <= sunrise - 60, gap still wins', () => {
    const d = day('2027-06-10', '04:00', '05:58'); // limit 04:58 -> 04:55
    expect(
      evaluateIqama('fajr', DEFAULT_RULE_SET.fajr, d, undefined, '04:57').iqama,
    ).toBe('04:55');
    const tight = day('2027-06-10', '04:54', '05:58'); // gap wants 05:00
    expect(
      evaluateIqama('fajr', DEFAULT_RULE_SET.fajr, tight, undefined, '04:57')
        .iqama,
    ).toBe('05:00');
  });
});
