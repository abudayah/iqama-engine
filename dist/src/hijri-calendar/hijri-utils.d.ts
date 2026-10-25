import { Dayjs } from 'dayjs';
interface HijriComponents {
    month: number;
    day: number;
    year: number;
}
export declare function getHijriComponents(date: Dayjs): HijriComponents;
export declare function formatHijriDate(date: Dayjs): string;
export {};
