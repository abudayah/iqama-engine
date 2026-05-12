/**
 * Property-Based Tests for ScheduleBuilderService — Qiyam injection
 *
 * Feature: ramadan-eid-admin-redesign
 *
 * **Validates: Requirements 9.1, 9.3, 12.2**
 */

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import dayjs from '../dayjs';
import { ScheduleBuilderService } from './schedule-builder.service';
import { AdhanAdapter } from '../adhan/adhan.adapter';
import { RulesService } from '../rules/rules.service';
import { OverrideService } from '../override/override.service';
import { PrismaService } from '../prisma/prisma.service';
import { QiyamConfigService } from '../hijri-calendar/qiyam-config.service';

/**
 * Generates valid HH:mm time strings (00:00–23:59).
 */
const validHHmmArbitrary = fc
  .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
  .map(
    ([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
  );

describe('ScheduleBuilderService — Property-Based Tests', () => {
  let service: ScheduleBuilderService;
  let qiyamConfigService: jest.Mocked<QiyamConfigService>;

  beforeEach(async () => {
    const tz = 'America/Vancouver';

    const mockAdhanAdapter = {
      getPrayerTimes: jest.fn().mockReturnValue({
        fajr: dayjs.tz('2026-03-01 04:00', tz),
        sunrise: dayjs.tz('2026-03-01 06:00', tz),
        dhuhr: dayjs.tz('2026-03-01 13:00', tz),
        asr: dayjs.tz('2026-03-01 16:30', tz),
        maghrib: dayjs.tz('2026-03-01 19:30', tz),
        isha: dayjs.tz('2026-03-01 21:00', tz),
      }),
    };

    const mockRulesService = {
      computeIqama: jest.fn().mockReturnValue({
        fajr: '04:15',
        dhuhr: '13:15',
        asr: '16:45',
        maghrib: '19:35',
        isha: '21:15',
      }),
    };

    const mockOverrideService = {
      getOverridesForDate: jest.fn().mockResolvedValue([]),
      applyOverrides: jest.fn().mockReturnValue({
        iqamaTimes: {
          fajr: '04:15',
          dhuhr: '13:15',
          asr: '16:45',
          maghrib: '19:35',
          isha: '21:15',
        },
        hasOverrides: false,
      }),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('America/Vancouver'),
    };

    const mockPrismaService = {
      specialPrayer: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const mockQiyamConfigService = {
      getForYear: jest.fn().mockResolvedValue(null),
    };

    const mockCacheManager = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      store: {
        reset: jest.fn().mockResolvedValue(undefined),
      },
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
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<ScheduleBuilderService>(ScheduleBuilderService);
    qiyamConfigService = module.get(QiyamConfigService);
  });

  /**
   * Property 2: Schedule injection preserves start_time exactly
   *
   * For any valid HH:mm start time stored in QiyamConfig,
   * ScheduleBuilderService.buildMonth SHALL inject the identical string value
   * as qiyam_time on every date that falls on Hijri days 20–29 of month 9,
   * and SHALL NOT inject qiyam_time on any other day.
   *
   * **Validates: Requirements 9.1, 9.3, 12.2**
   *
   * Uses Gregorian month 2026-03 which spans Hijri 1447/9/12 through 1447/9/30:
   *   - Hijri 9/20 = 2026-03-09 (index 8)
   *   - Hijri 9/29 = 2026-03-18 (index 17)
   *   - Hijri 9/19 = 2026-03-08 (index 7)  — NOT qualifying
   *   - Hijri 9/30 = 2026-03-19 (index 18) — NOT qualifying
   */
  it('Property 2: injects exact start_time as qiyam_time on qualifying Ramadan nights only', async () => {
    await fc.assert(
      fc.asyncProperty(validHHmmArbitrary, async (startTime) => {
        // Mock QiyamConfigService to return the generated start time
        qiyamConfigService.getForYear.mockResolvedValue({
          hijri_year: 1447,
          start_time: startTime,
        });

        const schedules = await service.buildMonth('2026-03');

        // Qualifying days: 2026-03-09 (index 8) through 2026-03-18 (index 17)
        // These are Hijri 1447/9/20 through 1447/9/29
        for (let idx = 0; idx < schedules.length; idx++) {
          const day = idx + 1; // 1-based day of March
          const isQualifying = day >= 9 && day <= 18;

          if (isQualifying) {
            if (schedules[idx].qiyam_time !== startTime) {
              return false;
            }
          } else {
            if (schedules[idx].qiyam_time !== undefined) {
              return false;
            }
          }
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });
});
