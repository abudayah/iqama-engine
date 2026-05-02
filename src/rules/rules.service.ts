import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RawPrayerTimes } from '../adhan/adhan.adapter';
import { computeFajrIqama } from './fajr.rule';
import { computeDhuhrIqama } from './dhuhr.rule';
import { computeAsrIqama } from './asr.rule';
import { computeMaghribIqama } from './maghrib.rule';
import { computeIshaIqama } from './isha.rule';

export interface IqamaTimes {
  fajr: string; // HH:mm
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
   * @param date - YYYY-MM-DD string for the requested date
   * @param raw  - Raw prayer times for the requested date
   */
  computeIqama(date: string, raw: RawPrayerTimes): IqamaTimes {
    // Fajr: use current day's times
    const fajr = computeFajrIqama(raw.fajr, raw.sunrise);

    // Dhuhr: always use the requested date + timezone (DST toggle)
    const dhuhr = computeDhuhrIqama(date, this.timezone);

    // Asr: use current day's times
    const asr = computeAsrIqama(raw.asr);

    // Maghrib: use current day's times
    const maghrib = computeMaghribIqama(raw.maghrib);

    // Isha: use current day's times
    const isha = computeIshaIqama(raw.isha);

    return { fajr, dhuhr, asr, maghrib, isha };
  }
}
