"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeIshaIqama = computeIshaIqama;
const time_utils_1 = require("./time-utils");
function computeIshaIqama(ishaAzan) {
    const ishaAzanClean = ishaAzan.startOf('minute');
    const hour = ishaAzanClean.hour();
    const minute = ishaAzanClean.minute();
    const totalMinutes = hour * 60 + minute;
    const boundary2230 = 22 * 60 + 30;
    const boundary2000 = 20 * 60;
    let gap;
    if (totalMinutes > boundary2230) {
        gap = 5;
    }
    else if (totalMinutes < boundary2000) {
        gap = 15;
    }
    else {
        const minutesSince2000 = totalMinutes - boundary2000;
        gap = 15 - 10 * (minutesSince2000 / 150);
    }
    const roundedGap = Math.round(gap);
    const result = (0, time_utils_1.ceilingToNearest5)(ishaAzanClean.add(roundedGap, 'minute'));
    return (0, time_utils_1.formatHHmm)(result);
}
//# sourceMappingURL=isha.rule.js.map