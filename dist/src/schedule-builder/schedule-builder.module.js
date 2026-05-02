"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleBuilderModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const adhan_module_1 = require("../adhan/adhan.module");
const rules_module_1 = require("../rules/rules.module");
const override_module_1 = require("../override/override.module");
const prisma_module_1 = require("../prisma/prisma.module");
const schedule_builder_service_1 = require("./schedule-builder.service");
let ScheduleBuilderModule = class ScheduleBuilderModule {
};
exports.ScheduleBuilderModule = ScheduleBuilderModule;
exports.ScheduleBuilderModule = ScheduleBuilderModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            adhan_module_1.AdhanModule,
            rules_module_1.RulesModule,
            override_module_1.OverrideModule,
            prisma_module_1.PrismaModule,
        ],
        providers: [schedule_builder_service_1.ScheduleBuilderService],
        exports: [schedule_builder_service_1.ScheduleBuilderService],
    })
], ScheduleBuilderModule);
//# sourceMappingURL=schedule-builder.module.js.map