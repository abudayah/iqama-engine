import { Dayjs } from 'dayjs';
export declare function setTimeInTz(dayjsObj: Dayjs, hours: number, minutes: number, seconds?: number): Dayjs;
export declare function ceilingToNearest5(dayjsObj: Dayjs): Dayjs;
export declare function floorToNearest5(dayjsObj: Dayjs): Dayjs;
export declare function ceilingToNearest30(dayjsObj: Dayjs): Dayjs;
export declare function formatHHmm(dayjsObj: Dayjs): string;
