import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
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

  /** Token from POST /preview for exactly these settings and date. */
  @IsString()
  previewId: string;

  /** Optimistic locking: latest IqamaRuleVersion.id the client saw (0 if none). */
  @IsInt()
  @Min(0)
  expectedRevision: number;
}
