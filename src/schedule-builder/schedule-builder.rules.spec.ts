/**
 * The schedule is built from the stored rule versions only (no legacy engine,
 * no flag): which version serves a date, explicit errors, guardrails.
 */
import { Logger } from '@nestjs/common';
import { DEFAULT_RULE_SET } from '../iqama-rules/iqama-rules.seed';
import { IqamaRulesError } from '../iqama-rules/iqama-rules.resolver';
import { RuleSet } from '../iqama-rules/iqama-rules.types';
import { makeStack, TEST_V1_DATE, versionRow } from '../iqama-rules/testing';

const withMaghrib = (minutes: number): RuleSet => ({
  ...DEFAULT_RULE_SET,
  maghrib: {
    ...DEFAULT_RULE_SET.maghrib,
    base: { type: 'OFFSET', minutes },
  },
});

describe('ScheduleBuilderService: stored rules', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reads the rule table (no flag involved)', async () => {
    const { builder, prisma } = await makeStack({});
    await builder.buildMonth('2027-06');
    expect(prisma.iqamaRuleVersion.findMany).toHaveBeenCalledTimes(1);
  });

  it('dates before the first version use the earliest version (past dates keep working)', async () => {
    const { builder } = await makeStack({
      rows: [versionRow(1, TEST_V1_DATE)],
    });
    // 2025-12 is winter and long before version 1: Dhuhr is 13:45 (Friday 13:40),
    // where the old DST rule used to show 12:45 / 12:40.
    const days = await builder.buildMonth('2025-12');
    expect(days).toHaveLength(31);
    for (const d of days) {
      expect(d.dhuhr.iqama).toBe(
        d.day_of_week === 'Friday' ? '13:40' : '13:45',
      );
    }
  });

  it('a later version applies from its effectiveFrom date, the earlier one before it', async () => {
    const { builder } = await makeStack({
      rows: [
        versionRow(1, TEST_V1_DATE),
        versionRow(2, '2027-06-04', withMaghrib(10)), // a Friday
      ],
    });
    const base = await makeStack({});
    const a = await base.builder.buildMonth('2027-06');
    const b = await builder.buildMonth('2027-06');
    expect(b[2].maghrib.iqama).toBe(a[2].maghrib.iqama); // 2027-06-03
    expect(b[3].maghrib.iqama).not.toBe(a[3].maghrib.iqama); // 2027-06-04
    expect(b[9].fajr.iqama).toBe(a[9].fajr.iqama);
  });

  it('on the same effectiveFrom the higher id wins', async () => {
    const { builder } = await makeStack({
      rows: [
        versionRow(1, TEST_V1_DATE),
        versionRow(2, TEST_V1_DATE, withMaghrib(10)),
      ],
    });
    const base = await makeStack({});
    const a = await base.builder.buildMonth('2027-06');
    const b = await builder.buildMonth('2027-06');
    expect(b[9].maghrib.iqama).not.toBe(a[9].maghrib.iqama);
  });

  describe('no silent fallback', () => {
    it('no versions at all: IQAMA_RULES_MISSING (500), logged', async () => {
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      const { builder } = await makeStack({ rows: [] });
      const err: unknown = await builder
        .buildMonth('2027-06')
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(IqamaRulesError);
      expect((err as IqamaRulesError).code).toBe('IQAMA_RULES_MISSING');
      expect((err as IqamaRulesError).getStatus()).toBe(500);
      expect(error).toHaveBeenCalled();
    });

    it('stored JSON that is not JSON: IQAMA_RULES_INVALID', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
      const bad = { ...versionRow(1, TEST_V1_DATE), settings: '{nope' };
      const { builder } = await makeStack({ rows: [bad] });
      await expect(builder.buildMonth('2027-06')).rejects.toMatchObject({
        code: 'IQAMA_RULES_INVALID',
      });
    });

    it('stored rules are validated at read time (not just cast)', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
      const broken = {
        ...DEFAULT_RULE_SET,
        maghrib: { base: { type: 'OFFSET', minutes: 9999 } },
      } as RuleSet;
      const { builder } = await makeStack({
        rows: [versionRow(1, TEST_V1_DATE, broken)],
      });
      await expect(builder.buildMonth('2027-06')).rejects.toThrow(
        /maghrib\.base\.minutes/,
      );
    });
  });

  it('keeps the guardrail on the rules path', async () => {
    const rules: RuleSet = {
      ...DEFAULT_RULE_SET,
      dhuhr: { base: { type: 'FIXED_TIME', time: '12:00' } },
    };
    const { builder } = await makeStack({
      rows: [versionRow(1, TEST_V1_DATE, rules)],
    });
    const d = (await builder.buildMonth('2027-06'))[9];
    expect(d.dhuhr.iqama_clamped).toBe(true);
    expect(d.dhuhr.iqama > d.dhuhr.azan).toBe(true);
  });

  describe('5-minute mark guardrail', () => {
    const rulesWith = (mode: 'FLOOR' | 'CEIL'): RuleSet => ({
      ...DEFAULT_RULE_SET,
      dhuhr: {
        base: { type: 'FIXED_TIME', time: '13:45' },
        rounding: { mode, step: 5 },
        weekdayAdjust: { FRI: -2 },
      },
    });

    it.each([
      ['FLOOR', '13:40'],
      ['CEIL', '13:45'],
    ] as const)(
      'Friday 13:43 with a %s rule becomes %s',
      async (mode, want) => {
        const { builder } = await makeStack({
          rows: [versionRow(1, TEST_V1_DATE, rulesWith(mode))],
        });
        const fri = (await builder.buildMonth('2027-06'))[10]; // 2027-06-11
        expect(fri.day_of_week).toBe('Friday');
        expect(fri.dhuhr.iqama).toBe(want);
        expect(fri.dhuhr.iqama_clamped).toBe(true);
      },
    );
  });
});
