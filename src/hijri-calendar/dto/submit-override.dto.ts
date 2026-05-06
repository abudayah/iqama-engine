import {
  IsString,
  IsIn,
  IsInt,
  IsOptional,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EidPrayerEntryDto {
  @IsString()
  label: string;

  @IsString()
  time: string;
}

export class EidConfigDto {
  @IsString()
  @IsIn(['EID_AL_FITR', 'EID_AL_ADHA'])
  type: 'EID_AL_FITR' | 'EID_AL_ADHA';

  @IsString()
  date: string;

  @ValidateNested({ each: true })
  @Type(() => EidPrayerEntryDto)
  prayers: EidPrayerEntryDto[];
}

export class SubmitOverrideDto {
  @IsInt()
  hijriYear: number;

  @IsInt()
  @Min(1)
  @Max(12)
  hijriMonth: number;

  @IsIn([29, 30])
  length: 29 | 30;

  @IsOptional()
  @ValidateNested()
  @Type(() => EidConfigDto)
  eidConfig?: EidConfigDto;
}
