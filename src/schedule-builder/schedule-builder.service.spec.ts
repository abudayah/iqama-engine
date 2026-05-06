import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import dayjs from '../dayjs';
import { ScheduleBuilderService } from './schedule-builder.service';
import { AdhanAdapter } from '../adhan/adhan.adapter';
import { RulesService } from '../rules/rules.service';
import { OverrideService } from '../override/override.service';
import { PrismaService } from '../prisma/prisma.service';
import { QiyamConfigService } from '../hijri-calendar/qiyam-config.service';

describe('ScheduleBuilderService', () => {
  let service: ScheduleBuilderService;
  let adhanAdapter: jest.Mocked<AdhanAdapter>;
  let rulesService: jest.Mocked<RulesService>;
  let overrideService: jest.Mocked<OverrideService>;
  let qiyamConfigService: jest.Mocked<QiyamConfigService>;

  beforeEach(async () => {
    const mockAdhanAdapter = {
      getPrayerTimes: jest.fn(),
    };

    const mockRulesService = {
      computeIqama: jest.fn(),
    };

    const mockOverrideService = {
      getOverridesForDate: jest.fn(),
      applyOverrides: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('America/Vancouver'),
    };

    // Mock PrismaService — return empty SpecialPrayer list by default
    const mockPrismaService = {
      specialPrayer: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const mockQiyamConfigService = {
      getForYear: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleBuilderService,
        { provide: AdhanAdapter, useValue: mockAdhanAdapter },
        { provide: RulesService, useValue: mockRulesService },
        { provide: OverrideService, useValue: mockOverrideService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: QiyamConfigService, useValue: mockQiyamConfigService },
      ],
    }).compile();

    service = module.get<ScheduleBuilderService>(ScheduleBuilderService);
    adhanAdapter = module.get(AdhanAdapter);
    rulesService = module.get(RulesService);
    overrideService = module.get(OverrideService);
    qiyamConfigService = module.get(QiyamConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildMonth', () => {
    it('should build schedule for a full month', async () => {
      const yearMonth = '2026-06';
      const tz = 'America/Vancouver';

      // Mock prayer times
      const mockPrayerTimes = {
        fajr: dayjs.tz('2026-06-01 03:00', tz),
        sunrise: dayjs.tz('2026-06-01 05:30', tz),
        dhuhr: dayjs.tz('2026-06-01 13:15', tz),
        asr: dayjs.tz('2026-06-01 17:30', tz),
        maghrib: dayjs.tz('2026-06-01 21:00', tz),
        isha: dayjs.tz('2026-06-01 22:45', tz),
      };

      adhanAdapter.getPrayerTimes.mockReturnValue(mockPrayerTimes);

      // Mock iqama times
      const mockIqamaTimes = {
        fajr: '04:15',
        dhuhr: '13:45',
        asr: '18:00',
        maghrib: '21:05',
        isha: '23:00',
      };

      rulesService.computeIqama.mockReturnValue(mockIqamaTimes);

      // Mock no overrides
      overrideService.getOverridesForDate.mockResolvedValue([]);
      overrideService.applyOverrides.mockReturnValue({
        iqamaTimes: mockIqamaTimes,
        hasOverrides: false,
      });

      const schedules = await service.buildMonth(yearMonth);

      // June has 30 days
      expect(schedules).toHaveLength(30);

      // Check first day structure
      const firstDay = schedules[0];
      expect(firstDay.date).toBe('2026-06-01');
      expect(firstDay.day_of_week).toBe('Monday');
      expect(firstDay.fajr.azan).toBe('03:00');
      expect(firstDay.fajr.iqama).toBe('04:15');
      expect(firstDay.sunrise).toBe('05:30');
      expect(firstDay.dhuhr.azan).toBe('13:15');
      expect(firstDay.dhuhr.iqama).toBe('13:45');
      expect(firstDay.asr.azan).toBe('17:30');
      expect(firstDay.asr.iqama).toBe('18:00');
      expect(firstDay.maghrib.azan).toBe('21:00');
      expect(firstDay.maghrib.iqama).toBe('21:05');
      expect(firstDay.isha.azan).toBe('22:45');
      expect(firstDay.isha.iqama).toBe('23:00');
      expect(firstDay.metadata.calculation_method).toBe('ISNA');
      expect(firstDay.metadata.has_overrides).toBe(false);
      expect(firstDay.hijri_date).toBeDefined();

      // Verify all days were processed
      expect(adhanAdapter.getPrayerTimes).toHaveBeenCalledTimes(30);
      expect(rulesService.computeIqama).toHaveBeenCalledTimes(30);
      expect(overrideService.getOverridesForDate).toHaveBeenCalledTimes(30);
    });

    it('should handle month with 31 days', async () => {
      const yearMonth = '2026-01';

      adhanAdapter.getPrayerTimes.mockReturnValue({
        fajr: dayjs.tz('2026-01-01 06:00', 'America/Vancouver'),
        sunrise: dayjs.tz('2026-01-01 08:00', 'America/Vancouver'),
        dhuhr: dayjs.tz('2026-01-01 12:30', 'America/Vancouver'),
        asr: dayjs.tz('2026-01-01 14:30', 'America/Vancouver'),
        maghrib: dayjs.tz('2026-01-01 16:30', 'America/Vancouver'),
        isha: dayjs.tz('2026-01-01 18:30', 'America/Vancouver'),
      });

      rulesService.computeIqama.mockReturnValue({
        fajr: '06:15',
        dhuhr: '12:45',
        asr: '16:00',
        maghrib: '16:35',
        isha: '18:45',
      });

      overrideService.getOverridesForDate.mockResolvedValue([]);
      overrideService.applyOverrides.mockReturnValue({
        iqamaTimes: {
          fajr: '06:15',
          dhuhr: '12:45',
          asr: '16:00',
          maghrib: '16:35',
          isha: '18:45',
        },
        hasOverrides: false,
      });

      const schedules = await service.buildMonth(yearMonth);

      // January has 31 days
      expect(schedules).toHaveLength(31);
      expect(schedules[30].date).toBe('2026-01-31');
    });

    it('should handle February in non-leap year', async () => {
      const yearMonth = '2026-02';

      adhanAdapter.getPrayerTimes.mockReturnValue({
        fajr: dayjs.tz('2026-02-01 06:00', 'America/Vancouver'),
        sunrise: dayjs.tz('2026-02-01 07:30', 'America/Vancouver'),
        dhuhr: dayjs.tz('2026-02-01 12:30', 'America/Vancouver'),
        asr: dayjs.tz('2026-02-01 15:00', 'America/Vancouver'),
        maghrib: dayjs.tz('2026-02-01 17:30', 'America/Vancouver'),
        isha: dayjs.tz('2026-02-01 19:00', 'America/Vancouver'),
      });

      rulesService.computeIqama.mockReturnValue({
        fajr: '06:15',
        dhuhr: '12:45',
        asr: '16:00',
        maghrib: '17:35',
        isha: '19:15',
      });

      overrideService.getOverridesForDate.mockResolvedValue([]);
      overrideService.applyOverrides.mockReturnValue({
        iqamaTimes: {
          fajr: '06:15',
          dhuhr: '12:45',
          asr: '16:00',
          maghrib: '17:35',
          isha: '19:15',
        },
        hasOverrides: false,
      });

      const schedules = await service.buildMonth(yearMonth);

      // February 2026 has 28 days (not a leap year)
      expect(schedules).toHaveLength(28);
      expect(schedules[27].date).toBe('2026-02-28');
    });

    it('should apply overrides when present', async () => {
      const yearMonth = '2026-06';

      adhanAdapter.getPrayerTimes.mockReturnValue({
        fajr: dayjs.tz('2026-06-01 03:00', 'America/Vancouver'),
        sunrise: dayjs.tz('2026-06-01 05:30', 'America/Vancouver'),
        dhuhr: dayjs.tz('2026-06-01 13:15', 'America/Vancouver'),
        asr: dayjs.tz('2026-06-01 17:30', 'America/Vancouver'),
        maghrib: dayjs.tz('2026-06-01 21:00', 'America/Vancouver'),
        isha: dayjs.tz('2026-06-01 22:45', 'America/Vancouver'),
      });

      rulesService.computeIqama.mockReturnValue({
        fajr: '04:15',
        dhuhr: '13:45',
        asr: '18:00',
        maghrib: '21:05',
        isha: '23:00',
      });

      // Mock override for Fajr
      const mockOverride = {
        id: 1,
        date: '2026-06-01',
        prayer: 'fajr',
        overrideType: 'FIXED',
        value: '04:30',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-01'),
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      overrideService.getOverridesForDate.mockResolvedValue([mockOverride]);
      overrideService.applyOverrides.mockReturnValue({
        iqamaTimes: {
          fajr: '04:30', // Overridden
          dhuhr: '13:45',
          asr: '18:00',
          maghrib: '21:05',
          isha: '23:00',
        },
        hasOverrides: true,
      });

      const schedules = await service.buildMonth(yearMonth);

      expect(schedules[0].fajr.iqama).toBe('04:30');
      expect(schedules[0].metadata.has_overrides).toBe(true);
    });

    it('should include hijri date in schedule', async () => {
      const yearMonth = '2026-06';

      adhanAdapter.getPrayerTimes.mockReturnValue({
        fajr: dayjs.tz('2026-06-01 03:00', 'America/Vancouver'),
        sunrise: dayjs.tz('2026-06-01 05:30', 'America/Vancouver'),
        dhuhr: dayjs.tz('2026-06-01 13:15', 'America/Vancouver'),
        asr: dayjs.tz('2026-06-01 17:30', 'America/Vancouver'),
        maghrib: dayjs.tz('2026-06-01 21:00', 'America/Vancouver'),
        isha: dayjs.tz('2026-06-01 22:45', 'America/Vancouver'),
      });

      rulesService.computeIqama.mockReturnValue({
        fajr: '04:15',
        dhuhr: '13:45',
        asr: '18:00',
        maghrib: '21:05',
        isha: '23:00',
      });

      overrideService.getOverridesForDate.mockResolvedValue([]);
      overrideService.applyOverrides.mockReturnValue({
        iqamaTimes: {
          fajr: '04:15',
          dhuhr: '13:45',
          asr: '18:00',
          maghrib: '21:05',
          isha: '23:00',
        },
        hasOverrides: false,
      });

      const schedules = await service.buildMonth(yearMonth);

      // Hijri date should be present and formatted correctly
      expect(schedules[0].hijri_date).toBeDefined();
      expect(schedules[0].hijri_date).toMatch(/^[A-Za-z-]+ \d+, \d{4}$/);
    });

    it('should correctly identify DST status', async () => {
      const yearMonth = '2026-06'; // DST active

      adhanAdapter.getPrayerTimes.mockReturnValue({
        fajr: dayjs.tz('2026-06-01 03:00', 'America/Vancouver'),
        sunrise: dayjs.tz('2026-06-01 05:30', 'America/Vancouver'),
        dhuhr: dayjs.tz('2026-06-01 13:15', 'America/Vancouver'),
        asr: dayjs.tz('2026-06-01 17:30', 'America/Vancouver'),
        maghrib: dayjs.tz('2026-06-01 21:00', 'America/Vancouver'),
        isha: dayjs.tz('2026-06-01 22:45', 'America/Vancouver'),
      });

      rulesService.computeIqama.mockReturnValue({
        fajr: '04:15',
        dhuhr: '13:45',
        asr: '18:00',
        maghrib: '21:05',
        isha: '23:00',
      });

      overrideService.getOverridesForDate.mockResolvedValue([]);
      overrideService.applyOverrides.mockReturnValue({
        iqamaTimes: {
          fajr: '04:15',
          dhuhr: '13:45',
          asr: '18:00',
          maghrib: '21:05',
          isha: '23:00',
        },
        hasOverrides: false,
      });

      const schedules = await service.buildMonth(yearMonth);

      // June should be DST
      expect(schedules[0].is_dst).toBe(true);
    });
  });

  /**
   * Helper to set up standard mocks for a month build.
   * Returns a function that sets up the mocks for a given yearMonth.
   */
  function setupStandardMocks(yearMonth: string) {
    const tz = 'America/Vancouver';
    adhanAdapter.getPrayerTimes.mockReturnValue({
      fajr: dayjs.tz(`${yearMonth}-01 04:00`, tz),
      sunrise: dayjs.tz(`${yearMonth}-01 06:00`, tz),
      dhuhr: dayjs.tz(`${yearMonth}-01 13:00`, tz),
      asr: dayjs.tz(`${yearMonth}-01 16:30`, tz),
      maghrib: dayjs.tz(`${yearMonth}-01 19:30`, tz),
      isha: dayjs.tz(`${yearMonth}-01 21:00`, tz),
    });
    rulesService.computeIqama.mockReturnValue({
      fajr: '04:15',
      dhuhr: '13:15',
      asr: '16:45',
      maghrib: '19:35',
      isha: '21:15',
    });
    overrideService.getOverridesForDate.mockResolvedValue([]);
    overrideService.applyOverrides.mockReturnValue({
      iqamaTimes: {
        fajr: '04:15',
        dhuhr: '13:15',
        asr: '16:45',
        maghrib: '19:35',
        isha: '21:15',
      },
      hasOverrides: false,
    });
  }

  describe('qiyam_time injection', () => {
    // Ramadan 1447 dates (from dayjs-hijri):
    // 2026-03-08 = Hijri 1447/9/19  (day before qualifying range)
    // 2026-03-09 = Hijri 1447/9/20  (first qualifying day)
    // 2026-03-18 = Hijri 1447/9/29  (last qualifying day)
    // 2026-03-19 = Hijri 1447/9/30  (day after qualifying range)
    // Month 2026-03 starts at Hijri 1447/9/12

    it('should inject qiyam_time on Hijri days 20–29 of month 9 when config exists', async () => {
      const yearMonth = '2026-03'; // Contains Ramadan 1447 days 12–30
      setupStandardMocks(yearMonth);
      qiyamConfigService.getForYear.mockResolvedValue({
        hijri_year: 1447,
        start_time: '02:00',
      });

      const schedules = await service.buildMonth(yearMonth);

      // 2026-03-09 is Hijri 1447/9/20 — index 8 (day 9 of March)
      // 2026-03-18 is Hijri 1447/9/29 — index 17 (day 18 of March)
      for (let day = 9; day <= 18; day++) {
        const idx = day - 1;
        expect(schedules[idx].qiyam_time).toBe('02:00');
      }
    });

    it('should NOT inject qiyam_time on Hijri day 19 of month 9', async () => {
      const yearMonth = '2026-03';
      setupStandardMocks(yearMonth);
      qiyamConfigService.getForYear.mockResolvedValue({
        hijri_year: 1447,
        start_time: '02:00',
      });

      const schedules = await service.buildMonth(yearMonth);

      // 2026-03-08 is Hijri 1447/9/19 — index 7 (day 8 of March)
      expect(schedules[7].qiyam_time).toBeUndefined();
    });

    it('should NOT inject qiyam_time on Hijri day 30 of month 9', async () => {
      const yearMonth = '2026-03';
      setupStandardMocks(yearMonth);
      qiyamConfigService.getForYear.mockResolvedValue({
        hijri_year: 1447,
        start_time: '02:00',
      });

      const schedules = await service.buildMonth(yearMonth);

      // 2026-03-19 is Hijri 1447/9/30 — index 18 (day 19 of March)
      expect(schedules[18].qiyam_time).toBeUndefined();
    });

    it('should NOT inject qiyam_time on any day of a non-Ramadan month', async () => {
      // 2026-06 is Hijri month 12 (Dhul-Hijjah) — not Ramadan
      const yearMonth = '2026-06';
      setupStandardMocks(yearMonth);
      qiyamConfigService.getForYear.mockResolvedValue({
        hijri_year: 1447,
        start_time: '02:00',
      });

      const schedules = await service.buildMonth(yearMonth);

      for (const schedule of schedules) {
        expect(schedule.qiyam_time).toBeUndefined();
      }
    });

    it('should NOT inject qiyam_time when no QiyamConfig exists', async () => {
      const yearMonth = '2026-03';
      setupStandardMocks(yearMonth);
      qiyamConfigService.getForYear.mockResolvedValue(null);

      const schedules = await service.buildMonth(yearMonth);

      for (const schedule of schedules) {
        expect(schedule.qiyam_time).toBeUndefined();
      }
    });
  });

  describe('getMonth', () => {
    it('should call buildMonth and return schedules', async () => {
      const yearMonth = '2026-06';
      const mockSchedules = [
        {
          date: '2026-06-01',
          hijri_date: 'Thul-Hijjah 6, 1447',
          day_of_week: 'Monday',
          is_dst: true,
          fajr: { azan: '03:00', iqama: '04:15' },
          sunrise: '05:30',
          dhuhr: { azan: '13:15', iqama: '13:45' },
          asr: { azan: '17:30', iqama: '18:00' },
          maghrib: { azan: '21:00', iqama: '21:05' },
          isha: { azan: '22:45', iqama: '23:00' },
          metadata: {
            calculation_method: 'ISNA' as const,
            has_overrides: false,
          },
        },
      ];

      const buildMonthSpy = jest
        .spyOn(service, 'buildMonth')
        .mockResolvedValue(mockSchedules);

      const result = await service.getMonth(yearMonth);

      expect(buildMonthSpy).toHaveBeenCalledWith(yearMonth);
      expect(result).toEqual(mockSchedules);
    });
  });
});
