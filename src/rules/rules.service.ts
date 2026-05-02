import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RawPrayerTimes } from '../adhan/adhan.adapter';
import { computeFajrIqama } from './fajr.rule';
import { computeDhuhrIqama } from './dhuhr.rule';
import { computeAsrIqama } from './asr.rule';
import { computeMaghribIqama } from './maghrib.rule';
import { computeIshaIqama } from './isha.rule';

export interface IqamaTimes {
  fajr: string;    // HH:mm
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
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
   * @param date       - YYYY-MM-DD string for the requested date
   * @param raw        - Raw prayer times for the requested date
   * @param fridayRaw  - Raw prayer times for the preceding Friday (FR5 Friday Block).
   *                     When provided, FR3 and FR4 use fridayRaw for Fajr, Asr, and Isha.
   *                     Maghrib (FR1) and Dhuhr (FR2) always use the requested date's data.
   */
  computeIqama(date: string, raw: RawPrayerTimes, fridayRaw?: RawPrayerTimes): IqamaTimes {
    // Fajr: use fridayRaw if available (Friday Block), else raw
    const fajrAzan = fridayRaw?.fajr ?? raw.fajr;
    const sunriseForFajr = fridayRaw?.sunrise ?? raw.sunrise;
    const fajr = computeFajrIqama(fajrAzan, sunriseForFajr);

    // Dhuhr: always use the requested date + timezone (DST toggle, no Friday Block)
    const dhuhr = computeDhuhrIqama(date, this.timezone);

    // Asr: use fridayRaw if available (Friday Block), else raw
    const asrAzan = fridayRaw?.asr ?? raw.asr;
    const asr = computeAsrIqama(asrAzan);

    // Maghrib: always use the requested date's own Azan (no Friday Block)
    const maghrib = computeMaghribIqama(raw.maghrib);

    // Isha: use fridayRaw if available (Friday Block), else raw
    const ishaAzan = fridayRaw?.isha ?? raw.isha;
    const isha = computeIshaIqama(ishaAzan);

    return { fajr, dhuhr, asr, maghrib, isha };
  }
}
