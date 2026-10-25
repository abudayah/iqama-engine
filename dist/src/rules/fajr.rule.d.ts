import { Dayjs } from 'dayjs';
export declare function computeFajrIqama(fajrAzan: Dayjs, sunrise: Dayjs): string;
export interface WeeklyFajrEntry {
    fajrAzan: Dayjs;
    sunrise: Dayjs;
}
export declare function computeWeeklyFajrIqama(weekDays: WeeklyFajrEntry[]): string;
