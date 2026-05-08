import { Injectable } from '@nestjs/common';
import { Dayjs } from 'dayjs';
import { PrismaService } from '../prisma/prisma.service';
import { IqamaTimes } from '../rules/rules.service';
import {
  ceilingToNearest5,
  floorToNearest5,
  formatHHmm,
} from '../rules/time-utils';

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
   * Priority rules enforced here:
   * - P0 (Fajr only): Iqama must never exceed Sunrise - 60 min (safeSunriseLimit).
   *   If rounding up would breach P0, floor down to nearest 5 instead so the
   *   result is always a clean 5-min boundary while still respecting P0.
   * - P1: Admin override value is used instead of the FR1–FR5 calculation.
   * - P3: All override results are rounded up to the nearest 5 minutes (CeilingToNearest5).
   *
   * Override types:
   * - FIXED: admin sets an exact HH:mm time → rounded to nearest 5, then P0 capped
   * - OFFSET: admin sets ±N minutes relative to Azan → rounded to nearest 5, then P0 capped
   *
   * hasOverrides is true when at least one override was applied.
   */
  applyOverrides(
    rawAzanTimes: Record<string, Dayjs>,
    rulesIqamaTimes: IqamaTimes,
    overrides: Override[],
    sunriseTimes?: Record<string, Dayjs>,
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

      // P3: round up to nearest 5 minutes
      let rounded = ceilingToNearest5(overrideTime);

      // P0 (Fajr only): if rounding up would breach safeSunriseLimit,
      // floor down to nearest 5 so the result is always a clean boundary
      if (prayer === 'fajr' && sunriseTimes?.['fajr']) {
        const safeSunriseLimit = sunriseTimes['fajr']
          .startOf('minute')
          .subtract(60, 'minute');
        if (rounded.isAfter(safeSunriseLimit)) {
          rounded = floorToNearest5(safeSunriseLimit);
        }
      }

      result[prayer] = formatHHmm(rounded);
    }

    return { iqamaTimes: result, hasOverrides };
  }
}
