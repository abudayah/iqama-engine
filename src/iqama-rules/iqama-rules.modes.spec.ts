import { Logger } from '@nestjs/common';
import { DEFAULT_RULE_SET } from './iqama-rules.seed';
import { IqamaRulesError } from './iqama-rules.resolver';
import { makeStack, TEST_CUTOVER, versionRow } from './testing';
import { RuleSet } from './iqama-rules.types';

const changed = (): RuleSet => ({
  ...DEFAULT_RULE_SET,
  maghrib: {
    ...DEFAULT_RULE_SET.maghrib,
    base: { type: 'OFFSET', minutes: 10 },
  },
});

// Months fully after the cutover (2026-11-13) and one before it.
const AFTER = ['2026-12', '2027-02', '2027-03', '2027-06'];
const BEFORE = '2026-06';

describe('IQAMA_RULES flag modes (ScheduleBuilderService)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('legacy (default) never reads the DB rule table', async () => {
    const { builder, prisma } = await makeStack({ mode: undefined });
    await builder.buildMonth('2027-06');
    expect(prisma.iqamaRuleVersion.findMany).not.toHaveBeenCalled();
  });

  it('an unknown flag value behaves as legacy', async () => {
    const { builder, prisma } = await makeStack({ mode: 'banana' });
    await builder.buildMonth('2027-06');
    expect(prisma.iqamaRuleVersion.findMany).not.toHaveBeenCalled();
  });

  it('db with the seed rules gives exactly the legacy schedule after the cutover', async () => {
    const legacy = await makeStack({ mode: 'legacy' });
    const db = await makeStack({ mode: 'db' });
    for (const month of AFTER) {
      expect(await db.builder.buildMonth(month)).toEqual(
        await legacy.builder.buildMonth(month),
      );
    }
  });

  it('db serves the DB rules from the version date on', async () => {
    const legacy = await makeStack({ mode: 'legacy' });
    const db = await makeStack({
      mode: 'db',
      rows: [
        versionRow(1, TEST_CUTOVER),
        versionRow(2, '2027-06-04', changed()), // a Friday
      ],
    });
    const a = await legacy.builder.buildMonth('2027-06');
    const b = await db.builder.buildMonth('2027-06');
    expect(b[0].maghrib.iqama).toBe(a[0].maghrib.iqama); // before 06-04
    const i = 9; // 2027-06-10
    expect(b[i].maghrib.iqama).not.toBe(a[i].maghrib.iqama);
    expect(b[i].fajr.iqama).toBe(a[i].fajr.iqama);
  });

  it('dates before the cutover use legacy in db mode, even with no versions at all', async () => {
    const legacy = await makeStack({ mode: 'legacy' });
    const db = await makeStack({ mode: 'db', rows: [] });
    expect(await db.builder.buildMonth(BEFORE)).toEqual(
      await legacy.builder.buildMonth(BEFORE),
    );
  });

  it('shadow serves legacy and logs the differences', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const legacy = await makeStack({ mode: 'legacy' });
    const shadow = await makeStack({
      mode: 'shadow',
      rows: [versionRow(1, TEST_CUTOVER, changed())],
    });
    expect(await shadow.builder.buildMonth('2027-06')).toEqual(
      await legacy.builder.buildMonth('2027-06'),
    );
    const msgs = warn.mock.calls.map((c) => String(c[0]));
    expect(
      msgs.some((m) => m.startsWith('[iqama shadow] 2027-06-10 maghrib')),
    ).toBe(true);
    expect(msgs.some((m) => m.includes(' fajr:'))).toBe(false);
  });

  it('shadow with identical rules logs nothing', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const shadow = await makeStack({ mode: 'shadow' });
    await shadow.builder.buildMonth('2026-12');
    expect(warn).not.toHaveBeenCalled();
  });

  describe('no silent fallback', () => {
    it('db: throws IQAMA_RULES_MISSING (500) when no version covers a date after the cutover', async () => {
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      const db = await makeStack({
        mode: 'db',
        rows: [versionRow(1, '2030-01-01')],
      });
      const err: unknown = await db.builder
        .buildMonth('2027-06')
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(IqamaRulesError);
      expect((err as IqamaRulesError).code).toBe('IQAMA_RULES_MISSING');
      expect((err as IqamaRulesError).getStatus()).toBe(500);
      expect(error).toHaveBeenCalled();
    });

    it('db: throws IQAMA_RULES_INVALID when the stored JSON is not JSON', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
      const bad = { ...versionRow(1, TEST_CUTOVER), settings: '{nope' };
      const db = await makeStack({ mode: 'db', rows: [bad] });
      await expect(db.builder.buildMonth('2027-06')).rejects.toMatchObject({
        code: 'IQAMA_RULES_INVALID',
      });
    });

    it('db: validates stored rules at read time (not just a cast)', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
      const broken = {
        ...DEFAULT_RULE_SET,
        maghrib: { base: { type: 'OFFSET', minutes: 9999 } },
      };
      const db = await makeStack({
        mode: 'db',
        rows: [versionRow(1, TEST_CUTOVER, broken as RuleSet)],
      });
      await expect(db.builder.buildMonth('2027-06')).rejects.toThrow(
        /maghrib\.base\.minutes/,
      );
    });

    it('shadow: logs the problem but still serves legacy', async () => {
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      const legacy = await makeStack({ mode: 'legacy' });
      const shadow = await makeStack({ mode: 'shadow', rows: [] });
      expect(await shadow.builder.buildMonth('2027-06')).toEqual(
        await legacy.builder.buildMonth('2027-06'),
      );
      expect(error).toHaveBeenCalled();
    });
  });

  it('keeps the guardrail on the db path', async () => {
    const rules: RuleSet = {
      ...DEFAULT_RULE_SET,
      dhuhr: { base: { type: 'FIXED_TIME', time: '12:00' } },
    };
    const db = await makeStack({
      mode: 'db',
      rows: [versionRow(1, TEST_CUTOVER, rules)],
    });
    const d = (await db.builder.buildMonth('2027-06'))[9];
    expect(d.dhuhr.iqama_clamped).toBe(true);
    expect(d.dhuhr.iqama > d.dhuhr.azan).toBe(true);
  });
});

describe('5-minute mark guardrail in db mode', () => {
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
  ] as const)('Friday 13:43 with a %s rule becomes %s', async (mode, want) => {
    const db = await makeStack({
      mode: 'db',
      rows: [versionRow(1, TEST_CUTOVER, rulesWith(mode))],
    });
    const fri = (await db.builder.buildMonth('2027-06'))[10]; // 2027-06-11
    expect(fri.day_of_week).toBe('Friday');
    expect(fri.dhuhr.iqama).toBe(want);
    expect(fri.dhuhr.iqama_clamped).toBe(true);
  });
});
