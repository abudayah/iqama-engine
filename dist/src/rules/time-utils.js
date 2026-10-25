"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTimeInTz = setTimeInTz;
exports.ceilingToNearest5 = ceilingToNearest5;
exports.floorToNearest5 = floorToNearest5;
exports.ceilingToNearest30 = ceilingToNearest30;
exports.formatHHmm = formatHHmm;
const dayjs_1 = __importDefault(require("dayjs"));
function setTimeInTz(dayjsObj, hours, minutes, seconds = 0) {
    const tz = dayjsObj.$x?.$timezone;
    if (!tz) {
        return dayjsObj
            .set('hour', hours)
            .set('minute', minutes)
            .set('second', seconds);
    }
    const dateStr = dayjsObj.tz(tz).format('YYYY-MM-DD');
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return dayjs_1.default.tz(`${dateStr} ${hh}:${mm}:${ss}`, tz);
}
function stripSubMinute(dayjsObj) {
    return dayjsObj
        .subtract(dayjsObj.second(), 'second')
        .subtract(dayjsObj.millisecond(), 'millisecond');
}
function ceilingToNearest5(dayjsObj) {
    const base = stripSubMinute(dayjsObj);
    const bumped = dayjsObj.second() > 0 || dayjsObj.millisecond() > 0
        ? base.add(1, 'minute')
        : base;
    const m = bumped.minute();
    const remainder = m % 5;
    if (remainder === 0)
        return bumped;
    return bumped.add(5 - remainder, 'minute');
}
function floorToNearest5(dayjsObj) {
    const base = stripSubMinute(dayjsObj);
    const m = base.minute();
    const remainder = m % 5;
    if (remainder === 0)
        return base;
    return base.subtract(remainder, 'minute');
}
function ceilingToNearest30(dayjsObj) {
    const base = stripSubMinute(dayjsObj);
    const bumped = dayjsObj.second() > 0 || dayjsObj.millisecond() > 0
        ? base.add(1, 'minute')
        : base;
    const m = bumped.minute();
    const remainder = m % 30;
    if (remainder === 0)
        return bumped;
    return bumped.add(30 - remainder, 'minute');
}
function formatHHmm(dayjsObj) {
    return dayjsObj.format('HH:mm');
}
//# sourceMappingURL=time-utils.js.map