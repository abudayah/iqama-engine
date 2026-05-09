import { Dayjs } from 'dayjs';
import { PrismaService } from '../prisma/prisma.service';
import { IqamaTimes } from '../rules/rules.service';
export interface Override {
    id: number;
    prayer: string;
    overrideType: string;
    value: string;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
export declare class OverrideService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getOverridesForDate(date: string): Promise<Override[]>;
    applyOverrides(rawAzanTimes: Record<string, Dayjs>, rulesIqamaTimes: IqamaTimes, overrides: Override[], sunriseTimes?: Record<string, Dayjs>): {
        iqamaTimes: IqamaTimes;
        hasOverrides: boolean;
    };
}
