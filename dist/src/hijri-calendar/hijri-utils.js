"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHijriComponents = getHijriComponents;
exports.formatHijriDate = formatHijriDate;
function getHijriComponents(date) {
    const h = date.calendar('hijri');
    return {
        month: h.month() + 1,
        day: h.date(),
        year: h.year(),
    };
}
function formatHijriDate(date) {
    const h = date.calendar('hijri');
    return h.format('MMMM D, YYYY');
}
//# sourceMappingURL=hijri-utils.js.map