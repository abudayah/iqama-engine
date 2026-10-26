"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAsrIqama = computeAsrIqama;
function firstFridayDate(dateInMonth) {
    const firstOfMonth = dateInMonth.date(1);
    const dow = firstOfMonth.day();
    const offset = (5 - dow + 7) % 7;
    return 1 + offset;
}
function computeAsrIqama(asrAzan) {
    const month = asrAzan.month() + 1;
    const day = asrAzan.date();
    if (month === 1 && day >= firstFridayDate(asrAzan)) {
        return '16:00';
    }
    if (month === 2 || (month === 3 && day <= 14)) {
        return '16:00';
    }
    if (month === 3 && day >= 15) {
        return '18:00';
    }
    if (month >= 4 && month <= 8) {
        return '18:00';
    }
    if (month === 9 && day < firstFridayDate(asrAzan)) {
        return '18:00';
    }
    if (month === 9 && day >= firstFridayDate(asrAzan)) {
        return '17:00';
    }
    if (month === 10 && day < firstFridayDate(asrAzan)) {
        return '17:00';
    }
    if (month === 10 && day >= firstFridayDate(asrAzan)) {
        return '16:30';
    }
    if (month === 11 && day < firstFridayDate(asrAzan)) {
        return '16:30';
    }
    if ((month === 11 && day >= firstFridayDate(asrAzan)) || month === 12) {
        return '15:45';
    }
    if (month === 1 && day < firstFridayDate(asrAzan)) {
        return '15:45';
    }
    return '18:00';
}
//# sourceMappingURL=asr.rule.js.map