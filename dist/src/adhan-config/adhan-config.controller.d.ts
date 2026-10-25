import { AdhanConfigService } from './adhan-config.service';
import { CreateVersionDto } from './dto/create-version.dto';
import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';
import { PreviewDto } from './dto/preview.dto';
export declare class AdhanConfigController {
    private readonly service;
    constructor(service: AdhanConfigService);
    private actorFromHeaders;
    getConfig(): Promise<{
        currentRevision: number;
        versions: import("./adhan-config.types").AdhanConfigVersionRecord[];
        periods: import("./adhan-config.types").AdhanConfigPeriodRecord[];
        effective: import("./adhan-config.types").ResolvedAdhanSettings | null;
        recommendedHighLatitudeRule: import("./adhan-catalog").HighLatitudeRuleName;
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
    createVersion(dto: CreateVersionDto, headers: Record<string, string | undefined>): Promise<{
        effectiveFrom: string;
        settings: string;
        reason: string | null;
        createdBy: string;
        createdAt: Date;
        id: number;
    }>;
    createPeriod(dto: CreatePeriodDto, headers: Record<string, string | undefined>): Promise<{
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
    updatePeriod(id: number, dto: UpdatePeriodDto, headers: Record<string, string | undefined>): Promise<{
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
    deletePeriod(id: number, previewId: string, headers: Record<string, string | undefined>): Promise<void>;
    getHistory(page?: string, pageSize?: string): Promise<{
        items: {
            reason: string | null;
            createdAt: Date;
            id: number;
            entity: string;
            entityId: number;
            action: string;
            before: string | null;
            after: string | null;
            actor: string;
        }[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    revert(id: number, headers: Record<string, string | undefined>): Promise<{
        effectiveFrom: string;
        settings: string;
        reason: string | null;
        createdBy: string;
        createdAt: Date;
        id: number;
    }>;
}
