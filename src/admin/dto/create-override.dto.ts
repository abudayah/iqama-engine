import {
  IsString,
  IsIn,
  IsDateString,
  Matches,
  ValidateIf,
} from 'class-validator';

export class CreateOverrideDto {
  @IsString()
  @IsIn(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'])
  prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

  @IsString()
  @IsIn(['FIXED', 'OFFSET'])
  overrideType: 'FIXED' | 'OFFSET';

  @IsString()
  @ValidateIf((o: CreateOverrideDto) => o.overrideType === 'FIXED')
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'FIXED value must be in HH:mm format (e.g., 04:30)',
  })
  @ValidateIf((o: CreateOverrideDto) => o.overrideType === 'OFFSET')
  @Matches(/^[+-]?\d+$/, {
    message: 'OFFSET value must be a number (e.g., +15 or -10)',
  })
  value: string; // HH:mm for FIXED, numeric string (minutes) for OFFSET

  @IsDateString()
  startDate: string; // YYYY-MM-DD

  @IsDateString()
  endDate: string; // YYYY-MM-DD
}
