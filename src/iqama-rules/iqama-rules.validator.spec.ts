import { DEFAULT_RULE_SET } from './iqama-rules.seed';
import { validateRuleSet } from './iqama-rules.validator';
import { RuleSet } from './iqama-rules.types';

const clone = (): RuleSet => structuredClone(DEFAULT_RULE_SET);
const paths = (r: { path: string }[]) => r.map((i) => i.path);

describe('validateRuleSet', () => {
  it('accepts the seed config with no errors', () => {
    expect(validateRuleSet(DEFAULT_RULE_SET, '2026-11-06').errors).toEqual([]);
  });

  it('rejects out-of-range and malformed values', () => {
    const r = clone();
    r.fajr.base = { type: 'OFFSET', minutes: 500 };
    r.dhuhr.base = { type: 'FIXED_TIME', time: '25:00' };
    r.isha.base = {
      type: 'SCALED_GAP',
      points: [
        { azan: '22:00', gapMinutes: 5 },
        { azan: '20:00', gapMinutes: 15 },
      ],
    };
    r.asr.base = {
      type: 'SEASONAL',
      segments: [
        { start: { kind: 'DATE', month: 2, day: 31 }, time: '16:00' },
        { start: { kind: 'DATE', month: 13, day: 1 }, time: '16:00' },
      ],
    };
    r.maghrib.rounding = { mode: 'CEIL', step: 7 };
    r.isha.rounding = { mode: 'FLOOR', step: 1 }; // not a multiple of 5
    r.maghrib.weekdayAdjust = { FRI: 99 };
    const p = paths(validateRuleSet(r).errors);
    expect(p).toEqual(
      expect.arrayContaining([
        'fajr.base.minutes',
        'dhuhr.base.time',
        'isha.base.points',
        'asr.base.segments[0].start.day',
        'asr.base.segments[1].start.month',
        'maghrib.rounding.step',
        'isha.rounding.step',
        'maghrib.weekdayAdjust.FRI',
      ]),
    );
  });

  it('rejects weekly lock on Maghrib and a sunrise limit outside Fajr', () => {
    const r = clone();
    r.maghrib.weeklyLock = true;
    r.isha.limits = { latestBeforeSunrise: 60 };
    expect(paths(validateRuleSet(r).errors)).toEqual(
      expect.arrayContaining([
        'maghrib.weeklyLock',
        'isha.limits.latestBeforeSunrise',
      ]),
    );
  });

  it('rejects an invalid effectiveFrom', () => {
    expect(
      paths(validateRuleSet(DEFAULT_RULE_SET, '2026-02-30').errors),
    ).toEqual(['effectiveFrom']);
  });

  it('errors on a non-Friday effectiveFrom for the four locked prayers', () => {
    const res = validateRuleSet(DEFAULT_RULE_SET, '2026-11-04'); // Wednesday
    expect(paths(res.errors).sort()).toEqual([
      'asr.effectiveFrom',
      'dhuhr.effectiveFrom',
      'fajr.effectiveFrom',
      'isha.effectiveFrom',
    ]);
    expect(validateRuleSet(DEFAULT_RULE_SET, '2026-11-06').errors).toEqual([]);
  });

  it('lets Maghrib-only changes start on any day', () => {
    const next = clone();
    next.maghrib.base = { type: 'OFFSET', minutes: 10 };
    expect(
      validateRuleSet(next, '2026-11-04', DEFAULT_RULE_SET).errors,
    ).toEqual([]);
    next.fajr.base = { type: 'OFFSET', minutes: 70 };
    expect(
      paths(validateRuleSet(next, '2026-11-04', DEFAULT_RULE_SET).errors),
    ).toEqual(['fajr.effectiveFrom']);
  });

  it('does not count a prayer as changed just because its keys are in another order', () => {
    // Same RuleSet, keys sorted the way a client may serialise it.
    const sorted = JSON.parse(
      JSON.stringify(DEFAULT_RULE_SET, (_k, v: unknown) =>
        v && typeof v === 'object' && !Array.isArray(v)
          ? Object.fromEntries(
              Object.entries(v).sort(([a], [b]) => a.localeCompare(b)),
            )
          : v,
      ),
    ) as RuleSet;
    sorted.maghrib.base = { type: 'OFFSET', minutes: 10 };
    expect(
      validateRuleSet(sorted, '2026-11-04', DEFAULT_RULE_SET).errors,
    ).toEqual([]);
  });

  it('warns when limits are below the hard guardrails', () => {
    const r = clone();
    r.fajr.limits = { minAfterAzan: 1, latestBeforeSunrise: 30 };
    const res = validateRuleSet(r);
    expect(res.errors).toEqual([]);
    expect(paths(res.warnings)).toEqual(
      expect.arrayContaining([
        'fajr.limits.minAfterAzan',
        'fajr.limits.latestBeforeSunrise',
      ]),
    );
  });
});
