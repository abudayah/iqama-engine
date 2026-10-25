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
exports.AdhanConfigController = void 0;
const common_1 = require("@nestjs/common");
const api_key_guard_1 = require("../auth/api-key.guard");
const adhan_config_service_1 = require("./adhan-config.service");
const create_version_dto_1 = require("./dto/create-version.dto");
const create_period_dto_1 = require("./dto/create-period.dto");
const update_period_dto_1 = require("./dto/update-period.dto");
const preview_dto_1 = require("./dto/preview.dto");
let AdhanConfigController = class AdhanConfigController {
    service;
    constructor(service) {
        this.service = service;
    }
    actorFromHeaders() {
        return 'admin';
    }
    getConfig() {
        return this.service.getConfig();
    }
    getCatalog() {
        return this.service.getCatalog();
    }
    preview(dto) {
        return this.service.preview(dto);
    }
    createVersion(dto) {
        return this.service.createVersion(dto, this.actorFromHeaders());
    }
    createPeriod(dto) {
        return this.service.createPeriod(dto, this.actorFromHeaders());
    }
    updatePeriod(id, dto) {
        return this.service.updatePeriod(id, dto);
    }
    deletePeriod(id, previewId) {
        return this.service.deletePeriod(id, previewId);
    }
};
exports.AdhanConfigController = AdhanConfigController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdhanConfigController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Get)('catalog'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdhanConfigController.prototype, "getCatalog", null);
__decorate([
    (0, common_1.Post)('preview'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [preview_dto_1.PreviewDto]),
    __metadata("design:returntype", void 0)
], AdhanConfigController.prototype, "preview", null);
__decorate([
    (0, common_1.Put)('base'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_version_dto_1.CreateVersionDto]),
    __metadata("design:returntype", void 0)
], AdhanConfigController.prototype, "createVersion", null);
__decorate([
    (0, common_1.Post)('periods'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_period_dto_1.CreatePeriodDto]),
    __metadata("design:returntype", void 0)
], AdhanConfigController.prototype, "createPeriod", null);
__decorate([
    (0, common_1.Put)('periods/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_period_dto_1.UpdatePeriodDto]),
    __metadata("design:returntype", void 0)
], AdhanConfigController.prototype, "updatePeriod", null);
__decorate([
    (0, common_1.Delete)('periods/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('previewId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", void 0)
], AdhanConfigController.prototype, "deletePeriod", null);
exports.AdhanConfigController = AdhanConfigController = __decorate([
    (0, common_1.Controller)('api/v1/admin/adhan-config'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    __metadata("design:paramtypes", [adhan_config_service_1.AdhanConfigService])
], AdhanConfigController);
//# sourceMappingURL=adhan-config.controller.js.map