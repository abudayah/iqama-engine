import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { AdhanConfigService } from './adhan-config.service';
import { CreateVersionDto } from './dto/create-version.dto';
import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';
import { PreviewDto } from './dto/preview.dto';

@Controller('api/v1/admin/adhan-config')
@UseGuards(ApiKeyGuard)
export class AdhanConfigController {
  constructor(private readonly service: AdhanConfigService) {}

  private actorFromHeaders(): string {
    // Use a fixed actor until real user authentication exists.
    // The API key itself must not appear in audit logs.
    return 'admin';
  }

  /** GET /api/v1/admin/adhan-config */
  @Get()
  getConfig() {
    return this.service.getConfig();
  }

  /** GET /api/v1/admin/adhan-config/catalog */
  @Get('catalog')
  getCatalog() {
    return this.service.getCatalog();
  }

  /** POST /api/v1/admin/adhan-config/preview */
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  preview(@Body() dto: PreviewDto) {
    return this.service.preview(dto);
  }

  /** PUT /api/v1/admin/adhan-config/base */
  @Put('base')
  createVersion(@Body() dto: CreateVersionDto) {
    return this.service.createVersion(dto, this.actorFromHeaders());
  }

  /** POST /api/v1/admin/adhan-config/periods */
  @Post('periods')
  @HttpCode(HttpStatus.CREATED)
  createPeriod(@Body() dto: CreatePeriodDto) {
    return this.service.createPeriod(dto, this.actorFromHeaders());
  }

  /** PUT /api/v1/admin/adhan-config/periods/:id */
  @Put('periods/:id')
  updatePeriod(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePeriodDto,
  ) {
    return this.service.updatePeriod(id, dto, this.actorFromHeaders());
  }

  /**
   * DELETE /api/v1/admin/adhan-config/periods/:id
   * Requires previewId as query param (confirmed delete).
   */
  @Delete('periods/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePeriod(
    @Param('id', ParseIntPipe) id: number,
    @Query('previewId') previewId: string,
  ) {
    return this.service.deletePeriod(id, previewId, this.actorFromHeaders());
  }

  /** GET /api/v1/admin/adhan-config/history */
  @Get('history')
  getHistory(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.getHistory(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  /** POST /api/v1/admin/adhan-config/history/:id/revert */
  @Post('history/:id/revert')
  revert(@Param('id', ParseIntPipe) id: number) {
    return this.service.revert(id, this.actorFromHeaders());
  }
}
