import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { AdhanAdapter } from '../adhan/adhan.adapter';
import { RulesService } from '../rules/rules.service';
import { OverrideService } from '../override/override.service';
import dayjs from '../dayjs';
import { formatHHmm } from '../rules/time-utils';

describe('CacheService', () => {
  let service: CacheService;
  let mockCacheManager: any;
  let mockAdhanAdapter: any;
  let mockRulesService: any;
  let mockOverrideService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    mockAdhanAdapter = {
      getPrayerTimes: jest.fn(),
    };

    mockRulesService = {
      computeIqama: jest.fn(),
    };

    mockOverrideService = {
      getOverridesForDate: jest.fn().mockResolvedValue([]),
      applyOverrides: jest.fn((rawAzanMap, iqamaTimes) => ({
        iqamaTimes,
        hasOverrides: false,
      })),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'app.masjidTimezone') return 'America/Vancouver';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: AdhanAdapter, useValue: mockAdhanAdapter },
        { provide: RulesService, useValue: mockRulesService },
        { provide: OverrideService, useValue: mockOverrideService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  describe('Schedule Building', () => {
    /**
     * Test that Iqama is always after or equal to Azan for all prayers.
     * This is a critical invariant that must always hold.
     */
    it('should ensure Iqama >= Azan for all prayers in all days', async () => {
      const fridayTimes = {
        fajr: dayjs.tz('2026-05-01 04:02', 'America/Vancouver'),
        sunrise: dayjs.tz('2026-05-01 05:45', 'America/Vancouver'),
        dhuhr: dayjs.tz('2026-05-01 13:09', 'America/Vancouver'),
        asr: dayjs.tz('2026-05-01 17:09', 'America/Vancouver'),
        maghrib: dayjs.tz('2026-05-01 20:28', 'America/Vancouver'),
        isha: dayjs.tz('2026-05-01 22:15', 'America/Vancouver'),
      };

      const thursdayTimes = {
        fajr: dayjs.tz('2026-05-07 03:57', 'America/Vancouver'),
        sunrise: dayjs.tz('2026-05-07 05:40', 'America/Vancouver'),
        dhuhr: dayjs.tz('2026-05-07 13:08', 'America/Vancouver'),
        asr: dayjs.tz('2026-05-07 17:11', 'America/Vancouver'),
        maghrib: dayjs.tz('2026-05-07 20:36', 'America/Vancouver'),
        isha: dayjs.tz('2026-05-07 22:29', 'America/Vancouver'),
      };

      mockAdhanAdapter.getPrayerTimes.mockImplementation((date: Date) => {
        const dateStr = date.toISOString().substring(0, 10);
        if (dateStr === '2026-05-01') return fridayTimes;
        if (dateStr === '2026-05-07') return thursdayTimes;
        return fridayTimes;
      });

      mockRulesService.computeIqama.mockImplementation((date, raw) => {
        // Dynamic mock that ensures Iqama > Azan by calculating based on actual Azan
        const ishaHour = raw.isha.hour();
        const ishaMinute = raw.isha.minute();
        const ishaTotal = ishaHour * 60 + ishaMinute;
        
        // Simple Isha calculation: add 10 minutes
        const ishaIqamaTotal = ishaTotal + 10;
        const ishaIqamaHour = Math.floor(ishaIqamaTotal / 60);
        const ishaIqamaMin = ishaIqamaTotal % 60;
        const ishaIqama = `${String(ishaIqamaHour).padStart(2, '0')}:${String(ishaIqamaMin).padStart(2, '0')}`;
        
        return {
          fajr: '05:05',
          dhuhr: '13:45',
          asr: '17:30',
          maghrib: formatHHmm(raw.maghrib.add(10, 'minute')),
          isha: ishaIqama,
        };
      });

      mockCacheManager.get.mockResolvedValue(null);

      const schedules = await service.buildMonth('2026-05');
      const thursday = schedules.find((s) => s.date === '2026-05-07');

      expect(thursday).toBeDefined();

      const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
      for (const prayer of prayers) {
        const azan = thursday![prayer].azan;
        const iqama = thursday![prayer].iqama;

        // Convert HH:mm to minutes for comparison
        const [azanHour, azanMin] = azan.split(':').map(Number);
        const [iqamaHour, iqamaMin] = iqama.split(':').map(Number);
        const azanMinutes = azanHour * 60 + azanMin;
        const iqamaMinutes = iqamaHour * 60 + iqamaMin;

        expect(iqamaMinutes).toBeGreaterThanOrEqual(azanMinutes);
      }
    });

    /**
     * Test that each day uses its own prayer times (no Friday Block).
     */
    it('should use each day own prayer times', async () => {
      const fridayTimes = {
        fajr: dayjs.tz('2026-05-01 04:02', 'America/Vancouver'),
        sunrise: dayjs.tz('2026-05-01 05:45', 'America/Vancouver'),
        dhuhr: dayjs.tz('2026-05-01 13:09', 'America/Vancouver'),
        asr: dayjs.tz('2026-05-01 17:09', 'America/Vancouver'),
        maghrib: dayjs.tz('2026-05-01 20:28', 'America/Vancouver'),
        isha: dayjs.tz('2026-05-01 22:15', 'America/Vancouver'),
      };

      const saturdayTimes = {
        fajr: dayjs.tz('2026-05-02 04:01', 'America/Vancouver'),
        sunrise: dayjs.tz('2026-05-02 05:44', 'America/Vancouver'),
        dhuhr: dayjs.tz('2026-05-02 13:09', 'America/Vancouver'),
        asr: dayjs.tz('2026-05-02 17:10', 'America/Vancouver'),
        maghrib: dayjs.tz('2026-05-02 20:29', 'America/Vancouver'),
        isha: dayjs.tz('2026-05-02 22:16', 'America/Vancouver'),
      };

      mockAdhanAdapter.getPrayerTimes.mockImplementation((date: Date) => {
        const dateStr = date.toISOString().substring(0, 10);
        if (dateStr === '2026-05-01') return fridayTimes;
        if (dateStr === '2026-05-02') return saturdayTimes;
        return fridayTimes;
      });

      mockRulesService.computeIqama.mockImplementation((date, raw) => {
        return {
          fajr: '05:05',
          dhuhr: '13:45',
          asr: formatHHmm(raw.asr.add(15, 'minute')),
          maghrib: formatHHmm(raw.maghrib.add(10, 'minute')),
          isha: formatHHmm(raw.isha.add(10, 'minute')),
        };
      });

      mockCacheManager.get.mockResolvedValue(null);

      const schedules = await service.buildMonth('2026-05');
      const friday = schedules.find((s) => s.date === '2026-05-01');
      const saturday = schedules.find((s) => s.date === '2026-05-02');

      expect(friday).toBeDefined();
      expect(saturday).toBeDefined();

      // Each day should use its own Azan times
      expect(friday!.fajr.azan).toBe('04:02');
      expect(saturday!.fajr.azan).toBe('04:01');
      
      expect(friday!.asr.azan).toBe('17:09');
      expect(saturday!.asr.azan).toBe('17:10');
      
      expect(friday!.isha.azan).toBe('22:15');
      expect(saturday!.isha.azan).toBe('22:16');
      
      expect(friday!.maghrib.azan).toBe('20:28');
      expect(saturday!.maghrib.azan).toBe('20:29');
    });

    /**
     * Test that schedule includes all required fields.
     */
    it('should build complete schedule with all required fields', async () => {
      const prayerTimes = {
        fajr: dayjs.tz('2026-05-01 04:02', 'America/Vancouver'),
        sunrise: dayjs.tz('2026-05-01 05:45', 'America/Vancouver'),
        dhuhr: dayjs.tz('2026-05-01 13:09', 'America/Vancouver'),
        asr: dayjs.tz('2026-05-01 17:09', 'America/Vancouver'),
        maghrib: dayjs.tz('2026-05-01 20:28', 'America/Vancouver'),
        isha: dayjs.tz('2026-05-01 22:15', 'America/Vancouver'),
      };

      mockAdhanAdapter.getPrayerTimes.mockReturnValue(prayerTimes);

      mockRulesService.computeIqama.mockReturnValue({
        fajr: '05:05',
        dhuhr: '13:45',
        asr: '17:30',
        maghrib: '20:35',
        isha: '22:25',
      });

      mockCacheManager.get.mockResolvedValue(null);

      const schedules = await service.buildMonth('2026-05');
      const schedule = schedules[0];

      expect(schedule).toHaveProperty('date');
      expect(schedule).toHaveProperty('day_of_week');
      expect(schedule).toHaveProperty('is_dst');
      expect(schedule).toHaveProperty('fajr');
      expect(schedule).toHaveProperty('dhuhr');
      expect(schedule).toHaveProperty('asr');
      expect(schedule).toHaveProperty('maghrib');
      expect(schedule).toHaveProperty('isha');
      expect(schedule).toHaveProperty('metadata');

      expect(schedule.fajr).toHaveProperty('azan');
      expect(schedule.fajr).toHaveProperty('iqama');
      expect(schedule.metadata).toHaveProperty('calculation_method', 'ISNA');
      expect(schedule.metadata).toHaveProperty('has_overrides', false);
    });
  });

  describe('Cache behavior', () => {
    it('should return cached data if available', async () => {
      const cachedData = [
        {
          date: '2026-05-01',
          day_of_week: 'Friday',
          is_dst: true,
          fajr: { azan: '04:02', iqama: '05:05' },
          dhuhr: { azan: '13:09', iqama: '13:45' },
          asr: { azan: '17:09', iqama: '17:30' },
          maghrib: { azan: '20:28', iqama: '20:35' },
          isha: { azan: '22:15', iqama: '22:25' },
          metadata: { calculation_method: 'ISNA', has_overrides: false },
        },
      ];

      mockCacheManager.get.mockResolvedValue(cachedData);

      const result = await service.getOrBuildMonth('2026-05');

      expect(result).toEqual(cachedData);
      expect(mockCacheManager.get).toHaveBeenCalledWith('schedule:2026-05');
      expect(mockAdhanAdapter.getPrayerTimes).not.toHaveBeenCalled();
    });

    it('should build and cache data if not in cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const prayerTimes = {
        fajr: dayjs.tz('2026-05-01 04:02', 'America/Vancouver'),
        sunrise: dayjs.tz('2026-05-01 05:45', 'America/Vancouver'),
        dhuhr: dayjs.tz('2026-05-01 13:09', 'America/Vancouver'),
        asr: dayjs.tz('2026-05-01 17:09', 'America/Vancouver'),
        maghrib: dayjs.tz('2026-05-01 20:28', 'America/Vancouver'),
        isha: dayjs.tz('2026-05-01 22:15', 'America/Vancouver'),
      };

      mockAdhanAdapter.getPrayerTimes.mockReturnValue(prayerTimes);

      mockRulesService.computeIqama.mockReturnValue({
        fajr: '05:05',
        dhuhr: '13:45',
        asr: '17:30',
        maghrib: '20:35',
        isha: '22:25',
      });

      const result = await service.getOrBuildMonth('2026-05');

      expect(result).toHaveLength(31); // May has 31 days
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'schedule:2026-05',
        expect.any(Array),
        2_592_000_000, // 30 days in ms
      );
    });
  });
});
