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
exports.RulesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fajr_rule_1 = require("./fajr.rule");
const dhuhr_rule_1 = require("./dhuhr.rule");
const asr_rule_1 = require("./asr.rule");
const maghrib_rule_1 = require("./maghrib.rule");
const isha_rule_1 = require("./isha.rule");
let RulesService = class RulesService {
    configService;
    timezone;
    constructor(configService) {
        this.configService = configService;
        this.timezone = this.configService.get('app.masjidTimezone');
    }
    computeIqama(date, raw) {
        const fajr = (0, fajr_rule_1.computeFajrIqama)(raw.fajr, raw.sunrise);
        const dhuhr = (0, dhuhr_rule_1.computeDhuhrIqama)(date, this.timezone);
        const asr = (0, asr_rule_1.computeAsrIqama)(raw.asr);
        const maghrib = (0, maghrib_rule_1.computeMaghribIqama)(raw.maghrib);
        const isha = (0, isha_rule_1.computeIshaIqama)(raw.isha);
        return { fajr, dhuhr, asr, maghrib, isha };
    }
};
exports.RulesService = RulesService;
exports.RulesService = RulesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RulesService);
//# sourceMappingURL=rules.service.js.map