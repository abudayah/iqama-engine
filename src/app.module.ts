import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config';
import { ScheduleModule } from './schedule/schedule.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { HijriCalendarModule } from './hijri-calendar/hijri-calendar.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig],
    }),
    ScheduleModule,
    AdminModule,
    HealthModule,
    HijriCalendarModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
