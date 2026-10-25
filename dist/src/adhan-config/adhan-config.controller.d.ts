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
    createVersion(dto: CreateVersionDto): Promise<{
        effectiveFrom: string;
        settings: string;
        createdBy: string;
        createdAt: Date;
        id: number;
    }>;
    createPeriod(dto: CreatePeriodDto): Promise<{
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
