"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAdhanSettings = resolveAdhanSettings;
exports.paramsKey = paramsKey;
const adhan_catalog_1 = require("./adhan-catalog");
const PRAYER_KEYS = [
    'fajr',
    'sunrise',
    'dhuhr',
    'asr',
    'maghrib',
    'isha',
];
function resolveAdhanSettings(date, versions, periods) {
    const sortedVersions = [...versions].sort((a, b) => {
        if (a.effectiveFrom !== b.effectiveFrom) {
            return a.effectiveFrom < b.effectiveFrom ? -1 : 1;
        }
        return a.id - b.id;
    });
    const activeVersion = sortedVersions
        .filter((v) => v.effectiveFrom <= date)
        .at(-1);
    if (!activeVersion) {
        throw new Error(`No AdhanConfigVersion found with effectiveFrom <= ${date}. ` +
            'Ensure the seed migration has run.');
    }
    const base = JSON.parse(activeVersion.settings);
    const activePeriods = periods.filter((p) => p.deletedAt === null && p.startDate <= date && p.endDate >= date);
    let mergedGeneral = { ...base.general };
    const mergedPrayers = {};
    for (const key of PRAYER_KEYS) {
        if (base.prayers[key]) {
            mergedPrayers[key] = { ...base.prayers[key] };
        }
    }
    const sortedPeriods = [...activePeriods].sort((a, b) => a.createdAt < b.createdAt ? -1 : 1);
    for (const period of sortedPeriods) {
        const partial = JSON.parse(period.settings);
        if (partial.general) {
            mergedGeneral = { ...mergedGeneral, ...partial.general };
        }
        if (partial.prayers) {
            for (const key of PRAYER_KEYS) {
                const ps = partial.prayers[key];
                if (ps) {
                    mergedPrayers[key] = { ...(mergedPrayers[key] ?? {}), ...ps };
                }
            }
        }
    }
    const perPrayer = {};
    for (const prayer of PRAYER_KEYS) {
        const ps = mergedPrayers[prayer] ?? {};
        const method = ps.method ?? mergedGeneral.method;
        const entry = (0, adhan_catalog_1.getMethodEntry)(method);
        perPrayer[prayer] = {
            prayer,
            method,
            fajrAngle: ps.fajrAngle ?? entry.fajrAngle,
            ishaAngle: ps.ishaAngle !== undefined ? ps.ishaAngle : (entry.ishaAngle ?? null),
            ishaInterval: ps.ishaInterval !== undefined
                ? ps.ishaInterval
                : (entry.ishaInterval ?? null),
            maghribAngle: ps.maghribAngle !== undefined
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
function paramsKey(p) {
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
//# sourceMappingURL=adhan-config.resolver.js.map