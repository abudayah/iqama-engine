import { ConfigService } from '@nestjs/config';
import { AdhanAdapter } from '../adhan/adhan.adapter';
import { RulesService } from '../rules/rules.service';
import { OverrideService } from '../override/override.service';
import { DailySchedule } from '../schedule/daily-schedule.interface';
export declare class ScheduleBuilderService {
  private readonly adhanAdapter;
  private readonly rulesService;
  private readonly overrideService;
  private readonly configService;
  private readonly timezone;
  constructor(
    adhanAdapter: AdhanAdapter,
    rulesService: RulesService,
    overrideService: OverrideService,
    configService: ConfigService,
  );
  buildMonth(yearMonth: string): Promise<DailySchedule[]>;
  getMonth(yearMonth: string): Promise<DailySchedule[]>;
}
