"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeFajrIqama = computeFajrIqama;
exports.computeWeeklyFajrIqama = computeWeeklyFajrIqama;
const time_utils_1 = require("./time-utils");
function computeFajrIqama(fajrAzan, sunrise) {
    const fajrAzanClean = fajrAzan.startOf('minute');
    const sunriseClean = sunrise.startOf('minute');
    const safeSunriseLimit = sunriseClean.subtract(60, 'minute');
    const maxDelay = fajrAzanClean.add(75, 'minute');
    let baseTarget = maxDelay.isBefore(safeSunriseLimit)
        ? maxDelay
        : safeSunriseLimit;
    const floorClamp = fajrAzanClean.add(10, 'minute');
    if (baseTarget.isBefore(floorClamp)) {
        baseTarget = floorClamp.isBefore(safeSunriseLimit)
            ? floorClamp
            : safeSunriseLimit;
    }
    const rounded = (0, time_utils_1.ceilingToNearest5)(baseTarget);
    const result = rounded.isAfter(safeSunriseLimit)
        ? (0, time_utils_1.floorToNearest5)(safeSunriseLimit)
        : rounded;
    return (0, time_utils_1.formatHHmm)(result);
}
function computeWeeklyFajrIqama(weekDays) {
    if (weekDays.length === 0) {
        throw new Error('weekDays must contain at least one entry');
    }
    const latest = weekDays
        .map(({ fajrAzan, sunrise }) => computeFajrIqama(fajrAzan, sunrise))
        .reduce((acc, current) => (current > acc ? current : acc));
    const minSafeLimitStr = weekDays
        .map(({ sunrise }) => (0, time_utils_1.formatHHmm)(sunrise.startOf('minute').subtract(60, 'minute')))
        .reduce((min, current) => (current < min ? current : min));
    if (latest <= minSafeLimitStr) {
        return latest;
    }
    const [h, m] = minSafeLimitStr.split(':').map(Number);
    const floored = Math.floor(m / 5) * 5;
    return `${String(h).padStart(2, '0')}:${String(floored).padStart(2, '0')}`;
}
//# sourceMappingURL=fajr.rule.js.map