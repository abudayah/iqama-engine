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
            },
        });
    }
    applyOverrides(rawAzanTimes, rulesIqamaTimes, overrides) {
        const result = { ...rulesIqamaTimes };
        let hasOverrides = false;
        for (const override of overrides) {
            const prayer = override.prayer;
            if (override.overrideType === 'FIXED') {
                result[prayer] = override.value;
                hasOverrides = true;
            }
            else if (override.overrideType === 'OFFSET') {
                const azan = rawAzanTimes[prayer];
                if (azan) {
                    const offsetMinutes = parseInt(override.value, 10);
                    result[prayer] = (0, time_utils_1.formatHHmm)((0, time_utils_1.ceilingToNearest5)(azan.add(offsetMinutes, 'minute')));
                    hasOverrides = true;
                }
            }
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