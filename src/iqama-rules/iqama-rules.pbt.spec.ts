import * as fc from 'fast-check';
import { evaluateIqama, evaluateRuleMinutes } from './iqama-rules.evaluator';
import { DEFAULT_RULE_SET } from './iqama-rules.seed';
import { validateRuleSet } from './iqama-rules.validator';
import { DayCtx, PRAYER_NAMES, PrayerRule, RuleSet } from './iqama-rules.types';
import { toMin } from '../rules/iqama-guardrail';

const dayArb = fc
  .record({
    month: fc.integer({ min: 1, max: 12 }),
    d: fc.integer({ min: 1, max: 28 }),
    azan: fc.integer({ min: 3 * 60, max: 23 * 60 + 20 }),
    gapToSunrise: fc.integer({ min: 30, max: 180 }),
  })
  .map(
    ({ month, d, azan, gapToSunrise }): DayCtx => ({
      date: `2027-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      azanMin: azan,
      sunriseMin: azan + gapToSunrise,
    }),
  );
const prayerArb = fc.constantFrom(...PRAYER_NAMES);

describe('iqama-rules properties', () => {
  it('final iqama >= azan+3 and Fajr <= sunrise-60, with or without override', () => {
    fc.assert(
      fc.property(
        prayerArb,
        dayArb,
        fc.option(fc.integer({ min: 0, max: 23 * 60 + 59 }), {
          nil: undefined,
        }),
        (prayer, day, ov) => {
          const override =
            ov === undefined
              ? undefined
              : `${String(Math.floor(ov / 60)).padStart(2, '0')}:${String(ov % 60).padStart(2, '0')}`;
          const { iqama } = evaluateIqama(
            prayer,
            DEFAULT_RULE_SET[prayer],
            day,
            undefined,
            override,
          );
          const v = toMin(iqama);
          return (
            v >= day.azanMin + 3 &&
            (prayer !== 'fajr' ||
              v <=
                Math.max(
                  day.sunriseMin! - 60,
                  Math.ceil((day.azanMin + 3) / 5) * 5,
                ))
          );
        },
      ),
    );
  });

  it('rounding invariants: result is on the step; CEIL >= target, FLOOR <= target', () => {
    fc.assert(
      fc.property(
        dayArb,
        fc.constantFrom('CEIL', 'FLOOR', 'NEAREST' as const),
        fc.constantFrom(1, 5, 10, 15, 30),
        fc.integer({ min: 0, max: 90 }),
        (day, mode, step, offset) => {
          const base: PrayerRule = {
            base: { type: 'OFFSET', minutes: offset },
          };
          const rounded = evaluateRuleMinutes(
            { ...base, rounding: { mode: mode as 'CEIL', step } },
            day,
          );
          const raw = evaluateRuleMinutes(base, day);
          return (
            rounded % step === 0 &&
            (mode !== 'CEIL' || rounded >= raw) &&
            (mode !== 'FLOOR' || rounded <= raw) &&
            Math.abs(rounded - raw) < step
          );
        },
      ),
    );
  });

  it('validator rejects any OFFSET outside -120..120 and accepts inside', () => {
    fc.assert(
      fc.property(fc.integer({ min: -400, max: 400 }), (minutes) => {
        const r: RuleSet = JSON.parse(JSON.stringify(DEFAULT_RULE_SET));
        r.maghrib.base = { type: 'OFFSET', minutes };
        const bad = validateRuleSet(r).errors.some(
          (e) => e.path === 'maghrib.base.minutes',
        );
        return bad === (minutes < -120 || minutes > 120);
      }),
    );
  });

  it('validator rejects any non-increasing SCALED_GAP points', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1439 }),
        fc.integer({ min: 0, max: 1439 }),
        (a, b) => {
          const t = (n: number) =>
            `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
          const r: RuleSet = JSON.parse(JSON.stringify(DEFAULT_RULE_SET));
          r.isha.base = {
            type: 'SCALED_GAP',
            points: [
              { azan: t(a), gapMinutes: 10 },
              { azan: t(b), gapMinutes: 5 },
            ],
          };
          const bad = validateRuleSet(r).errors.some(
            (e) => e.path === 'isha.base.points',
          );
          return bad === b <= a;
        },
      ),
    );
  });
});
