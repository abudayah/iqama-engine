import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateIqamaRulesVersionDto {
  /** Full RuleSet as a JSON string. */
  @IsString()
  settings: string;

  /** YYYY-MM-DD. Defaults to the next Friday after today. */
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  /** Optional note on why the rules changed (max 500 characters). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  /**
   * Required (true) when the preview listed Fajr conflicts: days where
   * Azan + 3 minutes forces Fajr past sunrise - 60 minutes.
   */
  @IsOptional()
  @IsBoolean()
  acknowledgeConflicts?: boolean;

  /** Optional: the `requestHash` the preview returned; checked against the body. */
  @IsOptional()
  @IsString()
  requestHash?: string;

  /** Token from POST /preview for exactly these settings and date. */
  @IsString()
  previewId: string;

  /** Optimistic locking: latest IqamaRuleVersion.id the client saw (0 if none). */
  @IsInt()
  @Min(0)
  expectedRevision: number;
}
