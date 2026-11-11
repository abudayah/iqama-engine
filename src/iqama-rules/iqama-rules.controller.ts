import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { IqamaRulesService } from './iqama-rules.service';
import { PreviewIqamaRulesDto } from './dto/preview-iqama-rules.dto';
import { CreateIqamaRulesVersionDto } from './dto/create-iqama-rules-version.dto';

@Controller('api/v1/admin/iqama-rules')
@UseGuards(ApiKeyGuard)
export class IqamaRulesController {
  constructor(private readonly service: IqamaRulesService) {}

  /** GET /api/v1/admin/iqama-rules — current rules + all versions */
  @Get()
  getConfig() {
    return this.service.getConfig();
  }

  /** GET /api/v1/admin/iqama-rules/catalog — rule types, fields, ranges */
  @Get('catalog')
  getCatalog() {
    return this.service.getCatalog();
  }

  /** POST /api/v1/admin/iqama-rules/preview */
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  preview(@Body() dto: PreviewIqamaRulesDto) {
    return this.service.preview(dto);
  }

  /** PUT /api/v1/admin/iqama-rules/base — save a new version */
  @Put('base')
  createVersion(@Body() dto: CreateIqamaRulesVersionDto) {
    return this.service.createVersion(dto, 'admin');
  }
}
