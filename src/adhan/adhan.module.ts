import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdhanAdapter } from './adhan.adapter';

@Module({
  imports: [ConfigModule],
  providers: [AdhanAdapter],
  exports: [AdhanAdapter],
})
export class AdhanModule {}
