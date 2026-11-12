export declare const RANGES: {
    readonly offsetMinutes: {
        readonly min: -120;
        readonly max: 120;
    };
    readonly gapMinutes: {
        readonly min: 0;
        readonly max: 120;
    };
    readonly minAfterAzan: {
        readonly min: 0;
        readonly max: 120;
    };
    readonly latestBeforeSunrise: {
        readonly min: 0;
        readonly max: 240;
    };
    readonly weekdayAdjust: {
        readonly min: -60;
        readonly max: 60;
    };
    readonly roundingSteps: readonly [5, 10, 15, 30, 60];
    readonly scaledGapMinPoints: 2;
    readonly scaledGapMaxPoints: 10;
    readonly seasonalMinSegments: 1;
    readonly seasonalMaxSegments: 24;
    readonly month: {
        readonly min: 1;
        readonly max: 12;
    };
    readonly dayOfMonth: {
        readonly min: 1;
        readonly max: 31;
    };
};
export declare const RULE_CATALOG: {
    readonly prayers: {
        name: import("./iqama-rules.types").PrayerName;
        weeklyLockAllowed: boolean;
        fridayStartRequired: boolean;
        sunriseLimitAllowed: boolean;
    }[];
    readonly baseTypes: readonly [{
        readonly type: "OFFSET";
        readonly label: "Minutes after Azan";
        readonly fields: readonly [{
            name: string;
            label: string;
            kind: "int";
            required: boolean;
            min: number;
            max: number;
            integer: boolean;
        }];
    }, {
        readonly type: "FIXED_TIME";
        readonly label: "Fixed clock time";
        readonly fields: readonly [{
            name: string;
            label: string;
            kind: "time";
            required: boolean;
            format: string;
        }];
    }, {
        readonly type: "SCALED_GAP";
        readonly label: "Gap that scales with Azan time";
        readonly note: "Azan times must be strictly increasing; the gap is held flat before the first and after the last point.";
        readonly fields: readonly [{
            readonly name: "points";
            readonly label: "Points";
            readonly kind: "list";
            readonly required: true;
            readonly minItems: 2;
            readonly maxItems: 10;
            readonly item: readonly [{
                name: string;
                label: string;
                kind: "time";
                required: boolean;
                format: string;
            }, {
                name: string;
                label: string;
                kind: "int";
                required: boolean;
                min: number;
                max: number;
                integer: boolean;
            }];
        }];
    }, {
        readonly type: "SEASONAL";
        readonly label: "Seasonal fixed times";
        readonly note: "Repeats every year; the last segment wraps over New Year. Start dates must be unique.";
        readonly fields: readonly [{
            readonly name: "segments";
            readonly label: "Segments";
            readonly kind: "list";
            readonly required: true;
            readonly minItems: 1;
            readonly maxItems: 24;
            readonly item: readonly [{
                readonly name: "start";
                readonly label: "Starts on";
                readonly kind: "object";
                readonly required: true;
                readonly discriminator: "kind";
                readonly variants: readonly [{
                    readonly value: "DATE";
                    readonly label: "A calendar date";
                    readonly fields: readonly [{
                        name: string;
                        label: string;
                        kind: "int";
                        required: boolean;
                        min: number;
                        max: number;
                        integer: boolean;
                    }, {
                        name: string;
                        label: string;
                        kind: "int";
                        required: boolean;
                        min: number;
                        max: number;
                        integer: boolean;
                    }];
                }, {
                    readonly value: "FIRST_FRIDAY";
                    readonly label: "The first Friday of a month";
                    readonly fields: readonly [{
                        name: string;
                        label: string;
                        kind: "int";
                        required: boolean;
                        min: number;
                        max: number;
                        integer: boolean;
                    }];
                }];
            }, {
                name: string;
                label: string;
                kind: "time";
                required: boolean;
                format: string;
            }];
        }];
    }];
    readonly modifiers: readonly [{
        readonly name: "limits";
        readonly label: "Limits";
        readonly kind: "object";
        readonly required: false;
        readonly fields: readonly [{
            readonly required: false;
            readonly name: string;
            readonly label: string;
            readonly kind: "int";
            readonly min: number;
            readonly max: number;
            readonly integer: boolean;
        }, {
            readonly required: false;
            readonly prayers: readonly ["fajr"];
            readonly name: string;
            readonly label: string;
            readonly kind: "int";
            readonly min: number;
            readonly max: number;
            readonly integer: boolean;
        }];
    }, {
        readonly name: "rounding";
        readonly label: "Rounding";
        readonly kind: "object";
        readonly required: false;
        readonly fields: readonly [{
            readonly name: "mode";
            readonly label: "Direction";
            readonly kind: "enum";
            readonly required: true;
            readonly options: readonly [{
                readonly value: "CEIL";
                readonly label: "Round up";
            }, {
                readonly value: "FLOOR";
                readonly label: "Round down";
            }, {
                readonly value: "NEAREST";
                readonly label: "Round to nearest";
            }];
        }, {
            readonly name: "step";
            readonly label: "To a multiple of (minutes)";
            readonly kind: "enum";
            readonly required: true;
            readonly options: {
                value: 10 | 60 | 5 | 15 | 30;
                label: string;
            }[];
            readonly default: 5;
        }];
    }, {
        readonly name: "weekdayAdjust";
        readonly label: "Weekday adjustment";
        readonly kind: "object";
        readonly required: false;
        readonly note: "Minutes added on that weekday, e.g. FRI -5. Leave a weekday empty for no change.";
        readonly fields: {
            required: boolean;
            name: string;
            label: string;
            kind: "int";
            min: number;
            max: number;
            integer: boolean;
        }[];
    }, {
        readonly name: "weeklyLock";
        readonly label: "Hold for the Friday to Thursday week";
        readonly kind: "bool";
        readonly required: false;
        readonly default: false;
        readonly prayers: readonly import("./iqama-rules.types").PrayerName[];
    }];
    readonly pipeline: readonly ["base", "limits", "rounding", "weekdayAdjust", "weeklyLock", "override", "guardrails"];
    readonly guardrails: {
        readonly minGapAfterAzanMinutes: 3;
        readonly fajrEndsBeforeSunriseMinutes: 60;
        readonly iqamaStepMinutes: 5;
        readonly fajrSunriseConflictPolicy: "gap-wins-with-acknowledgement";
    };
};
