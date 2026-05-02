import { Injectable, NotFoundException } from '@nestjs/common';
import dayjs from '../dayjs';
import { ScheduleBuilderService } from '../schedule-builder/schedule-builder.service';
import { DailySchedule } from './daily-schedule.interface';

@Injectable()
export class ScheduleService {
  constructor(private readonly scheduleBuilder: ScheduleBuilderService) {}

  async getScheduleForDate(date: string): Promise<DailySchedule> {
    const yearMonth = date.substring(0, 7); // "YYYY-MM"
    const schedules = await this.scheduleBuilder.getMonth(yearMonth);
    const schedule = schedules.find((s) => s.date === date);
    if (!schedule) {
      throw new NotFoundException(`No schedule found for date ${date}`);
    }
    return schedule;
  }

  async getScheduleForRange(
    startDate: string,
    endDate: string,
  ): Promise<DailySchedule[]> {
    // Collect all months in the range
    const start = dayjs(startDate);
    const end = dayjs(endDate);

    const monthsNeeded = new Set<string>();
    let current = start.startOf('month');
    while (current.isBefore(end) || current.isSame(end, 'month')) {
      monthsNeeded.add(current.format('YYYY-MM'));
      current = current.add(1, 'month');
    }

    // Fetch all months
    const allSchedules: DailySchedule[] = [];
    for (const yearMonth of monthsNeeded) {
      const schedules = await this.scheduleBuilder.getMonth(yearMonth);
      allSchedules.push(...schedules);
    }

    // Filter to the requested range
    return allSchedules.filter((s) => s.date >= startDate && s.date <= endDate);
  }
}
