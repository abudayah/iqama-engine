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
    getOverridesForRange(startDate: string, endDate: string): Promise<Override[]>;
    assertNoOverlap(prayer: string, startDate: string, endDate: string, excludeId?: number): Promise<void>;
    findOverlaps(prayer: string, startDate: string, endDate: string, excludeId?: number): Promise<Override[]>;
    applyOverrides(rawAzanTimes: Record<string, Dayjs>, rulesIqamaTimes: IqamaTimes, overrides: Override[]): {
        iqamaTimes: IqamaTimes;
        hasOverrides: boolean;
    };
}
