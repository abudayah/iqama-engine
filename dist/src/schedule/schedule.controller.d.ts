import { ScheduleService } from './schedule.service';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
import { DailySchedule } from './daily-schedule.interface';
export declare class ScheduleController {
    private readonly scheduleService;
    constructor(scheduleService: ScheduleService);
    getSchedule(query: ScheduleQueryDto): Promise<DailySchedule | DailySchedule[]>;
}
