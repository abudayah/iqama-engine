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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleController = void 0;
const common_1 = require("@nestjs/common");
const schedule_service_1 = require("./schedule.service");
const schedule_query_dto_1 = require("./dto/schedule-query.dto");
let ScheduleController = class ScheduleController {
    scheduleService;
    constructor(scheduleService) {
        this.scheduleService = scheduleService;
    }
    async getSchedule(query) {
        const { date, start_date, end_date } = query;
        if (date && (start_date || end_date)) {
            throw new common_1.BadRequestException("Cannot use 'date' together with 'start_date' or 'end_date'");
        }
        if ((start_date && !end_date) || (!start_date && end_date)) {
            throw new common_1.BadRequestException("'start_date' and 'end_date' must be provided together");
        }
        if (!date && !start_date && !end_date) {
            throw new common_1.BadRequestException("Provide either 'date' or both 'start_date' and 'end_date'");
        }
        if (start_date && end_date && start_date > end_date) {
            throw new common_1.BadRequestException("'start_date' must not be after 'end_date'");
        }
        if (date) {
            return this.scheduleService.getScheduleForDate(date);
        }
        return this.scheduleService.getScheduleForRange(start_date, end_date);
    }
};
exports.ScheduleController = ScheduleController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [schedule_query_dto_1.ScheduleQueryDto]),
    __metadata("design:returntype", Promise)
], ScheduleController.prototype, "getSchedule", null);
exports.ScheduleController = ScheduleController = __decorate([
    (0, common_1.Controller)('v1/schedule'),
    __metadata("design:paramtypes", [schedule_service_1.ScheduleService])
], ScheduleController);
//# sourceMappingURL=schedule.controller.js.map