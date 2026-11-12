import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { appConfig } from './config/app.config';
import { ScheduleModule } from './schedule/schedule.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { HijriCalendarModule } from './hijri-calendar/hijri-calendar.module';
import { AdhanConfigModule } from './adhan-config/adhan-config.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { THROTTLER_OPTIONS } from './throttle/throttle.config';
import { IqamaRulesModule } from './iqama-rules/iqama-rules.module';
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
      ttl: 10 * 60 * 1000, // 10-minute safety-net TTL (ms for cache-manager v5)
      max: 100, // Store up to 100 months in cache
    }),
    ThrottlerModule.forRoot(THROTTLER_OPTIONS),
    ScheduleModule,
    AdminModule,
    HealthModule,
    HijriCalendarModule,
    AdhanConfigModule,
    IqamaRulesModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
