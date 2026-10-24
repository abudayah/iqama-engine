/**
 * adhan-config.types.ts
 *
 * Shared type definitions for the Adhan configuration feature.
 */

import type {
  CalculationMethodName,
  MadhabName,
  HighLatitudeRuleName,
  RoundingName,
  ShafaqName,
  PolarCircleResolutionName,
} from './adhan-catalog';

export type { CalculationMethodName };

export type PrayerKey =
  | 'fajr'
  | 'sunrise'
  | 'dhuhr'
  | 'asr'
  | 'maghrib'
  | 'isha';

/** General (method-level) settings that apply to all prayers unless overridden. */
export interface GeneralSettings {
  method: CalculationMethodName;
  madhab: MadhabName;
  highLatitudeRule: HighLatitudeRuleName;
  polarCircleResolution: PolarCircleResolutionName;
  rounding: RoundingName;
  /** Only valid when method === 'MoonsightingCommittee' */
  shafaq?: ShafaqName;
}

/** Per-prayer settings. Every field is optional — absent means "inherit from general". */
export interface PrayerSettings {
  /** Fajr and Isha only: override the general method */
  method?: CalculationMethodName;
  fajrAngle?: number;
  ishaAngle?: number;
  /** Mutually exclusive with ishaAngle (used by UmmAlQura, Qatar) */
  ishaInterval?: number;
  /** Tehran only */
  maghribAngle?: number;
  /** Maps to adhan `adjustments` — NOT methodAdjustments */
  offsetMinutes?: number;
}

/** Full Adhan settings document (stored as JSON in AdhanConfigVersion.settings) */
export interface AdhanSettings {
  general: GeneralSettings;
  prayers: Partial<Record<PrayerKey, PrayerSettings>>;
}

/** Partial AdhanSettings for periods (every field optional at every level) */
export interface PartialAdhanSettings {
  general?: Partial<GeneralSettings>;
  prayers?: Partial<Record<PrayerKey, PrayerSettings>>;
}

/** Resolved per-prayer parameters (after base + period merge) */
export interface ResolvedPrayerParams {
  prayer: PrayerKey;
  method: CalculationMethodName;
  fajrAngle: number;
  ishaAngle: number | null;
  ishaInterval: number | null;
  maghribAngle: number | null;
  offsetMinutes: number;
  madhab: MadhabName;
  highLatitudeRule: HighLatitudeRuleName;
  polarCircleResolution: PolarCircleResolutionName;
  rounding: RoundingName;
  shafaq: ShafaqName | undefined;
}

/** Resolved settings for all prayers on a given date */
export interface ResolvedAdhanSettings {
  date: string; // YYYY-MM-DD
  general: GeneralSettings;
  perPrayer: Record<PrayerKey, ResolvedPrayerParams>;
  /** Which version id applied */
  baseVersionId: number;
  /** Which period ids applied (may be empty) */
  activePeriodIds: number[];
}

/** Lightweight DB record shapes (mirrors Prisma models but as plain objects) */
export interface AdhanConfigVersionRecord {
  id: number;
  effectiveFrom: string;
  settings: string; // JSON
  reason: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface AdhanConfigPeriodRecord {
  id: number;
  label: string;
  startDate: string;
  endDate: string;
  settings: string; // JSON
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface AdhanConfigAuditRecord {
  id: number;
  entity: 'VERSION' | 'PERIOD';
  entityId: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'REVERT';
  before: string | null;
  after: string | null;
  actor: string;
  reason: string | null;
  createdAt: Date;
}
