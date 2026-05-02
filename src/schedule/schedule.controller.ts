import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
import { DailySchedule } from '../cache/daily-schedule.interface';

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

    if (date) {
      return this.scheduleService.getScheduleForDate(date);
    }

    return this.scheduleService.getScheduleForRange(start_date!, end_date!);
  }
}
