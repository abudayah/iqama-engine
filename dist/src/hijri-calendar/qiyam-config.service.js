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
exports.QiyamConfigService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let QiyamConfigService = class QiyamConfigService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getForYear(hijriYear) {
        const record = await this.prisma.qiyamConfig.findUnique({
            where: { hijri_year: hijriYear },
        });
        if (!record) {
            return null;
        }
        return {
            hijri_year: record.hijri_year,
            start_time: record.start_time,
        };
    }
    async upsert(hijriYear, startTime) {
        await this.prisma.qiyamConfig.upsert({
            where: { hijri_year: hijriYear },
            create: {
                hijri_year: hijriYear,
                start_time: startTime,
            },
            update: {
                start_time: startTime,
            },
        });
    }
};
exports.QiyamConfigService = QiyamConfigService;
exports.QiyamConfigService = QiyamConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QiyamConfigService);
//# sourceMappingURL=qiyam-config.service.js.map