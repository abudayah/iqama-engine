import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleBuilderModule } from '../schedule-builder/schedule-builder.module';
import { OverrideModule } from '../override/override.module';

@Module({
  imports: [PrismaModule, ScheduleBuilderModule, OverrideModule],
  controllers: [AdminController],
})
export class AdminModule {}
