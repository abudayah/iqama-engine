import { CacheService } from '../cache/cache.service';
import { DailySchedule } from '../cache/daily-schedule.interface';
export declare class ScheduleService {
    private readonly cacheService;
    constructor(cacheService: CacheService);
    getScheduleForDate(date: string): Promise<DailySchedule>;
    getScheduleForRange(startDate: string, endDate: string): Promise<DailySchedule[]>;
}
