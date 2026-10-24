import { IsString, IsDateString, IsOptional } from 'class-validator';

export class PreviewDto {
  /**
   * The draft settings to preview.
   * For a base version: full AdhanSettings JSON.
   * For a period: partial AdhanSettings JSON.
   */
  @IsString()
  settings: string;

  /** Whether this is a 'version' or 'period' draft */
  @IsString()
  type: 'version' | 'period';

  /** For version preview: proposed effectiveFrom date */
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  /** For period preview: start of the date range */
  @IsOptional()
  @IsDateString()
  periodStartDate?: string;

  /** For period preview: end of the date range */
  @IsOptional()
  @IsDateString()
  periodEndDate?: string;
}
