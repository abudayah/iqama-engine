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
exports.ScheduleBuilderService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const dayjs_1 = __importDefault(require("../dayjs"));
const adhan_adapter_1 = require("../adhan/adhan.adapter");
const rules_service_1 = require("../rules/rules.service");
const override_service_1 = require("../override/override.service");
const dhuhr_rule_1 = require("../rules/dhuhr.rule");
const time_utils_1 = require("../rules/time-utils");
let ScheduleBuilderService = class ScheduleBuilderService {
    adhanAdapter;
    rulesService;
    overrideService;
    configService;
    timezone;
    constructor(adhanAdapter, rulesService, overrideService, configService) {
        this.adhanAdapter = adhanAdapter;
        this.rulesService = rulesService;
        this.overrideService = overrideService;
        this.configService = configService;
        this.timezone = this.configService.get('app.masjidTimezone');
    }
    async buildMonth(yearMonth) {
        const tz = this.timezone;
        const daysInMonth = dayjs_1.default.tz(`${yearMonth}-01`, tz).daysInMonth();
        const schedules = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const date = `${yearMonth}-${String(day).padStart(2, '0')}`;
            const dateObj = new Date(`${date}T12:00:00.000Z`);
            const raw = this.adhanAdapter.getPrayerTimes(dateObj);
            const overrides = await this.overrideService.getOverridesForDate(date);
            const iqamaTimes = this.rulesService.computeIqama(date, raw);
            const rawAzanMap = {
                fajr: raw.fajr,
                dhuhr: raw.dhuhr,
                asr: raw.asr,
                maghrib: raw.maghrib,
                isha: raw.isha,
            };
            const { iqamaTimes: finalIqama, hasOverrides } = this.overrideService.applyOverrides(rawAzanMap, iqamaTimes, overrides);
            const schedule = {
                date,
                day_of_week: dayjs_1.default.tz(date, tz).format('dddd'),
                is_dst: (0, dhuhr_rule_1.isDstActive)(date, tz),
                fajr: { azan: (0, time_utils_1.formatHHmm)(raw.fajr), iqama: finalIqama.fajr },
                dhuhr: { azan: (0, time_utils_1.formatHHmm)(raw.dhuhr), iqama: finalIqama.dhuhr },
                asr: { azan: (0, time_utils_1.formatHHmm)(raw.asr), iqama: finalIqama.asr },
                maghrib: { azan: (0, time_utils_1.formatHHmm)(raw.maghrib), iqama: finalIqama.maghrib },
                isha: { azan: (0, time_utils_1.formatHHmm)(raw.isha), iqama: finalIqama.isha },
                metadata: {
                    calculation_method: 'ISNA',
                    has_overrides: hasOverrides,
                },
            };
            schedules.push(schedule);
        }
        return schedules;
    }
    async getMonth(yearMonth) {
        return this.buildMonth(yearMonth);
    }
};
exports.ScheduleBuilderService = ScheduleBuilderService;
exports.ScheduleBuilderService = ScheduleBuilderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [adhan_adapter_1.AdhanAdapter,
        rules_service_1.RulesService,
        override_service_1.OverrideService,
        config_1.ConfigService])
], ScheduleBuilderService);
//# sourceMappingURL=schedule-builder.service.js.map