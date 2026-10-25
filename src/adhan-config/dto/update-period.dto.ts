import { IsString, IsDateString, IsOptional } from 'class-validator';

export class UpdatePeriodDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  settings?: string;

  /** Confirmation token from POST /preview */
  @IsString()
  previewId: string;
}
