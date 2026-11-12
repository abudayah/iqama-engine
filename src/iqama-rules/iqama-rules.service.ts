import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleBuilderService } from '../schedule-builder/schedule-builder.service';
import { DailySchedule } from '../schedule/daily-schedule.interface';
import { RULE_CATALOG } from './iqama-rules.catalog';
import { loadRuleSet, resolveRuleVersion } from './iqama-rules.resolver';
import { validateRuleSet } from './iqama-rules.validator';
import { canonicalJson } from './iqama-rules.canonical';
import { addDay, classifyDay, emptyStats } from './iqama-rules.preview-stats';
import {
  IqamaRuleVersionRecord,
  PRAYER_NAMES,
  RuleSet,
} from './iqama-rules.types';
import type { PreviewIqamaRulesDto } from './dto/preview-iqama-rules.dto';
import type { CreateIqamaRulesVersionDto } from './dto/create-iqama-rules-version.dto';

const PREVIEW_TTL_MS = 10 * 60 * 1000;
/** Days of real schedule returned for the side-by-side table. */
const SAMPLE_DAYS = 14;
/** Days scanned for the summary. */
const SCAN_DAYS = 365;
const FIRST_DATES = 10;
/** Max Fajr clashes listed in a preview (the total is in summary.conflictDays). */
const MAX_CONFLICTS_LISTED = 100;

const addDays = (date: string, n: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export { canonicalJson };

/** First Friday strictly after `today`. */
export function nextFriday(today: string): string {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  return addDays(today, (5 - dow + 7) % 7 || 7);
}

@Injectable()
export class IqamaRulesService {
  private readonly previewTokens = new Map<
    string,
    {
      requestHash: string;
      revision: number;
      expiresAt: number;
      conflictCount: number;
    }
  >();
  private readonly timezone: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleBuilder: ScheduleBuilderService,
    private readonly configService: ConfigService,
  ) {
    this.timezone =
      this.configService.get<string>('app.masjidTimezone') ?? 'UTC';
  }

  private today(): string {
    return new Date().toLocaleDateString('sv-SE', { timeZone: this.timezone });
  }

  private allVersions(): Promise<IqamaRuleVersionRecord[]> {
    return this.prisma.iqamaRuleVersion.findMany({
      orderBy: { effectiveFrom: 'asc' },
    });
  }

  private async latestVersionId(): Promise<number> {
    const latest = await this.prisma.iqamaRuleVersion.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    return latest?.id ?? 0;
  }

  // ── preview tokens (same scheme as adhan-config) ───────────────────────────

  /**
   * Hash of the exact request: canonical RuleSet (keys sorted, so formatting and
   * key order do not matter) + effectiveFrom. The preview token is bound to it.
   */
  private requestHash(rules: RuleSet, effectiveFrom: string): string {
    return createHash('sha256')
      .update(`${canonicalJson(rules)}|${effectiveFrom}`)
      .digest('hex');
  }

  private issuePreviewId(
    requestHash: string,
    revision: number,
    conflictCount: number,
  ): string {
    const id = `ipv_${randomBytes(8).toString('hex')}`;
    this.previewTokens.set(id, {
      requestHash,
      revision,
      expiresAt: Date.now() + PREVIEW_TTL_MS,
      conflictCount,
    });
    for (const [k, v] of this.previewTokens) {
      if (v.expiresAt < Date.now()) this.previewTokens.delete(k);
    }
    return id;
  }

  /**
   * The token is valid only for the exact request hash and revision it was
   * issued for. Single use. Errors are 422 with a `code`:
   *  IQAMA_PREVIEW_INVALID    missing, expired or already used
   *  IQAMA_PREVIEW_MISMATCH   settings/effectiveFrom differ from the preview
   *  IQAMA_REVISION_STALE     previewed against another revision than the one being saved on
   *  IQAMA_CONFLICTS_NOT_ACKNOWLEDGED  Fajr conflicts listed, acknowledgeConflicts missing
   */
  private consumePreviewId(
    id: string,
    requestHash: string,
    revision: number,
    acknowledgeConflicts: boolean,
  ): void {
    const fail = (code: string, message: string, extra = {}) =>
      new UnprocessableEntityException({ code, message, ...extra });
    const token = this.previewTokens.get(id);
    if (!token || token.expiresAt < Date.now()) {
      this.previewTokens.delete(id);
      throw fail(
        'IQAMA_PREVIEW_INVALID',
        'Preview token not found, expired or already used. Please run the preview again.',
      );
    }
    if (token.requestHash !== requestHash) {
      throw fail(
        'IQAMA_PREVIEW_MISMATCH',
        'The rules or effective date differ from the ones that were previewed. Please run the preview again.',
      );
    }
    if (token.revision !== revision) {
      throw fail(
        'IQAMA_REVISION_STALE',
        `The preview was made against revision ${token.revision}, but this save is for revision ${revision}. Please reload and run the preview again.`,
      );
    }
    // Checked before the token is used up, so the admin can retry with the flag.
    if (token.conflictCount > 0 && !acknowledgeConflicts) {
      throw fail(
        'IQAMA_CONFLICTS_NOT_ACKNOWLEDGED',
        `This proposal has ${token.conflictCount} day(s) where Fajr cannot end 60 minutes before sunrise (Azan + 3 minutes wins). Review the conflicts in the preview and send acknowledgeConflicts: true to save.`,
        { conflictCount: token.conflictCount },
      );
    }
    this.previewTokens.delete(id);
  }

  // ── shared validation (preview and save use the same checks) ───────────────

  private async validateDraft(settingsJson: string, requestedFrom?: string) {
    let rules: RuleSet;
    try {
      rules = JSON.parse(settingsJson) as RuleSet;
    } catch {
      throw new BadRequestException('settings must be valid JSON');
    }
    const today = this.today();
    const effectiveFrom = requestedFrom ?? nextFriday(today);
    if (effectiveFrom < today) {
      throw new BadRequestException(
        `effectiveFrom (${effectiveFrom}) cannot be earlier than today (${today}).`,
      );
    }
    const versions = await this.allVersions();
    const latest = [...versions]
      .sort(
        (a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.id - b.id,
      )
      .at(-1);
    if (latest && effectiveFrom < latest.effectiveFrom) {
      throw new BadRequestException(
        `A version starting ${latest.effectiveFrom} already exists; effectiveFrom must not be earlier.`,
      );
    }
    let previous: RuleSet | undefined;
    if (latest) {
      try {
        previous = JSON.parse(latest.settings) as RuleSet;
      } catch {
        previous = undefined; // treat as "everything changes"
      }
    }
    const result = validateRuleSet(rules, effectiveFrom, previous);
    if (result.errors.length > 0) {
      throw new BadRequestException({
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

  // ── GET / ──────────────────────────────────────────────────────────────────

  async getConfig() {
    const today = this.today();
    const [versions, currentRevision] = await Promise.all([
      this.allVersions(),
      this.latestVersionId(),
    ]);

    const describe = (row: IqamaRuleVersionRecord) => {
      let rules: RuleSet | null = null;
      let error: string | null = null;
      try {
        rules = loadRuleSet(row);
      } catch (e) {
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

    // In force today (dates before the first version use the earliest one).
    const effectiveRow = resolveRuleVersion(today, versions);
    // The baseline every new version must be built on (the newest one).
    const latestRow = [...versions]
      .sort(
        (a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.id - b.id,
      )
      .at(-1);

    return {
      // Deprecated: always 'db'. The legacy and shadow engines were removed.
      mode: 'db' as const,
      currentRevision,
      today,
      timezone: this.timezone,
      defaultEffectiveFrom: nextFriday(today),
      effective: effectiveRow ? describe(effectiveRow) : null,
      latest: latestRow ? describe(latestRow) : null,
      upcoming: versions
        .filter((v) => v.effectiveFrom > today)
        .sort(
          (a, b) =>
            a.effectiveFrom.localeCompare(b.effectiveFrom) || a.id - b.id,
        )
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

  // ── GET /catalog ───────────────────────────────────────────────────────────

  getCatalog() {
    return RULE_CATALOG;
  }

  // ── POST /preview ──────────────────────────────────────────────────────────

  async preview(dto: PreviewIqamaRulesDto) {
    const { effectiveFrom, warnings, versions, requestHash } =
      await this.validateDraft(dto.settings, dto.effectiveFrom);
    const currentRevision = await this.latestVersionId();

    const proposedRecord: IqamaRuleVersionRecord = {
      id: currentRevision + 1,
      effectiveFrom,
      settings: dto.settings,
      reason: null,
      createdBy: 'preview',
      createdAt: new Date(),
    };
    const currentRules = versions;
    const proposedRules = [...versions, proposedRecord];

    const to = addDays(effectiveFrom, SCAN_DAYS - 1);
    const months: string[] = [];
    for (let m = effectiveFrom.slice(0, 7); m <= to.slice(0, 7); ) {
      months.push(m);
      const [y, mo] = m.split('-').map(Number);
      m = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
    }
    const inRange = (d: DailySchedule) =>
      d.date >= effectiveFrom && d.date <= to;
    const current: DailySchedule[] = [];
    const proposed: DailySchedule[] = [];
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

    const byPrayer = Object.fromEntries(
      PRAYER_NAMES.map((p) => [
        p,
        { daysChanged: 0, daysClamped: 0, ...emptyStats() },
      ]),
    );
    // Totals count days where at least one prayer matches.
    const total = emptyStats();
    const conflicts: {
      date: string;
      prayer: 'fajr';
      azan: string;
      sunrise: string;
      iqama: string;
      brokenLimit: string;
      wonBy: string;
    }[] = [];
    let conflictDays = 0;
    const changedDates: string[] = [];
    const clampedDates: string[] = [];
    let daysClampedCurrent = 0;
    const days = proposed.map((p, i) => {
      const c = current[i];
      let changed = false;
      let clamped = false;
      const prayers: Record<string, unknown> = {};
      const dayClass = {
        changed: false,
        movedNow: false,
        movedProposed: false,
        newlyMoved: false,
        noLongerMoved: false,
      };
      for (const name of PRAYER_NAMES) {
        const k = classifyDay(c[name], p[name]);
        addDay(byPrayer[name], p.date, k, FIRST_DATES);
        for (const key of Object.keys(dayClass) as (keyof typeof dayClass)[]) {
          dayClass[key] ||= k[key];
        }
        const ch = c[name].iqama !== p[name].iqama;
        const cl = p[name].iqama_clamped === true;
        if (ch) byPrayer[name].daysChanged++;
        if (cl) byPrayer[name].daysClamped++;
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
      addDay(total, p.date, dayClass, FIRST_DATES);
      if (changed) changedDates.push(p.date);
      if (clamped) clampedDates.push(p.date);
      if (PRAYER_NAMES.some((n) => c[n].iqama_clamped)) daysClampedCurrent++;
      return { date: p.date, day_of_week: p.day_of_week, prayers };
    });

    return {
      previewId: this.issuePreviewId(
        requestHash,
        currentRevision,
        conflictDays,
      ),
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

  // ── PUT /base ──────────────────────────────────────────────────────────────

  async createVersion(dto: CreateIqamaRulesVersionDto, actor: string) {
    const currentRevision = await this.latestVersionId();
    if (dto.expectedRevision !== currentRevision) {
      throw new ConflictException(
        `Rules changed since you opened this page (expected revision ${dto.expectedRevision}, current is ${currentRevision}). Please reload and review the latest values.`,
      );
    }
    const { effectiveFrom, requestHash } = await this.validateDraft(
      dto.settings,
      dto.effectiveFrom,
    );
    // Optional echo from the client: must be the hash the preview returned.
    if (dto.requestHash !== undefined && dto.requestHash !== requestHash) {
      throw new UnprocessableEntityException({
        code: 'IQAMA_PREVIEW_MISMATCH',
        message:
          'requestHash does not match the submitted settings and effectiveFrom. Please run the preview again.',
      });
    }
    this.consumePreviewId(
      dto.previewId,
      requestHash,
      dto.expectedRevision,
      dto.acknowledgeConflicts === true,
    );

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
}
