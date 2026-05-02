import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Coordinates,
  CalculationMethod,
  PrayerTimes,
  Madhab,
  Rounding,
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
    // Custom Fajr angle (12.3°) to match masjid's calculation
    // ISNA default is 15°, but local practice uses 12.3°
    params.fajrAngle = 12.3;
    params.madhab = Madhab.Shafi;
    params.rounding = Rounding.None;

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
