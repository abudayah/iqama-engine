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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdhanAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const adhan_1 = require("adhan");
const dayjs_1 = __importDefault(require("../dayjs"));
let AdhanAdapter = class AdhanAdapter {
    configService;
    latitude;
    longitude;
    timezone;
    constructor(configService) {
        this.configService = configService;
        this.latitude = this.configService.get('app.masjidLatitude');
        this.longitude = this.configService.get('app.masjidLongitude');
        this.timezone = this.configService.get('app.masjidTimezone');
    }
    getPrayerTimes(date) {
        const coordinates = new adhan_1.Coordinates(this.latitude, this.longitude);
        const params = adhan_1.CalculationMethod.NorthAmerica();
        params.madhab = adhan_1.Madhab.Shafi;
        params.rounding = adhan_1.Rounding.None;
        params.highLatitudeRule = adhan_1.HighLatitudeRule.TwilightAngle;
        const pt = new adhan_1.PrayerTimes(coordinates, date, params);
        return {
            fajr: (0, dayjs_1.default)(pt.fajr).tz(this.timezone),
            sunrise: (0, dayjs_1.default)(pt.sunrise).tz(this.timezone),
            dhuhr: (0, dayjs_1.default)(pt.dhuhr).tz(this.timezone),
            asr: (0, dayjs_1.default)(pt.asr).tz(this.timezone),
            maghrib: (0, dayjs_1.default)(pt.maghrib).tz(this.timezone),
            isha: (0, dayjs_1.default)(pt.isha).tz(this.timezone),
        };
    }
};
exports.AdhanAdapter = AdhanAdapter;
exports.AdhanAdapter = AdhanAdapter = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AdhanAdapter);
//# sourceMappingURL=adhan.adapter.js.map