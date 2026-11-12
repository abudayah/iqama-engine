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
  scaledGapMaxPoints: 10,
  seasonalMinSegments: 1,
  seasonalMaxSegments: 24,
  month: { min: 1, max: 12 },
  dayOfMonth: { min: 1, max: 31 },
} as const;

/**
 * Field metadata, so the admin UI can render and validate forms from the
 * catalog alone.
 *
 * Every field: { name, label, kind, required }.
 *  kind 'int'    adds min, max, integer: true, optional step, default
 *  kind 'time'   adds format: 'HH:mm'
 *  kind 'enum'   adds options: [{ value, label }]
 *  kind 'bool'   optional default
 *  kind 'list'   adds minItems, maxItems and item: Field[] (the fields of one item)
 *  kind 'object' adds fields: Field[]; a discriminated object also has
 *                discriminator (the property name) and variants:
 *                [{ value, label, fields: Field[] }] instead of fields
 * Optional on any field: `prayers` (only these prayers may use it) and `default`
 * (only where a default is safe; absent otherwise).
 */
const int = (
  name: string,
  label: string,
  range: { min: number; max: number },
  extra: Record<string, unknown> = {},
) => ({
  name,
  label,
  kind: 'int' as const,
  required: true,
  min: range.min,
  max: range.max,
  integer: true,
  ...extra,
});

const time = (name: string, label: string) => ({
  name,
  label,
  kind: 'time' as const,
  required: true,
  format: 'HH:mm',
});

const monthField = int('month', 'Month (1 = January)', RANGES.month);

export const RULE_CATALOG = {
  prayers: PRAYER_NAMES.map((name) => ({
    name,
    weeklyLockAllowed: LOCKABLE_PRAYERS.includes(name),
    /** Changes must start on a Friday (validation error otherwise). */
    fridayStartRequired: LOCKABLE_PRAYERS.includes(name),
    sunriseLimitAllowed: name === 'fajr',
  })),

  /** The `base` object of a prayer rule: { type, ...fields }. */
  baseTypes: [
    {
      type: 'OFFSET',
      label: 'Minutes after Azan',
      fields: [int('minutes', 'Minutes after Azan', RANGES.offsetMinutes)],
    },
    {
      type: 'FIXED_TIME',
      label: 'Fixed clock time',
      fields: [time('time', 'Time')],
    },
    {
      type: 'SCALED_GAP',
      label: 'Gap that scales with Azan time',
      note: 'Azan times must be strictly increasing; the gap is held flat before the first and after the last point.',
      fields: [
        {
          name: 'points',
          label: 'Points',
          kind: 'list' as const,
          required: true,
          minItems: RANGES.scaledGapMinPoints,
          maxItems: RANGES.scaledGapMaxPoints,
          item: [
            time('azan', 'When Azan is at'),
            int('gapMinutes', 'Gap after Azan (minutes)', RANGES.gapMinutes),
          ],
        },
      ],
    },
    {
      type: 'SEASONAL',
      label: 'Seasonal fixed times',
      note: 'Repeats every year; the last segment wraps over New Year. Start dates must be unique.',
      fields: [
        {
          name: 'segments',
          label: 'Segments',
          kind: 'list' as const,
          required: true,
          minItems: RANGES.seasonalMinSegments,
          maxItems: RANGES.seasonalMaxSegments,
          item: [
            {
              name: 'start',
              label: 'Starts on',
              kind: 'object' as const,
              required: true,
              discriminator: 'kind',
              variants: [
                {
                  value: 'DATE',
                  label: 'A calendar date',
                  fields: [
                    monthField,
                    int('day', 'Day of month', RANGES.dayOfMonth, {
                      note: 'Must exist in the chosen month (February allows 29).',
                    }),
                  ],
                },
                {
                  value: 'FIRST_FRIDAY',
                  label: 'The first Friday of a month',
                  fields: [monthField],
                },
              ],
            },
            time('time', 'Iqama time'),
          ],
        },
      ],
    },
  ],

  /** Optional parts of a prayer rule (keys of the rule object), in pipeline order. */
  modifiers: [
    {
      name: 'limits',
      label: 'Limits',
      kind: 'object' as const,
      required: false,
      fields: [
        {
          ...int(
            'minAfterAzan',
            'At least this many minutes after Azan',
            RANGES.minAfterAzan,
          ),
          required: false,
        },
        {
          ...int(
            'latestBeforeSunrise',
            'At most this many minutes before sunrise',
            RANGES.latestBeforeSunrise,
          ),
          required: false,
          prayers: ['fajr'],
        },
      ],
    },
    {
      name: 'rounding',
      label: 'Rounding',
      kind: 'object' as const,
      required: false,
      fields: [
        {
          name: 'mode',
          label: 'Direction',
          kind: 'enum' as const,
          required: true,
          options: [
            { value: 'CEIL', label: 'Round up' },
            { value: 'FLOOR', label: 'Round down' },
            { value: 'NEAREST', label: 'Round to nearest' },
          ],
        },
        {
          name: 'step',
          label: 'To a multiple of (minutes)',
          kind: 'enum' as const,
          required: true,
          options: RANGES.roundingSteps.map((v) => ({
            value: v,
            label: `${v} minutes`,
          })),
          default: IQAMA_STEP_MIN,
        },
      ],
    },
    {
      name: 'weekdayAdjust',
      label: 'Weekday adjustment',
      kind: 'object' as const,
      required: false,
      note: 'Minutes added on that weekday, e.g. FRI -5. Leave a weekday empty for no change.',
      fields: WEEKDAYS.map((day) => ({
        ...int(day, day, RANGES.weekdayAdjust),
        required: false,
      })),
    },
    {
      name: 'weeklyLock',
      label: 'Hold for the Friday to Thursday week',
      kind: 'bool' as const,
      required: false,
      default: false,
      prayers: [...LOCKABLE_PRAYERS],
    },
  ],

  /** Order in which the parts of a rule are applied; guardrails always last. */
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
    /**
     * When Azan + the minimum gap makes the Fajr sunrise rule impossible, the
     * gap wins, the day is flagged (iqama_conflict) and the admin must
     * acknowledge the conflicts before saving.
     */
    fajrSunriseConflictPolicy: 'gap-wins-with-acknowledgement',
  },
} as const;
