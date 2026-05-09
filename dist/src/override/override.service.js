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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverrideService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const time_utils_1 = require("../rules/time-utils");
let OverrideService = class OverrideService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOverridesForDate(date) {
        const dateObj = new Date(`${date}T00:00:00.000Z`);
        return this.prisma.override.findMany({
            where: {
                startDate: { lte: dateObj },
                endDate: { gte: dateObj },
                deletedAt: null,
            },
        });
    }
    applyOverrides(rawAzanTimes, rulesIqamaTimes, overrides, sunriseTimes) {
        const result = { ...rulesIqamaTimes };
        let hasOverrides = false;
        for (const override of overrides) {
            const prayer = override.prayer;
            if (!(prayer in result))
                continue;
            let overrideTime = null;
            if (override.overrideType === 'FIXED') {
                const azan = rawAzanTimes[prayer];
                if (!azan)
                    continue;
                const [hours, minutes] = override.value.split(':').map(Number);
                overrideTime = azan
                    .startOf('day')
                    .hour(hours)
                    .minute(minutes)
                    .second(0);
                hasOverrides = true;
            }
            else if (override.overrideType === 'OFFSET') {
                const azan = rawAzanTimes[prayer];
                if (!azan)
                    continue;
                const offsetMinutes = parseInt(override.value, 10);
                overrideTime = azan.add(offsetMinutes, 'minute');
                hasOverrides = true;
            }
            if (overrideTime === null)
                continue;
            let rounded = (0, time_utils_1.ceilingToNearest5)(overrideTime);
            if (prayer === 'fajr' && sunriseTimes?.['fajr']) {
                const safeSunriseLimit = sunriseTimes['fajr']
                    .startOf('minute')
                    .subtract(60, 'minute');
                if (rounded.isAfter(safeSunriseLimit)) {
                    rounded = (0, time_utils_1.floorToNearest5)(safeSunriseLimit);
                }
            }
            result[prayer] = (0, time_utils_1.formatHHmm)(rounded);
        }
        return { iqamaTimes: result, hasOverrides };
    }
};
exports.OverrideService = OverrideService;
exports.OverrideService = OverrideService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OverrideService);
//# sourceMappingURL=override.service.js.map