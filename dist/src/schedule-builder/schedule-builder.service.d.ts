import { ConfigService } from '@nestjs/config';
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
    private readonly timezone;
    constructor(adhanAdapter: AdhanAdapter, rulesService: RulesService, overrideService: OverrideService, prisma: PrismaService, configService: ConfigService, qiyamConfigService: QiyamConfigService);
    buildMonth(yearMonth: string): Promise<DailySchedule[]>;
    private buildWeeklyContext;
    getMonth(yearMonth: string): Promise<DailySchedule[]>;
}
