import { HttpException } from '@nestjs/common';
import { IqamaRuleVersionRecord, RuleSet, ValidationIssue } from './iqama-rules.types';
export declare class IqamaRulesError extends HttpException {
    readonly code: 'IQAMA_RULES_MISSING' | 'IQAMA_RULES_INVALID';
    readonly issues?: ValidationIssue[] | undefined;
    constructor(code: 'IQAMA_RULES_MISSING' | 'IQAMA_RULES_INVALID', message: string, issues?: ValidationIssue[] | undefined);
}
type VersionRow = Pick<IqamaRuleVersionRecord, 'id' | 'effectiveFrom' | 'settings'>;
export declare function resolveRuleVersion<T extends VersionRow>(date: string, versions: T[]): T | undefined;
export declare function loadRuleSet(version: VersionRow): RuleSet;
export {};
