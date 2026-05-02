import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { AdhanAdapter } from '../adhan/adhan.adapter';
import { RulesService } from '../rules/rules.service';
import { OverrideService } from '../override/override.service';
import { DailySchedule } from './daily-schedule.interface';
export declare class CacheService {
    private readonly cacheManager;
    private readonly adhanAdapter;
    private readonly rulesService;
    private readonly overrideService;
    private readonly configService;
    private readonly timezone;
    constructor(cacheManager: Cache, adhanAdapter: AdhanAdapter, rulesService: RulesService, overrideService: OverrideService, configService: ConfigService);
    buildMonth(yearMonth: string): Promise<DailySchedule[]>;
    getOrBuildMonth(yearMonth: string): Promise<DailySchedule[]>;
}
