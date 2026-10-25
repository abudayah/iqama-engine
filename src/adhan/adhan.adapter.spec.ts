import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AdhanAdapter } from './adhan.adapter';
import type {
  ResolvedAdhanSettings,
  ResolvedPrayerParams,
  PrayerKey,
} from '../adhan-config/adhan-config.types';

const PRAYERS: PrayerKey[] = [
  'fajr',
  'sunrise',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
];

function makeResolved(
  overrides: Partial<ResolvedPrayerParams> = {},
): ResolvedAdhanSettings {
  const base: ResolvedPrayerParams = {
    prayer: 'fajr',
    method: 'NorthAmerica',
    fajrAngle: 15,
    ishaAngle: 15,
    ishaInterval: null,
    maghribAngle: null,
    offsetMinutes: 0,
    madhab: 'shafi',
    highLatitudeRule: 'TwilightAngle',
    polarCircleResolution: 'Unresolved',
    rounding: 'Nearest',
    shafaq: undefined,
  };
  const perPrayer = Object.fromEntries(
    PRAYERS.map((p) => [p, { ...base, prayer: p, ...overrides }]),
  ) as Record<PrayerKey, ResolvedPrayerParams>;
  return {
    date: '2025-06-15',
    general: {
      method: 'NorthAmerica',
      madhab: 'shafi',
      highLatitudeRule: 'TwilightAngle',
      polarCircleResolution: 'Unresolved',
      rounding: 'Nearest',
    },
    perPrayer,
    baseVersionId: 1,
    activePeriodIds: [],
  };
}

describe('AdhanAdapter', () => {
  let adapter: AdhanAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdhanAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'app.masjidLatitude') return 49.2652047;
              if (key === 'app.masjidLongitude') return -122.7878735;
              if (key === 'app.masjidTimezone') return 'America/Vancouver';
              return null;
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get<AdhanAdapter>(AdhanAdapter);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('getPrayerTimes', () => {
    it('should return all prayer times for a given date', () => {
      const date = new Date('2025-06-15T12:00:00.000Z');
      const result = adapter.getPrayerTimes(date);

      expect(result.fajr.isValid()).toBe(true);
      expect(result.sunrise.isValid()).toBe(true);
      expect(result.dhuhr.isValid()).toBe(true);
      expect(result.asr.isValid()).toBe(true);
      expect(result.maghrib.isValid()).toBe(true);
      expect(result.isha.isValid()).toBe(true);
    });

    it('should return times in correct chronological order', () => {
      const date = new Date('2025-06-15T12:00:00.000Z');
      const result = adapter.getPrayerTimes(date);

      expect(result.fajr.valueOf()).toBeLessThan(result.sunrise.valueOf());
      expect(result.sunrise.valueOf()).toBeLessThan(result.dhuhr.valueOf());
      expect(result.dhuhr.valueOf()).toBeLessThan(result.asr.valueOf());
      expect(result.asr.valueOf()).toBeLessThan(result.maghrib.valueOf());
      expect(result.maghrib.valueOf()).toBeLessThan(result.isha.valueOf());
    });

    it('should return different times for different dates', () => {
      const summerDate = new Date('2025-06-21T12:00:00.000Z');
      const winterDate = new Date('2025-12-21T12:00:00.000Z');

      const summerTimes = adapter.getPrayerTimes(summerDate);
      const winterTimes = adapter.getPrayerTimes(winterDate);

      expect(summerTimes.fajr.hour()).toBeLessThan(winterTimes.fajr.hour());
      expect(summerTimes.maghrib.hour()).toBeGreaterThan(
        winterTimes.maghrib.hour(),
      );
    });

    it('should use correct timezone', () => {
      const date = new Date('2025-06-15T12:00:00.000Z');
      const result = adapter.getPrayerTimes(date);

      expect(result.fajr.format('Z')).toMatch(/^-0[78]:00$/);
      expect(result.dhuhr.format('Z')).toMatch(/^-0[78]:00$/);
    });

    it('should handle leap year dates', () => {
      const leapDate = new Date('2024-02-29T12:00:00.000Z');
      const result = adapter.getPrayerTimes(leapDate);

      expect(result.fajr.isValid()).toBe(true);
      expect(result.dhuhr.isValid()).toBe(true);
    });

    it('should handle dates near summer solstice', () => {
      const solsticeDate = new Date('2025-06-21T12:00:00.000Z');
      const result = adapter.getPrayerTimes(solsticeDate);

      expect(result.fajr.hour()).toBeLessThan(4);
      expect(result.maghrib.hour()).toBeGreaterThan(20);
    });

    it('should handle dates near winter solstice', () => {
      const solsticeDate = new Date('2025-12-21T12:00:00.000Z');
      const result = adapter.getPrayerTimes(solsticeDate);

      expect(result.fajr.hour()).toBeGreaterThan(5);
      expect(result.maghrib.hour()).toBeLessThan(17);
    });
  });

  describe('getPrayerTimesFromConfig', () => {
    it('returns all 6 valid prayer times', () => {
      const date = new Date('2025-06-15T12:00:00.000Z');
      const result = adapter.getPrayerTimesFromConfig(date, makeResolved());

      for (const p of PRAYERS) {
        expect(result[p].isValid()).toBe(true);
      }
    });

    it('maintains Fajr < Sunrise < Dhuhr < Asr < Maghrib < Isha', () => {
      const date = new Date('2025-06-15T12:00:00.000Z');
      const r = adapter.getPrayerTimesFromConfig(date, makeResolved());

      expect(r.fajr.valueOf()).toBeLessThan(r.sunrise.valueOf());
      expect(r.sunrise.valueOf()).toBeLessThan(r.dhuhr.valueOf());
      expect(r.dhuhr.valueOf()).toBeLessThan(r.asr.valueOf());
      expect(r.asr.valueOf()).toBeLessThan(r.maghrib.valueOf());
      expect(r.maghrib.valueOf()).toBeLessThan(r.isha.valueOf());
    });

    it('produces same Fajr/Dhuhr/Maghrib as legacy adapter in December (no seasonal offset)', () => {
      const date = new Date('2025-12-15T12:00:00.000Z');
      const legacy = adapter.getPrayerTimes(date);
      const fromConfig = adapter.getPrayerTimesFromConfig(date, makeResolved());

      expect(fromConfig.fajr.format('HH:mm')).toBe(legacy.fajr.format('HH:mm'));
      expect(fromConfig.dhuhr.format('HH:mm')).toBe(
        legacy.dhuhr.format('HH:mm'),
      );
      expect(fromConfig.maghrib.format('HH:mm')).toBe(
        legacy.maghrib.format('HH:mm'),
      );
    });

    it('applies a negative offset to Isha only', () => {
      const date = new Date('2025-12-15T12:00:00.000Z');
      const baseline = adapter.getPrayerTimesFromConfig(date, makeResolved());

      // Apply -6 offset only to Isha
      const resolvedWithIshaOffset = makeResolved();
      resolvedWithIshaOffset.perPrayer.isha = {
        ...resolvedWithIshaOffset.perPrayer.isha,
        offsetMinutes: -6,
      };
      const withOffset = adapter.getPrayerTimesFromConfig(
        date,
        resolvedWithIshaOffset,
      );

      const diffMinutes =
        (baseline.isha.valueOf() - withOffset.isha.valueOf()) / 60000;
      expect(diffMinutes).toBe(6);
      // Other prayers unaffected
      expect(withOffset.fajr.format('HH:mm')).toBe(
        baseline.fajr.format('HH:mm'),
      );
    });

    it('Hanafi Asr is later than Shafi Asr', () => {
      const date = new Date('2025-06-15T12:00:00.000Z');
      const shafi = adapter.getPrayerTimesFromConfig(
        date,
        makeResolved({ madhab: 'shafi' }),
      );
      const hanafi = adapter.getPrayerTimesFromConfig(
        date,
        makeResolved({ madhab: 'hanafi' }),
      );

      expect(hanafi.asr.valueOf()).toBeGreaterThan(shafi.asr.valueOf());
    });

    it('handles MuslimWorldLeague method without throwing', () => {
      const date = new Date('2025-06-15T12:00:00.000Z');
      const result = adapter.getPrayerTimesFromConfig(
        date,
        makeResolved({ method: 'MuslimWorldLeague', ishaAngle: 17 }),
      );

      expect(result.fajr.isValid()).toBe(true);
      expect(result.isha.isValid()).toBe(true);
    });

    it('handles UmmAlQura (ishaInterval) without throwing', () => {
      const date = new Date('2025-06-15T12:00:00.000Z');
      const result = adapter.getPrayerTimesFromConfig(
        date,
        makeResolved({
          method: 'UmmAlQura',
          ishaAngle: null,
          ishaInterval: 90,
        }),
      );

      expect(result.isha.isValid()).toBe(true);
    });
  });
});
