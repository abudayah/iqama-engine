import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdhanConfigController } from './adhan-config.controller';
import { AdhanConfigService } from './adhan-config.service';
import { ScheduleBuilderModule } from '../schedule-builder/schedule-builder.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule, ScheduleBuilderModule],
  controllers: [AdhanConfigController],
  providers: [AdhanConfigService],
  exports: [AdhanConfigService],
})
export class AdhanConfigModule {}
