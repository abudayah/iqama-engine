import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Coordinates,
  CalculationMethod,
  PrayerTimes,
  Madhab,
  Rounding,
  HighLatitudeRule,
} from 'adhan';
import { Dayjs } from 'dayjs';
import dayjs from '../dayjs';

export interface RawPrayerTimes {
  fajr: Dayjs;
  sunrise: Dayjs;
  dhuhr: Dayjs;
  asr: Dayjs;
  maghrib: Dayjs;
  isha: Dayjs;
}

@Injectable()
export class AdhanAdapter {
  private readonly latitude: number;
  private readonly longitude: number;
  private readonly timezone: string;

  constructor(private readonly configService: ConfigService) {
    this.latitude = this.configService.get<number>('app.masjidLatitude')!;
    this.longitude = this.configService.get<number>('app.masjidLongitude')!;
    this.timezone = this.configService.get<string>('app.masjidTimezone')!;
  }

  getPrayerTimes(date: Date): RawPrayerTimes {
    const coordinates = new Coordinates(this.latitude, this.longitude);

    const params = CalculationMethod.NorthAmerica();
    params.madhab = Madhab.Shafi;
    params.rounding = Rounding.None;
    // High latitude adjustment: TwilightAngle restricts Isha (and Fajr) in summer
    // months (Jun–Jul) when the 15° twilight angle never fully disappears at ~49°N.
    // Has zero effect on all other months — times are identical to the raw calculation.
    params.highLatitudeRule = HighLatitudeRule.TwilightAngle;
    const pt = new PrayerTimes(coordinates, date, params);

    return {
      fajr: dayjs(pt.fajr).tz(this.timezone),
      sunrise: dayjs(pt.sunrise).tz(this.timezone),
      dhuhr: dayjs(pt.dhuhr).tz(this.timezone),
      asr: dayjs(pt.asr).tz(this.timezone),
      maghrib: dayjs(pt.maghrib).tz(this.timezone),
      isha: dayjs(pt.isha).tz(this.timezone),
    };
  }
}
