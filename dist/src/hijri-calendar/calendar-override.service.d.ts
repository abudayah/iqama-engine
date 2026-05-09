import { CalendarOverride } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HijriCalendarStatusDto } from './dto/hijri-calendar-status.dto';
import { SubmitOverrideDto } from './dto/submit-override.dto';
import { EidPrayerRecordDto } from './dto/eid-prayer-record.dto';
export declare function isInApproachWindow(today: string, eidDate: string): boolean;
export declare function computeFallbackDate(eidType: 'EID_AL_FITR' | 'EID_AL_ADHA', currentHijriYear: number, calendarOverride?: Pick<CalendarOverride, 'length'>): string;
export declare class CalendarOverrideService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getStatus(): Promise<HijriCalendarStatusDto>;
    deleteCalendarOverride(hijriYear: number, hijriMonth: number): Promise<void>;
    upsertCalendarOverride(hijriYear: number, hijriMonth: number, length: number): Promise<void>;
    upsertSpecialPrayer(type: string, hijriYear: number, date: string, prayers: unknown[]): Promise<void>;
    submitOverride(dto: SubmitOverrideDto): Promise<void>;
    getEidPrayers(today: string, admin?: boolean): Promise<EidPrayerRecordDto[]>;
}
