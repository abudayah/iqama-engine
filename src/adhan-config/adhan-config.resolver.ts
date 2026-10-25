/**
 * adhan-config.resolver.ts
 *
 * Pure function that merges base config + active periods for a given date
 * into a fully-resolved per-prayer parameter set.
 *
 * No I/O, no side effects — trivially testable.
 */

import { getMethodEntry } from './adhan-catalog';
import type {
  AdhanSettings,
  PartialAdhanSettings,
  GeneralSettings,
  PrayerKey,
  PrayerSettings,
  ResolvedPrayerParams,
  ResolvedAdhanSettings,
  AdhanConfigVersionRecord,
  AdhanConfigPeriodRecord,
} from './adhan-config.types';

const PRAYER_KEYS: PrayerKey[] = [
  'fajr',
  'sunrise',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
];

/**
 * Resolve the effective AdhanSettings for a given date.
 *
 * Algorithm:
 *   1. Pick the base version: latest AdhanConfigVersion with effectiveFrom <= date.
 *   2. Find active periods: AdhanConfigPeriod where startDate <= date <= endDate.
 *   3. Merge: start from base, apply period fields on top.
 *   4. Expand per-prayer, falling back to general for any missing field.
 */
export function resolveAdhanSettings(
  date: string, // YYYY-MM-DD
  versions: AdhanConfigVersionRecord[],
  periods: AdhanConfigPeriodRecord[],
): ResolvedAdhanSettings {
  // 1. Pick the active base version
  const sortedVersions = [...versions].sort((a, b) => {
    if (a.effectiveFrom !== b.effectiveFrom) {
      return a.effectiveFrom < b.effectiveFrom ? -1 : 1;
    }
    return a.id - b.id; // tiebreaker: lower id = older
  });
  const activeVersion = sortedVersions
    .filter((v) => v.effectiveFrom <= date)
    .at(-1);

  if (!activeVersion) {
    throw new Error(
      `No AdhanConfigVersion found with effectiveFrom <= ${date}. ` +
        'Ensure the seed migration has run.',
    );
  }

  const base: AdhanSettings = JSON.parse(
    activeVersion.settings,
  ) as AdhanSettings;

  // 2. Find active periods (non-deleted, date in range)
  const activePeriods = periods.filter(
    (p) => p.deletedAt === null && p.startDate <= date && p.endDate >= date,
  );

  // 3. Merge general settings from periods (field-level, in createdAt order)
  let mergedGeneral: GeneralSettings = { ...base.general };
  const mergedPrayers: Partial<Record<PrayerKey, PrayerSettings>> = {};

  // Copy base prayers
  for (const key of PRAYER_KEYS) {
    if (base.prayers[key]) {
      mergedPrayers[key] = { ...base.prayers[key] };
    }
  }

  // Apply periods in creation order (oldest first)
  const sortedPeriods = [...activePeriods].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : 1,
  );

  for (const period of sortedPeriods) {
    const partial: PartialAdhanSettings = JSON.parse(
      period.settings,
    ) as PartialAdhanSettings;

    // Merge general fields
    if (partial.general) {
      mergedGeneral = { ...mergedGeneral, ...partial.general };
    }

    // Merge per-prayer fields
    if (partial.prayers) {
      for (const key of PRAYER_KEYS) {
        const ps = partial.prayers[key];
        if (ps) {
          mergedPrayers[key] = { ...(mergedPrayers[key] ?? {}), ...ps };
        }
      }
    }
  }

  // 4. Expand to full per-prayer resolved params
  const perPrayer = {} as Record<PrayerKey, ResolvedPrayerParams>;
  for (const prayer of PRAYER_KEYS) {
    const ps: PrayerSettings = mergedPrayers[prayer] ?? {};
    const method = ps.method ?? mergedGeneral.method;
    const entry = getMethodEntry(method);

    perPrayer[prayer] = {
      prayer,
      method,
      fajrAngle: ps.fajrAngle ?? entry.fajrAngle,
      ishaAngle:
        ps.ishaAngle !== undefined ? ps.ishaAngle : (entry.ishaAngle ?? null),
      ishaInterval:
        ps.ishaInterval !== undefined
          ? ps.ishaInterval
          : (entry.ishaInterval ?? null),
      maghribAngle:
        ps.maghribAngle !== undefined
          ? ps.maghribAngle
          : (entry.maghribAngle ?? null),
      offsetMinutes: ps.offsetMinutes ?? 0,
      madhab: mergedGeneral.madhab,
      highLatitudeRule: mergedGeneral.highLatitudeRule,
      polarCircleResolution: mergedGeneral.polarCircleResolution,
      rounding: mergedGeneral.rounding,
      shafaq: mergedGeneral.shafaq,
    };
  }

  return {
    date,
    general: mergedGeneral,
    perPrayer,
    baseVersionId: activeVersion.id,
    activePeriodIds: activePeriods.map((p) => p.id),
  };
}

/** Build CalculationParameters-equivalent key for grouping prayers */
export function paramsKey(p: ResolvedPrayerParams): string {
  return JSON.stringify({
    method: p.method,
    fajrAngle: p.fajrAngle,
    ishaAngle: p.ishaAngle,
    ishaInterval: p.ishaInterval,
    maghribAngle: p.maghribAngle,
    madhab: p.madhab,
    highLatitudeRule: p.highLatitudeRule,
    polarCircleResolution: p.polarCircleResolution,
    rounding: p.rounding,
    shafaq: p.shafaq,
  });
}
