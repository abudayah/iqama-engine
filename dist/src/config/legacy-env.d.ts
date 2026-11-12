import { Logger } from '@nestjs/common';
export declare const REMOVED_ENV_VARS: readonly ["IQAMA_RULES", "IQAMA_RULES_CUTOVER"];
export declare function logIgnoredLegacyEnv(env?: NodeJS.ProcessEnv, logger?: Pick<Logger, 'log'>): string[];
