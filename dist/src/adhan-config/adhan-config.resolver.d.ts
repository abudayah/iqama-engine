import type { ResolvedPrayerParams, ResolvedAdhanSettings, AdhanConfigVersionRecord, AdhanConfigPeriodRecord } from './adhan-config.types';
export declare function resolveAdhanSettings(date: string, versions: AdhanConfigVersionRecord[], periods: AdhanConfigPeriodRecord[]): ResolvedAdhanSettings;
export declare function paramsKey(p: ResolvedPrayerParams): string;
