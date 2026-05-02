export interface PrayerEntry {
  azan: string; // HH:mm
  iqama: string; // HH:mm
}

export interface DailySchedule {
  date: string; // YYYY-MM-DD
  day_of_week: string; // e.g. "Friday"
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
