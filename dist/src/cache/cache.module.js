"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppCacheModule = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const config_1 = require("@nestjs/config");
const adhan_module_1 = require("../adhan/adhan.module");
const rules_module_1 = require("../rules/rules.module");
const override_module_1 = require("../override/override.module");
const prisma_module_1 = require("../prisma/prisma.module");
const cache_service_1 = require("./cache.service");
let AppCacheModule = class AppCacheModule {
};
exports.AppCacheModule = AppCacheModule;
exports.AppCacheModule = AppCacheModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            cache_manager_1.CacheModule.register({
                ttl: 2_592_000_000,
                max: 100,
            }),
            adhan_module_1.AdhanModule,
            rules_module_1.RulesModule,
            override_module_1.OverrideModule,
            prisma_module_1.PrismaModule,
        ],
        providers: [cache_service_1.CacheService],
        exports: [cache_service_1.CacheService],
    })
], AppCacheModule);
//# sourceMappingURL=cache.module.js.map