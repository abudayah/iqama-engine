"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateRule = void 0;
exports.toDayCtx = toDayCtx;
exports.firstFriday = firstFriday;
exports.evaluateRuleMinutes = evaluateRuleMinutes;
exports.evaluateIqama = evaluateIqama;
const iqama_guardrail_1 = require("../rules/iqama-guardrail");
const time_utils_1 = require("../rules/time-utils");
const iqama_rules_types_1 = require("./iqama-rules.types");
function toDayCtx(date, azan, sunrise) {
    return {
        date,
        azanMin: (0, iqama_guardrail_1.toMin)((0, time_utils_1.formatHHmm)(azan)),
        ...(sunrise ? { sunriseMin: (0, iqama_guardrail_1.toMin)((0, time_utils_1.formatHHmm)(sunrise)) } : {}),
    };
}
const parseDate = (date) => {
    const [y, m, d] = date.split('-').map(Number);
    return [y, m, d];
};
const dayOfWeek = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();
function firstFriday(year, month) {
    return 1 + ((5 - dayOfWeek(year, month, 1) + 7) % 7);
}
const startKey = (s, year) => {
    const day = s.kind === 'DATE' ? s.day : firstFriday(year, s.month);
    return s.month * 100 + day;
};
function seasonalTime(base, date) {
    const [y, m, d] = parseDate(date);
    const today = m * 100 + d;
    const keyed = base.segments.map((seg) => ({
        key: startKey(seg.start, y),
        time: seg.time,
    }));
    const started = keyed.filter((s) => s.key <= today);
    const pool = started.length > 0 ? started : keyed;
    return pool.reduce((a, b) => (b.key > a.key ? b : a)).time;
}
function baseMinutes(base, day) {
    switch (base.type) {
        case 'OFFSET':
            return day.azanMin + base.minutes;
        case 'FIXED_TIME':
            return (0, iqama_guardrail_1.toMin)(base.time);
        case 'SEASONAL':
            return (0, iqama_guardrail_1.toMin)(seasonalTime(base, day.date));
        case 'SCALED_GAP': {
            const pts = [...base.points]
                .map((p) => ({ at: (0, iqama_guardrail_1.toMin)(p.azan), gap: p.gapMinutes }))
                .sort((a, b) => a.at - b.at);
            let gap;
            if (day.azanMin <= pts[0].at)
                gap = pts[0].gap;
            else if (day.azanMin >= pts[pts.length - 1].at)
                gap = pts[pts.length - 1].gap;
            else {
                const i = pts.findIndex((p) => p.at >= day.azanMin);
                const [a, b] = [pts[i - 1], pts[i]];
                gap = a.gap + ((b.gap - a.gap) * (day.azanMin - a.at)) / (b.at - a.at);
            }
            return day.azanMin + Math.round(gap);
        }
    }
}
const ceilTo = (v, step) => Math.ceil(v / step) * step;
const floorTo = (v, step) => Math.floor(v / step) * step;
function perDay(rule, day) {
    const { limits, rounding } = rule;
    const minT = limits?.minAfterAzan !== undefined
        ? day.azanMin + limits.minAfterAzan
        : undefined;
    const maxT = limits?.latestBeforeSunrise !== undefined && day.sunriseMin !== undefined
        ? day.sunriseMin - limits.latestBeforeSunrise
        : undefined;
    let target = baseMinutes(rule.base, day);
    if (minT !== undefined)
        target = Math.max(target, minT);
    if (maxT !== undefined)
        target = Math.min(target, maxT);
    let v = target;
    if (rounding) {
        const { mode, step } = rounding;
        v =
            mode === 'CEIL'
                ? ceilTo(target, step)
                : mode === 'FLOOR'
                    ? floorTo(target, step)
                    : Math.round(target / step) * step;
        if (maxT !== undefined && v > maxT)
            v = floorTo(maxT, step);
        else if (minT !== undefined && v < minT)
            v = ceilTo(target, step);
    }
    const [y, m, d] = parseDate(day.date);
    const adjust = rule.weekdayAdjust?.[iqama_rules_types_1.WEEKDAYS[dayOfWeek(y, m, d)]];
    return v + (adjust ?? 0);
}
function evaluateRuleMinutes(rule, day, week) {
    if (!rule.weeklyLock || !week || week.length === 0)
        return perDay(rule, day);
    let latest = Math.max(...week.map((d) => perDay(rule, d)));
    const n = rule.limits?.latestBeforeSunrise;
    if (n !== undefined) {
        const caps = week
            .filter((d) => d.sunriseMin !== undefined)
            .map((d) => d.sunriseMin - n);
        if (caps.length > 0) {
            const cap = Math.min(...caps);
            if (latest > cap)
                latest = floorTo(cap, rule.rounding?.step ?? 1);
        }
    }
    return latest;
}
const evaluateRule = (rule, day, week) => (0, iqama_guardrail_1.toHHmm)(evaluateRuleMinutes(rule, day, week));
exports.evaluateRule = evaluateRule;
function evaluateIqama(prayer, rule, day, week, override) {
    const before = override !== undefined
        ? (0, iqama_guardrail_1.toMin)(override)
        : evaluateRuleMinutes(rule, day, week);
    const after = (0, iqama_guardrail_1.guardrailMinutes)(before, day.azanMin, prayer === 'fajr' ? day.sunriseMin : undefined, rule.rounding?.mode === 'FLOOR');
    return { iqama: (0, iqama_guardrail_1.toHHmm)(after), clamped: after !== before };
}
//# sourceMappingURL=iqama-rules.evaluator.js.map