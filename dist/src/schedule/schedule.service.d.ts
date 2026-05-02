import { ScheduleBuilderService } from '../schedule-builder/schedule-builder.service';
import { DailySchedule } from './daily-schedule.interface';
export declare class ScheduleService {
  private readonly scheduleBuilder;
  constructor(scheduleBuilder: ScheduleBuilderService);
  getScheduleForDate(date: string): Promise<DailySchedule>;
  getScheduleForRange(
    startDate: string,
    endDate: string,
  ): Promise<DailySchedule[]>;
}
