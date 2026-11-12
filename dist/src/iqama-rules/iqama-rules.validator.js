"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRuleSet = validateRuleSet;
const iqama_guardrail_1 = require("../rules/iqama-guardrail");
const iqama_rules_catalog_1 = require("./iqama-rules.catalog");
const iqama_rules_canonical_1 = require("./iqama-rules.canonical");
const iqama_rules_types_1 = require("./iqama-rules.types");
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ROUND_STEPS = iqama_rules_catalog_1.RANGES.roundingSteps;
const isInt = (n) => typeof n === 'number' && Number.isInteger(n);
const inRange = (n, lo, hi) => isInt(n) && n >= lo && n <= hi;
const maxDay = (month) => [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
function validatePrayer(prayer, rule, errors, warnings) {
    const err = (path, message) => errors.push({ path: `${prayer}${path}`, message });
    const warn = (path, message) => warnings.push({ path: `${prayer}${path}`, message });
    if (!rule || typeof rule !== 'object' || !rule.base) {
        err('', 'rule with a base is required');
        return;
    }
    const b = rule.base;
    switch (b.type) {
        case 'OFFSET':
            if (!inRange(b.minutes, iqama_rules_catalog_1.RANGES.offsetMinutes.min, iqama_rules_catalog_1.RANGES.offsetMinutes.max))
                err('.base.minutes', 'must be a whole number from -120 to 120');
            break;
        case 'FIXED_TIME':
            if (!HHMM.test(b.time ?? ''))
                err('.base.time', 'must be HH:mm');
            break;
        case 'SCALED_GAP': {
            const pts = b.points;
            if (!Array.isArray(pts) || pts.length < iqama_rules_catalog_1.RANGES.scaledGapMinPoints) {
                err('.base.points', 'at least 2 points are required');
                break;
            }
            if (pts.length > iqama_rules_catalog_1.RANGES.scaledGapMaxPoints) {
                err('.base.points', `at most ${iqama_rules_catalog_1.RANGES.scaledGapMaxPoints} points are allowed`);
                break;
            }
            pts.forEach((p, i) => {
                if (!HHMM.test(p?.azan ?? ''))
                    err(`.base.points[${i}].azan`, 'must be HH:mm');
                if (!inRange(p?.gapMinutes, iqama_rules_catalog_1.RANGES.gapMinutes.min, iqama_rules_catalog_1.RANGES.gapMinutes.max))
                    err(`.base.points[${i}].gapMinutes`, 'must be a whole number from 0 to 120');
            });
            const times = pts.map((p) => HHMM.test(p?.azan ?? '') ? (0, iqama_guardrail_1.toMin)(p.azan) : NaN);
            if (times.every((t) => !Number.isNaN(t)) &&
                times.some((t, i) => i > 0 && t <= times[i - 1]))
                err('.base.points', 'azan times must be strictly increasing');
            break;
        }
        case 'SEASONAL': {
            const segs = b.segments;
            if (!Array.isArray(segs) || segs.length < iqama_rules_catalog_1.RANGES.seasonalMinSegments) {
                err('.base.segments', 'at least 1 segment is required');
                break;
            }
            if (segs.length > iqama_rules_catalog_1.RANGES.seasonalMaxSegments) {
                err('.base.segments', `at most ${iqama_rules_catalog_1.RANGES.seasonalMaxSegments} segments are allowed`);
                break;
            }
            const seen = new Set();
            segs.forEach((s, i) => {
                const p = `.base.segments[${i}]`;
                if (!HHMM.test(s?.time ?? ''))
                    err(`${p}.time`, 'must be HH:mm');
                const st = s?.start;
                if (!st || !inRange(st.month, 1, 12)) {
                    err(`${p}.start.month`, 'must be 1-12');
                    return;
                }
                if (st.kind === 'DATE') {
                    if (!inRange(st.day, 1, maxDay(st.month)))
                        err(`${p}.start.day`, `must be 1-${maxDay(st.month)} for month ${st.month}`);
                }
                else if (st.kind !== 'FIRST_FRIDAY') {
                    err(`${p}.start.kind`, "must be 'DATE' or 'FIRST_FRIDAY'");
                    return;
                }
                const key = st.kind === 'DATE' ? `D${st.month}-${st.day}` : `F${st.month}`;
                if (seen.has(key))
                    err(`${p}.start`, 'duplicate segment start');
                seen.add(key);
            });
            break;
        }
        default:
            err('.base.type', 'unknown base type');
    }
    const lim = rule.limits;
    if (lim) {
        if (lim.minAfterAzan !== undefined) {
            if (!inRange(lim.minAfterAzan, iqama_rules_catalog_1.RANGES.minAfterAzan.min, iqama_rules_catalog_1.RANGES.minAfterAzan.max))
                err('.limits.minAfterAzan', 'must be a whole number from 0 to 120');
            else if (lim.minAfterAzan < iqama_guardrail_1.MIN_IQAMA_GAP_MIN)
                warn('.limits.minAfterAzan', `below the ${iqama_guardrail_1.MIN_IQAMA_GAP_MIN}-minute hard guardrail; the guardrail will raise it`);
        }
        if (lim.latestBeforeSunrise !== undefined) {
            if (prayer !== 'fajr')
                err('.limits.latestBeforeSunrise', 'only Fajr has a sunrise limit');
            else if (!inRange(lim.latestBeforeSunrise, iqama_rules_catalog_1.RANGES.latestBeforeSunrise.min, iqama_rules_catalog_1.RANGES.latestBeforeSunrise.max))
                err('.limits.latestBeforeSunrise', 'must be a whole number from 0 to 240');
            else if (lim.latestBeforeSunrise < iqama_guardrail_1.FAJR_SUNRISE_BUFFER_MIN)
                warn('.limits.latestBeforeSunrise', `below the ${iqama_guardrail_1.FAJR_SUNRISE_BUFFER_MIN}-minute hard guardrail; the guardrail will cap it`);
        }
    }
    if (rule.rounding) {
        if (!['CEIL', 'FLOOR', 'NEAREST'].includes(rule.rounding.mode))
            err('.rounding.mode', 'must be CEIL, FLOOR or NEAREST');
        if (!ROUND_STEPS.includes(rule.rounding.step))
            err('.rounding.step', `must be one of ${ROUND_STEPS.join(', ')}`);
    }
    if (rule.weekdayAdjust) {
        for (const [k, v] of Object.entries(rule.weekdayAdjust)) {
            if (!iqama_rules_types_1.WEEKDAYS.includes(k))
                err(`.weekdayAdjust.${k}`, 'unknown weekday');
            else if (!inRange(v, iqama_rules_catalog_1.RANGES.weekdayAdjust.min, iqama_rules_catalog_1.RANGES.weekdayAdjust.max))
                err(`.weekdayAdjust.${k}`, 'must be a whole number from -60 to 60');
        }
    }
    if (rule.weeklyLock) {
        if (!iqama_rules_types_1.LOCKABLE_PRAYERS.includes(prayer)) {
            err('.weeklyLock', 'weekly lock is not available for this prayer');
        }
        else {
            if (rule.weekdayAdjust && Object.keys(rule.weekdayAdjust).length > 0)
                warn('.weekdayAdjust', 'weekly lock holds the latest day of the week, so a weekday adjustment has little or no effect');
        }
    }
}
function validateRuleSet(rules, effectiveFrom, previous) {
    const errors = [];
    const warnings = [];
    if (effectiveFrom !== undefined) {
        const ok = /^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom) &&
            !Number.isNaN(Date.parse(`${effectiveFrom}T00:00:00Z`)) &&
            new Date(`${effectiveFrom}T00:00:00Z`).toISOString().slice(0, 10) ===
                effectiveFrom;
        if (!ok) {
            errors.push({
                path: 'effectiveFrom',
                message: 'must be a valid YYYY-MM-DD date',
            });
            effectiveFrom = undefined;
        }
    }
    for (const prayer of iqama_rules_types_1.PRAYER_NAMES) {
        validatePrayer(prayer, rules?.[prayer], errors, warnings);
        if (effectiveFrom &&
            iqama_rules_types_1.LOCKABLE_PRAYERS.includes(prayer) &&
            new Date(`${effectiveFrom}T00:00:00Z`).getUTCDay() !== 5 &&
            (!previous ||
                (0, iqama_rules_canonical_1.canonicalJson)(previous[prayer]) !== (0, iqama_rules_canonical_1.canonicalJson)(rules?.[prayer]))) {
            errors.push({
                path: `${prayer}.effectiveFrom`,
                message: `${prayer} changes must start on a Friday (got ${effectiveFrom})`,
            });
        }
    }
    return { errors, warnings };
}
//# sourceMappingURL=iqama-rules.validator.js.map