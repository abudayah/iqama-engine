import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OverrideService } from './override.service';

@Module({
  imports: [PrismaModule],
  providers: [OverrideService],
  exports: [OverrideService],
})
export class OverrideModule {}
