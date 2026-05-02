import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1/health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      // Check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: 'up',
          api: 'up',
        },
      };
    } catch (error) {
      return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        services: {
          database: 'down',
          api: 'up',
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
