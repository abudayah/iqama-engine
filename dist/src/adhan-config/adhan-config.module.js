"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdhanConfigModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const adhan_config_controller_1 = require("./adhan-config.controller");
const adhan_config_service_1 = require("./adhan-config.service");
const schedule_builder_module_1 = require("../schedule-builder/schedule-builder.module");
const prisma_module_1 = require("../prisma/prisma.module");
let AdhanConfigModule = class AdhanConfigModule {
};
exports.AdhanConfigModule = AdhanConfigModule;
exports.AdhanConfigModule = AdhanConfigModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, prisma_module_1.PrismaModule, schedule_builder_module_1.ScheduleBuilderModule],
        controllers: [adhan_config_controller_1.AdhanConfigController],
        providers: [adhan_config_service_1.AdhanConfigService],
        exports: [adhan_config_service_1.AdhanConfigService],
    })
], AdhanConfigModule);
//# sourceMappingURL=adhan-config.module.js.map