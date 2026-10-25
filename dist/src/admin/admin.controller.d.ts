import { PrismaService } from '../prisma/prisma.service';
import { ScheduleBuilderService } from '../schedule-builder/schedule-builder.service';
import { CreateOverrideDto } from './dto/create-override.dto';
import { UpdateOverrideDto } from './dto/update-override.dto';
export declare class AdminController {
    private readonly prisma;
    private readonly scheduleBuilder;
    constructor(prisma: PrismaService, scheduleBuilder: ScheduleBuilderService);
    createOverride(dto: CreateOverrideDto): Promise<{
        createdAt: Date;
        id: number;
        startDate: Date;
        endDate: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        prayer: string;
        overrideType: string;
        value: string;
    }>;
    listOverrides(): Promise<{
        createdAt: Date;
        id: number;
        startDate: Date;
        endDate: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        prayer: string;
        overrideType: string;
        value: string;
    }[]>;
    getOverride(id: number): Promise<{
        createdAt: Date;
        id: number;
        startDate: Date;
        endDate: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        prayer: string;
        overrideType: string;
        value: string;
    }>;
    updateOverride(id: number, dto: UpdateOverrideDto): Promise<{
        createdAt: Date;
        id: number;
        startDate: Date;
        endDate: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        prayer: string;
        overrideType: string;
        value: string;
    }>;
    deleteOverride(id: number): Promise<void>;
    clearCache(): Promise<void>;
    clearAllOverrides(): Promise<void>;
}
