import { Injectable, ConflictException } from '@nestjs/common';
import { Dayjs } from 'dayjs';
import { PrismaService } from '../prisma/prisma.service';
import { IqamaTimes } from '../iqama-rules/iqama-rules.types';
import {
  ceilingToNearest5,
  formatHHmm,
  setTimeInTz,
} from '../rules/time-utils';

/** YYYY-MM-DD of a stored override boundary (Date from Prisma, or ISO string). */
const ymd = (v: Date | string): string =>
  (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10);

export interface Override {
  id: number;
  prayer: string; // "fajr" | "dhuhr" | "asr" | "maghrib" | "isha"
  overrideType: string; // "FIXED" | "OFFSET"
  value: string; // HH:mm for FIXED, integer minutes as string for OFFSET
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

@Injectable()
export class OverrideService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Overrides overlapping [startDate, endDate] (YYYY-MM-DD, inclusive),
   * newest first. One query per month instead of one per day.
   */
  async getOverridesForRange(
    startDate: string,
    endDate: string,
  ): Promise<Override[]> {
    // SQLite stores DateTime as "YYYY-MM-DDTHH:mm:ss.sss+00:00".
    // Prisma serializes JS Date objects as "YYYY-MM-DD HH:mm:ss.sss" for SQLite
    // queries, which breaks lte/gte comparisons because space (ASCII 32) < 'T' (84),
    // making stored dates appear greater than query dates.
    // Fix: use raw SQL comparing the YYYY-MM-DD prefix, which is format-agnostic.
    return this.prisma.$queryRaw<Override[]>`
      SELECT * FROM "Override"
      WHERE substr("startDate", 1, 10) <= ${endDate}
        AND substr("endDate",   1, 10) >= ${startDate}
        AND "deletedAt" IS NULL
      ORDER BY "createdAt" DESC
    `;
  }

  /**
   * Reject a new/changed override whose date range overlaps an active
   * override for the SAME prayer (different prayers may overlap).
   * Dates are YYYY-MM-DD, inclusive. `excludeId` skips the override being edited.
   */
  async assertNoOverlap(
    prayer: string,
    startDate: string,
    endDate: string,
    excludeId?: number,
  ): Promise<void> {
    const clash = await this.findOverlaps(
      prayer,
      startDate,
      endDate,
      excludeId,
    );
    if (clash.length > 0) {
      const c = clash[0];
      throw new ConflictException(
        `Override #${c.id} (${c.prayer} ${c.overrideType} ${c.value}, ${ymd(c.startDate)} to ${ymd(c.endDate)}) already covers ${prayer} within ${startDate} to ${endDate}. Edit or delete it first.`,
      );
    }
  }

  async findOverlaps(
    prayer: string,
    startDate: string,
    endDate: string,
    excludeId?: number,
  ): Promise<Override[]> {
    return this.prisma.$queryRaw<Override[]>`
      SELECT * FROM "Override"
      WHERE "prayer" = ${prayer}
        AND substr("startDate", 1, 10) <= ${endDate}
        AND substr("endDate",   1, 10) >= ${startDate}
        AND "deletedAt" IS NULL
        AND "id" != ${excludeId ?? -1}
      ORDER BY "createdAt" DESC
    `;
  }

  /**
   * Apply overrides to the rules-computed Iqama times.
   *
   * Priority rules enforced here:
   * - P0 (Admin Override): Highest priority — admin override value is used instead of the
   *   FR1–FR5 calculation. The admin is a trusted operator who knows the Shariah requirements.
   *   The override is used as-is (after P3 rounding); the min-gap / Fajr-sunrise
   *   guardrail is applied afterwards by ScheduleBuilderService (iqama_clamped).
   * - P3: All override results are rounded to the nearest 5 minutes (CeilingToNearest5).
   *
   * Override types:
   * - FIXED: admin sets an exact HH:mm time → rounded to nearest 5
   * - OFFSET: admin sets ±N minutes relative to Azan → rounded to nearest 5
   *
   * hasOverrides is true when at least one override was applied.
   */
  applyOverrides(
    rawAzanTimes: Record<string, Dayjs>,
    rulesIqamaTimes: IqamaTimes,
    overrides: Override[],
  ): { iqamaTimes: IqamaTimes; hasOverrides: boolean } {
    const result = { ...rulesIqamaTimes };
    let hasOverrides = false;

    // Oldest first, so the NEWEST override for a prayer is applied last and wins.
    const ordered = [...overrides].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
        a.id - b.id,
    );

    for (const override of ordered) {
      const prayer = override.prayer as keyof IqamaTimes;
      // Skip overrides for unrecognised prayer names
      if (!(prayer in result)) continue;

      let overrideTime: Dayjs | null = null;

      if (override.overrideType === 'FIXED') {
        const azan = rawAzanTimes[prayer];
        if (!azan) continue;
        // Parse HH:mm into a Dayjs on the same date as the Azan.
        // Use setTimeInTz() instead of bare .hour()/.minute()/.second() setters
        // because dayjs-hijri overwrites .set() and drops $x.$timezone.
        const [hours, minutes] = override.value.split(':').map(Number);
        overrideTime = setTimeInTz(azan, hours, minutes, 0);
        hasOverrides = true;
      } else if (override.overrideType === 'OFFSET') {
        const azan = rawAzanTimes[prayer];
        if (!azan) continue;
        const offsetMinutes = parseInt(override.value, 10);
        overrideTime = azan.add(offsetMinutes, 'minute');
        hasOverrides = true;
      }

      if (overrideTime === null) continue;

      // P3: round to nearest 5 minutes — admin override takes full priority (P0),
      // no safety ceiling is applied; the admin is trusted to set correct times.
      const rounded = ceilingToNearest5(overrideTime);

      result[prayer] = formatHHmm(rounded);
    }

    return { iqamaTimes: result, hasOverrides };
  }
}
