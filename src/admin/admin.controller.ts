import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleBuilderService } from '../schedule-builder/schedule-builder.service';
import { CreateOverrideDto } from './dto/create-override.dto';
import { UpdateOverrideDto } from './dto/update-override.dto';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Controller('api/v1/admin')
@UseGuards(ApiKeyGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleBuilder: ScheduleBuilderService,
  ) {}

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

    // Invalidate cache for affected months
    await this.scheduleBuilder.invalidateCache(dto.startDate, dto.endDate);

    return override;
  }

  /**
   * List all overrides (active only — excludes soft-deleted)
   * GET /api/v1/admin/overrides
   */
  @Get('overrides')
  async listOverrides() {
    const overrides = await this.prisma.override.findMany({
      where: { deletedAt: null },
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

    if (!override || override.deletedAt !== null) {
      throw new NotFoundException(`Override with ID ${id} not found`);
    }

    return override;
  }

  /**
   * Update an existing override
   * PATCH /api/v1/admin/overrides/:id
   */
  @Patch('overrides/:id')
  async updateOverride(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOverrideDto,
  ) {
    // Check if override exists
    const existing = await this.prisma.override.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Override with ID ${id} not found`);
    }

    // Update the override
    const updated = await this.prisma.override.update({
      where: { id },
      data: {
        ...(dto.prayer && { prayer: dto.prayer }),
        ...(dto.overrideType && { overrideType: dto.overrideType }),
        ...(dto.value && { value: dto.value }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
      },
    });

    // Invalidate cache for both old and new date ranges
    const oldStart = existing.startDate.toISOString().split('T')[0];
    const oldEnd = existing.endDate.toISOString().split('T')[0];
    await this.scheduleBuilder.invalidateCache(oldStart, oldEnd);

    if (dto.startDate || dto.endDate) {
      const newStart = dto.startDate || oldStart;
      const newEnd = dto.endDate || oldEnd;
      await this.scheduleBuilder.invalidateCache(newStart, newEnd);
    }

    return updated;
  }

  /**
   * Soft-delete an override (marks deletedAt, keeps record for analysis)
   * DELETE /api/v1/admin/overrides/:id
   */
  @Delete('overrides/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOverride(@Param('id', ParseIntPipe) id: number) {
    const existing = await this.prisma.override.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt !== null) {
      throw new NotFoundException(`Override with ID ${id} not found`);
    }

    await this.prisma.override.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Invalidate cache for affected months
    const startDate = existing.startDate.toISOString().split('T')[0];
    const endDate = existing.endDate.toISOString().split('T')[0];
    await this.scheduleBuilder.invalidateCache(startDate, endDate);
  }

  /**
   * Soft-delete all active overrides (use with caution)
   * DELETE /api/v1/admin/overrides
   */
  @Delete('overrides')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearAllOverrides() {
    await this.prisma.override.updateMany({
      where: { deletedAt: null },
      data: { deletedAt: new Date() },
    });

    // Clear entire cache since we don't know which months were affected
    await this.scheduleBuilder.invalidateCache();
  }
}
