import { Dayjs } from 'dayjs';

/**
 * Typed wrapper around the dayjs-hijri plugin's `.calendar('hijri')` API.
 *
 * The plugin adds `.calendar()` to dayjs instances at runtime and is not
 * reflected in TypeScript types, so we centralise the `any` casts here
 * rather than scattering them across the codebase.
 */
interface HijriComponents {
  /** 1-based Hijri month (1 = Muharram … 12 = Dhul-Hijjah) */
  month: number;
  /** Hijri day of month (1-based) */
  day: number;
  /** Hijri year (e.g. 1447) */
  year: number;
}

export function getHijriComponents(date: Dayjs): HijriComponents {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const h: any = (date as any).calendar('hijri');
  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    month: (h.month() as number) + 1, // plugin is 0-indexed
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    day: h.date() as number,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    year: h.year() as number,
  };
}

/**
 * Formats a dayjs instance as a human-readable Hijri date string,
 * e.g. "Ramadan 1, 1447".
 */
export function formatHijriDate(date: Dayjs): string {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const h: any = (date as any).calendar('hijri');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return h.format('MMMM D, YYYY') as string;
}
