"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrecedingFridayDate = getPrecedingFridayDate;
const dayjs_1 = __importDefault(require("../dayjs"));
function getPrecedingFridayDate(date, tz) {
    const d = dayjs_1.default.tz(date, tz);
    const dayOfWeek = d.day();
    const daysSinceFriday = (dayOfWeek + 7 - 5) % 7;
    return d.subtract(daysSinceFriday, 'day').format('YYYY-MM-DD');
}
//# sourceMappingURL=friday-block.rule.js.map