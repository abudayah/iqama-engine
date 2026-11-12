export interface PrayerDayView {
    iqama: string;
    iqama_clamped?: boolean;
}
export interface DayClass {
    changed: boolean;
    movedNow: boolean;
    movedProposed: boolean;
    newlyMoved: boolean;
    noLongerMoved: boolean;
}
export declare function classifyDay(current: PrayerDayView, proposed: PrayerDayView): DayClass;
export interface MovedStats {
    changedDays: number;
    movedNow: number;
    movedProposed: number;
    newlyMoved: number;
    newlyMovedDates: string[];
    noLongerMoved: number;
}
export declare const emptyStats: () => MovedStats;
export declare function addDay(stats: MovedStats, date: string, c: DayClass, maxDates: number): void;
