import { Dayjs } from 'dayjs';
import { DayCtx, PrayerName, PrayerRule } from './iqama-rules.types';
export declare function toDayCtx(date: string, azan: Dayjs, sunrise?: Dayjs): DayCtx;
export declare function firstFriday(year: number, month: number): number;
export declare function evaluateRuleMinutes(rule: PrayerRule, day: DayCtx, week?: DayCtx[]): number;
export declare const evaluateRule: (rule: PrayerRule, day: DayCtx, week?: DayCtx[]) => string;
export declare function evaluateIqama(prayer: PrayerName, rule: PrayerRule, day: DayCtx, week?: DayCtx[], override?: string): {
    iqama: string;
    clamped: boolean;
};
