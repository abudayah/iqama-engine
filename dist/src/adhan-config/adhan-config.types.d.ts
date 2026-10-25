import type { CalculationMethodName, MadhabName, HighLatitudeRuleName, RoundingName, ShafaqName, PolarCircleResolutionName } from './adhan-catalog';
export type { CalculationMethodName };
export type PrayerKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export interface GeneralSettings {
    method: CalculationMethodName;
    madhab: MadhabName;
    highLatitudeRule: HighLatitudeRuleName;
    polarCircleResolution: PolarCircleResolutionName;
    rounding: RoundingName;
    shafaq?: ShafaqName;
}
export interface PrayerSettings {
    method?: CalculationMethodName;
    fajrAngle?: number;
    ishaAngle?: number;
    ishaInterval?: number;
    maghribAngle?: number;
    offsetMinutes?: number;
}
export interface AdhanSettings {
    general: GeneralSettings;
    prayers: Partial<Record<PrayerKey, PrayerSettings>>;
}
export interface PartialAdhanSettings {
    general?: Partial<GeneralSettings>;
    prayers?: Partial<Record<PrayerKey, PrayerSettings>>;
}
export interface ResolvedPrayerParams {
    prayer: PrayerKey;
    method: CalculationMethodName;
    fajrAngle: number;
    ishaAngle: number | null;
    ishaInterval: number | null;
    maghribAngle: number | null;
    offsetMinutes: number;
    madhab: MadhabName;
    highLatitudeRule: HighLatitudeRuleName;
    polarCircleResolution: PolarCircleResolutionName;
    rounding: RoundingName;
    shafaq: ShafaqName | undefined;
}
export interface ResolvedAdhanSettings {
    date: string;
    general: GeneralSettings;
    perPrayer: Record<PrayerKey, ResolvedPrayerParams>;
    baseVersionId: number;
    activePeriodIds: number[];
}
export interface AdhanConfigVersionRecord {
    id: number;
    effectiveFrom: string;
    settings: string;
    createdBy: string;
    createdAt: Date;
}
export interface AdhanConfigPeriodRecord {
    id: number;
    label: string;
    startDate: string;
    endDate: string;
    settings: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
