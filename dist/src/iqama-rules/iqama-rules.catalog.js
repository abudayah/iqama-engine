"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RULE_CATALOG = exports.RANGES = void 0;
const iqama_guardrail_1 = require("../rules/iqama-guardrail");
const iqama_rules_types_1 = require("./iqama-rules.types");
exports.RANGES = {
    offsetMinutes: { min: -120, max: 120 },
    gapMinutes: { min: 0, max: 120 },
    minAfterAzan: { min: 0, max: 120 },
    latestBeforeSunrise: { min: 0, max: 240 },
    weekdayAdjust: { min: -60, max: 60 },
    roundingSteps: [5, 10, 15, 30, 60],
    scaledGapMinPoints: 2,
    scaledGapMaxPoints: 10,
    seasonalMinSegments: 1,
    seasonalMaxSegments: 24,
    month: { min: 1, max: 12 },
    dayOfMonth: { min: 1, max: 31 },
};
const int = (name, label, range, extra = {}) => ({
    name,
    label,
    kind: 'int',
    required: true,
    min: range.min,
    max: range.max,
    integer: true,
    ...extra,
});
const time = (name, label) => ({
    name,
    label,
    kind: 'time',
    required: true,
    format: 'HH:mm',
});
const monthField = int('month', 'Month (1 = January)', exports.RANGES.month);
exports.RULE_CATALOG = {
    prayers: iqama_rules_types_1.PRAYER_NAMES.map((name) => ({
        name,
        weeklyLockAllowed: iqama_rules_types_1.LOCKABLE_PRAYERS.includes(name),
        fridayStartRequired: iqama_rules_types_1.LOCKABLE_PRAYERS.includes(name),
        sunriseLimitAllowed: name === 'fajr',
    })),
    baseTypes: [
        {
            type: 'OFFSET',
            label: 'Minutes after Azan',
            fields: [int('minutes', 'Minutes after Azan', exports.RANGES.offsetMinutes)],
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
                    kind: 'list',
                    required: true,
                    minItems: exports.RANGES.scaledGapMinPoints,
                    maxItems: exports.RANGES.scaledGapMaxPoints,
                    item: [
                        time('azan', 'When Azan is at'),
                        int('gapMinutes', 'Gap after Azan (minutes)', exports.RANGES.gapMinutes),
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
                    kind: 'list',
                    required: true,
                    minItems: exports.RANGES.seasonalMinSegments,
                    maxItems: exports.RANGES.seasonalMaxSegments,
                    item: [
                        {
                            name: 'start',
                            label: 'Starts on',
                            kind: 'object',
                            required: true,
                            discriminator: 'kind',
                            variants: [
                                {
                                    value: 'DATE',
                                    label: 'A calendar date',
                                    fields: [
                                        monthField,
                                        int('day', 'Day of month', exports.RANGES.dayOfMonth, {
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
    modifiers: [
        {
            name: 'limits',
            label: 'Limits',
            kind: 'object',
            required: false,
            fields: [
                {
                    ...int('minAfterAzan', 'At least this many minutes after Azan', exports.RANGES.minAfterAzan),
                    required: false,
                },
                {
                    ...int('latestBeforeSunrise', 'Iqama at least this many minutes before sunrise', exports.RANGES.latestBeforeSunrise),
                    required: false,
                    prayers: ['fajr'],
                },
            ],
        },
        {
            name: 'rounding',
            label: 'Rounding',
            kind: 'object',
            required: false,
            fields: [
                {
                    name: 'mode',
                    label: 'Direction',
                    kind: 'enum',
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
                    kind: 'enum',
                    required: true,
                    options: exports.RANGES.roundingSteps.map((v) => ({
                        value: v,
                        label: `${v} minutes`,
                    })),
                    default: iqama_guardrail_1.IQAMA_STEP_MIN,
                },
            ],
        },
        {
            name: 'weekdayAdjust',
            label: 'Weekday adjustment',
            kind: 'object',
            required: false,
            note: 'Minutes added on that weekday, e.g. FRI -5. Leave a weekday empty for no change.',
            fields: iqama_rules_types_1.WEEKDAYS.map((day) => ({
                ...int(day, day, exports.RANGES.weekdayAdjust),
                required: false,
            })),
        },
        {
            name: 'weeklyLock',
            label: 'Hold for the Friday to Thursday week',
            kind: 'bool',
            required: false,
            default: false,
            prayers: [...iqama_rules_types_1.LOCKABLE_PRAYERS],
        },
    ],
    pipeline: [
        'base',
        'limits',
        'rounding',
        'weekdayAdjust',
        'weeklyLock',
        'override',
        'guardrails',
    ],
    guardrails: {
        minGapAfterAzanMinutes: iqama_guardrail_1.MIN_IQAMA_GAP_MIN,
        fajrEndsBeforeSunriseMinutes: iqama_guardrail_1.FAJR_SUNRISE_BUFFER_MIN,
        iqamaStepMinutes: iqama_guardrail_1.IQAMA_STEP_MIN,
        fajrSunriseConflictPolicy: 'gap-wins-with-acknowledgement',
    },
};
//# sourceMappingURL=iqama-rules.catalog.js.map