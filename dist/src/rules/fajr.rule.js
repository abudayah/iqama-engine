"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeFajrIqama = computeFajrIqama;
const time_utils_1 = require("./time-utils");
function computeFajrIqama(fajrAzan, sunrise) {
    const fajrAzanClean = fajrAzan.startOf('minute');
    const sunriseClean = sunrise.startOf('minute');
    const maxDelay = fajrAzanClean.add(75, 'minute');
    const safeSunriseLimit = sunriseClean.subtract(45, 'minute');
    let baseTarget = maxDelay.isBefore(safeSunriseLimit)
        ? maxDelay
        : safeSunriseLimit;
    const floorClamp = fajrAzanClean.add(10, 'minute');
    if (baseTarget.isBefore(floorClamp)) {
        baseTarget = floorClamp;
    }
    return (0, time_utils_1.formatHHmm)((0, time_utils_1.ceilingToNearest5)(baseTarget));
}
//# sourceMappingURL=fajr.rule.js.map