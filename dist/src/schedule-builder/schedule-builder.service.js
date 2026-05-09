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
const prisma_service_1 = require("../prisma/prisma.service");
const qiyam_config_service_1 = require("../hijri-calendar/qiyam-config.service");
const hijri_utils_1 = require("../hijri-calendar/hijri-utils");
const dhuhr_rule_1 = require("../rules/dhuhr.rule");
const time_utils_1 = require("../rules/time-utils");
const FALLBACK_EID_PRAYER_1 = '07:00';
const FALLBACK_EID_PRAYER_2 = '08:30';
function isQiyamNight(date) {
    const { month, day } = (0, hijri_utils_1.getHijriComponents)(date);
    return month === 9 && day >= 20 && day <= 29;
}
function isAstronomicalEidDay(date) {
    const { month, day } = (0, hijri_utils_1.getHijriComponents)(date);
    return (month === 10 && day === 1) || (month === 12 && day === 10);
}
let ScheduleBuilderService = class ScheduleBuilderService {
    adhanAdapter;
    rulesService;
    overrideService;
    prisma;
    configService;
    qiyamConfigService;
    timezone;
    constructor(adhanAdapter, rulesService, overrideService, prisma, configService, qiyamConfigService) {
        this.adhanAdapter = adhanAdapter;
        this.rulesService = rulesService;
        this.overrideService = overrideService;
        this.prisma = prisma;
        this.configService = configService;
        this.qiyamConfigService = qiyamConfigService;
        this.timezone = this.configService.get('app.masjidTimezone');
    }
    async buildMonth(yearMonth) {
        const tz = this.timezone;
        const daysInMonth = dayjs_1.default.tz(`${yearMonth}-01`, tz).daysInMonth();
        const monthStart = `${yearMonth}-01`;
        const monthEnd = `${yearMonth}-${String(daysInMonth).padStart(2, '0')}`;
        const specialPrayers = await this.prisma.specialPrayer.findMany({
            where: { date: { gte: monthStart, lte: monthEnd } },
        });
        const eidByDate = new Map();
        for (const sp of specialPrayers) {
            const prayers = sp.prayers;
            const p1 = prayers.find((p) => p.label === '1st Eid Prayer')?.time ??
                FALLBACK_EID_PRAYER_1;
            const p2 = prayers.find((p) => p.label === '2nd Eid Prayer')?.time ??
                FALLBACK_EID_PRAYER_2;
            eidByDate.set(sp.date, { prayer1: p1, prayer2: p2 });
        }
        const schedules = [];
        const firstDay = dayjs_1.default.tz(`${yearMonth}-01`, tz);
        const hijriYear = (0, hijri_utils_1.getHijriComponents)(firstDay).year;
        const qiyamConfig = await this.qiyamConfigService.getForYear(hijriYear);
        for (let day = 1; day <= daysInMonth; day++) {
            const date = `${yearMonth}-${String(day).padStart(2, '0')}`;
            const dateObj = dayjs_1.default.tz(`${date}T12:00:00`, tz).toDate();
            const raw = this.adhanAdapter.getPrayerTimes(dateObj);
            const overrides = await this.overrideService.getOverridesForDate(date);
            const weeklyCtx = this.buildWeeklyContext(date, tz);
            const iqamaTimes = this.rulesService.computeIqama(date, raw, weeklyCtx);
            const rawAzanMap = {
                fajr: raw.fajr,
                dhuhr: raw.dhuhr,
                asr: raw.asr,
                maghrib: raw.maghrib,
                isha: raw.isha,
            };
            const sunriseMap = {
                fajr: raw.sunrise,
            };
            const { iqamaTimes: finalIqama, hasOverrides } = this.overrideService.applyOverrides(rawAzanMap, iqamaTimes, overrides, sunriseMap);
            const dateDayjs = dayjs_1.default.tz(date, tz);
            const hijriDate = (0, hijri_utils_1.formatHijriDate)(dateDayjs);
            const isEidDay = isAstronomicalEidDay(dateDayjs);
            const eidEntry = isEidDay
                ? (eidByDate.get(date) ?? {
                    prayer1: FALLBACK_EID_PRAYER_1,
                    prayer2: FALLBACK_EID_PRAYER_2,
                })
                : undefined;
            const schedule = {
                date,
                hijri_date: hijriDate,
                day_of_week: dateDayjs.format('dddd'),
                is_dst: (0, dhuhr_rule_1.isDstActive)(date, tz),
                fajr: { azan: (0, time_utils_1.formatHHmm)(raw.fajr), iqama: finalIqama.fajr },
                sunrise: (0, time_utils_1.formatHHmm)(raw.sunrise),
                dhuhr: { azan: (0, time_utils_1.formatHHmm)(raw.dhuhr), iqama: finalIqama.dhuhr },
                asr: { azan: (0, time_utils_1.formatHHmm)(raw.asr), iqama: finalIqama.asr },
                maghrib: { azan: (0, time_utils_1.formatHHmm)(raw.maghrib), iqama: finalIqama.maghrib },
                isha: { azan: (0, time_utils_1.formatHHmm)(raw.isha), iqama: finalIqama.isha },
                ...(eidEntry
                    ? { eid_prayer_1: eidEntry.prayer1, eid_prayer_2: eidEntry.prayer2 }
                    : {}),
                ...(qiyamConfig && isQiyamNight(dateDayjs)
                    ? { qiyam_time: qiyamConfig.start_time }
                    : {}),
                metadata: {
                    calculation_method: 'ISNA',
                    has_overrides: hasOverrides,
                },
            };
            schedules.push(schedule);
        }
        return schedules;
    }
    buildWeeklyContext(date, tz) {
        const d = dayjs_1.default.tz(date, tz);
        const dayOfWeek = d.day();
        const daysSinceFriday = (dayOfWeek + 2) % 7;
        const weekStart = d.subtract(daysSinceFriday, 'day');
        const fajrWeek = [];
        const ishaWeek = [];
        for (let i = 0; i < 7; i++) {
            const weekDate = weekStart.add(i, 'day');
            const weekDateObj = weekDate
                .hour(12)
                .minute(0)
                .second(0)
                .millisecond(0)
                .toDate();
            const weekRaw = this.adhanAdapter.getPrayerTimes(weekDateObj);
            fajrWeek.push({ fajrAzan: weekRaw.fajr, sunrise: weekRaw.sunrise });
            ishaWeek.push(weekRaw.isha);
        }
        return { fajrWeek, ishaWeek };
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
        prisma_service_1.PrismaService,
        config_1.ConfigService,
        qiyam_config_service_1.QiyamConfigService])
], ScheduleBuilderService);
//# sourceMappingURL=schedule-builder.service.js.map