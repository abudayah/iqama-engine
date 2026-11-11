import {
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { nextFriday } from './iqama-rules.service';
import { DEFAULT_RULE_SET } from './iqama-rules.seed';
import { freezeDate, makeStack } from './testing';
import { RuleSet } from './iqama-rules.types';

// Wednesday. Next Friday = 2026-11-13.
const NOW = '2026-11-11T20:00:00Z';

const withMaghrib = (minutes: number): RuleSet => ({
  ...DEFAULT_RULE_SET,
  maghrib: { ...DEFAULT_RULE_SET.maghrib, base: { type: 'OFFSET', minutes } },
});
const json = (r: RuleSet) => JSON.stringify(r);

describe('nextFriday', () => {
  it('is strictly after today', () => {
    expect(nextFriday('2026-11-11')).toBe('2026-11-13'); // Wed
    expect(nextFriday('2026-11-12')).toBe('2026-11-13'); // Thu
    expect(nextFriday('2026-11-13')).toBe('2026-11-20'); // Fri -> next week
    expect(nextFriday('2026-11-14')).toBe('2026-11-20'); // Sat
    expect(nextFriday('2026-12-31')).toBe('2027-01-01'); // year end
  });
});

describe('IqamaRulesService', () => {
  beforeEach(() => freezeDate(NOW));
  afterEach(() => jest.useRealTimers());

  it('getConfig returns versions, effective rules and the default date', async () => {
    const { service } = await makeStack({ mode: 'shadow' });
    const cfg = await service.getConfig();
    expect(cfg.mode).toBe('shadow');
    expect(cfg.currentRevision).toBe(1);
    expect(cfg.versions).toHaveLength(1);
    expect(cfg.effective).toEqual(DEFAULT_RULE_SET);
    expect(cfg.today).toBe('2026-11-11');
    expect(cfg.defaultEffectiveFrom).toBe('2026-11-13');
  });

  it('getCatalog exposes ranges and the fixed guardrails', async () => {
    const { service } = await makeStack({});
    const c = service.getCatalog();
    expect(c.guardrails.minGapAfterAzanMinutes).toBe(3);
    expect(c.guardrails.iqamaStepMinutes).toBe(5);
    expect(c.modifiers.limits.latestBeforeSunrise.prayers).toEqual(['fajr']);
    expect(c.baseTypes.map((b) => b.type)).toEqual([
      'OFFSET',
      'FIXED_TIME',
      'SCALED_GAP',
      'SEASONAL',
    ]);
    expect(
      c.prayers.find((p) => p.name === 'maghrib')?.fridayStartRequired,
    ).toBe(false);
  });

  describe('preview', () => {
    it('identical rules: nothing changes', async () => {
      const { service } = await makeStack({});
      const p = await service.preview({ settings: json(DEFAULT_RULE_SET) });
      expect(p.effectiveFrom).toBe('2026-11-13');
      expect(p.summary.totalDays).toBe(365);
      expect(p.summary.daysChanged).toBe(0);
      expect(p.days).toHaveLength(14);
      expect(p.previewId).toMatch(/^ipv_/);
    }, 60_000);

    it('counts changed days per prayer and returns real current vs proposed', async () => {
      const { service } = await makeStack({});
      const p = await service.preview({
        settings: json(withMaghrib(10)),
        effectiveFrom: '2026-11-13',
      });
      expect(p.summary.byPrayer.maghrib.daysChanged).toBeGreaterThan(300);
      expect(p.summary.byPrayer.fajr.daysChanged).toBe(0);
      expect(p.summary.firstChangedDates[0]).toBe('2026-11-13');
      const m = (p.days[0].prayers as Record<string, any>).maghrib;
      expect(m.proposed.iqama > m.current.iqama).toBe(true);
    }, 60_000);

    it('reports clamped days and the first affected dates', async () => {
      const { service } = await makeStack({});
      const rules: RuleSet = {
        ...DEFAULT_RULE_SET,
        maghrib: { base: { type: 'FIXED_TIME', time: '12:00' } },
      };
      const p = await service.preview({
        settings: json(rules),
        effectiveFrom: '2026-11-13',
      });
      expect(p.summary.daysClamped).toBe(365);
      expect(p.summary.firstClampedDates).toHaveLength(10);
      expect(p.summary.byPrayer.maghrib.daysClamped).toBe(365);
    }, 60_000);

    it('reports the existing Asr Feb 11 - Mar 14 2027 clamping', async () => {
      const { service } = await makeStack({});
      const p = await service.preview({
        settings: json(withMaghrib(10)),
        effectiveFrom: '2027-01-01',
      });
      // Asr 16:00 (Feb 11 - Mar 14 2027) is clamped in current and proposed alike
      expect(p.summary.byPrayer.asr.daysClamped).toBe(32);
      expect(p.summary.daysChanged).toBe(
        p.summary.byPrayer.maghrib.daysChanged,
      );
      expect(p.summary.daysClampedCurrent).toBeGreaterThan(0);
    }, 60_000);

    it('rejects a non-Friday start when a locked prayer changes', async () => {
      const { service } = await makeStack({});
      const r = withMaghrib(5);
      r.fajr = { ...r.fajr, base: { type: 'OFFSET', minutes: 70 } };
      await expect(
        service.preview({ settings: json(r), effectiveFrom: '2026-11-12' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows any start day when only Maghrib changes', async () => {
      const { service } = await makeStack({});
      const p = await service.preview({
        settings: json(withMaghrib(10)),
        effectiveFrom: '2026-11-12',
      });
      expect(p.effectiveFrom).toBe('2026-11-12');
    }, 60_000);

    it('rejects bad JSON, past dates and invalid rules', async () => {
      const { service } = await makeStack({});
      await expect(service.preview({ settings: '{nope' })).rejects.toThrow(
        'valid JSON',
      );
      await expect(
        service.preview({
          settings: json(DEFAULT_RULE_SET),
          effectiveFrom: '2026-11-06',
        }),
      ).rejects.toThrow('earlier than today');
      const bad = withMaghrib(999);
      await expect(
        service.preview({ settings: json(bad), effectiveFrom: '2026-11-13' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('createVersion (PUT /base)', () => {
    it('saves a new version, defaulting to next Friday, and invalidates cache', async () => {
      const { service, prisma, rows, builder } = await makeStack({});
      const invalidate = jest
        .spyOn(builder, 'invalidateCache')
        .mockResolvedValue(undefined);
      const settings = json(withMaghrib(10));
      const { previewId, currentRevision } = await service.preview({
        settings,
      });
      const v = await service.createVersion(
        { settings, previewId, expectedRevision: currentRevision },
        'admin',
      );
      expect(v.effectiveFrom).toBe('2026-11-13');
      expect(prisma.iqamaRuleVersion.create).toHaveBeenCalledTimes(1);
      expect(rows).toHaveLength(2); // append-only: old row kept
      expect(invalidate).toHaveBeenCalledWith('2026-11-13', '2027-12-31');
    }, 60_000);

    it('409 when the revision is stale', async () => {
      const { service } = await makeStack({});
      await expect(
        service.createVersion(
          {
            settings: json(DEFAULT_RULE_SET),
            previewId: 'x',
            expectedRevision: 0,
          },
          'admin',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('422 without a valid preview token, and tokens are single-use', async () => {
      const { service } = await makeStack({});
      const settings = json(withMaghrib(10));
      await expect(
        service.createVersion(
          { settings, previewId: 'ipv_missing', expectedRevision: 1 },
          'admin',
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);

      const { previewId } = await service.preview({ settings });
      // different settings than previewed
      await expect(
        service.createVersion(
          { settings: json(withMaghrib(15)), previewId, expectedRevision: 1 },
          'admin',
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);

      const ok = await service.preview({ settings });
      jest
        .spyOn((service as any).scheduleBuilder, 'invalidateCache')
        .mockResolvedValue(undefined);
      await service.createVersion(
        { settings, previewId: ok.previewId, expectedRevision: 1 },
        'admin',
      );
      await expect(
        service.createVersion(
          { settings, previewId: ok.previewId, expectedRevision: 2 },
          'admin',
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    }, 120_000);

    it('rejects a non-Friday start for a locked prayer even with a token', async () => {
      const { service } = await makeStack({});
      const r = withMaghrib(5);
      r.isha = { ...r.isha, limits: { minAfterAzan: 5 } };
      await expect(
        service.createVersion(
          {
            settings: json(r),
            effectiveFrom: '2026-11-12',
            previewId: 'ipv_x',
            expectedRevision: 1,
          },
          'admin',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
