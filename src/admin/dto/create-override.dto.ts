import { IsString, IsIn, Matches, IsDateString } from 'class-validator';

export class CreateOverrideDto {
  @IsString()
  @IsIn(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'])
  prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

  @IsString()
  @IsIn(['FIXED', 'OFFSET'])
  overrideType: 'FIXED' | 'OFFSET';

  @IsString()
  value: string; // HH:mm for FIXED, numeric string (minutes) for OFFSET

  @IsDateString()
  startDate: string; // YYYY-MM-DD

  @IsDateString()
  endDate: string; // YYYY-MM-DD
}
