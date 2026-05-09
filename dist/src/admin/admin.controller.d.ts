import { PrismaService } from '../prisma/prisma.service';
import { CreateOverrideDto } from './dto/create-override.dto';
import { UpdateOverrideDto } from './dto/update-override.dto';
export declare class AdminController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createOverride(dto: CreateOverrideDto): Promise<{
        prayer: string;
        overrideType: string;
        value: string;
        startDate: Date;
        endDate: Date;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        id: number;
    }>;
    listOverrides(): Promise<{
        prayer: string;
        overrideType: string;
        value: string;
        startDate: Date;
        endDate: Date;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        id: number;
    }[]>;
    getOverride(id: number): Promise<{
        prayer: string;
        overrideType: string;
        value: string;
        startDate: Date;
        endDate: Date;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        id: number;
    }>;
    updateOverride(id: number, dto: UpdateOverrideDto): Promise<{
        prayer: string;
        overrideType: string;
        value: string;
        startDate: Date;
        endDate: Date;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        id: number;
    }>;
    deleteOverride(id: number): Promise<void>;
    clearAllOverrides(): Promise<void>;
}
