import { ConfigService } from '@nestjs/config';
import { RawPrayerTimes } from '../adhan/adhan.adapter';
import { WeeklyFajrEntry } from './fajr.rule';
import { Dayjs } from 'dayjs';
export interface IqamaTimes {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
}
export interface WeeklyContext {
    fajrWeek: WeeklyFajrEntry[];
    ishaWeek: Dayjs[];
    rawWeek?: {
        date: string;
        raw: RawPrayerTimes;
    }[];
}
export declare class RulesService {
    private readonly configService;
    private readonly timezone;
    private readonly cutover;
    constructor(configService: ConfigService);
    computeIqama(date: string, raw: RawPrayerTimes, weeklyCtx?: WeeklyContext): IqamaTimes;
}
