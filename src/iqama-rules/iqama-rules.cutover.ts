/**
 * Cutover date helpers. No imports on purpose: the Prisma seed script loads
 * this file with plain ts-node, which must not pull in the dayjs plugins.
 */

/** Dates before this keep the legacy rules; from it on the DB rules apply. */
export const DEFAULT_IQAMA_RULES_CUTOVER = '2026-11-13';

/** Anything but a YYYY-MM-DD string falls back to the default cutover. */
export function parseCutover(v: unknown): string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
    ? v
    : DEFAULT_IQAMA_RULES_CUTOVER;
}
