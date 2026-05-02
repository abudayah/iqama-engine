import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { Dayjs } from 'dayjs';
import dayjs from '../dayjs';
import { AdhanAdapter, RawPrayerTimes } from '../adhan/adhan.adapter';
import { RulesService } from '../rules/rules.service';
import { OverrideService } from '../override/override.service';
import { getPrecedingFridayDate } from '../rules/friday-block.rule';
import { isDstActive } from '../rules/dhuhr.rule';
import { formatHHmm } from '../rules/time-utils';
import { DailySchedule } from './daily-schedule.interface';

@Injectable()
export class CacheService {
  private readonly timezone: string;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly adhanAdapter: AdhanAdapter,
    private readonly rulesService: RulesService,
    private readonly overrideService: OverrideService,
    private readonly configService: ConfigService,
  ) {
    this.timezone = this.configService.get<string>('app.masjidTimezone')!;
  }

  /**
   * Build the full array of DailySchedule objects for a given month.
   * @param yearMonth - "YYYY-MM" string
   */
  async buildMonth(yearMonth: string): Promise<DailySchedule[]> {
    const tz = this.timezone;

    // Determine the number of days in the month
    const daysInMonth = dayjs.tz(`${yearMonth}-01`, tz).daysInMonth();

    const schedules: DailySchedule[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${yearMonth}-${String(day).padStart(2, '0')}`;

      // (a) Get raw prayer times for this day
      const dateObj = new Date(`${date}T12:00:00.000Z`);
      const raw = this.adhanAdapter.getPrayerTimes(dateObj);

      // (b) Determine the preceding Friday date
      const fridayDate = getPrecedingFridayDate(date, tz);

      // (c) If the preceding Friday is different from the current date, get its raw times
      let fridayRaw: RawPrayerTimes | undefined = undefined;
      if (fridayDate !== date) {
        const fridayDateObj = new Date(`${fridayDate}T12:00:00.000Z`);
        fridayRaw = this.adhanAdapter.getPrayerTimes(fridayDateObj);
      }

      // (d) Get overrides for this day
      const overrides = await this.overrideService.getOverridesForDate(date);

      // (e) Compute iqama times via FR1–FR5
      const iqamaTimes = this.rulesService.computeIqama(date, raw, fridayRaw);

      // (f) Build rawAzanMap for OFFSET override calculations
      const rawAzanMap: Record<string, Dayjs> = {
        fajr: raw.fajr,
        dhuhr: raw.dhuhr,
        asr: raw.asr,
        maghrib: raw.maghrib,
        isha: raw.isha,
      };

      // Apply overrides (FR6)
      const { iqamaTimes: finalIqama, hasOverrides } =
        this.overrideService.applyOverrides(rawAzanMap, iqamaTimes, overrides);

      // (g) Build the DailySchedule object
      const schedule: DailySchedule = {
        date,
        day_of_week: dayjs.tz(date, tz).format('dddd'),
        is_dst: isDstActive(date, tz),
        fajr: { azan: formatHHmm(raw.fajr), iqama: finalIqama.fajr },
        dhuhr: { azan: formatHHmm(raw.dhuhr), iqama: finalIqama.dhuhr },
        asr: { azan: formatHHmm(raw.asr), iqama: finalIqama.asr },
        maghrib: { azan: formatHHmm(raw.maghrib), iqama: finalIqama.maghrib },
        isha: { azan: formatHHmm(raw.isha), iqama: finalIqama.isha },
        metadata: {
          calculation_method: 'ISNA',
          has_overrides: hasOverrides,
        },
      };

      schedules.push(schedule);
    }

    return schedules;
  }

  async getOrBuildMonth(yearMonth: string): Promise<DailySchedule[]> {
    const cacheKey = `schedule:${yearMonth}`;
    const cached = await this.cacheManager.get<DailySchedule[]>(cacheKey);
    if (cached) {
      return cached;
    }
    const schedules = await this.buildMonth(yearMonth);
    await this.cacheManager.set(cacheKey, schedules, 2_592_000_000);
    return schedules;
  }
}
