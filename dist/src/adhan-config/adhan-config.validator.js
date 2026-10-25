"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAdhanSettings = validateAdhanSettings;
exports.validatePartialAdhanSettings = validatePartialAdhanSettings;
exports.validatePeriodDates = validatePeriodDates;
const adhan_catalog_1 = require("./adhan-catalog");
const VALID_METHODS = new Set(adhan_catalog_1.ADHAN_CATALOG.methods.map((m) => m.name));
const VALID_MADHAB = new Set(adhan_catalog_1.ADHAN_CATALOG.madhabValues);
const VALID_HIGH_LAT = new Set(adhan_catalog_1.ADHAN_CATALOG.highLatitudeRuleValues);
const VALID_ROUNDING = new Set(adhan_catalog_1.ADHAN_CATALOG.roundingValues);
const VALID_SHAFAQ = new Set(adhan_catalog_1.ADHAN_CATALOG.shafaqValues);
const VALID_POLAR = new Set(adhan_catalog_1.ADHAN_CATALOG.polarCircleResolutionValues);
const VALID_PRAYERS = [
    'fajr',
    'sunrise',
    'dhuhr',
    'asr',
    'maghrib',
    'isha',
];
const ANGLE_MIN = 10;
const ANGLE_MAX = 22;
const OFFSET_MAX_HARD = 60;
const OFFSET_WARN = 10;
const ISHA_INTERVAL_MAX = 180;
const OFFSET_MIN_HARD = -OFFSET_MAX_HARD;
function err(field, message) {
    return { field, severity: 'error', message };
}
function warn(field, message) {
    return { field, severity: 'warning', message };
}
function validateGeneral(g, prefix = 'general') {
    const issues = [];
    if (!VALID_METHODS.has(g.method))
        issues.push(err(`${prefix}.method`, `Unknown method: ${g.method}`));
    if (!VALID_MADHAB.has(g.madhab))
        issues.push(err(`${prefix}.madhab`, `Unknown madhab: ${g.madhab}`));
    if (!VALID_HIGH_LAT.has(g.highLatitudeRule))
        issues.push(err(`${prefix}.highLatitudeRule`, `Unknown highLatitudeRule: ${g.highLatitudeRule}`));
    if (!VALID_ROUNDING.has(g.rounding))
        issues.push(err(`${prefix}.rounding`, `Unknown rounding: ${g.rounding}`));
    if (!VALID_POLAR.has(g.polarCircleResolution))
        issues.push(err(`${prefix}.polarCircleResolution`, `Unknown polarCircleResolution: ${g.polarCircleResolution}`));
    if (g.shafaq !== undefined) {
        if (!VALID_SHAFAQ.has(g.shafaq))
            issues.push(err(`${prefix}.shafaq`, `Unknown shafaq: ${g.shafaq}`));
        if (g.method !== 'MoonsightingCommittee')
            issues.push(err(`${prefix}.shafaq`, 'shafaq is only valid with MoonsightingCommittee'));
    }
    return issues;
}
function validatePrayerSettings(prayer, ps, prefix) {
    const issues = [];
    if (ps.method !== undefined && !VALID_METHODS.has(ps.method))
        issues.push(err(`${prefix}.method`, `Unknown method: ${ps.method}`));
    if (ps.fajrAngle !== undefined) {
        if (prayer !== 'fajr')
            issues.push(err(`${prefix}.fajrAngle`, 'fajrAngle only applies to fajr'));
        if (ps.fajrAngle < ANGLE_MIN || ps.fajrAngle > ANGLE_MAX)
            issues.push(err(`${prefix}.fajrAngle`, `Fajr angle must be ${ANGLE_MIN}–${ANGLE_MAX}°`));
    }
    if (ps.ishaAngle !== undefined && ps.ishaInterval !== undefined)
        issues.push(err(`${prefix}`, 'ishaAngle and ishaInterval are mutually exclusive'));
    if (ps.ishaAngle !== undefined) {
        if (prayer !== 'isha')
            issues.push(err(`${prefix}.ishaAngle`, 'ishaAngle only applies to isha'));
        if (ps.ishaAngle < ANGLE_MIN || ps.ishaAngle > ANGLE_MAX)
            issues.push(err(`${prefix}.ishaAngle`, `Isha angle must be ${ANGLE_MIN}–${ANGLE_MAX}°`));
    }
    if (ps.ishaInterval !== undefined) {
        if (prayer !== 'isha')
            issues.push(err(`${prefix}.ishaInterval`, 'ishaInterval only applies to isha'));
        if (ps.ishaInterval < 0 || ps.ishaInterval > ISHA_INTERVAL_MAX)
            issues.push(err(`${prefix}.ishaInterval`, `ishaInterval must be 0–${ISHA_INTERVAL_MAX}`));
    }
    if (ps.maghribAngle !== undefined) {
        if (prayer !== 'maghrib')
            issues.push(err(`${prefix}.maghribAngle`, 'maghribAngle only applies to maghrib'));
        if (ps.maghribAngle < ANGLE_MIN || ps.maghribAngle > ANGLE_MAX)
            issues.push(err(`${prefix}.maghribAngle`, `Maghrib angle must be ${ANGLE_MIN}–${ANGLE_MAX}°`));
    }
    if (ps.offsetMinutes !== undefined) {
        if (!Number.isInteger(ps.offsetMinutes))
            issues.push(err(`${prefix}.offsetMinutes`, 'offsetMinutes must be an integer'));
        if (ps.offsetMinutes < OFFSET_MIN_HARD ||
            ps.offsetMinutes > OFFSET_MAX_HARD)
            issues.push(err(`${prefix}.offsetMinutes`, `Offset must be between ${OFFSET_MIN_HARD} and ${OFFSET_MAX_HARD} minutes`));
        else if (Math.abs(ps.offsetMinutes) > OFFSET_WARN)
            issues.push(warn(`${prefix}.offsetMinutes`, `Offset of ${ps.offsetMinutes} min is large (>${OFFSET_WARN} min)`));
    }
    return issues;
}
function validateAdhanSettings(settings) {
    const issues = [];
    issues.push(...validateGeneral(settings.general));
    if (settings.prayers) {
        for (const prayer of VALID_PRAYERS) {
            const ps = settings.prayers[prayer];
            if (ps) {
                issues.push(...validatePrayerSettings(prayer, ps, `prayers.${prayer}`));
            }
        }
    }
    return {
        valid: issues.every((i) => i.severity !== 'error'),
        issues,
    };
}
function validatePartialAdhanSettings(settings) {
    const issues = [];
    if (settings.general) {
        const g = settings.general;
        if (g.method !== undefined && !VALID_METHODS.has(g.method))
            issues.push(err('general.method', `Unknown method: ${g.method}`));
        if (g.madhab !== undefined && !VALID_MADHAB.has(g.madhab))
            issues.push(err('general.madhab', `Unknown madhab: ${g.madhab}`));
        if (g.highLatitudeRule !== undefined &&
            !VALID_HIGH_LAT.has(g.highLatitudeRule))
            issues.push(err('general.highLatitudeRule', `Unknown highLatitudeRule: ${g.highLatitudeRule}`));
        if (g.rounding !== undefined && !VALID_ROUNDING.has(g.rounding))
            issues.push(err('general.rounding', `Unknown rounding: ${g.rounding}`));
        if (g.polarCircleResolution !== undefined &&
            !VALID_POLAR.has(g.polarCircleResolution))
            issues.push(err('general.polarCircleResolution', `Unknown polarCircleResolution: ${g.polarCircleResolution}`));
        if (g.shafaq !== undefined && !VALID_SHAFAQ.has(g.shafaq))
            issues.push(err('general.shafaq', `Unknown shafaq: ${g.shafaq}`));
    }
    if (settings.prayers) {
        for (const prayer of VALID_PRAYERS) {
            const ps = settings.prayers[prayer];
            if (ps) {
                issues.push(...validatePrayerSettings(prayer, ps, `prayers.${prayer}`));
            }
        }
    }
    if (!settings.general && !settings.prayers) {
        issues.push(err('settings', 'Period settings must contain at least one field'));
    }
    return {
        valid: issues.every((i) => i.severity !== 'error'),
        issues,
    };
}
function validatePeriodDates(startDate, endDate) {
    const issues = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate))
        issues.push(err('startDate', 'startDate must be YYYY-MM-DD'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate))
        issues.push(err('endDate', 'endDate must be YYYY-MM-DD'));
    if (issues.length === 0 && startDate > endDate)
        issues.push(err('endDate', 'endDate must be on or after startDate'));
    if (issues.length === 0) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 366)
            issues.push(warn('endDate', 'Period is longer than one year'));
    }
    return issues;
}
//# sourceMappingURL=adhan-config.validator.js.map