import { ExecutionContext } from '@nestjs/common';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
export declare const THROTTLE_WINDOW_MS = 60000;
export declare const PUBLIC_LIMIT_PER_MIN = 300;
export declare const ADMIN_LIMIT_PER_MIN = 120;
export declare function isAdminRoute(context: ExecutionContext): boolean;
export declare const THROTTLER_OPTIONS: ThrottlerModuleOptions;
