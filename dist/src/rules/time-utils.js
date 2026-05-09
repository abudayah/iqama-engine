"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ceilingToNearest5 = ceilingToNearest5;
exports.floorToNearest5 = floorToNearest5;
exports.ceilingToNearest30 = ceilingToNearest30;
exports.formatHHmm = formatHHmm;
function ceilingToNearest5(dayjsObj) {
    const m = dayjsObj.minute();
    const s = dayjsObj.second();
    const totalMinutes = m + (s > 0 ? 1 : 0);
    const rounded = Math.ceil(totalMinutes / 5) * 5;
    return dayjsObj.startOf('minute').minute(rounded).second(0);
}
function floorToNearest5(dayjsObj) {
    const m = dayjsObj.minute();
    const floored = Math.floor(m / 5) * 5;
    return dayjsObj.startOf('minute').minute(floored).second(0);
}
function ceilingToNearest30(dayjsObj) {
    const m = dayjsObj.minute();
    const s = dayjsObj.second();
    const totalMinutes = m + (s > 0 ? 1 : 0);
    const rounded = Math.ceil(totalMinutes / 30) * 30;
    return dayjsObj.startOf('minute').minute(rounded).second(0);
}
function formatHHmm(dayjsObj) {
    return dayjsObj.format('HH:mm');
}
//# sourceMappingURL=time-utils.js.map