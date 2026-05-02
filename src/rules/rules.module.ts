import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RulesService } from './rules.service';

@Module({
  imports: [ConfigModule],
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}
