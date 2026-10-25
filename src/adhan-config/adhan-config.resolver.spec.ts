import { resolveAdhanSettings } from './adhan-config.resolver';
import type {
  AdhanConfigVersionRecord,
  AdhanConfigPeriodRecord,
  AdhanSettings,
  PartialAdhanSettings,
} from './adhan-config.types';

const BASE_SETTINGS: AdhanSettings = {
  general: {
    method: 'NorthAmerica',
    madhab: 'shafi',
    highLatitudeRule: 'TwilightAngle',
    polarCircleResolution: 'Unresolved',
    rounding: 'Nearest',
  },
  prayers: {},
};

function makeVersion(
  id: number,
  effectiveFrom: string,
  settings: AdhanSettings = BASE_SETTINGS,
): AdhanConfigVersionRecord {
  return {
    id,
    effectiveFrom,
    settings: JSON.stringify(settings),
    reason: null,
    createdBy: 'test',
    createdAt: new Date('2024-01-01'),
  };
}

function makePeriod(
  id: number,
  startDate: string,
  endDate: string,
  settings: PartialAdhanSettings,
  deletedAt: Date | null = null,
): AdhanConfigPeriodRecord {
  return {
    id,
    label: `Period ${id}`,
    startDate,
    endDate,
    settings: JSON.stringify(settings),
    createdBy: 'test',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt,
  };
}

describe('resolveAdhanSettings', () => {
  describe('base version selection', () => {
    it('picks the version with effectiveFrom <= date', () => {
      const versions = [
        makeVersion(1, '1970-01-01'),
        makeVersion(2, '2025-01-01'),
        makeVersion(3, '2026-01-01'),
      ];
      const result = resolveAdhanSettings('2025-06-15', versions, []);
      expect(result.baseVersionId).toBe(2);
    });

    it('picks the latest applicable version when multiple qualify', () => {
      const versions = [
        makeVersion(1, '1970-01-01'),
        makeVersion(5, '2024-12-01'),
        makeVersion(9, '2025-06-01'),
      ];
      const result = resolveAdhanSettings('2025-06-15', versions, []);
      expect(result.baseVersionId).toBe(9);
    });

    it('throws when no version covers the requested date', () => {
      const versions = [makeVersion(1, '2030-01-01')];
      expect(() => resolveAdhanSettings('2025-06-15', versions, [])).toThrow();
    });
  });

  describe('general settings resolution', () => {
    it('returns base general settings when no periods apply', () => {
      const versions = [makeVersion(1, '1970-01-01')];
      const result = resolveAdhanSettings('2025-06-15', versions, []);
      expect(result.general.method).toBe('NorthAmerica');
      expect(result.general.madhab).toBe('shafi');
    });

    it('period overrides a general field', () => {
      const versions = [makeVersion(1, '1970-01-01')];
      const periods = [
        makePeriod(1, '2025-06-01', '2025-06-30', {
          general: { method: 'MuslimWorldLeague' },
        }),
      ];
      const result = resolveAdhanSettings('2025-06-15', versions, periods);
      expect(result.general.method).toBe('MuslimWorldLeague');
      // Other general fields still come from base
      expect(result.general.madhab).toBe('shafi');
    });
  });

  describe('period filtering', () => {
    it('ignores periods outside the date range', () => {
      const versions = [makeVersion(1, '1970-01-01')];
      const periods = [
        makePeriod(1, '2025-07-01', '2025-07-31', {
          general: { method: 'Egyptian' },
        }),
      ];
      const result = resolveAdhanSettings('2025-06-15', versions, periods);
      expect(result.general.method).toBe('NorthAmerica');
      expect(result.activePeriodIds).toHaveLength(0);
    });

    it('ignores soft-deleted periods', () => {
      const versions = [makeVersion(1, '1970-01-01')];
      const periods = [
        makePeriod(
          1,
          '2025-06-01',
          '2025-06-30',
          { general: { method: 'Egyptian' } },
          new Date(), // deletedAt set
        ),
      ];
      const result = resolveAdhanSettings('2025-06-15', versions, periods);
      expect(result.general.method).toBe('NorthAmerica');
    });

    it('includes the active period id in activePeriodIds', () => {
      const versions = [makeVersion(1, '1970-01-01')];
      const periods = [
        makePeriod(42, '2025-06-01', '2025-06-30', {
          prayers: { isha: { offsetMinutes: -6 } },
        }),
      ];
      const result = resolveAdhanSettings('2025-06-15', versions, periods);
      expect(result.activePeriodIds).toContain(42);
    });
  });

  describe('per-prayer resolution', () => {
    it('offsetMinutes defaults to 0 when no period sets it', () => {
      const versions = [makeVersion(1, '1970-01-01')];
      const result = resolveAdhanSettings('2025-06-15', versions, []);
      expect(result.perPrayer.fajr.offsetMinutes).toBe(0);
      expect(result.perPrayer.isha.offsetMinutes).toBe(0);
    });

    it('period sets offsetMinutes on a specific prayer', () => {
      const versions = [makeVersion(1, '1970-01-01')];
      const periods = [
        makePeriod(1, '2025-05-01', '2025-07-31', {
          prayers: { isha: { offsetMinutes: -6 } },
        }),
      ];
      const result = resolveAdhanSettings('2025-06-15', versions, periods);
      expect(result.perPrayer.isha.offsetMinutes).toBe(-6);
      expect(result.perPrayer.fajr.offsetMinutes).toBe(0);
    });

    it('all 6 prayer keys are present in perPrayer', () => {
      const versions = [makeVersion(1, '1970-01-01')];
      const result = resolveAdhanSettings('2025-01-01', versions, []);
      const keys = Object.keys(result.perPrayer);
      expect(keys).toContain('fajr');
      expect(keys).toContain('sunrise');
      expect(keys).toContain('dhuhr');
      expect(keys).toContain('asr');
      expect(keys).toContain('maghrib');
      expect(keys).toContain('isha');
    });

    it('per-prayer method falls back to general method', () => {
      const versions = [makeVersion(1, '1970-01-01')];
      const result = resolveAdhanSettings('2025-01-01', versions, []);
      expect(result.perPrayer.fajr.method).toBe('NorthAmerica');
      expect(result.perPrayer.isha.method).toBe('NorthAmerica');
    });
  });

  describe('determinism', () => {
    it('returns the same result for the same inputs (pure function)', () => {
      const versions = [makeVersion(1, '1970-01-01')];
      const periods = [
        makePeriod(1, '2025-06-01', '2025-06-30', {
          prayers: { fajr: { offsetMinutes: 5 } },
        }),
      ];
      const a = resolveAdhanSettings('2025-06-15', versions, periods);
      const b = resolveAdhanSettings('2025-06-15', versions, periods);
      expect(a).toEqual(b);
    });

    it('a period outside the date has no effect', () => {
      const versions = [makeVersion(1, '1970-01-01')];
      const withPeriod = [
        makePeriod(1, '2025-07-01', '2025-07-31', {
          prayers: { fajr: { offsetMinutes: 15 } },
        }),
      ];
      const inside = resolveAdhanSettings('2025-06-15', versions, withPeriod);
      const outside = resolveAdhanSettings('2025-06-15', versions, []);
      expect(inside.perPrayer.fajr.offsetMinutes).toBe(
        outside.perPrayer.fajr.offsetMinutes,
      );
    });
  });
});
