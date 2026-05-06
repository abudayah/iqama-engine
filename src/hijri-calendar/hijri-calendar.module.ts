import { Module } from '@nestjs/common';
import { HijriCalendarController } from './hijri-calendar.controller';
import { CalendarOverrideService } from './calendar-override.service';
import { QiyamConfigService } from './qiyam-config.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HijriCalendarController],
  providers: [CalendarOverrideService, QiyamConfigService],
})
export class HijriCalendarModule {}
