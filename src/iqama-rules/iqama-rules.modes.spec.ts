import { Logger } from '@nestjs/common';
import { DEFAULT_RULE_SET } from './iqama-rules.seed';
import { freezeDate, makeStack, versionRow } from './testing';
import { RuleSet } from './iqama-rules.types';

const changed = (): RuleSet => ({
  ...DEFAULT_RULE_SET,
  maghrib: {
    ...DEFAULT_RULE_SET.maghrib,
    base: { type: 'OFFSET', minutes: 10 },
  },
});

describe('IQAMA_RULES flag modes (ScheduleBuilderService)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('legacy (default) never reads the DB rule table', async () => {
    const { builder, prisma } = await makeStack({ mode: undefined });
    await builder.buildMonth('2026-06');
    expect(prisma.iqamaRuleVersion.findMany).not.toHaveBeenCalled();
  });

  it('an unknown flag value behaves as legacy', async () => {
    const { builder, prisma } = await makeStack({ mode: 'banana' });
    await builder.buildMonth('2026-06');
    expect(prisma.iqamaRuleVersion.findMany).not.toHaveBeenCalled();
  });

  it('db with the seed rules gives exactly the legacy schedule', async () => {
    const legacy = await makeStack({ mode: 'legacy' });
    const db = await makeStack({ mode: 'db' });
    for (const month of ['2026-06', '2026-12', '2027-02', '2027-03']) {
      expect(await db.builder.buildMonth(month)).toEqual(
        await legacy.builder.buildMonth(month),
      );
    }
  });

  it('db serves the DB rules', async () => {
    const legacy = await makeStack({ mode: 'legacy' });
    const db = await makeStack({
      mode: 'db',
      rows: [
        versionRow(1, '1970-01-01'),
        versionRow(2, '2026-06-05', changed()),
      ],
    });
    const a = await legacy.builder.buildMonth('2026-06');
    const b = await db.builder.buildMonth('2026-06');
    expect(b[0].maghrib.iqama).toBe(a[0].maghrib.iqama); // before 06-05
    const i = 9; // 2026-06-10
    expect(b[i].maghrib.iqama).not.toBe(a[i].maghrib.iqama);
    expect(b[i].fajr.iqama).toBe(a[i].fajr.iqama);
  });

  it('shadow serves legacy and logs the differences', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const legacy = await makeStack({ mode: 'legacy' });
    const shadow = await makeStack({
      mode: 'shadow',
      rows: [versionRow(1, '1970-01-01', changed())],
    });
    expect(await shadow.builder.buildMonth('2026-06')).toEqual(
      await legacy.builder.buildMonth('2026-06'),
    );
    const msgs = warn.mock.calls.map((c) => String(c[0]));
    expect(
      msgs.some((m) => m.startsWith('[iqama shadow] 2026-06-10 maghrib')),
    ).toBe(true);
    expect(msgs.some((m) => m.includes(' fajr:'))).toBe(false);
  });

  it('shadow with identical rules logs nothing', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const shadow = await makeStack({ mode: 'shadow' });
    await shadow.builder.buildMonth('2026-12');
    expect(warn).not.toHaveBeenCalled();
  });

  it('db falls back to legacy (with a warning) when no version covers the date', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const legacy = await makeStack({ mode: 'legacy' });
    const db = await makeStack({
      mode: 'db',
      rows: [versionRow(1, '2030-01-01', changed())],
    });
    expect(await db.builder.buildMonth('2026-06')).toEqual(
      await legacy.builder.buildMonth('2026-06'),
    );
    expect(warn).toHaveBeenCalled();
  });

  it('keeps the guardrail on the db path', async () => {
    freezeDate('2026-11-11T20:00:00Z');
    const rules: RuleSet = {
      ...DEFAULT_RULE_SET,
      dhuhr: { base: { type: 'FIXED_TIME', time: '12:00' } },
    };
    const db = await makeStack({
      mode: 'db',
      rows: [versionRow(1, '1970-01-01', rules)],
    });
    const d = (await db.builder.buildMonth('2026-06'))[9];
    expect(d.dhuhr.iqama_clamped).toBe(true);
    expect(d.dhuhr.iqama > d.dhuhr.azan).toBe(true);
  });
});
