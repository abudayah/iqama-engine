export interface PrayerEntry {
  azan: string; // HH:mm
  iqama: string; // HH:mm
  /** True when a non-zero per-prayer Azan offset is applied (base or active period). */
  azan_customized?: boolean;
  /** True when the guardrail raised/lowered the Iqama (min gap after Azan, or Fajr 60 min before sunrise). */
  iqama_clamped?: boolean;
}

export interface DailySchedule {
  date: string; // YYYY-MM-DD
  hijri_date: string; // e.g., "Dhul Hijjah 25, 1446"
  day_of_week: string; // e.g. "Friday"
  is_dst: boolean;
  fajr: PrayerEntry;
  sunrise: string; // HH:mm
  dhuhr: PrayerEntry;
  asr: PrayerEntry;
  maghrib: PrayerEntry;
  isha: PrayerEntry;
  /** Eid prayer times injected when the date is an Eid day */
  eid_prayer_1?: string; // HH:mm — 1st Eid prayer
  eid_prayer_2?: string; // HH:mm — 2nd Eid prayer
  qiyam_time?: string; // HH:mm
  metadata: {
    calculation_method: string; // e.g. 'NorthAmerica' (ISNA), 'MuslimWorldLeague', etc.
    has_overrides: boolean;
  };
}
