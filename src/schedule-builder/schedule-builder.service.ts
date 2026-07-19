import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Dayjs } from 'dayjs';
import dayjs from '../dayjs';
import { AdhanAdapter } from '../adhan/adhan.adapter';
import { RulesService, WeeklyContext } from '../rules/rules.service';
import { WeeklyFajrEntry } from '../rules/fajr.rule';
import { OverrideService } from '../override/override.service';
import { PrismaService } from '../prisma/prisma.service';
import { QiyamConfigService } from '../hijri-calendar/qiyam-config.service';
import {
  getHijriComponents,
  formatHijriDate,
} from '../hijri-calendar/hijri-utils';
import { isDstActive } from '../rules/dhuhr.rule';
import { formatHHmm } from '../rules/time-utils';
import { DailySchedule } from '../schedule/daily-schedule.interface';

/** Placeholder Eid prayer times used when no SpecialPrayer record has been saved */
const FALLBACK_EID_PRAYER_1 = '07:00';
const FALLBACK_EID_PRAYER_2 = '08:30';

/**
 * Returns true when the given date falls on a Qiyam night:
 * Hijri month = 9 (Ramadan) and Hijri day ∈ {20, 21, …, 29}.
 * Day 30 is excluded — it is the last night of Ramadan and Eid eve,
 * not a Qiyam night.
 */
function isQiyamNight(date: Dayjs): boolean {
  const { month, day } = getHijriComponents(date);
  return month === 9 && day >= 20 && day <= 29;
}

/**
 * Returns true if the given Gregorian date is an Eid day according to the
 * astronomical Hijri calendar.
 * - Eid al-Fitr:  1st–3rd of Shawwal (month 10, days 1–3)
 * - Eid al-Adha: 10th–13th of Dhul-Hijjah (month 12, days 10–13)
 */
function isAstronomicalEidDay(date: Dayjs): boolean {
  const { month, day } = getHijriComponents(date);
  return (
    (month === 10 && day >= 1 && day <= 3) ||
    (month === 12 && day >= 10 && day <= 13)
  );
}

@Injectable()
export class ScheduleBuilderService {
  private readonly timezone: string;

  /**
   * In-flight build tracker — keyed by cache key ("schedule:YYYY-MM").
   *
   * When multiple concurrent requests arrive for the same uncached month,
   * only one `buildMonth()` runs; the rest await the same Promise.
   * This also closes the stale-write race: if `invalidateCache` fires and
   * deletes a key while a build is still in-flight, the in-flight entry is
   * removed from this map by `invalidateCache` so its eventual `set()` is
   * suppressed (the Promise resolves to the data but we skip the cache write).
   */
  private readonly inFlight = new Map<string, Promise<DailySchedule[]>>();

  constructor(
    private readonly adhanAdapter: AdhanAdapter,
    private readonly rulesService: RulesService,
    private readonly overrideService: OverrideService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly qiyamConfigService: QiyamConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
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

    // Pre-fetch all SpecialPrayer records whose date falls in this month
    // so we don't query per-day inside the loop.
    const monthStart = `${yearMonth}-01`;
    const monthEnd = `${yearMonth}-${String(daysInMonth).padStart(2, '0')}`;
    const specialPrayers = await this.prisma.specialPrayer.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
    });
    // Build a map: date → { prayer1, prayer2 } for O(1) lookup.
    // Each SpecialPrayer record is stored against the first day of each Eid.
    // We also populate the subsequent Eid days (days 2–3 for Eid al-Fitr,
    // days 11–13 for Eid al-Adha) so they share the same admin-configured times.
    const eidByDate = new Map<string, { prayer1: string; prayer2: string }>();
    for (const sp of specialPrayers) {
      const prayers = JSON.parse(sp.prayers) as {
        label: string;
        time: string;
      }[];
      const p1 =
        prayers.find((p) => p.label === '1st Eid Prayer')?.time ??
        FALLBACK_EID_PRAYER_1;
      const p2 =
        prayers.find((p) => p.label === '2nd Eid Prayer')?.time ??
        FALLBACK_EID_PRAYER_2;
      const entry = { prayer1: p1, prayer2: p2 };

      // Day 1 (the stored date)
      eidByDate.set(sp.date, entry);

      // Propagate to remaining Eid days:
      // Eid al-Fitr (type EID_AL_FITR): days 1–3 → +1, +2
      // Eid al-Adha (type EID_AL_ADHA): days 10–13 → +1, +2, +3
      const extraDays = sp.type === 'EID_AL_ADHA' ? 3 : 2;
      for (let offset = 1; offset <= extraDays; offset++) {
        eidByDate.set(
          dayjs(sp.date).add(offset, 'day').format('YYYY-MM-DD'),
          entry,
        );
      }
    }

    const schedules: DailySchedule[] = [];

    // Derive the Hijri year from the first day of the month and fetch qiyam config once
    const firstDay = dayjs.tz(`${yearMonth}-01`, tz);
    const hijriYear = getHijriComponents(firstDay).year;
    const qiyamConfig = await this.qiyamConfigService.getForYear(hijriYear);

    // Pre-compute weekly contexts once per ISO week rather than once per day.
    // Days in the same week share the same Friday→Thursday window, so computing
    // the context 7× per week is wasteful.  Key = the ISO date of the Friday
    // that starts that week.
    const weeklyCtxCache = new Map<string, WeeklyContext>();

    const getWeeklyCtx = (date: string): WeeklyContext => {
      const d = dayjs.tz(date, tz);
      const dayOfWeek = d.day(); // 0 Sun … 5 Fri … 6 Sat
      const daysSinceFriday = (dayOfWeek + 2) % 7;
      const weekFridayKey = d
        .subtract(daysSinceFriday, 'day')
        .format('YYYY-MM-DD');

      const cached = weeklyCtxCache.get(weekFridayKey);
      if (cached) return cached;

      const ctx = this.buildWeeklyContext(date, tz);
      weeklyCtxCache.set(weekFridayKey, ctx);
      return ctx;
    };

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${yearMonth}-${String(day).padStart(2, '0')}`;

      // (a) Get raw prayer times for this day.
      // Use local noon in the masjid timezone (not UTC noon) so the adhan
      // library receives the correct calendar date regardless of the server's
      // system timezone.
      const dateObj = dayjs.tz(`${date}T12:00:00`, tz).toDate();
      const raw = this.adhanAdapter.getPrayerTimes(dateObj);

      // (b) Get overrides for this day
      const overrides = await this.overrideService.getOverridesForDate(date);

      // (c) Get the weekly context (Friday→Thursday window) for FR3-W / FR4-W.
      //     Reuse the cached result when multiple days share the same week.
      const weeklyCtx = getWeeklyCtx(date);

      // (d) Compute iqama times via FR1–FR4 (weekly rules for Fajr & Isha)
      const iqamaTimes = this.rulesService.computeIqama(date, raw, weeklyCtx);

      // (e) Build rawAzanMap for OFFSET override calculations
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

      // (f) Build the DailySchedule object
      const dateDayjs = dayjs.tz(date, tz);
      const hijriDate = formatHijriDate(dateDayjs);

      // Only inject Eid prayers on the actual Eid day (astronomical check)
      const isEidDay = isAstronomicalEidDay(dateDayjs);
      const eidEntry = isEidDay
        ? (eidByDate.get(date) ?? {
            prayer1: FALLBACK_EID_PRAYER_1,
            prayer2: FALLBACK_EID_PRAYER_2,
          })
        : undefined;

      const schedule: DailySchedule = {
        date,
        hijri_date: hijriDate,
        day_of_week: dateDayjs.format('dddd'),
        is_dst: isDstActive(date, tz),
        fajr: { azan: formatHHmm(raw.fajr), iqama: finalIqama.fajr },
        sunrise: formatHHmm(raw.sunrise),
        dhuhr: { azan: formatHHmm(raw.dhuhr), iqama: finalIqama.dhuhr },
        asr: { azan: formatHHmm(raw.asr), iqama: finalIqama.asr },
        maghrib: { azan: formatHHmm(raw.maghrib), iqama: finalIqama.maghrib },
        isha: { azan: formatHHmm(raw.isha), iqama: finalIqama.isha },
        ...(eidEntry
          ? { eid_prayer_1: eidEntry.prayer1, eid_prayer_2: eidEntry.prayer2 }
          : {}),
        ...(qiyamConfig && isQiyamNight(dateDayjs)
          ? { qiyam_time: qiyamConfig.start_time }
          : {}),
        metadata: {
          calculation_method: 'ISNA',
          has_overrides: hasOverrides,
        },
      };

      schedules.push(schedule);
    }

    return schedules;
  }

  /**
   * Build the WeeklyContext for a given date.
   *
   * The week window runs from the most recent Friday (inclusive) through the
   * following Thursday (inclusive), i.e. 7 days.  This is the canonical
   * Islamic week used for announcing fixed Fajr and Isha Iqama times.
   *
   * dayjs day-of-week: 0 = Sunday … 5 = Friday … 6 = Saturday
   */
  private buildWeeklyContext(date: string, tz: string): WeeklyContext {
    const d = dayjs.tz(date, tz);

    // Find the Friday that starts this week.
    // dayjs .day() → 0 Sun, 1 Mon, 2 Tue, 3 Wed, 4 Thu, 5 Fri, 6 Sat
    const dayOfWeek = d.day(); // 0–6
    // Days since last Friday: Fri=0, Sat=1, Sun=2, Mon=3, Tue=4, Wed=5, Thu=6
    const daysSinceFriday = (dayOfWeek + 2) % 7;
    const weekStart = d.subtract(daysSinceFriday, 'day'); // Friday

    const fajrWeek: WeeklyFajrEntry[] = [];
    const ishaWeek: Dayjs[] = [];

    for (let i = 0; i < 7; i++) {
      const weekDate = weekStart.add(i, 'day');
      // Use the same pattern as the main calculation to ensure timezone consistency
      const weekDateStr = weekDate.format('YYYY-MM-DD');
      const weekDateObj = dayjs.tz(`${weekDateStr}T12:00:00`, tz).toDate();
      const weekRaw = this.adhanAdapter.getPrayerTimes(weekDateObj);
      fajrWeek.push({ fajrAzan: weekRaw.fajr, sunrise: weekRaw.sunrise });
      ishaWeek.push(weekRaw.isha);
    }

    return { fajrWeek, ishaWeek };
  }

  async getMonth(yearMonth: string): Promise<DailySchedule[]> {
    const cacheKey = `schedule:${yearMonth}`;

    // 1. Cache hit — return immediately.
    const cached = await this.cacheManager.get<DailySchedule[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Already building this month — join the in-flight promise instead of
    //    starting a second redundant build (thundering-herd protection).
    const existing = this.inFlight.get(cacheKey);
    if (existing) {
      return existing;
    }

    // 3. Start a new build and register it so concurrent callers can share it.
    const build = this.buildMonth(yearMonth).then(async (schedules) => {
      // Only write to cache if this build is still the "current" one for this
      // key.  If invalidateCache() ran while we were building, it will have
      // removed this entry from inFlight — in that case we skip the set() so
      // the stale result never lands in cache.
      if (this.inFlight.get(cacheKey) === build) {
        await this.cacheManager.set(cacheKey, schedules);
        this.inFlight.delete(cacheKey);
      }
      return schedules;
    });

    // Store *before* awaiting so any concurrent callers that arrive while
    // buildMonth is running will find and share this promise.
    this.inFlight.set(cacheKey, build);

    return build;
  }

  /**
   * Invalidate cache for affected months when overrides or special prayers change.
   * Called by admin operations.
   *
   * Also removes any in-flight build promises for the affected months so that
   * a build which started before this invalidation cannot write stale data back
   * into the cache after the invalidation completes.
   */
  async invalidateCache(startDate?: string, endDate?: string): Promise<void> {
    if (!startDate && !endDate) {
      // Clear all cached schedules and all in-flight builds.
      this.inFlight.clear();
      await this.cacheManager.clear();
      return;
    }

    // Invalidate specific months affected by the date range.
    // Strip to YYYY-MM-DD before parsing to avoid UTC→local timezone shifts
    // that could cause dayjs to land on the wrong calendar day/month.
    const startDateStr = startDate!.substring(0, 10);
    const endDateStr = (endDate || startDate)!.substring(0, 10);
    const start = dayjs(startDateStr);
    const end = dayjs(endDateStr);

    const monthsToInvalidate = new Set<string>();
    let current = start.startOf('month');

    while (current.isBefore(end) || current.isSame(end, 'month')) {
      monthsToInvalidate.add(current.format('YYYY-MM'));
      current = current.add(1, 'month');
    }

    for (const yearMonth of monthsToInvalidate) {
      const cacheKey = `schedule:${yearMonth}`;
      // Remove the in-flight promise first so any pending build's then()
      // callback sees the key is gone and skips the cache write.
      this.inFlight.delete(cacheKey);
      await this.cacheManager.del(cacheKey);
    }
  }
}
