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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HijriCalendarController = void 0;
const common_1 = require("@nestjs/common");
const api_key_guard_1 = require("../auth/api-key.guard");
const calendar_override_service_1 = require("./calendar-override.service");
const qiyam_config_service_1 = require("./qiyam-config.service");
const hijri_utils_1 = require("./hijri-utils");
const submit_override_dto_1 = require("./dto/submit-override.dto");
const qiyam_config_dto_1 = require("./dto/qiyam-config.dto");
const dayjs_1 = __importDefault(require("../dayjs"));
let HijriCalendarController = class HijriCalendarController {
    calendarOverrideService;
    qiyamConfigService;
    constructor(calendarOverrideService, qiyamConfigService) {
        this.calendarOverrideService = calendarOverrideService;
        this.qiyamConfigService = qiyamConfigService;
    }
    async getStatus() {
        return this.calendarOverrideService.getStatus();
    }
    async submitOverride(dto) {
        return this.calendarOverrideService.submitOverride(dto);
    }
    async deleteOverride() {
        const { year: hijriYear, month: hijriMonth } = (0, hijri_utils_1.getHijriComponents)((0, dayjs_1.default)());
        return this.calendarOverrideService.deleteCalendarOverride(hijriYear, hijriMonth);
    }
    async getEidPrayers(date, admin) {
        const today = date && /^\d{4}-\d{2}-\d{2}$/.test(date)
            ? date
            : (0, dayjs_1.default)().format('YYYY-MM-DD');
        return this.calendarOverrideService.getEidPrayers(today, admin === 'true');
    }
    async getQiyamConfig() {
        const { year: hijriYear } = (0, hijri_utils_1.getHijriComponents)((0, dayjs_1.default)());
        return this.qiyamConfigService.getForYear(hijriYear);
    }
    async saveQiyamConfig(dto) {
        const { year: hijriYear } = (0, hijri_utils_1.getHijriComponents)((0, dayjs_1.default)());
        return this.qiyamConfigService.upsert(hijriYear, dto.start_time);
    }
};
exports.HijriCalendarController = HijriCalendarController;
__decorate([
    (0, common_1.Get)('status'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HijriCalendarController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Post)('override'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [submit_override_dto_1.SubmitOverrideDto]),
    __metadata("design:returntype", Promise)
], HijriCalendarController.prototype, "submitOverride", null);
__decorate([
    (0, common_1.Delete)('override'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HijriCalendarController.prototype, "deleteOverride", null);
__decorate([
    (0, common_1.Get)('eid-prayers'),
    __param(0, (0, common_1.Query)('date')),
    __param(1, (0, common_1.Query)('admin')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], HijriCalendarController.prototype, "getEidPrayers", null);
__decorate([
    (0, common_1.Get)('qiyam-config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HijriCalendarController.prototype, "getQiyamConfig", null);
__decorate([
    (0, common_1.Post)('qiyam-config'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [qiyam_config_dto_1.QiyamConfigDto]),
    __metadata("design:returntype", Promise)
], HijriCalendarController.prototype, "saveQiyamConfig", null);
exports.HijriCalendarController = HijriCalendarController = __decorate([
    (0, common_1.Controller)('api/v1/hijri-calendar'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        exceptionFactory: (errors) => new common_1.UnprocessableEntityException(errors),
    })),
    __metadata("design:paramtypes", [calendar_override_service_1.CalendarOverrideService,
        qiyam_config_service_1.QiyamConfigService])
], HijriCalendarController);
//# sourceMappingURL=hijri-calendar.controller.js.map