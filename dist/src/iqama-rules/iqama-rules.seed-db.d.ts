export declare const SEED_EFFECTIVE_FROM = "2026-11-13";
export interface IqamaRuleSeedClient {
    iqamaRuleVersion: {
        count(): Promise<number>;
        create(args: {
            data: {
                effectiveFrom: string;
                settings: string;
                createdBy: string;
                reason?: string;
            };
        }): Promise<unknown>;
    };
}
export declare function seedIqamaRules(prisma: IqamaRuleSeedClient, effectiveFrom?: string): Promise<boolean>;
