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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const create_override_dto_1 = require("./dto/create-override.dto");
const api_key_guard_1 = require("../auth/api-key.guard");
let AdminController = class AdminController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createOverride(dto) {
        const override = await this.prisma.override.create({
            data: {
                prayer: dto.prayer,
                overrideType: dto.overrideType,
                value: dto.value,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
            },
        });
        return override;
    }
    async listOverrides() {
        const overrides = await this.prisma.override.findMany({
            orderBy: [{ startDate: 'desc' }, { prayer: 'asc' }],
        });
        return overrides;
    }
    async getOverride(id) {
        const override = await this.prisma.override.findUnique({
            where: { id },
        });
        if (!override) {
            throw new Error(`Override with ID ${id} not found`);
        }
        return override;
    }
    async deleteOverride(id) {
        await this.prisma.override.delete({
            where: { id },
        });
    }
    async clearAllOverrides() {
        await this.prisma.override.deleteMany();
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Post)('overrides'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_override_dto_1.CreateOverrideDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createOverride", null);
__decorate([
    (0, common_1.Get)('overrides'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listOverrides", null);
__decorate([
    (0, common_1.Get)('overrides/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getOverride", null);
__decorate([
    (0, common_1.Delete)('overrides/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteOverride", null);
__decorate([
    (0, common_1.Delete)('overrides'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "clearAllOverrides", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('api/v1/admin'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map