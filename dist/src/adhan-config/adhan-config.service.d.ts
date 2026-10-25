import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleBuilderService } from '../schedule-builder/schedule-builder.service';
import type { AdhanConfigVersionRecord, AdhanConfigPeriodRecord } from './adhan-config.types';
import type { CreateVersionDto } from './dto/create-version.dto';
import type { CreatePeriodDto } from './dto/create-period.dto';
import type { UpdatePeriodDto } from './dto/update-period.dto';
import type { PreviewDto } from './dto/preview.dto';
export declare class AdhanConfigService {
    private readonly prisma;
    private readonly scheduleBuilder;
    private readonly configService;
    private readonly previewTokens;
    private readonly timezone;
    constructor(prisma: PrismaService, scheduleBuilder: ScheduleBuilderService, configService: ConfigService);
    private todayInTimezone;
    private allVersions;
    private allActivePeriods;
    private latestVersionId;
    private generatePreviewId;
    private consumePreviewId;
    getConfig(): Promise<{
        currentRevision: number;
        versions: AdhanConfigVersionRecord[];
        periods: AdhanConfigPeriodRecord[];
        effective: import("./adhan-config.types").ResolvedAdhanSettings | null;
        recommendedHighLatitudeRule: import("./adhan-catalog").HighLatitudeRuleName;
        today: string;
        timezone: string;
        latitude: number;
        longitude: number;
    }>;
    getCatalog(): {
        recommendedHighLatitudeRule: import("./adhan-catalog").HighLatitudeRuleName;
        methods: import("./adhan-catalog").MethodCatalogEntry[];
        madhabValues: import("./adhan-catalog").MadhabName[];
        highLatitudeRuleValues: import("./adhan-catalog").HighLatitudeRuleName[];
        roundingValues: import("./adhan-catalog").RoundingName[];
        shafaqValues: import("./adhan-catalog").ShafaqName[];
        polarCircleResolutionValues: import("./adhan-catalog").PolarCircleResolutionName[];
    };
    preview(dto: PreviewDto): Promise<{
        previewId: string;
        currentRevision: number;
        warnings: import("./adhan-config.validator").ValidationIssue[];
    }>;
    createVersion(dto: CreateVersionDto, actor: string): Promise<{
        effectiveFrom: string;
        settings: string;
        createdBy: string;
        createdAt: Date;
        id: number;
    }>;
    createPeriod(dto: CreatePeriodDto, actor: string): Promise<{
        settings: string;
        createdBy: string;
        createdAt: Date;
        id: number;
        label: string;
        startDate: string;
        endDate: string;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    updatePeriod(id: number, dto: UpdatePeriodDto): Promise<{
        settings: string;
        createdBy: string;
        createdAt: Date;
        id: number;
        label: string;
        startDate: string;
        endDate: string;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    deletePeriod(id: number, previewId: string): Promise<void>;
}
