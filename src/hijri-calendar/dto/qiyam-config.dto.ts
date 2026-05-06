import { IsString, Matches } from 'class-validator';

export class QiyamConfigDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'start_time must be a valid HH:mm time (00:00–23:59)',
  })
  start_time: string;
}
