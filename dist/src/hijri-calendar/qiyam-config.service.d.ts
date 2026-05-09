import { PrismaService } from '../prisma/prisma.service';
export declare class QiyamConfigService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getForYear(hijriYear: number): Promise<{
        hijri_year: number;
        start_time: string;
    } | null>;
    upsert(hijriYear: number, startTime: string): Promise<void>;
}
