import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RulesService } from './rules.service';
import { RawPrayerTimes } from '../adhan/adhan.adapter';
import dayjs from '../dayjs';

describe('RulesService', () => {
  let service: RulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RulesService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'app.masjidTimezone') return 'America/Vancouver';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RulesService>(RulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('computeIqama', () => {
    it('should compute all prayer Iqama times', () => {
      const date = '2025-06-15';
      const rawTimes: RawPrayerTimes = {
        fajr: dayjs.tz('2025-06-15 03:30', 'America/Vancouver'),
        sunrise: dayjs.tz('2025-06-15 05:15', 'America/Vancouver'),
        dhuhr: dayjs.tz('2025-06-15 13:10', 'America/Vancouver'),
        asr: dayjs.tz('2025-06-15 17:30', 'America/Vancouver'),
        maghrib: dayjs.tz('2025-06-15 20:30', 'America/Vancouver'),
        isha: dayjs.tz('2025-06-15 22:15', 'America/Vancouver'),
      };

      const result = service.computeIqama(date, rawTimes);

      expect(result).toHaveProperty('fajr');
      expect(result).toHaveProperty('dhuhr');
      expect(result).toHaveProperty('asr');
      expect(result).toHaveProperty('maghrib');
      expect(result).toHaveProperty('isha');

      // Verify format (HH:mm)
      expect(result.fajr).toMatch(/^\d{2}:\d{2}$/);
      expect(result.dhuhr).toMatch(/^\d{2}:\d{2}$/);
      expect(result.asr).toMatch(/^\d{2}:\d{2}$/);
      expect(result.maghrib).toMatch(/^\d{2}:\d{2}$/);
      expect(result.isha).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should ensure Iqama times are after Azan times', () => {
      const date = '2025-06-15';
      const rawTimes: RawPrayerTimes = {
        fajr: dayjs.tz('2025-06-15 03:30', 'America/Vancouver'),
        sunrise: dayjs.tz('2025-06-15 05:15', 'America/Vancouver'),
        dhuhr: dayjs.tz('2025-06-15 13:10', 'America/Vancouver'),
        asr: dayjs.tz('2025-06-15 17:30', 'America/Vancouver'),
        maghrib: dayjs.tz('2025-06-15 20:30', 'America/Vancouver'),
        isha: dayjs.tz('2025-06-15 22:15', 'America/Vancouver'),
      };

      const result = service.computeIqama(date, rawTimes);

      // Convert to minutes for comparison
      const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };

      expect(toMinutes(result.fajr)).toBeGreaterThanOrEqual(toMinutes('03:30'));
      expect(toMinutes(result.dhuhr)).toBeGreaterThanOrEqual(
        toMinutes('13:10'),
      );
      expect(toMinutes(result.asr)).toBeGreaterThanOrEqual(toMinutes('17:30'));
      expect(toMinutes(result.maghrib)).toBeGreaterThanOrEqual(
        toMinutes('20:30'),
      );
      expect(toMinutes(result.isha)).toBeGreaterThanOrEqual(toMinutes('22:15'));
    });

    it('should handle winter dates correctly', () => {
      const date = '2025-12-15';
      const rawTimes: RawPrayerTimes = {
        fajr: dayjs.tz('2025-12-15 06:30', 'America/Vancouver'),
        sunrise: dayjs.tz('2025-12-15 08:00', 'America/Vancouver'),
        dhuhr: dayjs.tz('2025-12-15 12:10', 'America/Vancouver'),
        asr: dayjs.tz('2025-12-15 14:30', 'America/Vancouver'),
        maghrib: dayjs.tz('2025-12-15 16:30', 'America/Vancouver'),
        isha: dayjs.tz('2025-12-15 18:15', 'America/Vancouver'),
      };

      const result = service.computeIqama(date, rawTimes);

      // Dhuhr should be 12:45 (standard time)
      expect(result.dhuhr).toBe('12:45');

      // Asr should be 15:00 (early winter)
      expect(result.asr).toBe('15:00');
    });
  });
});
