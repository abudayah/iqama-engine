export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export declare const PRAYER_NAMES: readonly PrayerName[];
export declare const LOCKABLE_PRAYERS: readonly PrayerName[];
export type Weekday = 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
export declare const WEEKDAYS: readonly Weekday[];
export interface OffsetBase {
    type: 'OFFSET';
    minutes: number;
}
export interface FixedTimeBase {
    type: 'FIXED_TIME';
    time: string;
}
export interface ScaledGapBase {
    type: 'SCALED_GAP';
    points: {
        azan: string;
        gapMinutes: number;
    }[];
}
export type SegmentStart = {
    kind: 'DATE';
    month: number;
    day: number;
} | {
    kind: 'FIRST_FRIDAY';
    month: number;
};
export interface SeasonalBase {
    type: 'SEASONAL';
    segments: {
        start: SegmentStart;
        time: string;
    }[];
}
export type RuleBase = OffsetBase | FixedTimeBase | ScaledGapBase | SeasonalBase;
export interface Limits {
    minAfterAzan?: number;
    latestBeforeSunrise?: number;
}
export type RoundingMode = 'CEIL' | 'FLOOR' | 'NEAREST';
export interface Rounding {
    mode: RoundingMode;
    step: number;
}
export interface PrayerRule {
    base: RuleBase;
    limits?: Limits;
    rounding?: Rounding;
    weekdayAdjust?: Partial<Record<Weekday, number>>;
    weeklyLock?: boolean;
}
export type RuleSet = Record<PrayerName, PrayerRule>;
export interface DayCtx {
    date: string;
    azanMin: number;
    sunriseMin?: number;
}
export interface ValidationIssue {
    path: string;
    message: string;
}
export interface ValidationResult {
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
}
export interface IqamaRuleVersionRecord {
    id: number;
    effectiveFrom: string;
    settings: string;
    createdBy: string;
    reason?: string | null;
    createdAt: Date;
}
export type IqamaTimes = Record<PrayerName, string>;
