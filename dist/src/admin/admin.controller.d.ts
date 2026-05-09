import { PrismaService } from '../prisma/prisma.service';
import { CreateOverrideDto } from './dto/create-override.dto';
import { UpdateOverrideDto } from './dto/update-override.dto';
export declare class AdminController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createOverride(dto: CreateOverrideDto): Promise<{
        id: number;
        prayer: string;
        overrideType: string;
        value: string;
        startDate: Date;
        endDate: Date;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    listOverrides(): Promise<{
        id: number;
        prayer: string;
        overrideType: string;
        value: string;
        startDate: Date;
        endDate: Date;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }[]>;
    getOverride(id: number): Promise<{
        id: number;
        prayer: string;
        overrideType: string;
        value: string;
        startDate: Date;
        endDate: Date;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    updateOverride(id: number, dto: UpdateOverrideDto): Promise<{
        id: number;
        prayer: string;
        overrideType: string;
        value: string;
        startDate: Date;
        endDate: Date;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    deleteOverride(id: number): Promise<void>;
    clearAllOverrides(): Promise<void>;
}
