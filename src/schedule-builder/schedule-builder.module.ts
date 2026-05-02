import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdhanModule } from '../adhan/adhan.module';
import { RulesModule } from '../rules/rules.module';
import { OverrideModule } from '../override/override.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleBuilderService } from './schedule-builder.service';

@Module({
  imports: [
    ConfigModule,
    AdhanModule,
    RulesModule,
    OverrideModule,
    PrismaModule,
  ],
  providers: [ScheduleBuilderService],
  exports: [ScheduleBuilderService],
})
export class ScheduleBuilderModule {}
