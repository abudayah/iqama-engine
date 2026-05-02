import { IsOptional, Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class ScheduleQueryDto {
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Date values must be in YYYY-MM-DD format' })
  date?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Date values must be in YYYY-MM-DD format' })
  start_date?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Date values must be in YYYY-MM-DD format' })
  end_date?: string;
}
