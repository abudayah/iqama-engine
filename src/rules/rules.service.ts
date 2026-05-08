import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RawPrayerTimes } from '../adhan/adhan.adapter';
import {
  computeFajrIqama,
  computeWeeklyFajrIqama,
  WeeklyFajrEntry,
} from './fajr.rule';
import { computeDhuhrIqama } from './dhuhr.rule';
import { computeAsrIqama } from './asr.rule';
import { computeMaghribIqama } from './maghrib.rule';
import { computeIshaIqama, computeWeeklyIshaIqama } from './isha.rule';
import { Dayjs } from 'dayjs';

export interface IqamaTimes {
  fajr: string; // HH:mm
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

/** Weekly prayer time context used by the FR3-W and FR4-W rules. */
export interface WeeklyContext {
  /** Fajr + Sunrise pairs for each day in the Friday→Thursday window. */
  fajrWeek: WeeklyFajrEntry[];
  /** Isha Azan times for each day in the Friday→Thursday window. */
  ishaWeek: Dayjs[];
}

@Injectable()
export class RulesService {
  private readonly timezone: string;

  constructor(private readonly configService: ConfigService) {
    this.timezone = this.configService.get<string>('app.masjidTimezone')!;
  }

  /**
   * Compute Iqama times for a given date.
   *
   * @param date        - YYYY-MM-DD string for the requested date
   * @param raw         - Raw prayer times for the requested date
   * @param weeklyCtx   - Optional weekly context (Friday→Thursday window).
   *                      When provided, Fajr and Isha use the weekly fixed
   *                      time (FR3-W / FR4-W) instead of the per-day formula.
   */
  computeIqama(
    date: string,
    raw: RawPrayerTimes,
    weeklyCtx?: WeeklyContext,
  ): IqamaTimes {
    // Fajr: weekly fixed time when context is available, otherwise per-day FR3
    const fajr = weeklyCtx
      ? computeWeeklyFajrIqama(weeklyCtx.fajrWeek)
      : computeFajrIqama(raw.fajr, raw.sunrise);

    // Dhuhr: always use the requested date + timezone (DST toggle)
    const dhuhr = computeDhuhrIqama(date, this.timezone);

    // Asr: use current day's times
    const asr = computeAsrIqama(raw.asr);

    // Maghrib: use current day's times
    const maghrib = computeMaghribIqama(raw.maghrib);

    // Isha: weekly fixed time when context is available, otherwise per-day FR4
    const isha = weeklyCtx
      ? computeWeeklyIshaIqama(weeklyCtx.ishaWeek)
      : computeIshaIqama(raw.isha);

    return { fajr, dhuhr, asr, maghrib, isha };
  }
}
