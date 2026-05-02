import { PrismaService } from '../prisma/prisma.service';
import { CreateOverrideDto } from './dto/create-override.dto';
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
        id: number;
    }>;
    deleteOverride(id: number): Promise<void>;
    clearAllOverrides(): Promise<void>;
}
