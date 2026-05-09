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
}
export declare class RulesService {
    private readonly configService;
    private readonly timezone;
    constructor(configService: ConfigService);
    computeIqama(date: string, raw: RawPrayerTimes, weeklyCtx?: WeeklyContext): IqamaTimes;
}
