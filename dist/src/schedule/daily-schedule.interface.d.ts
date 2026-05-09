export interface PrayerEntry {
    azan: string;
    iqama: string;
}
export interface DailySchedule {
    date: string;
    hijri_date: string;
    day_of_week: string;
    is_dst: boolean;
    fajr: PrayerEntry;
    sunrise: string;
    dhuhr: PrayerEntry;
    asr: PrayerEntry;
    maghrib: PrayerEntry;
    isha: PrayerEntry;
    eid_prayer_1?: string;
    eid_prayer_2?: string;
    qiyam_time?: string;
    metadata: {
        calculation_method: 'ISNA';
        has_overrides: boolean;
    };
}
