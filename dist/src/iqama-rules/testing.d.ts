import { ScheduleBuilderService } from '../schedule-builder/schedule-builder.service';
import { IqamaRulesService } from './iqama-rules.service';
import { IqamaRuleVersionRecord, RuleSet } from './iqama-rules.types';
export declare const TEST_TZ = "Etc/GMT+7";
export declare const TEST_V1_DATE = "2026-11-13";
export declare const versionRow: (id: number, effectiveFrom: string, rules?: RuleSet) => IqamaRuleVersionRecord;
export declare function defaultAdhanConfig(): {
    versions: {
        id: number;
        effectiveFrom: string;
        settings: string;
        createdBy: string;
        createdAt: Date;
    }[];
    periods: {
        id: number;
        label: string;
        startDate: string;
        endDate: string;
        settings: string;
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: null;
    }[];
};
export declare function makeStack(opts: {
    rows?: IqamaRuleVersionRecord[];
    adhanConfig?: boolean;
    tz?: string;
    overrides?: unknown[];
}): Promise<{
    builder: ScheduleBuilderService;
    service: IqamaRulesService;
    prisma: {
        $queryRaw: jest.Mock<any, any, any>;
        specialPrayer: {
            findMany: jest.Mock<any, any, any>;
        };
        adhanConfigVersion: {
            findMany: jest.Mock<any, any, any>;
        };
        adhanConfigPeriod: {
            findMany: jest.Mock<any, any, any>;
        };
        iqamaRuleVersion: {
            findMany: jest.Mock<Promise<IqamaRuleVersionRecord[]>, [], any>;
            findFirst: jest.Mock<Promise<{
                id: number;
            } | null>, [], any>;
            create: jest.Mock<Promise<{
                effectiveFrom: string;
                settings: string;
                createdBy: string;
                reason?: string | null;
                id: number;
                createdAt: Date;
            }>, [{
                data: {
                    effectiveFrom: string;
                    settings: string;
                    createdBy: string;
                    reason?: string | null;
                };
            }], any>;
        };
    };
    rows: IqamaRuleVersionRecord[];
}>;
export declare function freezeDate(iso: string): void;
