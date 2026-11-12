import { IsDateString, IsOptional, IsString } from 'class-validator';

export class PreviewIqamaRulesDto {
  /** Full RuleSet as a JSON string. */
  @IsString()
  settings: string;

  /** YYYY-MM-DD. Defaults to the next Friday after today. */
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;
}
