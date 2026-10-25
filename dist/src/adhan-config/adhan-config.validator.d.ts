import type { AdhanSettings, PartialAdhanSettings } from './adhan-config.types';
export interface ValidationIssue {
    field: string;
    message: string;
    severity: 'error' | 'warning';
}
export interface ValidationResult {
    valid: boolean;
    issues: ValidationIssue[];
}
export declare function validateAdhanSettings(settings: AdhanSettings): ValidationResult;
export declare function validatePartialAdhanSettings(settings: PartialAdhanSettings): ValidationResult;
export declare function validatePeriodDates(startDate: string, endDate: string): ValidationIssue[];
