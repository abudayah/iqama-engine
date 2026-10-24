import { IsString, IsDateString, IsOptional } from 'class-validator';

export class CreatePeriodDto {
  @IsString()
  label: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  /** Partial AdhanSettings JSON — validated by AdhanConfigValidator */
  @IsString()
  settings: string;

  /** Confirmation token from POST /preview */
  @IsString()
  previewId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
