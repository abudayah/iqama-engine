import { Logger } from '@nestjs/common';
export declare function intlOffset(timeZone: string, at: Date): string;
export declare function warnIfStaleTzdata(timezone: string, now?: Date, logger?: Pick<Logger, 'error'>, offsetOf?: (tz: string, at: Date) => string): boolean;
