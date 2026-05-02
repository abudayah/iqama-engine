import { PrismaService } from '../prisma/prisma.service';
import { CreateOverrideDto } from './dto/create-override.dto';
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
    }>;
    deleteOverride(id: number): Promise<void>;
    clearAllOverrides(): Promise<void>;
}
