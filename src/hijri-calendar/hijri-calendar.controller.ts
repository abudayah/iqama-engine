import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UsePipes,
  ValidationPipe,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CalendarOverrideService } from './calendar-override.service';
import { QiyamConfigService } from './qiyam-config.service';
import { ScheduleBuilderService } from '../schedule-builder/schedule-builder.service';
import { getHijriComponents } from './hijri-utils';
import { SubmitOverrideDto } from './dto/submit-override.dto';
import { HijriCalendarStatusDto } from './dto/hijri-calendar-status.dto';
import { EidPrayerRecordDto } from './dto/eid-prayer-record.dto';
import { QiyamConfigDto } from './dto/qiyam-config.dto';
import dayjs from '../dayjs';

@Controller('api/v1/hijri-calendar')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    exceptionFactory: (errors) => new UnprocessableEntityException(errors),
  }),
)
export class HijriCalendarController {
  constructor(
    private readonly calendarOverrideService: CalendarOverrideService,
    private readonly qiyamConfigService: QiyamConfigService,
    private readonly scheduleBuilder: ScheduleBuilderService,
  ) {}

  /**
   * GET /api/v1/hijri-calendar/status
   * Returns the current Hijri date and whether an override already exists.
   * Public endpoint - used by the moon-sighting card on the home page.
   */
  @Get('status')
  async getStatus(): Promise<HijriCalendarStatusDto> {
    return this.calendarOverrideService.getStatus();
  }

  /**
   * POST /api/v1/hijri-calendar/override
   * Submits a moon-sighting override (and optional Eid config).
   */
  @Post('override')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.CREATED)
  async submitOverride(@Body() dto: SubmitOverrideDto): Promise<void> {
    await this.calendarOverrideService.submitOverride(dto);

    // Invalidate cache - clear all since Hijri calendar affects date display
    await this.scheduleBuilder.invalidateCache();
  }

  /**
   * DELETE /api/v1/hijri-calendar/override
   * Clears the moon-sighting override for the current month (resets to astronomical).
   */
  @Delete('override')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOverride(): Promise<void> {
    const { year: hijriYear, month: hijriMonth } = getHijriComponents(dayjs());
    await this.calendarOverrideService.deleteCalendarOverride(
      hijriYear,
      hijriMonth,
    );

    // Invalidate cache - clear all since Hijri calendar affects date display
    await this.scheduleBuilder.invalidateCache();
  }

  /**
   * GET /api/v1/hijri-calendar/eid-prayers?date=YYYY-MM-DD&admin=true
   * Returns Eid prayer records. No auth required.
   * - Without admin=true: only returns records within the approach window (for the display app).
   * - With admin=true: returns all saved records regardless of date (for the admin panel).
   * The optional `date` query param lets the frontend pass a simulated date.
   */
  @Get('eid-prayers')
  async getEidPrayers(
    @Query('date') date?: string,
    @Query('admin') admin?: string,
  ): Promise<EidPrayerRecordDto[]> {
    const today =
      date && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? date
        : dayjs().format('YYYY-MM-DD');
    return this.calendarOverrideService.getEidPrayers(today, admin === 'true');
  }

  /**
   * GET /api/v1/hijri-calendar/qiyam-config
   * Returns the Qiyam config for the current Hijri year. No auth required.
   */
  @Get('qiyam-config')
  async getQiyamConfig(): Promise<{
    hijri_year: number;
    start_time: string;
  } | null> {
    const { year: hijriYear } = getHijriComponents(dayjs());
    return this.qiyamConfigService.getForYear(hijriYear);
  }

  /**
   * POST /api/v1/hijri-calendar/qiyam-config
   * Saves the Qiyam config for the current Hijri year. Requires API key.
   */
  @Post('qiyam-config')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.CREATED)
  async saveQiyamConfig(@Body() dto: QiyamConfigDto): Promise<void> {
    const { year: hijriYear } = getHijriComponents(dayjs());
    await this.qiyamConfigService.upsert(hijriYear, dto.start_time);

    // Invalidate cache for Ramadan months (month 9)
    // Since we don't know exact Gregorian dates, clear all cache
    await this.scheduleBuilder.invalidateCache();
  }
}
