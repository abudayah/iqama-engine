import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
import { DailySchedule } from './daily-schedule.interface';
import dayjs from '../dayjs';

/** Maximum allowed date range for range queries (inclusive). */
const MAX_RANGE_DAYS = 366;

@Controller('api/v1/schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  async getSchedule(
    @Query() query: ScheduleQueryDto,
  ): Promise<DailySchedule | DailySchedule[]> {
    const { date, start_date, end_date } = query;

    // Mutual exclusion: date + (start_date or end_date)
    if (date && (start_date || end_date)) {
      throw new BadRequestException(
        "Cannot use 'date' together with 'start_date' or 'end_date'",
      );
    }

    // Only one of start_date/end_date provided
    if ((start_date && !end_date) || (!start_date && end_date)) {
      throw new BadRequestException(
        "'start_date' and 'end_date' must be provided together",
      );
    }

    // Neither date nor start_date+end_date
    if (!date && !start_date && !end_date) {
      throw new BadRequestException(
        "Provide either 'date' or both 'start_date' and 'end_date'",
      );
    }

    // start_date > end_date
    if (start_date && end_date && start_date > end_date) {
      throw new BadRequestException(
        "'start_date' must not be after 'end_date'",
      );
    }

    // Cap range to prevent unbounded schedule generation
    if (start_date && end_date) {
      const rangeDays = dayjs(end_date).diff(dayjs(start_date), 'day') + 1;
      if (rangeDays > MAX_RANGE_DAYS) {
        throw new BadRequestException(
          `Date range must not exceed ${MAX_RANGE_DAYS} days (requested ${rangeDays})`,
        );
      }
    }

    if (date) {
      return this.scheduleService.getScheduleForDate(date);
    }

    return this.scheduleService.getScheduleForRange(start_date!, end_date!);
  }
}
