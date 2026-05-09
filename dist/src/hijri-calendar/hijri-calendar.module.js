"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HijriCalendarModule = void 0;
const common_1 = require("@nestjs/common");
const hijri_calendar_controller_1 = require("./hijri-calendar.controller");
const calendar_override_service_1 = require("./calendar-override.service");
const qiyam_config_service_1 = require("./qiyam-config.service");
const prisma_module_1 = require("../prisma/prisma.module");
let HijriCalendarModule = class HijriCalendarModule {
};
exports.HijriCalendarModule = HijriCalendarModule;
exports.HijriCalendarModule = HijriCalendarModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [hijri_calendar_controller_1.HijriCalendarController],
        providers: [calendar_override_service_1.CalendarOverrideService, qiyam_config_service_1.QiyamConfigService],
    })
], HijriCalendarModule);
//# sourceMappingURL=hijri-calendar.module.js.map