"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeDhuhrIqama = computeDhuhrIqama;
exports.isDstActive = isDstActive;
const dayjs_1 = __importDefault(require("../dayjs"));
function computeDhuhrIqama(date, tz) {
    const d = dayjs_1.default.tz(date, tz);
    const jan1 = d.startOf('year');
    const isDst = d.utcOffset() > jan1.utcOffset();
    const baseTime = isDst ? '13:45' : '12:45';
    if (d.day() === 5) {
        const [hours, minutes] = baseTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes - 5;
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return baseTime;
}
function isDstActive(date, tz) {
    const d = dayjs_1.default.tz(date, tz);
    const jan1 = d.startOf('year');
    return d.utcOffset() > jan1.utcOffset();
}
//# sourceMappingURL=dhuhr.rule.js.map