import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { AdhanAdapter } from '../adhan/adhan.adapter';
import { RulesService } from '../rules/rules.service';
import { OverrideService } from '../override/override.service';
import { PrismaService } from '../prisma/prisma.service';
import { QiyamConfigService } from '../hijri-calendar/qiyam-config.service';
import { DailySchedule } from '../schedule/daily-schedule.interface';
export declare class ScheduleBuilderService {
    private readonly adhanAdapter;
    private readonly rulesService;
    private readonly overrideService;
    private readonly prisma;
    private readonly configService;
    private readonly qiyamConfigService;
    private cacheManager;
    private readonly timezone;
    private readonly inFlight;
    constructor(adhanAdapter: AdhanAdapter, rulesService: RulesService, overrideService: OverrideService, prisma: PrismaService, configService: ConfigService, qiyamConfigService: QiyamConfigService, cacheManager: Cache);
    private loadAdhanConfig;
    buildMonth(yearMonth: string): Promise<DailySchedule[]>;
    private buildWeeklyContext;
    getMonth(yearMonth: string): Promise<DailySchedule[]>;
    invalidateCache(startDate?: string, endDate?: string): Promise<void>;
}
