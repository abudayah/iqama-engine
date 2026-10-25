"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeIshaIqama = computeIshaIqama;
exports.computeWeeklyIshaIqama = computeWeeklyIshaIqama;
const time_utils_1 = require("./time-utils");
function computeIshaIqama(ishaAzan) {
    const ishaAzanClean = ishaAzan.startOf('minute');
    const hour = ishaAzanClean.hour();
    const minute = ishaAzanClean.minute();
    const totalMinutes = hour * 60 + minute;
    const boundary2200 = 22 * 60;
    const boundary2000 = 20 * 60;
    let gap;
    if (totalMinutes > boundary2200) {
        gap = 5;
    }
    else if (totalMinutes < boundary2000) {
        gap = 15;
    }
    else {
        const minutesSince2000 = totalMinutes - boundary2000;
        gap = 15 - 10 * (minutesSince2000 / 120);
    }
    const roundedGap = Math.round(gap);
    const target = ishaAzanClean.add(roundedGap, 'minute');
    const minIqama = ishaAzanClean.add(3, 'minute');
    const floored = (0, time_utils_1.floorToNearest5)(target);
    const result = floored.isBefore(minIqama)
        ? (0, time_utils_1.ceilingToNearest5)(target)
        : floored;
    return (0, time_utils_1.formatHHmm)(result);
}
function computeWeeklyIshaIqama(weekDays) {
    if (weekDays.length === 0) {
        throw new Error('weekDays must contain at least one entry');
    }
    return weekDays
        .map((ishaAzan) => computeIshaIqama(ishaAzan))
        .reduce((latest, current) => (current > latest ? current : latest));
}
//# sourceMappingURL=isha.rule.js.map