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
    return this.service.updatePeriod(id, dto);
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
    return this.service.deletePeriod(id, previewId);
  }
}
