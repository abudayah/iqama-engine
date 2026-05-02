import { ConfigService } from '@nestjs/config';
import { RawPrayerTimes } from '../adhan/adhan.adapter';
export interface IqamaTimes {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
}
export declare class RulesService {
    private readonly configService;
    private readonly timezone;
    constructor(configService: ConfigService);
    computeIqama(date: string, raw: RawPrayerTimes): IqamaTimes;
}
