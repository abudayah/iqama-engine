import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1/health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

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
      // The real error stays in the server log; the public response is generic.
      this.logger.error(
        'Health check failed: database unreachable',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException({ status: 'error', db: 'down' });
    }
  }
}
