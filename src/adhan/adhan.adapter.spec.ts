import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AdhanAdapter } from './adhan.adapter';

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

      expect(result).toHaveProperty('fajr');
      expect(result).toHaveProperty('sunrise');
      expect(result).toHaveProperty('dhuhr');
      expect(result).toHaveProperty('asr');
      expect(result).toHaveProperty('maghrib');
      expect(result).toHaveProperty('isha');

      // All should be dayjs objects
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

      // Convert to timestamps for comparison
      const fajrTime = result.fajr.valueOf();
      const sunriseTime = result.sunrise.valueOf();
      const dhuhrTime = result.dhuhr.valueOf();
      const asrTime = result.asr.valueOf();
      const maghribTime = result.maghrib.valueOf();
      const ishaTime = result.isha.valueOf();

      expect(fajrTime).toBeLessThan(sunriseTime);
      expect(sunriseTime).toBeLessThan(dhuhrTime);
      expect(dhuhrTime).toBeLessThan(asrTime);
      expect(asrTime).toBeLessThan(maghribTime);
      expect(maghribTime).toBeLessThan(ishaTime);
    });

    it('should return different times for different dates', () => {
      const summerDate = new Date('2025-06-21T12:00:00.000Z');
      const winterDate = new Date('2025-12-21T12:00:00.000Z');

      const summerTimes = adapter.getPrayerTimes(summerDate);
      const winterTimes = adapter.getPrayerTimes(winterDate);

      // Fajr should be earlier in summer
      expect(summerTimes.fajr.hour()).toBeLessThan(winterTimes.fajr.hour());

      // Maghrib should be later in summer
      expect(summerTimes.maghrib.hour()).toBeGreaterThan(
        winterTimes.maghrib.hour(),
      );
    });

    it('should use correct timezone', () => {
      const date = new Date('2025-06-15T12:00:00.000Z');
      const result = adapter.getPrayerTimes(date);

      // All times should be in America/Vancouver timezone
      expect(result.fajr.format('Z')).toMatch(/^-0[78]:00$/); // -07:00 or -08:00
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

      // Fajr should be very early
      expect(result.fajr.hour()).toBeLessThan(4);

      // Maghrib should be very late
      expect(result.maghrib.hour()).toBeGreaterThan(20);
    });

    it('should handle dates near winter solstice', () => {
      const solsticeDate = new Date('2025-12-21T12:00:00.000Z');
      const result = adapter.getPrayerTimes(solsticeDate);

      // Fajr should be later
      expect(result.fajr.hour()).toBeGreaterThan(5);

      // Maghrib should be earlier
      expect(result.maghrib.hour()).toBeLessThan(17);
    });
  });
});
