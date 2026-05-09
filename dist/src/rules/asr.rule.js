"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAsrIqama = computeAsrIqama;
function computeAsrIqama(asrAzan) {
    const month = asrAzan.month() + 1;
    const day = asrAzan.date();
    if ((month === 3 && day >= 15) ||
        (month >= 4 && month <= 8) ||
        (month === 9 && day <= 15)) {
        return '18:00';
    }
    if ((month === 9 && day >= 16) ||
        month === 10 ||
        (month === 11 && day <= 15)) {
        return '17:00';
    }
    if ((month === 11 && day >= 16) ||
        month === 12 ||
        (month === 1 && day <= 15)) {
        return '15:00';
    }
    return '16:00';
}
//# sourceMappingURL=asr.rule.js.map