"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeMaghribIqama = computeMaghribIqama;
const time_utils_1 = require("./time-utils");
function computeMaghribIqama(maghribAzan) {
    const maghribAzanClean = maghribAzan.startOf('minute');
    return (0, time_utils_1.formatHHmm)((0, time_utils_1.ceilingToNearest5)(maghribAzanClean.add(5, 'minute')));
}
//# sourceMappingURL=maghrib.rule.js.map