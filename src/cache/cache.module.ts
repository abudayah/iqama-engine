import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { AdhanModule } from '../adhan/adhan.module';
import { RulesModule } from '../rules/rules.module';
import { OverrideModule } from '../override/override.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheService } from './cache.service';

@Module({
  imports: [
    ConfigModule,
    CacheModule.register({
      ttl: 2_592_000_000, // 30 days in ms
      max: 100,
    }),
    AdhanModule,
    RulesModule,
    OverrideModule,
    PrismaModule,
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class AppCacheModule {}
