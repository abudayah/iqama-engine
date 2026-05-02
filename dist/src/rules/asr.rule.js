"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAsrIqama = computeAsrIqama;
const time_utils_1 = require("./time-utils");
function computeAsrIqama(asrAzan) {
    const asrAzanClean = asrAzan.startOf('minute');
    return (0, time_utils_1.formatHHmm)((0, time_utils_1.ceilingToNearest30)(asrAzanClean.add(15, 'minute')));
}
//# sourceMappingURL=asr.rule.js.map