import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';

export class CreateVersionDto {
  /** Full AdhanSettings JSON — validated by AdhanConfigValidator */
  @IsString()
  settings: string;

  /** YYYY-MM-DD in masjid timezone. Must not be earlier than today. */
  @IsDateString()
  effectiveFrom: string;

  @IsOptional()
  @IsString()
  reason?: string;

  /**
   * Confirmation token from POST /preview.
   * Server rejects the write if this token is missing, expired, or mismatched.
   */
  @IsString()
  previewId: string;

  /**
   * Optimistic locking: the latest AdhanConfigVersion.id the client saw.
   * Rejected with 409 if a newer version exists.
   */
  @IsInt()
  @Min(0)
  expectedRevision: number;
}
