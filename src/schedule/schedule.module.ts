import { Module } from '@nestjs/common';
import { ScheduleBuilderModule } from '../schedule-builder/schedule-builder.module';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';

@Module({
  imports: [ScheduleBuilderModule],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
