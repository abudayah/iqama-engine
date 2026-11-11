import {
  FAJR_SUNRISE_BUFFER_MIN,
  IQAMA_STEP_MIN,
  MIN_IQAMA_GAP_MIN,
} from '../rules/iqama-guardrail';
import { LOCKABLE_PRAYERS, PRAYER_NAMES, WEEKDAYS } from './iqama-rules.types';

/** Single source of truth for numeric ranges (validator + catalog endpoint). */
export const RANGES = {
  offsetMinutes: { min: -120, max: 120 },
  gapMinutes: { min: 0, max: 120 },
  minAfterAzan: { min: 0, max: 120 },
  latestBeforeSunrise: { min: 0, max: 240 },
  weekdayAdjust: { min: -60, max: 60 },
  roundingSteps: [5, 10, 15, 30, 60], // multiples of IQAMA_STEP_MIN
  scaledGapMinPoints: 2,
} as const;

/** Describes the rule model so the admin UI can render forms. */
export const RULE_CATALOG = {
  prayers: PRAYER_NAMES.map((name) => ({
    name,
    weeklyLockAllowed: LOCKABLE_PRAYERS.includes(name),
    /** Changes must start on a Friday (validation error otherwise). */
    fridayStartRequired: LOCKABLE_PRAYERS.includes(name),
    sunriseLimitAllowed: name === 'fajr',
  })),
  baseTypes: [
    {
      type: 'OFFSET',
      label: 'Minutes after Azan',
      fields: [{ name: 'minutes', kind: 'int', ...RANGES.offsetMinutes }],
    },
    {
      type: 'FIXED_TIME',
      label: 'Fixed clock time',
      fields: [{ name: 'time', kind: 'time', format: 'HH:mm' }],
    },
    {
      type: 'SCALED_GAP',
      label: 'Gap that scales with Azan time',
      fields: [
        {
          name: 'points',
          kind: 'list',
          minItems: RANGES.scaledGapMinPoints,
          item: [
            { name: 'azan', kind: 'time', format: 'HH:mm' },
            { name: 'gapMinutes', kind: 'int', ...RANGES.gapMinutes },
          ],
          note: 'Azan times must be strictly increasing; gap is held flat outside the points.',
        },
      ],
    },
    {
      type: 'SEASONAL',
      label: 'Seasonal fixed times',
      fields: [
        {
          name: 'segments',
          kind: 'list',
          minItems: 1,
          item: [
            {
              name: 'start',
              kind: 'oneOf',
              options: [
                { kind: 'DATE', fields: ['month (1-12)', 'day (1-31)'] },
                { kind: 'FIRST_FRIDAY', fields: ['month (1-12)'] },
              ],
            },
            { name: 'time', kind: 'time', format: 'HH:mm' },
          ],
          note: 'Repeats every year; the last segment wraps over New Year.',
        },
      ],
    },
  ],
  modifiers: {
    order: ['limits', 'rounding', 'weekdayAdjust', 'weeklyLock'],
    limits: {
      minAfterAzan: RANGES.minAfterAzan,
      latestBeforeSunrise: { ...RANGES.latestBeforeSunrise, prayers: ['fajr'] },
    },
    rounding: {
      modes: ['CEIL', 'FLOOR', 'NEAREST'],
      steps: RANGES.roundingSteps,
    },
    weekdayAdjust: { weekdays: WEEKDAYS, ...RANGES.weekdayAdjust },
    weeklyLock: { prayers: LOCKABLE_PRAYERS },
  },
  pipeline: [
    'base',
    'limits',
    'rounding',
    'weekdayAdjust',
    'weeklyLock',
    'override',
    'guardrails',
  ],
  /** Hard constants in code; not editable. */
  guardrails: {
    minGapAfterAzanMinutes: MIN_IQAMA_GAP_MIN,
    fajrEndsBeforeSunriseMinutes: FAJR_SUNRISE_BUFFER_MIN,
    iqamaStepMinutes: IQAMA_STEP_MIN,
  },
} as const;
