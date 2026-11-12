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
exports.IqamaRulesService = exports.canonicalJson = void 0;
exports.nextFriday = nextFriday;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const schedule_builder_service_1 = require("../schedule-builder/schedule-builder.service");
const iqama_rules_catalog_1 = require("./iqama-rules.catalog");
const iqama_rules_resolver_1 = require("./iqama-rules.resolver");
const iqama_rules_validator_1 = require("./iqama-rules.validator");
const iqama_rules_canonical_1 = require("./iqama-rules.canonical");
Object.defineProperty(exports, "canonicalJson", { enumerable: true, get: function () { return iqama_rules_canonical_1.canonicalJson; } });
const iqama_rules_preview_stats_1 = require("./iqama-rules.preview-stats");
const iqama_rules_types_1 = require("./iqama-rules.types");
const PREVIEW_TTL_MS = 10 * 60 * 1000;
const SAMPLE_DAYS = 14;
const SCAN_DAYS = 365;
const FIRST_DATES = 10;
const MAX_CONFLICTS_LISTED = 100;
const addDays = (date, n) => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};
function nextFriday(today) {
    const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
    return addDays(today, (5 - dow + 7) % 7 || 7);
}
let IqamaRulesService = class IqamaRulesService {
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
    today() {
        return new Date().toLocaleDateString('sv-SE', { timeZone: this.timezone });
    }
    allVersions() {
        return this.prisma.iqamaRuleVersion.findMany({
            orderBy: { effectiveFrom: 'asc' },
        });
    }
    async latestVersionId() {
        const latest = await this.prisma.iqamaRuleVersion.findFirst({
            orderBy: { id: 'desc' },
            select: { id: true },
        });
        return latest?.id ?? 0;
    }
    requestHash(rules, effectiveFrom) {
        return (0, crypto_1.createHash)('sha256')
            .update(`${(0, iqama_rules_canonical_1.canonicalJson)(rules)}|${effectiveFrom}`)
            .digest('hex');
    }
    issuePreviewId(requestHash, revision, conflictCount) {
        const id = `ipv_${(0, crypto_1.randomBytes)(8).toString('hex')}`;
        this.previewTokens.set(id, {
            requestHash,
            revision,
            expiresAt: Date.now() + PREVIEW_TTL_MS,
            conflictCount,
        });
        for (const [k, v] of this.previewTokens) {
            if (v.expiresAt < Date.now())
                this.previewTokens.delete(k);
        }
        return id;
    }
    consumePreviewId(id, requestHash, revision, acknowledgeConflicts) {
        const fail = (code, message, extra = {}) => new common_1.UnprocessableEntityException({ code, message, ...extra });
        const token = this.previewTokens.get(id);
        if (!token || token.expiresAt < Date.now()) {
            this.previewTokens.delete(id);
            throw fail('IQAMA_PREVIEW_INVALID', 'Preview token not found, expired or already used. Please run the preview again.');
        }
        if (token.requestHash !== requestHash) {
            throw fail('IQAMA_PREVIEW_MISMATCH', 'The rules or effective date differ from the ones that were previewed. Please run the preview again.');
        }
        if (token.revision !== revision) {
            throw fail('IQAMA_REVISION_STALE', `The preview was made against revision ${token.revision}, but this save is for revision ${revision}. Please reload and run the preview again.`);
        }
        if (token.conflictCount > 0 && !acknowledgeConflicts) {
            throw fail('IQAMA_CONFLICTS_NOT_ACKNOWLEDGED', `This proposal has ${token.conflictCount} day(s) where Fajr cannot end 60 minutes before sunrise (Azan + 3 minutes wins). Review the conflicts in the preview and send acknowledgeConflicts: true to save.`, { conflictCount: token.conflictCount });
        }
        this.previewTokens.delete(id);
    }
    async validateDraft(settingsJson, requestedFrom) {
        let rules;
        try {
            rules = JSON.parse(settingsJson);
        }
        catch {
            throw new common_1.BadRequestException('settings must be valid JSON');
        }
        const today = this.today();
        const effectiveFrom = requestedFrom ?? nextFriday(today);
        if (effectiveFrom < today) {
            throw new common_1.BadRequestException(`effectiveFrom (${effectiveFrom}) cannot be earlier than today (${today}).`);
        }
        const versions = await this.allVersions();
        const latest = [...versions]
            .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.id - b.id)
            .at(-1);
        if (latest && effectiveFrom < latest.effectiveFrom) {
            throw new common_1.BadRequestException(`A version starting ${latest.effectiveFrom} already exists; effectiveFrom must not be earlier.`);
        }
        let previous;
        if (latest) {
            try {
                previous = JSON.parse(latest.settings);
            }
            catch {
                previous = undefined;
            }
        }
        const result = (0, iqama_rules_validator_1.validateRuleSet)(rules, effectiveFrom, previous);
        if (result.errors.length > 0) {
            throw new common_1.BadRequestException({
                message: 'Invalid settings',
                errors: result.errors,
                warnings: result.warnings,
            });
        }
        return {
            rules,
            effectiveFrom,
            warnings: result.warnings,
            versions,
            requestHash: this.requestHash(rules, effectiveFrom),
        };
    }
    async getConfig() {
        const today = this.today();
        const cutover = (0, iqama_rules_resolver_1.parseCutover)(this.configService.get('app.iqamaRulesCutover'));
        const [versions, currentRevision] = await Promise.all([
            this.allVersions(),
            this.latestVersionId(),
        ]);
        const describe = (row) => {
            let rules = null;
            let error = null;
            try {
                rules = (0, iqama_rules_resolver_1.loadRuleSet)(row);
            }
            catch (e) {
                error = e instanceof Error ? e.message : String(e);
            }
            return {
                versionId: row.id,
                effectiveFrom: row.effectiveFrom,
                createdAt: row.createdAt,
                reason: row.reason ?? null,
                rules,
                error,
            };
        };
        const effectiveRow = today < cutover ? undefined : (0, iqama_rules_resolver_1.resolveRuleVersion)(today, versions);
        const latestRow = [...versions]
            .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.id - b.id)
            .at(-1);
        return {
            mode: (0, iqama_rules_resolver_1.parseIqamaRulesMode)(this.configService.get('app.iqamaRules')),
            cutover,
            currentRevision,
            today,
            timezone: this.timezone,
            defaultEffectiveFrom: nextFriday(today),
            effective: effectiveRow ? describe(effectiveRow) : null,
            latest: latestRow ? describe(latestRow) : null,
            upcoming: versions
                .filter((v) => v.effectiveFrom > today)
                .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.id - b.id)
                .map(describe),
            versions: versions.map((v) => ({
                id: v.id,
                effectiveFrom: v.effectiveFrom,
                createdAt: v.createdAt,
                createdBy: v.createdBy,
                reason: v.reason ?? null,
                settings: v.settings,
            })),
        };
    }
    getCatalog() {
        return iqama_rules_catalog_1.RULE_CATALOG;
    }
    async preview(dto) {
        const { effectiveFrom, warnings, versions, requestHash } = await this.validateDraft(dto.settings, dto.effectiveFrom);
        const currentRevision = await this.latestVersionId();
        const proposedRecord = {
            id: currentRevision + 1,
            effectiveFrom,
            settings: dto.settings,
            reason: null,
            createdBy: 'preview',
            createdAt: new Date(),
        };
        const currentRules = versions.length > 0 ? versions : 'legacy';
        const proposedRules = [...versions, proposedRecord];
        const to = addDays(effectiveFrom, SCAN_DAYS - 1);
        const months = [];
        for (let m = effectiveFrom.slice(0, 7); m <= to.slice(0, 7);) {
            months.push(m);
            const [y, mo] = m.split('-').map(Number);
            m = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
        }
        const inRange = (d) => d.date >= effectiveFrom && d.date <= to;
        const current = [];
        const proposed = [];
        for (const m of months) {
            const cur = await this.scheduleBuilder.buildMonth(m, {
                rules: currentRules,
            });
            const prop = await this.scheduleBuilder.buildMonth(m, {
                rules: proposedRules,
            });
            current.push(...cur.filter(inRange));
            proposed.push(...prop.filter(inRange));
        }
        const byPrayer = Object.fromEntries(iqama_rules_types_1.PRAYER_NAMES.map((p) => [
            p,
            { daysChanged: 0, daysClamped: 0, ...(0, iqama_rules_preview_stats_1.emptyStats)() },
        ]));
        const total = (0, iqama_rules_preview_stats_1.emptyStats)();
        const conflicts = [];
        let conflictDays = 0;
        const changedDates = [];
        const clampedDates = [];
        let daysClampedCurrent = 0;
        const days = proposed.map((p, i) => {
            const c = current[i];
            let changed = false;
            let clamped = false;
            const prayers = {};
            const dayClass = {
                changed: false,
                movedNow: false,
                movedProposed: false,
                newlyMoved: false,
                noLongerMoved: false,
            };
            for (const name of iqama_rules_types_1.PRAYER_NAMES) {
                const k = (0, iqama_rules_preview_stats_1.classifyDay)(c[name], p[name]);
                (0, iqama_rules_preview_stats_1.addDay)(byPrayer[name], p.date, k, FIRST_DATES);
                for (const key of Object.keys(dayClass)) {
                    dayClass[key] ||= k[key];
                }
                const ch = c[name].iqama !== p[name].iqama;
                const cl = p[name].iqama_clamped === true;
                if (ch)
                    byPrayer[name].daysChanged++;
                if (cl)
                    byPrayer[name].daysClamped++;
                changed ||= ch;
                clamped ||= cl;
                prayers[name] = {
                    azan: p[name].azan,
                    current: {
                        iqama: c[name].iqama,
                        clamped: c[name].iqama_clamped === true,
                    },
                    proposed: { iqama: p[name].iqama, clamped: cl },
                };
            }
            if (p.fajr.iqama_conflict) {
                conflictDays++;
                if (conflicts.length < MAX_CONFLICTS_LISTED) {
                    conflicts.push({
                        date: p.date,
                        prayer: 'fajr',
                        azan: p.fajr.azan,
                        sunrise: p.sunrise,
                        iqama: p.fajr.iqama,
                        brokenLimit: 'fajr_ends_60_min_before_sunrise',
                        wonBy: 'azan_plus_3_min_gap',
                    });
                }
            }
            (0, iqama_rules_preview_stats_1.addDay)(total, p.date, dayClass, FIRST_DATES);
            if (changed)
                changedDates.push(p.date);
            if (clamped)
                clampedDates.push(p.date);
            if (iqama_rules_types_1.PRAYER_NAMES.some((n) => c[n].iqama_clamped))
                daysClampedCurrent++;
            return { date: p.date, day_of_week: p.day_of_week, prayers };
        });
        return {
            previewId: this.issuePreviewId(requestHash, currentRevision, conflictDays),
            currentRevision,
            effectiveFrom,
            requestHash,
            warnings,
            conflicts,
            days: days.slice(0, SAMPLE_DAYS),
            summary: {
                from: effectiveFrom,
                to,
                totalDays: proposed.length,
                daysChanged: changedDates.length,
                daysClamped: clampedDates.length,
                daysClampedCurrent,
                conflictDays,
                firstChangedDates: changedDates.slice(0, FIRST_DATES),
                firstClampedDates: clampedDates.slice(0, FIRST_DATES),
                ...total,
                byPrayer,
            },
        };
    }
    async createVersion(dto, actor) {
        const currentRevision = await this.latestVersionId();
        if (dto.expectedRevision !== currentRevision) {
            throw new common_1.ConflictException(`Rules changed since you opened this page (expected revision ${dto.expectedRevision}, current is ${currentRevision}). Please reload and review the latest values.`);
        }
        const { effectiveFrom, requestHash } = await this.validateDraft(dto.settings, dto.effectiveFrom);
        if (dto.requestHash !== undefined && dto.requestHash !== requestHash) {
            throw new common_1.UnprocessableEntityException({
                code: 'IQAMA_PREVIEW_MISMATCH',
                message: 'requestHash does not match the submitted settings and effectiveFrom. Please run the preview again.',
            });
        }
        this.consumePreviewId(dto.previewId, requestHash, dto.expectedRevision, dto.acknowledgeConflicts === true);
        const version = await this.prisma.iqamaRuleVersion.create({
            data: {
                effectiveFrom,
                settings: dto.settings,
                createdBy: actor,
                reason: dto.reason ?? null,
            },
        });
        const endOfNextYear = `${new Date().getFullYear() + 1}-12-31`;
        await this.scheduleBuilder.invalidateCache(effectiveFrom, endOfNextYear);
        return version;
    }
};
exports.IqamaRulesService = IqamaRulesService;
exports.IqamaRulesService = IqamaRulesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        schedule_builder_service_1.ScheduleBuilderService,
        config_1.ConfigService])
], IqamaRulesService);
//# sourceMappingURL=iqama-rules.service.js.map