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
const ymd = (v) => (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10);
let OverrideService = class OverrideService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOverridesForRange(startDate, endDate) {
        return this.prisma.$queryRaw `
      SELECT * FROM "Override"
      WHERE substr("startDate", 1, 10) <= ${endDate}
        AND substr("endDate",   1, 10) >= ${startDate}
        AND "deletedAt" IS NULL
      ORDER BY "createdAt" DESC
    `;
    }
    async assertNoOverlap(prayer, startDate, endDate, excludeId) {
        const clash = await this.findOverlaps(prayer, startDate, endDate, excludeId);
        if (clash.length > 0) {
            const c = clash[0];
            throw new common_1.ConflictException(`Override #${c.id} (${c.prayer} ${c.overrideType} ${c.value}, ${ymd(c.startDate)} to ${ymd(c.endDate)}) already covers ${prayer} within ${startDate} to ${endDate}. Edit or delete it first.`);
        }
    }
    async findOverlaps(prayer, startDate, endDate, excludeId) {
        return this.prisma.$queryRaw `
      SELECT * FROM "Override"
      WHERE "prayer" = ${prayer}
        AND substr("startDate", 1, 10) <= ${endDate}
        AND substr("endDate",   1, 10) >= ${startDate}
        AND "deletedAt" IS NULL
        AND "id" != ${excludeId ?? -1}
      ORDER BY "createdAt" DESC
    `;
    }
    applyOverrides(rawAzanTimes, rulesIqamaTimes, overrides) {
        const result = { ...rulesIqamaTimes };
        let hasOverrides = false;
        const ordered = [...overrides].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
            a.id - b.id);
        for (const override of ordered) {
            const prayer = override.prayer;
            if (!(prayer in result))
                continue;
            let overrideTime = null;
            if (override.overrideType === 'FIXED') {
                const azan = rawAzanTimes[prayer];
                if (!azan)
                    continue;
                const [hours, minutes] = override.value.split(':').map(Number);
                overrideTime = (0, time_utils_1.setTimeInTz)(azan, hours, minutes, 0);
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
            const rounded = (0, time_utils_1.ceilingToNearest5)(overrideTime);
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