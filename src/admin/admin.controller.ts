import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOverrideDto } from './dto/create-override.dto';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Controller('api/v1/admin')
@UseGuards(ApiKeyGuard)
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new override
   * POST /api/v1/admin/overrides
   */
  @Post('overrides')
  @HttpCode(HttpStatus.CREATED)
  async createOverride(@Body() dto: CreateOverrideDto) {
    const override = await this.prisma.override.create({
      data: {
        prayer: dto.prayer,
        overrideType: dto.overrideType,
        value: dto.value,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });

    return override;
  }

  /**
   * List all overrides
   * GET /api/v1/admin/overrides
   */
  @Get('overrides')
  async listOverrides() {
    const overrides = await this.prisma.override.findMany({
      orderBy: [{ startDate: 'desc' }, { prayer: 'asc' }],
    });

    return overrides;
  }

  /**
   * Get a specific override by ID
   * GET /api/v1/admin/overrides/:id
   */
  @Get('overrides/:id')
  async getOverride(@Param('id', ParseIntPipe) id: number) {
    const override = await this.prisma.override.findUnique({
      where: { id },
    });

    if (!override) {
      throw new Error(`Override with ID ${id} not found`);
    }

    return override;
  }

  /**
   * Delete an override
   * DELETE /api/v1/admin/overrides/:id
   */
  @Delete('overrides/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOverride(@Param('id', ParseIntPipe) id: number) {
    await this.prisma.override.delete({
      where: { id },
    });
  }

  /**
   * Clear all overrides (use with caution)
   * DELETE /api/v1/admin/overrides
   */
  @Delete('overrides')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearAllOverrides() {
    await this.prisma.override.deleteMany();
  }
}
