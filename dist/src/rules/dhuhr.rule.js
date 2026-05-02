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
    return isDst ? '13:45' : '12:45';
}
function isDstActive(date, tz) {
    const d = dayjs_1.default.tz(date, tz);
    const jan1 = d.startOf('year');
    return d.utcOffset() > jan1.utcOffset();
}
//# sourceMappingURL=dhuhr.rule.js.map