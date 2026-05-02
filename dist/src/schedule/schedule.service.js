"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleService = void 0;
const common_1 = require("@nestjs/common");
const dayjs_1 = __importDefault(require("../dayjs"));
const cache_service_1 = require("../cache/cache.service");
let ScheduleService = class ScheduleService {
    cacheService;
    constructor(cacheService) {
        this.cacheService = cacheService;
    }
    async getScheduleForDate(date) {
        const yearMonth = date.substring(0, 7);
        const schedules = await this.cacheService.getOrBuildMonth(yearMonth);
        const schedule = schedules.find((s) => s.date === date);
        if (!schedule) {
            throw new common_1.NotFoundException(`No schedule found for date ${date}`);
        }
        return schedule;
    }
    async getScheduleForRange(startDate, endDate) {
        const start = (0, dayjs_1.default)(startDate);
        const end = (0, dayjs_1.default)(endDate);
        const monthsNeeded = new Set();
        let current = start.startOf('month');
        while (current.isBefore(end) || current.isSame(end, 'month')) {
            monthsNeeded.add(current.format('YYYY-MM'));
            current = current.add(1, 'month');
        }
        const allSchedules = [];
        for (const yearMonth of monthsNeeded) {
            const schedules = await this.cacheService.getOrBuildMonth(yearMonth);
            allSchedules.push(...schedules);
        }
        return allSchedules.filter((s) => s.date >= startDate && s.date <= endDate);
    }
};
exports.ScheduleService = ScheduleService;
exports.ScheduleService = ScheduleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cache_service_1.CacheService])
], ScheduleService);
//# sourceMappingURL=schedule.service.js.map