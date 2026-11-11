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
import {
  parseIqamaRulesMode,
  parseRuleVersions,
  resolveRuleSet,
} from './iqama-rules.resolver';
import { validateRuleSet } from './iqama-rules.validator';
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

const addDays = (date: string, n: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** First Friday strictly after `today`. */
export function nextFriday(today: string): string {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  return addDays(today, (5 - dow + 7) % 7 || 7);
}

@Injectable()
export class IqamaRulesService {
  private readonly previewTokens = new Map<
    string,
    { hash: string; expiresAt: number }
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

  private tokenHash(settings: string, effectiveFrom: string, revision: number) {
    return createHash('sha256')
      .update(`${settings}|${effectiveFrom}|${revision}`)
      .digest('hex');
  }

  private issuePreviewId(hash: string): string {
    const id = `ipv_${randomBytes(8).toString('hex')}`;
    this.previewTokens.set(id, {
      hash,
      expiresAt: Date.now() + PREVIEW_TTL_MS,
    });
    for (const [k, v] of this.previewTokens) {
      if (v.expiresAt < Date.now()) this.previewTokens.delete(k);
    }
    return id;
  }

  private consumePreviewId(id: string, hash: string): void {
    const token = this.previewTokens.get(id);
    if (!token || token.expiresAt < Date.now()) {
      this.previewTokens.delete(id);
      throw new UnprocessableEntityException(
        'Preview token not found or expired. Please run the preview again.',
      );
    }
    if (token.hash !== hash) {
      throw new UnprocessableEntityException(
        'Preview token does not match submitted settings. Please run the preview again.',
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
    return { rules, effectiveFrom, warnings: result.warnings, versions };
  }

  // ── GET / ──────────────────────────────────────────────────────────────────

  async getConfig() {
    const today = this.today();
    const [versions, currentRevision] = await Promise.all([
      this.allVersions(),
      this.latestVersionId(),
    ]);
    const parsed = parseRuleVersions(versions);
    return {
      mode: parseIqamaRulesMode(this.configService.get('app.iqamaRules')),
      currentRevision,
      versions,
      effective: resolveRuleSet(today, parsed) ?? null,
      today,
      timezone: this.timezone,
      defaultEffectiveFrom: nextFriday(today),
    };
  }

  // ── GET /catalog ───────────────────────────────────────────────────────────

  getCatalog() {
    return RULE_CATALOG;
  }

  // ── POST /preview ──────────────────────────────────────────────────────────

  async preview(dto: PreviewIqamaRulesDto) {
    const { effectiveFrom, warnings, versions } = await this.validateDraft(
      dto.settings,
      dto.effectiveFrom,
    );
    const currentRevision = await this.latestVersionId();

    const proposedRecord: IqamaRuleVersionRecord = {
      id: currentRevision + 1,
      effectiveFrom,
      settings: dto.settings,
      createdBy: 'preview',
      createdAt: new Date(),
    };
    const currentRules = versions.length > 0 ? versions : 'legacy';
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
      PRAYER_NAMES.map((p) => [p, { daysChanged: 0, daysClamped: 0 }]),
    );
    const changedDates: string[] = [];
    const clampedDates: string[] = [];
    let daysClampedCurrent = 0;
    const days = proposed.map((p, i) => {
      const c = current[i];
      let changed = false;
      let clamped = false;
      const prayers: Record<string, unknown> = {};
      for (const name of PRAYER_NAMES) {
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
      if (changed) changedDates.push(p.date);
      if (clamped) clampedDates.push(p.date);
      if (PRAYER_NAMES.some((n) => c[n].iqama_clamped)) daysClampedCurrent++;
      return { date: p.date, day_of_week: p.day_of_week, prayers };
    });

    return {
      previewId: this.issuePreviewId(
        this.tokenHash(dto.settings, effectiveFrom, currentRevision),
      ),
      currentRevision,
      effectiveFrom,
      warnings,
      days: days.slice(0, SAMPLE_DAYS),
      summary: {
        from: effectiveFrom,
        to,
        totalDays: proposed.length,
        daysChanged: changedDates.length,
        daysClamped: clampedDates.length,
        daysClampedCurrent,
        firstChangedDates: changedDates.slice(0, FIRST_DATES),
        firstClampedDates: clampedDates.slice(0, FIRST_DATES),
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
    const { effectiveFrom } = await this.validateDraft(
      dto.settings,
      dto.effectiveFrom,
    );
    this.consumePreviewId(
      dto.previewId,
      this.tokenHash(dto.settings, effectiveFrom, dto.expectedRevision),
    );

    const version = await this.prisma.iqamaRuleVersion.create({
      data: { effectiveFrom, settings: dto.settings, createdBy: actor },
    });

    const endOfNextYear = `${new Date().getFullYear() + 1}-12-31`;
    await this.scheduleBuilder.invalidateCache(effectiveFrom, endOfNextYear);
    return version;
  }
}
