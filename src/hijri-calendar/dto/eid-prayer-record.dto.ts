export class EidPrayerEntryDto {
  label: string; // "1st Prayer" | "2nd Prayer"
  time: string; // HH:mm
}

export class EidPrayerRecordDto {
  type: 'EID_AL_FITR' | 'EID_AL_ADHA';
  date: string; // YYYY-MM-DD
  prayers: EidPrayerEntryDto[];
  source: 'override' | 'astronomical';
}
