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
exports.CalendarOverrideService = void 0;
exports.isInApproachWindow = isInApproachWindow;
exports.computeFallbackDate = computeFallbackDate;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const dayjs_1 = __importDefault(require("../dayjs"));
const hijri_utils_1 = require("./hijri-utils");
function isInApproachWindow(today, eidDate) {
    const diff = (0, dayjs_1.default)(eidDate).diff((0, dayjs_1.default)(today), 'day');
    return diff === 0;
}
const ASTRONOMICAL_FALLBACK_PRAYERS = [
    { label: '1st Eid Prayer', time: '07:00' },
    { label: '2nd Eid Prayer', time: '08:30' },
];
function hijriToGregorian(hijriYear, hijriMonth1Based, hijriDay) {
    const h = (0, dayjs_1.default)()
        .calendar('hijri')
        .set('year', hijriYear)
        .set('month', hijriMonth1Based - 1)
        .set('date', hijriDay);
    return h.calendar('gregory').format('YYYY-MM-DD');
}
function computeFallbackDate(eidType, currentHijriYear, calendarOverride) {
    if (eidType === 'EID_AL_FITR') {
        if (calendarOverride) {
            const ramadanStart = hijriToGregorian(currentHijriYear, 9, 1);
            return (0, dayjs_1.default)(ramadanStart)
                .add(calendarOverride.length, 'day')
                .format('YYYY-MM-DD');
        }
        else {
            return hijriToGregorian(currentHijriYear, 10, 1);
        }
    }
    else {
        if (calendarOverride) {
            const dhulQidahStart = hijriToGregorian(currentHijriYear, 11, 1);
            return (0, dayjs_1.default)(dhulQidahStart)
                .add(calendarOverride.length + 9, 'day')
                .format('YYYY-MM-DD');
        }
        else {
            return hijriToGregorian(currentHijriYear, 12, 10);
        }
    }
}
let CalendarOverrideService = class CalendarOverrideService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStatus() {
        const now = (0, dayjs_1.default)();
        const { year: hijriYear, month: hijriMonth, day: hijriDay, } = (0, hijri_utils_1.getHijriComponents)(now);
        const gregorianDate = now.format('YYYY-MM-DD');
        const override = await this.prisma.calendarOverride.findUnique({
            where: {
                hijri_year_hijri_month: {
                    hijri_year: hijriYear,
                    hijri_month: hijriMonth,
                },
            },
        });
        return {
            gregorianDate,
            hijriYear,
            hijriMonth,
            hijriDay,
            hasOverride: override !== null,
            overrideLength: override ? override.length : null,
        };
    }
    async deleteCalendarOverride(hijriYear, hijriMonth) {
        await this.prisma.calendarOverride.deleteMany({
            where: {
                hijri_year: hijriYear,
                hijri_month: hijriMonth,
            },
        });
    }
    async upsertCalendarOverride(hijriYear, hijriMonth, length) {
        await this.prisma.calendarOverride.upsert({
            where: {
                hijri_year_hijri_month: {
                    hijri_year: hijriYear,
                    hijri_month: hijriMonth,
                },
            },
            create: {
                hijri_year: hijriYear,
                hijri_month: hijriMonth,
                length,
                is_manual_override: true,
            },
            update: {
                length,
                is_manual_override: true,
            },
        });
    }
    async upsertSpecialPrayer(type, hijriYear, date, prayers) {
        const prayersJson = prayers;
        await this.prisma.specialPrayer.upsert({
            where: {
                hijri_year_type: {
                    hijri_year: hijriYear,
                    type,
                },
            },
            create: {
                type,
                hijri_year: hijriYear,
                date,
                prayers: prayersJson,
            },
            update: {
                date,
                prayers: prayersJson,
            },
        });
    }
    async submitOverride(dto) {
        await this.upsertCalendarOverride(dto.hijriYear, dto.hijriMonth, dto.length);
        if (dto.eidConfig) {
            await this.upsertSpecialPrayer(dto.eidConfig.type, dto.hijriYear, dto.eidConfig.date, dto.eidConfig.prayers);
        }
    }
    async getEidPrayers(today, admin = false) {
        const { year: currentHijriYear } = (0, hijri_utils_1.getHijriComponents)((0, dayjs_1.default)(today));
        const results = [];
        for (const eidType of ['EID_AL_FITR', 'EID_AL_ADHA']) {
            const specialPrayer = await this.prisma.specialPrayer.findUnique({
                where: {
                    hijri_year_type: { hijri_year: currentHijriYear, type: eidType },
                },
            });
            let eidDate;
            let prayers;
            let source;
            if (specialPrayer) {
                eidDate = specialPrayer.date;
                prayers = specialPrayer.prayers;
                source = 'override';
            }
            else {
                const precedingMonth = eidType === 'EID_AL_FITR' ? 9 : 11;
                const calendarOverride = await this.prisma.calendarOverride.findUnique({
                    where: {
                        hijri_year_hijri_month: {
                            hijri_year: currentHijriYear,
                            hijri_month: precedingMonth,
                        },
                    },
                });
                eidDate = computeFallbackDate(eidType, currentHijriYear, calendarOverride ?? undefined);
                prayers = ASTRONOMICAL_FALLBACK_PRAYERS;
                source = 'astronomical';
            }
            if (admin || isInApproachWindow(today, eidDate)) {
                results.push({ type: eidType, date: eidDate, prayers, source });
            }
        }
        return results;
    }
};
exports.CalendarOverrideService = CalendarOverrideService;
exports.CalendarOverrideService = CalendarOverrideService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CalendarOverrideService);
//# sourceMappingURL=calendar-override.service.js.map