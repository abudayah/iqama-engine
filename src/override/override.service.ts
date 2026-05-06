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
    // Parse YYYY-MM-DD to a Date at midnight UTC for comparison
    const dateObj = new Date(`${date}T00:00:00.000Z`);

    return this.prisma.override.findMany({
      where: {
        startDate: { lte: dateObj },
        endDate: { gte: dateObj },
        deletedAt: null,
      },
    });
  }

  /**
   * Apply overrides to the rules-computed Iqama times.
   *
   * - FIXED override: return override.value directly, skip FR1–FR5 for that prayer
   * - OFFSET override: return formatHHmm(ceilingToNearest5(azan + offsetMinutes))
   * - hasOverrides is true when at least one override was applied
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
      if (override.overrideType === 'FIXED') {
        result[prayer] = override.value;
        hasOverrides = true;
      } else if (override.overrideType === 'OFFSET') {
        const azan = rawAzanTimes[prayer];
        if (azan) {
          const offsetMinutes = parseInt(override.value, 10);
          result[prayer] = formatHHmm(
            ceilingToNearest5(azan.add(offsetMinutes, 'minute')),
          );
          hasOverrides = true;
        }
      }
    }

    return { iqamaTimes: result, hasOverrides };
  }
}
