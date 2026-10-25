/**
 * adhan-config.service.ts
 *
 * CRUD, preview, and confirmation-token management
 * for the Adhan configuration feature.
 */

import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleBuilderService } from '../schedule-builder/schedule-builder.service';
import { ADHAN_CATALOG } from './adhan-catalog';
import { resolveAdhanSettings } from './adhan-config.resolver';
import {
  validateAdhanSettings,
  validatePartialAdhanSettings,
  validatePeriodDates,
} from './adhan-config.validator';
import type {
  AdhanSettings,
  PartialAdhanSettings,
  AdhanConfigVersionRecord,
  AdhanConfigPeriodRecord,
} from './adhan-config.types';
import type { CreateVersionDto } from './dto/create-version.dto';
import type { CreatePeriodDto } from './dto/create-period.dto';
import type { UpdatePeriodDto } from './dto/update-period.dto';
import type { PreviewDto } from './dto/preview.dto';

// ─── Preview token store (in-memory, 10 min TTL) ──────────────────────────────

interface PreviewToken {
  hash: string;
  expiresAt: number; // ms epoch
}

const PREVIEW_TTL_MS = 10 * 60 * 1000;

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AdhanConfigService {
  private readonly previewTokens = new Map<string, PreviewToken>();
  private readonly timezone: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleBuilder: ScheduleBuilderService,
    private readonly configService: ConfigService,
  ) {
    this.timezone =
      this.configService.get<string>('app.masjidTimezone') ?? 'UTC';
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  private todayInTimezone(): string {
    return new Date().toLocaleDateString('sv-SE', { timeZone: this.timezone });
  }

  private async allVersions(): Promise<AdhanConfigVersionRecord[]> {
    return this.prisma.adhanConfigVersion.findMany({
      orderBy: { effectiveFrom: 'asc' },
    });
  }

  private async allActivePeriods(): Promise<AdhanConfigPeriodRecord[]> {
    return this.prisma.adhanConfigPeriod.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async latestVersionId(): Promise<number> {
    const latest = await this.prisma.adhanConfigVersion.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    return latest?.id ?? 0;
  }

  // ── Preview token management ───────────────────────────────────────────────

  private generatePreviewId(
    settingsJson: string,
    type: string,
    extraDates: string,
    currentRevision: number,
  ): string {
    const payload = `${settingsJson}|${type}|${extraDates}|${currentRevision}`;
    const hash = createHash('sha256').update(payload).digest('hex');
    const id = `pv_${randomBytes(8).toString('hex')}`;
    this.previewTokens.set(id, {
      hash,
      expiresAt: Date.now() + PREVIEW_TTL_MS,
    });
    // Purge stale tokens opportunistically
    for (const [k, v] of this.previewTokens) {
      if (v.expiresAt < Date.now()) this.previewTokens.delete(k);
    }
    return id;
  }

  private consumePreviewId(
    previewId: string,
    settingsJson: string,
    type: string,
    extraDates: string,
    currentRevision: number,
  ): void {
    const token = this.previewTokens.get(previewId);
    if (!token || token.expiresAt < Date.now()) {
      this.previewTokens.delete(previewId);
      throw new UnprocessableEntityException(
        'Preview token not found or expired. Please run the preview again.',
      );
    }
    const expectedHash = createHash('sha256')
      .update(`${settingsJson}|${type}|${extraDates}|${currentRevision}`)
      .digest('hex');
    // Compare hashes in constant time by hashing both once more
    const a = createHash('sha256').update(token.hash).digest('hex');
    const b = createHash('sha256').update(expectedHash).digest('hex');
    if (a !== b) {
      throw new UnprocessableEntityException(
        'Preview token does not match submitted settings. Please run the preview again.',
      );
    }
    this.previewTokens.delete(previewId);
  }

  // ── GET /adhan-config ──────────────────────────────────────────────────────

  async getConfig() {
    const today = this.todayInTimezone();
    const [versions, periods, currentRevision] = await Promise.all([
      this.allVersions(),
      this.allActivePeriods(),
      this.latestVersionId(),
    ]);
    const lat = this.configService.get<number>('app.masjidLatitude') ?? 0;
    const lon = this.configService.get<number>('app.masjidLongitude') ?? 0;

    let effective: ReturnType<typeof resolveAdhanSettings> | null = null;
    if (versions.length > 0) {
      try {
        effective = resolveAdhanSettings(today, versions, periods);
      } catch {
        // No version covers today yet
      }
    }

    const recommendedHighLatitudeRule =
      ADHAN_CATALOG.recommendedHighLatitudeRule(lat, lon);

    return {
      currentRevision,
      versions,
      periods,
      effective,
      recommendedHighLatitudeRule,
      today,
      timezone: this.timezone,
      latitude: lat,
      longitude: lon,
    };
  }

  // ── GET /adhan-config/catalog ──────────────────────────────────────────────

  getCatalog() {
    const lat = this.configService.get<number>('app.masjidLatitude') ?? 0;
    const lon = this.configService.get<number>('app.masjidLongitude') ?? 0;
    // Serialize the catalog — replace the function with its result
    const { recommendedHighLatitudeRule: fn, ...rest } = ADHAN_CATALOG;
    return {
      ...rest,
      recommendedHighLatitudeRule: fn(lat, lon),
    };
  }

  // ── POST /adhan-config/preview ─────────────────────────────────────────────

  async preview(dto: PreviewDto) {
    const { settings: settingsJson, type } = dto;

    let parsed: unknown;
    try {
      parsed = JSON.parse(settingsJson);
    } catch {
      throw new BadRequestException('settings must be valid JSON');
    }

    const extraDates =
      type === 'version'
        ? (dto.effectiveFrom ?? '')
        : `${dto.periodStartDate ?? ''}|${dto.periodEndDate ?? ''}`;

    let validationIssues: ReturnType<typeof validateAdhanSettings>['issues'] =
      [];

    if (type === 'version') {
      const result = validateAdhanSettings(parsed as AdhanSettings);
      validationIssues = result.issues;
      if (!result.valid) {
        throw new BadRequestException({
          message: 'Invalid settings',
          issues: result.issues,
        });
      }
    } else {
      const result = validatePartialAdhanSettings(
        parsed as PartialAdhanSettings,
      );
      validationIssues = result.issues;
      if (!result.valid) {
        throw new BadRequestException({
          message: 'Invalid period settings',
          issues: result.issues,
        });
      }
      if (dto.periodStartDate && dto.periodEndDate) {
        const dateIssues = validatePeriodDates(
          dto.periodStartDate,
          dto.periodEndDate,
        );
        if (dateIssues.some((i) => i.severity === 'error')) {
          throw new BadRequestException({
            message: 'Invalid period dates',
            issues: dateIssues,
          });
        }
        validationIssues = [...validationIssues, ...dateIssues];
      }
    }

    const currentRevision = await this.latestVersionId();
    const previewId = this.generatePreviewId(
      settingsJson,
      type,
      extraDates,
      currentRevision,
    );

    return {
      previewId,
      currentRevision,
      warnings: validationIssues.filter((i) => i.severity === 'warning'),
    };
  }

  // ── PUT /adhan-config/base ─────────────────────────────────────────────────

  async createVersion(dto: CreateVersionDto, actor: string) {
    const today = this.todayInTimezone();

    // Optimistic locking
    const currentRevision = await this.latestVersionId();
    if (dto.expectedRevision !== currentRevision) {
      throw new ConflictException(
        `Settings changed since you opened this page (expected revision ${dto.expectedRevision}, current is ${currentRevision}). Please reload and review the latest values.`,
      );
    }

    // effectiveFrom must not be in the past
    if (dto.effectiveFrom < today) {
      throw new BadRequestException(
        `effectiveFrom (${dto.effectiveFrom}) cannot be earlier than today (${today}).`,
      );
    }

    // Parse and validate settings
    let settings: AdhanSettings;
    try {
      settings = JSON.parse(dto.settings) as AdhanSettings;
    } catch {
      throw new BadRequestException('settings must be valid JSON');
    }
    const validation = validateAdhanSettings(settings);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Invalid settings',
        issues: validation.issues,
      });
    }

    // Consume preview token
    this.consumePreviewId(
      dto.previewId,
      dto.settings,
      'version',
      dto.effectiveFrom,
      dto.expectedRevision,
    );

    // Persist
    const version = await this.prisma.adhanConfigVersion.create({
      data: {
        effectiveFrom: dto.effectiveFrom,
        settings: dto.settings,
        createdBy: actor,
      },
    });

    // Invalidate cache for effectiveFrom onward (up to ~1 year ahead)
    const endOfYear = `${new Date().getFullYear() + 1}-12-31`;
    await this.scheduleBuilder.invalidateCache(dto.effectiveFrom, endOfYear);

    return version;
  }

  // ── POST /adhan-config/periods ─────────────────────────────────────────────

  async createPeriod(dto: CreatePeriodDto, actor: string) {
    let settings: PartialAdhanSettings;
    try {
      settings = JSON.parse(dto.settings) as PartialAdhanSettings;
    } catch {
      throw new BadRequestException('settings must be valid JSON');
    }

    const validation = validatePartialAdhanSettings(settings);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Invalid period settings',
        issues: validation.issues,
      });
    }

    const dateIssues = validatePeriodDates(dto.startDate, dto.endDate);
    if (dateIssues.some((i) => i.severity === 'error')) {
      throw new BadRequestException({
        message: 'Invalid period dates',
        issues: dateIssues,
      });
    }

    const currentRevision = await this.latestVersionId();
    this.consumePreviewId(
      dto.previewId,
      dto.settings,
      'period',
      `${dto.startDate}|${dto.endDate}`,
      currentRevision,
    );

    const period = await this.prisma.adhanConfigPeriod.create({
      data: {
        label: dto.label,
        startDate: dto.startDate,
        endDate: dto.endDate,
        settings: dto.settings,
        createdBy: actor,
      },
    });

    await this.scheduleBuilder.invalidateCache(dto.startDate, dto.endDate);

    return period;
  }

  // ── PUT /adhan-config/periods/:id ─────────────────────────────────────────

  async updatePeriod(id: number, dto: UpdatePeriodDto) {
    const existing = await this.prisma.adhanConfigPeriod.findUnique({
      where: { id },
    });
    if (!existing || existing.deletedAt !== null) {
      throw new NotFoundException(`Period ${id} not found`);
    }

    const newSettings = dto.settings ?? existing.settings;
    const newStart = dto.startDate ?? existing.startDate;
    const newEnd = dto.endDate ?? existing.endDate;

    if (dto.settings) {
      let parsed: PartialAdhanSettings;
      try {
        parsed = JSON.parse(dto.settings) as PartialAdhanSettings;
      } catch {
        throw new BadRequestException('settings must be valid JSON');
      }
      const validation = validatePartialAdhanSettings(parsed);
      if (!validation.valid) {
        throw new BadRequestException({
          message: 'Invalid period settings',
          issues: validation.issues,
        });
      }
    }

    const dateIssues = validatePeriodDates(newStart, newEnd);
    if (dateIssues.some((i) => i.severity === 'error')) {
      throw new BadRequestException({
        message: 'Invalid period dates',
        issues: dateIssues,
      });
    }

    const currentRevision = await this.latestVersionId();
    this.consumePreviewId(
      dto.previewId,
      newSettings,
      'period',
      `${newStart}|${newEnd}`,
      currentRevision,
    );

    const updated = await this.prisma.adhanConfigPeriod.update({
      where: { id },
      data: {
        ...(dto.label ? { label: dto.label } : {}),
        ...(dto.startDate ? { startDate: dto.startDate } : {}),
        ...(dto.endDate ? { endDate: dto.endDate } : {}),
        ...(dto.settings ? { settings: dto.settings } : {}),
      },
    });

    // Invalidate both old and new date ranges
    await this.scheduleBuilder.invalidateCache(
      existing.startDate,
      existing.endDate,
    );
    if (newStart !== existing.startDate || newEnd !== existing.endDate) {
      await this.scheduleBuilder.invalidateCache(newStart, newEnd);
    }

    return updated;
  }

  // ── DELETE /adhan-config/periods/:id ──────────────────────────────────────

  async deletePeriod(id: number, previewId: string) {
    const existing = await this.prisma.adhanConfigPeriod.findUnique({
      where: { id },
    });
    if (!existing || existing.deletedAt !== null) {
      throw new NotFoundException(`Period ${id} not found`);
    }

    const currentRevision = await this.latestVersionId();
    this.consumePreviewId(
      previewId,
      existing.settings,
      'period',
      `${existing.startDate}|${existing.endDate}`,
      currentRevision,
    );

    await this.prisma.adhanConfigPeriod.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.scheduleBuilder.invalidateCache(
      existing.startDate,
      existing.endDate,
    );
  }
}
