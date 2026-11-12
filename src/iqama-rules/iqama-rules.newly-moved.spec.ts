import { DEFAULT_RULE_SET } from './iqama-rules.seed';
import { addDay, classifyDay, emptyStats } from './iqama-rules.preview-stats';
import { freezeDate, makeStack } from './testing';
import { RuleSet } from './iqama-rules.types';

describe('classifyDay', () => {
  const t = (iqama: string, clamped = false) => ({
    iqama,
    ...(clamped ? { iqama_clamped: true } : {}),
  });

  it('unchanged and already moved is NOT newly moved', () => {
    expect(classifyDay(t('16:05', true), t('16:05', true))).toEqual({
      changed: false,
      movedNow: true,
      movedProposed: true,
      newlyMoved: false,
      noLongerMoved: false,
    });
  });

  it('moved only under the proposal is newly moved', () => {
    expect(classifyDay(t('13:45'), t('13:15', true))).toMatchObject({
      changed: true,
      newlyMoved: true,
      noLongerMoved: false,
    });
  });

  it('moved before and after, but to a different time, is newly moved', () => {
    expect(classifyDay(t('16:05', true), t('16:10', true))).toMatchObject({
      changed: true,
      movedNow: true,
      movedProposed: true,
      newlyMoved: true,
    });
  });

  it('moved today, not under the proposal: no longer moved', () => {
    expect(classifyDay(t('16:05', true), t('16:45'))).toMatchObject({
      changed: true,
      newlyMoved: false,
      noLongerMoved: true,
    });
  });

  it('addDay counts and keeps only the first N newly moved dates', () => {
    const s = emptyStats();
    for (let i = 1; i <= 12; i++) {
      addDay(
        s,
        `2027-01-${String(i).padStart(2, '0')}`,
        classifyDay(t('13:45'), t('13:15', true)),
        10,
      );
    }
    expect(s.newlyMoved).toBe(12);
    expect(s.newlyMovedDates).toHaveLength(10);
    expect(s.newlyMovedDates[0]).toBe('2027-01-01');
  });
});

describe('preview summary: newly moved', () => {
  // 2027-01-01 is a Friday, so any of the four locked prayers may change from there.
  // The year scanned (2027-01-01 .. 2027-12-31) contains the Asr "Late Winter 16:00"
  // season, which the guardrail already moves on 32 days (Feb 11 - Mar 14).
  beforeEach(() => freezeDate('2026-11-11T20:00:00Z'));
  afterEach(() => jest.useRealTimers());

  const run = async (rules: RuleSet) => {
    const { service } = await makeStack({});
    return service.preview({
      settings: JSON.stringify(rules),
      effectiveFrom: '2027-01-01',
    });
  };

  it('an unchanged prayer that is already moved (Asr Feb 11 - Mar 14) is NOT newly moved', async () => {
    const p = await run({
      ...DEFAULT_RULE_SET,
      maghrib: {
        ...DEFAULT_RULE_SET.maghrib,
        base: { type: 'OFFSET', minutes: 10 },
      },
    });
    const asr = p.summary.byPrayer.asr;
    expect(asr).toMatchObject({
      changedDays: 0,
      movedNow: 32,
      movedProposed: 32,
      newlyMoved: 0,
      newlyMovedDates: [],
      noLongerMoved: 0,
    });
    // totals: Maghrib changes, nothing is newly moved or freed
    expect(p.summary).toMatchObject({
      newlyMoved: 0,
      noLongerMoved: 0,
      movedNow: 32,
      movedProposed: 32,
    });
    expect(p.summary.newlyMovedDates).toEqual([]);
    expect(p.summary.byPrayer.maghrib.changedDays).toBeGreaterThan(300);
  }, 120_000);

  it('a change that causes new moves is counted, with the first dates', async () => {
    const p = await run({
      ...DEFAULT_RULE_SET,
      dhuhr: { base: { type: 'FIXED_TIME', time: '12:00' } }, // before Azan every day
    });
    const dhuhr = p.summary.byPrayer.dhuhr;
    expect(dhuhr.movedNow).toBe(0);
    expect(dhuhr.movedProposed).toBe(365);
    expect(dhuhr.newlyMoved).toBe(365);
    expect(dhuhr.noLongerMoved).toBe(0);
    expect(dhuhr.newlyMovedDates).toHaveLength(10);
    expect(dhuhr.newlyMovedDates[0]).toBe('2027-01-01');
    // Asr is untouched: its existing 32 moves are not counted as new
    expect(p.summary.byPrayer.asr.newlyMoved).toBe(0);
    expect(p.summary.newlyMoved).toBe(365);
    expect(p.summary.newlyMovedDates).toEqual(dhuhr.newlyMovedDates);
    // existing fields are still there and consistent
    expect(p.summary.daysClamped).toBe(365);
    expect(p.summary.byPrayer.dhuhr.daysClamped).toBe(365);
  }, 120_000);

  it('a change that removes moves is counted as no longer moved', async () => {
    const segments = (
      DEFAULT_RULE_SET.asr.base as {
        segments: { start: unknown; time: string }[];
      }
    ).segments.map((s) => (s.time === '16:00' ? { ...s, time: '16:45' } : s));
    const p = await run({
      ...DEFAULT_RULE_SET,
      asr: {
        base: { type: 'SEASONAL', segments } as never,
      },
    });
    const asr = p.summary.byPrayer.asr;
    expect(asr).toMatchObject({
      movedNow: 32,
      movedProposed: 0,
      newlyMoved: 0,
      noLongerMoved: 32,
    });
    expect(asr.changedDays).toBeGreaterThanOrEqual(32);
    expect(p.summary).toMatchObject({
      movedNow: 32,
      movedProposed: 0,
      newlyMoved: 0,
      noLongerMoved: 32,
    });
    // old fields unchanged in meaning
    expect(p.summary.daysClamped).toBe(0);
    expect(p.summary.daysClampedCurrent).toBe(32);
  }, 120_000);
});
