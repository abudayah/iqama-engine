import { Injectable } from '@nestjs/common';
import { Dayjs } from 'dayjs';
import { PrismaService } from '../prisma/prisma.service';
import { IqamaTimes } from '../rules/rules.service';
import { ceilingToNearest5, formatHHmm } from '../rules/time-utils';

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

  async getOverridesForDate(date: string): Promise<Override[]> {
    // SQLite stores DateTime as "YYYY-MM-DDTHH:mm:ss.sss+00:00".
    // Prisma serializes JS Date objects as "YYYY-MM-DD HH:mm:ss.sss" for SQLite
    // queries, which breaks lte/gte comparisons because space (ASCII 32) < 'T' (84),
    // making stored dates appear greater than query dates.
    // Fix: use raw SQL comparing the YYYY-MM-DD prefix, which is format-agnostic.
    return this.prisma.$queryRaw<Override[]>`
      SELECT * FROM "Override"
      WHERE substr("startDate", 1, 10) <= ${date}
        AND substr("endDate",   1, 10) >= ${date}
        AND "deletedAt" IS NULL
    `;
  }

  /**
   * Apply overrides to the rules-computed Iqama times.
   *
   * Priority rules enforced here:
   * - P0 (Admin Override): Highest priority — admin override value is used instead of the
   *   FR1–FR5 calculation. The admin is a trusted operator who knows the Shariah requirements.
   *   No safety ceiling is applied; the override is used as-is (after P3 rounding).
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

    for (const override of overrides) {
      const prayer = override.prayer as keyof IqamaTimes;
      // Skip overrides for unrecognised prayer names
      if (!(prayer in result)) continue;

      let overrideTime: Dayjs | null = null;

      if (override.overrideType === 'FIXED') {
        const azan = rawAzanTimes[prayer];
        if (!azan) continue;
        // Parse HH:mm into a Dayjs on the same date as the Azan
        const [hours, minutes] = override.value.split(':').map(Number);
        overrideTime = azan
          .startOf('day')
          .hour(hours)
          .minute(minutes)
          .second(0);
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
