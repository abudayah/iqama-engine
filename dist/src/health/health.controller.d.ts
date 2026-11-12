import { PrismaService } from '../prisma/prisma.service';
export declare class HealthController {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    check(): Promise<{
        status: string;
        timestamp: string;
        services: {
            database: string;
            api: string;
        };
    }>;
}
