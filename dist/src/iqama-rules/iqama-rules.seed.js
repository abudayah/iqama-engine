"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_RULE_SET = void 0;
exports.DEFAULT_RULE_SET = {
    fajr: {
        base: { type: 'OFFSET', minutes: 75 },
        limits: { minAfterAzan: 10, latestBeforeSunrise: 60 },
        rounding: { mode: 'CEIL', step: 5 },
        weeklyLock: true,
    },
    dhuhr: {
        base: { type: 'FIXED_TIME', time: '13:45' },
        weekdayAdjust: { FRI: -5 },
    },
    asr: {
        base: {
            type: 'SEASONAL',
            segments: [
                { start: { kind: 'FIRST_FRIDAY', month: 1 }, time: '16:00' },
                { start: { kind: 'DATE', month: 3, day: 15 }, time: '18:00' },
                { start: { kind: 'FIRST_FRIDAY', month: 9 }, time: '17:00' },
                { start: { kind: 'FIRST_FRIDAY', month: 10 }, time: '16:30' },
                { start: { kind: 'FIRST_FRIDAY', month: 11 }, time: '15:45' },
            ],
        },
    },
    maghrib: {
        base: { type: 'OFFSET', minutes: 5 },
        rounding: { mode: 'CEIL', step: 5 },
    },
    isha: {
        base: {
            type: 'SCALED_GAP',
            points: [
                { azan: '20:00', gapMinutes: 15 },
                { azan: '22:00', gapMinutes: 5 },
            ],
        },
        limits: { minAfterAzan: 3 },
        rounding: { mode: 'FLOOR', step: 5 },
        weeklyLock: true,
    },
};
//# sourceMappingURL=iqama-rules.seed.js.map