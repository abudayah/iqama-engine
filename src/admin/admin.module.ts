import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleBuilderModule } from '../schedule-builder/schedule-builder.module';

@Module({
  imports: [PrismaModule, ScheduleBuilderModule],
  controllers: [AdminController],
})
export class AdminModule {}
