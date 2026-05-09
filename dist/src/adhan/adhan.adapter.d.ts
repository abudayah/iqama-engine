import { ConfigService } from '@nestjs/config';
import { Dayjs } from 'dayjs';
export interface RawPrayerTimes {
    fajr: Dayjs;
    sunrise: Dayjs;
    dhuhr: Dayjs;
    asr: Dayjs;
    maghrib: Dayjs;
    isha: Dayjs;
}
export declare class AdhanAdapter {
    private readonly configService;
    private readonly latitude;
    private readonly longitude;
    private readonly timezone;
    constructor(configService: ConfigService);
    getPrayerTimes(date: Date): RawPrayerTimes;
}
