import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { appConfig } from './config/app.config';
import { ScheduleModule } from './schedule/schedule.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { HijriCalendarModule } from './hijri-calendar/hijri-calendar.module';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '..', '.env'),
      load: [appConfig],
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 0, // No TTL - cache indefinitely until manually invalidated
      max: 100, // Store up to 100 months in cache
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
