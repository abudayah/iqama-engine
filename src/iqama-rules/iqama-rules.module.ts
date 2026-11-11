import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleBuilderModule } from '../schedule-builder/schedule-builder.module';
import { IqamaRulesController } from './iqama-rules.controller';
import { IqamaRulesService } from './iqama-rules.service';

@Module({
  imports: [ConfigModule, PrismaModule, ScheduleBuilderModule],
  controllers: [IqamaRulesController],
  providers: [IqamaRulesService],
  exports: [IqamaRulesService],
})
export class IqamaRulesModule {}
