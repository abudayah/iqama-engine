import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Dayjs } from 'dayjs';
import dayjs from '../dayjs';
import { AdhanAdapter } from '../adhan/adhan.adapter';
import { RulesService } from '../rules/rules.service';
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
 * astronomical Hijri calendar (1st Shawwal or 10th Dhul-Hijjah).
 */
function isAstronomicalEidDay(date: Dayjs): boolean {
  const { month, day } = getHijriComponents(date);
  return (month === 10 && day === 1) || (month === 12 && day === 10);
}

@Injectable()
export class ScheduleBuilderService {
  private readonly timezone: string;

  constructor(
    private readonly adhanAdapter: AdhanAdapter,
    private readonly rulesService: RulesService,
    private readonly overrideService: OverrideService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly qiyamConfigService: QiyamConfigService,
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
    // Build a map: date → { prayer1, prayer2 } for O(1) lookup
    const eidByDate = new Map<string, { prayer1: string; prayer2: string }>();
    for (const sp of specialPrayers) {
      const prayers = sp.prayers as { label: string; time: string }[];
      const p1 =
        prayers.find((p) => p.label === '1st Eid Prayer')?.time ??
        FALLBACK_EID_PRAYER_1;
      const p2 =
        prayers.find((p) => p.label === '2nd Eid Prayer')?.time ??
        FALLBACK_EID_PRAYER_2;
      eidByDate.set(sp.date, { prayer1: p1, prayer2: p2 });
    }

    const schedules: DailySchedule[] = [];

    // Derive the Hijri year from the first day of the month and fetch qiyam config once
    const firstDay = dayjs.tz(`${yearMonth}-01`, tz);
    const hijriYear = getHijriComponents(firstDay).year;
    const qiyamConfig = await this.qiyamConfigService.getForYear(hijriYear);

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

      // (c) Compute iqama times via FR1–FR4
      const iqamaTimes = this.rulesService.computeIqama(date, raw);

      // (d) Build rawAzanMap for OFFSET override calculations
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

      // (e) Build the DailySchedule object
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

  async getMonth(yearMonth: string): Promise<DailySchedule[]> {
    return this.buildMonth(yearMonth);
  }
}
