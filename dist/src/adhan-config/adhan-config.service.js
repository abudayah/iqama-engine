"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdhanConfigService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const schedule_builder_service_1 = require("../schedule-builder/schedule-builder.service");
const adhan_catalog_1 = require("./adhan-catalog");
const adhan_config_resolver_1 = require("./adhan-config.resolver");
const adhan_config_validator_1 = require("./adhan-config.validator");
const PREVIEW_TTL_MS = 10 * 60 * 1000;
let AdhanConfigService = class AdhanConfigService {
    prisma;
    scheduleBuilder;
    configService;
    previewTokens = new Map();
    timezone;
    constructor(prisma, scheduleBuilder, configService) {
        this.prisma = prisma;
        this.scheduleBuilder = scheduleBuilder;
        this.configService = configService;
        this.timezone =
            this.configService.get('app.masjidTimezone') ?? 'UTC';
    }
    todayInTimezone() {
        return new Date().toLocaleDateString('sv-SE', { timeZone: this.timezone });
    }
    async allVersions() {
        return this.prisma.adhanConfigVersion.findMany({
            orderBy: { effectiveFrom: 'asc' },
        });
    }
    async allActivePeriods() {
        return this.prisma.adhanConfigPeriod.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
        });
    }
    async latestVersionId() {
        const latest = await this.prisma.adhanConfigVersion.findFirst({
            orderBy: { id: 'desc' },
            select: { id: true },
        });
        return latest?.id ?? 0;
    }
    generatePreviewId(settingsJson, type, extraDates, currentRevision) {
        const payload = `${settingsJson}|${type}|${extraDates}|${currentRevision}`;
        const hash = (0, crypto_1.createHash)('sha256').update(payload).digest('hex');
        const id = `pv_${(0, crypto_1.randomBytes)(8).toString('hex')}`;
        this.previewTokens.set(id, {
            hash,
            expiresAt: Date.now() + PREVIEW_TTL_MS,
        });
        for (const [k, v] of this.previewTokens) {
            if (v.expiresAt < Date.now())
                this.previewTokens.delete(k);
        }
        return id;
    }
    consumePreviewId(previewId, settingsJson, type, extraDates, currentRevision) {
        const token = this.previewTokens.get(previewId);
        if (!token || token.expiresAt < Date.now()) {
            this.previewTokens.delete(previewId);
            throw new common_1.UnprocessableEntityException('Preview token not found or expired. Please run the preview again.');
        }
        const expectedHash = (0, crypto_1.createHash)('sha256')
            .update(`${settingsJson}|${type}|${extraDates}|${currentRevision}`)
            .digest('hex');
        const a = (0, crypto_1.createHash)('sha256').update(token.hash).digest('hex');
        const b = (0, crypto_1.createHash)('sha256').update(expectedHash).digest('hex');
        if (a !== b) {
            throw new common_1.UnprocessableEntityException('Preview token does not match submitted settings. Please run the preview again.');
        }
        this.previewTokens.delete(previewId);
    }
    async getConfig() {
        const today = this.todayInTimezone();
        const [versions, periods, currentRevision] = await Promise.all([
            this.allVersions(),
            this.allActivePeriods(),
            this.latestVersionId(),
        ]);
        const lat = this.configService.get('app.masjidLatitude') ?? 0;
        const lon = this.configService.get('app.masjidLongitude') ?? 0;
        let effective = null;
        if (versions.length > 0) {
            try {
                effective = (0, adhan_config_resolver_1.resolveAdhanSettings)(today, versions, periods);
            }
            catch {
            }
        }
        const recommendedHighLatitudeRule = adhan_catalog_1.ADHAN_CATALOG.recommendedHighLatitudeRule(lat, lon);
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
    getCatalog() {
        const lat = this.configService.get('app.masjidLatitude') ?? 0;
        const lon = this.configService.get('app.masjidLongitude') ?? 0;
        const { recommendedHighLatitudeRule: fn, ...rest } = adhan_catalog_1.ADHAN_CATALOG;
        return {
            ...rest,
            recommendedHighLatitudeRule: fn(lat, lon),
        };
    }
    async preview(dto) {
        const { settings: settingsJson, type } = dto;
        let parsed;
        try {
            parsed = JSON.parse(settingsJson);
        }
        catch {
            throw new common_1.BadRequestException('settings must be valid JSON');
        }
        const extraDates = type === 'version'
            ? (dto.effectiveFrom ?? '')
            : `${dto.periodStartDate ?? ''}|${dto.periodEndDate ?? ''}`;
        let validationIssues = [];
        if (type === 'version') {
            const result = (0, adhan_config_validator_1.validateAdhanSettings)(parsed);
            validationIssues = result.issues;
            if (!result.valid) {
                throw new common_1.BadRequestException({
                    message: 'Invalid settings',
                    issues: result.issues,
                });
            }
        }
        else {
            const result = (0, adhan_config_validator_1.validatePartialAdhanSettings)(parsed);
            validationIssues = result.issues;
            if (!result.valid) {
                throw new common_1.BadRequestException({
                    message: 'Invalid period settings',
                    issues: result.issues,
                });
            }
            if (dto.periodStartDate && dto.periodEndDate) {
                const dateIssues = (0, adhan_config_validator_1.validatePeriodDates)(dto.periodStartDate, dto.periodEndDate);
                if (dateIssues.some((i) => i.severity === 'error')) {
                    throw new common_1.BadRequestException({
                        message: 'Invalid period dates',
                        issues: dateIssues,
                    });
                }
                validationIssues = [...validationIssues, ...dateIssues];
            }
        }
        const currentRevision = await this.latestVersionId();
        const previewId = this.generatePreviewId(settingsJson, type, extraDates, currentRevision);
        return {
            previewId,
            currentRevision,
            warnings: validationIssues.filter((i) => i.severity === 'warning'),
        };
    }
    async createVersion(dto, actor) {
        const today = this.todayInTimezone();
        const currentRevision = await this.latestVersionId();
        if (dto.expectedRevision !== currentRevision) {
            throw new common_1.ConflictException(`Settings changed since you opened this page (expected revision ${dto.expectedRevision}, current is ${currentRevision}). Please reload and review the latest values.`);
        }
        if (dto.effectiveFrom < today) {
            throw new common_1.BadRequestException(`effectiveFrom (${dto.effectiveFrom}) cannot be earlier than today (${today}).`);
        }
        let settings;
        try {
            settings = JSON.parse(dto.settings);
        }
        catch {
            throw new common_1.BadRequestException('settings must be valid JSON');
        }
        const validation = (0, adhan_config_validator_1.validateAdhanSettings)(settings);
        if (!validation.valid) {
            throw new common_1.BadRequestException({
                message: 'Invalid settings',
                issues: validation.issues,
            });
        }
        this.consumePreviewId(dto.previewId, dto.settings, 'version', dto.effectiveFrom, dto.expectedRevision);
        const version = await this.prisma.adhanConfigVersion.create({
            data: {
                effectiveFrom: dto.effectiveFrom,
                settings: dto.settings,
                createdBy: actor,
            },
        });
        const endOfYear = `${new Date().getFullYear() + 1}-12-31`;
        await this.scheduleBuilder.invalidateCache(dto.effectiveFrom, endOfYear);
        return version;
    }
    async createPeriod(dto, actor) {
        let settings;
        try {
            settings = JSON.parse(dto.settings);
        }
        catch {
            throw new common_1.BadRequestException('settings must be valid JSON');
        }
        const validation = (0, adhan_config_validator_1.validatePartialAdhanSettings)(settings);
        if (!validation.valid) {
            throw new common_1.BadRequestException({
                message: 'Invalid period settings',
                issues: validation.issues,
            });
        }
        const dateIssues = (0, adhan_config_validator_1.validatePeriodDates)(dto.startDate, dto.endDate);
        if (dateIssues.some((i) => i.severity === 'error')) {
            throw new common_1.BadRequestException({
                message: 'Invalid period dates',
                issues: dateIssues,
            });
        }
        const currentRevision = await this.latestVersionId();
        this.consumePreviewId(dto.previewId, dto.settings, 'period', `${dto.startDate}|${dto.endDate}`, currentRevision);
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
    async updatePeriod(id, dto) {
        const existing = await this.prisma.adhanConfigPeriod.findUnique({
            where: { id },
        });
        if (!existing || existing.deletedAt !== null) {
            throw new common_1.NotFoundException(`Period ${id} not found`);
        }
        const newSettings = dto.settings ?? existing.settings;
        const newStart = dto.startDate ?? existing.startDate;
        const newEnd = dto.endDate ?? existing.endDate;
        if (dto.settings) {
            let parsed;
            try {
                parsed = JSON.parse(dto.settings);
            }
            catch {
                throw new common_1.BadRequestException('settings must be valid JSON');
            }
            const validation = (0, adhan_config_validator_1.validatePartialAdhanSettings)(parsed);
            if (!validation.valid) {
                throw new common_1.BadRequestException({
                    message: 'Invalid period settings',
                    issues: validation.issues,
                });
            }
        }
        const dateIssues = (0, adhan_config_validator_1.validatePeriodDates)(newStart, newEnd);
        if (dateIssues.some((i) => i.severity === 'error')) {
            throw new common_1.BadRequestException({
                message: 'Invalid period dates',
                issues: dateIssues,
            });
        }
        const currentRevision = await this.latestVersionId();
        this.consumePreviewId(dto.previewId, newSettings, 'period', `${newStart}|${newEnd}`, currentRevision);
        const updated = await this.prisma.adhanConfigPeriod.update({
            where: { id },
            data: {
                ...(dto.label ? { label: dto.label } : {}),
                ...(dto.startDate ? { startDate: dto.startDate } : {}),
                ...(dto.endDate ? { endDate: dto.endDate } : {}),
                ...(dto.settings ? { settings: dto.settings } : {}),
            },
        });
        await this.scheduleBuilder.invalidateCache(existing.startDate, existing.endDate);
        if (newStart !== existing.startDate || newEnd !== existing.endDate) {
            await this.scheduleBuilder.invalidateCache(newStart, newEnd);
        }
        return updated;
    }
    async deletePeriod(id, previewId) {
        const existing = await this.prisma.adhanConfigPeriod.findUnique({
            where: { id },
        });
        if (!existing || existing.deletedAt !== null) {
            throw new common_1.NotFoundException(`Period ${id} not found`);
        }
        const currentRevision = await this.latestVersionId();
        this.consumePreviewId(previewId, existing.settings, 'period', `${existing.startDate}|${existing.endDate}`, currentRevision);
        await this.prisma.adhanConfigPeriod.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        await this.scheduleBuilder.invalidateCache(existing.startDate, existing.endDate);
    }
};
exports.AdhanConfigService = AdhanConfigService;
exports.AdhanConfigService = AdhanConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        schedule_builder_service_1.ScheduleBuilderService,
        config_1.ConfigService])
], AdhanConfigService);
//# sourceMappingURL=adhan-config.service.js.map