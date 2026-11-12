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
exports.IqamaRulesController = void 0;
const common_1 = require("@nestjs/common");
const api_key_guard_1 = require("../auth/api-key.guard");
const iqama_rules_service_1 = require("./iqama-rules.service");
const preview_iqama_rules_dto_1 = require("./dto/preview-iqama-rules.dto");
const create_iqama_rules_version_dto_1 = require("./dto/create-iqama-rules-version.dto");
let IqamaRulesController = class IqamaRulesController {
    service;
    constructor(service) {
        this.service = service;
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
        return this.service.createVersion(dto, 'admin');
    }
};
exports.IqamaRulesController = IqamaRulesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], IqamaRulesController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Get)('catalog'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], IqamaRulesController.prototype, "getCatalog", null);
__decorate([
    (0, common_1.Post)('preview'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [preview_iqama_rules_dto_1.PreviewIqamaRulesDto]),
    __metadata("design:returntype", void 0)
], IqamaRulesController.prototype, "preview", null);
__decorate([
    (0, common_1.Put)('base'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_iqama_rules_version_dto_1.CreateIqamaRulesVersionDto]),
    __metadata("design:returntype", void 0)
], IqamaRulesController.prototype, "createVersion", null);
exports.IqamaRulesController = IqamaRulesController = __decorate([
    (0, common_1.Controller)('api/v1/admin/iqama-rules'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    __metadata("design:paramtypes", [iqama_rules_service_1.IqamaRulesService])
], IqamaRulesController);
//# sourceMappingURL=iqama-rules.controller.js.map