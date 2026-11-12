import { Logger } from '@nestjs/common';

/** Offset text such as "GMT-07:00" for a timezone at an instant (Intl, no dayjs). */
export function intlOffset(timeZone: string, at: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  }).formatToParts(at);
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
}

/**
 * Stale timezone data guard. British Columbia stopped clock changes after
 * 2026-03-08 (UTC-7 all year). A Node/ICU build with old tzdata still thinks
 * America/Vancouver is UTC-8 in winter, which shifts every Azan time by an hour.
 * Checks January 15 of next year and logs an error if it is not UTC-7.
 * Only applies to America/Vancouver. Returns true when the data looks stale.
 */
export function warnIfStaleTzdata(
  timezone: string,
  now: Date = new Date(),
  logger: Pick<Logger, 'error'> = new Logger('TzdataGuard'),
  offsetOf: (tz: string, at: Date) => string = intlOffset,
): boolean {
  if (timezone !== 'America/Vancouver') return false;
  const jan = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 15, 20, 0, 0));
  const offset = offsetOf(timezone, jan);
  if (offset === 'GMT-07:00') return false;
  logger.error(
    `Stale timezone data: America/Vancouver is ${offset || 'unknown'} on ${jan.toISOString().slice(0, 10)}, expected GMT-07:00 ` +
      `(B.C. stopped clock changes after 2026-03-08). Node ${process.version} has tzdata ${process.versions.tz}. ` +
      'Prayer times will be one hour off in winter. Upgrade Node to 22.23.5 or newer.',
  );
  return true;
}
