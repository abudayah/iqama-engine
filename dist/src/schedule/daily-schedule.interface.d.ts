export interface PrayerEntry {
  azan: string;
  iqama: string;
}
export interface DailySchedule {
  date: string;
  day_of_week: string;
  is_dst: boolean;
  fajr: PrayerEntry;
  dhuhr: PrayerEntry;
  asr: PrayerEntry;
  maghrib: PrayerEntry;
  isha: PrayerEntry;
  metadata: {
    calculation_method: 'ISNA';
    has_overrides: boolean;
  };
}
