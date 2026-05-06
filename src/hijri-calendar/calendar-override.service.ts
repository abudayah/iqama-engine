import { Injectable } from '@nestjs/common';
import { CalendarOverride, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import dayjs from '../dayjs';
import { getHijriComponents } from './hijri-utils';
import { HijriCalendarStatusDto } from './dto/hijri-calendar-status.dto';
import { SubmitOverrideDto } from './dto/submit-override.dto';
import { EidPrayerRecordDto } from './dto/eid-prayer-record.dto';

// Pure helper — returns true only when today IS the Eid day (diff === 0)
export function isInApproachWindow(today: string, eidDate: string): boolean {
  const diff = dayjs(eidDate).diff(dayjs(today), 'day');
  return diff === 0;
}

// Task 2.2: Astronomical fallback prayer times (placeholder)
const ASTRONOMICAL_FALLBACK_PRAYERS = [
  { label: '1st Eid Prayer', time: '07:00' },
  { label: '2nd Eid Prayer', time: '08:30' },
];

/**
 * Convert a Hijri (year, month 1-based, day) to a Gregorian YYYY-MM-DD string.
 *
 * The dayjs-hijri plugin adds .calendar() to *instances*, not to the constructor.
 * We start from dayjs() (today), switch to Hijri, then set the desired Hijri
 * year/month/day — the plugin's $set handler converts back to Gregorian internally.
 */
function hijriToGregorian(
  hijriYear: number,
  hijriMonth1Based: number,
  hijriDay: number,
): string {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const h: any = (dayjs() as any)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    .calendar('hijri')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    .set('year', hijriYear)
    // plugin uses 0-indexed months
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    .set('month', hijriMonth1Based - 1)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    .set('date', hijriDay);
  // Switch back to Gregorian to format
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return h.calendar('gregory').format('YYYY-MM-DD') as string;
}

// Task 2.2: Compute the Gregorian Eid date as a YYYY-MM-DD string.
// When a CalendarOverride exists for the preceding month, the month start is
// shifted by calendarOverride.length days from the astronomical 1st of that month.
export function computeFallbackDate(
  eidType: 'EID_AL_FITR' | 'EID_AL_ADHA',
  currentHijriYear: number,
  calendarOverride?: Pick<CalendarOverride, 'length'>,
): string {
  if (eidType === 'EID_AL_FITR') {
    // Preceding month: 9 (Ramadan). Eid = 1st of Shawwal (month 10, day 1).
    if (calendarOverride) {
      // Astronomical 1st of Ramadan → add override.length days to get 1st of Shawwal
      const ramadanStart = hijriToGregorian(currentHijriYear, 9, 1);
      return dayjs(ramadanStart)
        .add(calendarOverride.length, 'day')
        .format('YYYY-MM-DD');
    } else {
      // Pure astronomical: 1st of Shawwal (Hijri month 10, day 1)
      return hijriToGregorian(currentHijriYear, 10, 1);
    }
  } else {
    // EID_AL_ADHA
    // Preceding month: 11 (Dhul-Qi'dah). Eid = 10th of Dhul-Hijjah (month 12, day 10).
    if (calendarOverride) {
      // Astronomical 1st of Dhul-Qi'dah → add override.length + 9 days
      const dhulQidahStart = hijriToGregorian(currentHijriYear, 11, 1);
      return dayjs(dhulQidahStart)
        .add(calendarOverride.length + 9, 'day')
        .format('YYYY-MM-DD');
    } else {
      // Pure astronomical: 10th of Dhul-Hijjah (Hijri month 12, day 10)
      return hijriToGregorian(currentHijriYear, 12, 10);
    }
  }
}

@Injectable()
export class CalendarOverrideService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(): Promise<HijriCalendarStatusDto> {
    const now = dayjs();

    // Switch to Hijri calendar to get Hijri date components.
    const {
      year: hijriYear,
      month: hijriMonth,
      day: hijriDay,
    } = getHijriComponents(now);

    const gregorianDate = now.format('YYYY-MM-DD');

    const override = await this.prisma.calendarOverride.findUnique({
      where: {
        hijri_year_hijri_month: {
          hijri_year: hijriYear,
          hijri_month: hijriMonth,
        },
      },
    });

    return {
      gregorianDate,
      hijriYear,
      hijriMonth,
      hijriDay,
      hasOverride: override !== null,
      overrideLength: override ? (override.length as 29 | 30) : null,
    };
  }

  async deleteCalendarOverride(
    hijriYear: number,
    hijriMonth: number,
  ): Promise<void> {
    await this.prisma.calendarOverride.deleteMany({
      where: {
        hijri_year: hijriYear,
        hijri_month: hijriMonth,
      },
    });
  }

  async upsertCalendarOverride(
    hijriYear: number,
    hijriMonth: number,
    length: number,
  ): Promise<void> {
    await this.prisma.calendarOverride.upsert({
      where: {
        hijri_year_hijri_month: {
          hijri_year: hijriYear,
          hijri_month: hijriMonth,
        },
      },
      create: {
        hijri_year: hijriYear,
        hijri_month: hijriMonth,
        length,
        is_manual_override: true,
      },
      update: {
        length,
        is_manual_override: true,
      },
    });
  }

  async upsertSpecialPrayer(
    type: string,
    hijriYear: number,
    date: string,
    prayers: unknown[],
  ): Promise<void> {
    const prayersJson = prayers as Prisma.InputJsonValue;
    await this.prisma.specialPrayer.upsert({
      where: {
        hijri_year_type: {
          hijri_year: hijriYear,
          type,
        },
      },
      create: {
        type,
        hijri_year: hijriYear,
        date,
        prayers: prayersJson,
      },
      update: {
        date,
        prayers: prayersJson,
      },
    });
  }

  async submitOverride(dto: SubmitOverrideDto): Promise<void> {
    await this.upsertCalendarOverride(
      dto.hijriYear,
      dto.hijriMonth,
      dto.length,
    );

    if (dto.eidConfig) {
      await this.upsertSpecialPrayer(
        dto.eidConfig.type,
        dto.hijriYear,
        dto.eidConfig.date,
        dto.eidConfig.prayers,
      );
    }
  }

  // Task 2.3: Return Eid prayer records that fall within the 3-day approach window.
  // When admin=true, skip the window filter and return all saved records.
  async getEidPrayers(
    today: string,
    admin = false,
  ): Promise<EidPrayerRecordDto[]> {
    // 1. Get current Hijri year from today
    const { year: currentHijriYear } = getHijriComponents(dayjs(today));

    const results: EidPrayerRecordDto[] = [];

    for (const eidType of ['EID_AL_FITR', 'EID_AL_ADHA'] as const) {
      // 2. Query SpecialPrayer for an admin-submitted override
      const specialPrayer = await this.prisma.specialPrayer.findUnique({
        where: {
          hijri_year_type: { hijri_year: currentHijriYear, type: eidType },
        },
      });

      let eidDate: string;
      let prayers: { label: string; time: string }[];
      let source: 'override' | 'astronomical';

      if (specialPrayer) {
        eidDate = specialPrayer.date;
        prayers = specialPrayer.prayers as { label: string; time: string }[];
        source = 'override';
      } else {
        // 3. Get CalendarOverride for the preceding month
        const precedingMonth = eidType === 'EID_AL_FITR' ? 9 : 11;
        const calendarOverride = await this.prisma.calendarOverride.findUnique({
          where: {
            hijri_year_hijri_month: {
              hijri_year: currentHijriYear,
              hijri_month: precedingMonth,
            },
          },
        });

        eidDate = computeFallbackDate(
          eidType,
          currentHijriYear,
          calendarOverride ?? undefined,
        );
        prayers = ASTRONOMICAL_FALLBACK_PRAYERS;
        source = 'astronomical';
      }

      // 4. Apply visibility filter — only include if within the 3-day window (skip for admin)
      if (admin || isInApproachWindow(today, eidDate)) {
        results.push({ type: eidType, date: eidDate, prayers, source });
      }
    }

    return results;
  }
}
