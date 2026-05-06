export class HijriCalendarStatusDto {
  gregorianDate: string;
  hijriYear: number;
  hijriMonth: number;
  hijriDay: number;
  hasOverride: boolean;
  overrideLength: 29 | 30 | null;
}
