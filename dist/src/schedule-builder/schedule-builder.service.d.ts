import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { AdhanAdapter } from '../adhan/adhan.adapter';
import { OverrideService } from '../override/override.service';
import { PrismaService } from '../prisma/prisma.service';
import { QiyamConfigService } from '../hijri-calendar/qiyam-config.service';
import { IqamaRuleVersionRecord } from '../iqama-rules/iqama-rules.types';
import { DailySchedule } from '../schedule/daily-schedule.interface';
export interface BuildOptions {
    rules?: IqamaRuleVersionRecord[];
}
export declare class ScheduleBuilderService {
    private readonly adhanAdapter;
    private readonly overrideService;
    private readonly prisma;
    private readonly configService;
    private readonly qiyamConfigService;
    private cacheManager;
    private readonly logger;
    private readonly timezone;
    private readonly inFlight;
    constructor(adhanAdapter: AdhanAdapter, overrideService: OverrideService, prisma: PrismaService, configService: ConfigService, qiyamConfigService: QiyamConfigService, cacheManager: Cache);
    private loadAdhanConfig;
    buildMonth(yearMonth: string, opts?: BuildOptions): Promise<DailySchedule[]>;
    private resolveRawTimes;
    private buildWeeklyContext;
    private computeIqama;
    getMonth(yearMonth: string): Promise<DailySchedule[]>;
    invalidateCache(startDate?: string, endDate?: string): Promise<void>;
}
