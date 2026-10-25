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
function toAdhanMadhab(m) {
    return m === 'hanafi' ? adhan_1.Madhab.Hanafi : adhan_1.Madhab.Shafi;
}
function toAdhanHighLatitudeRule(r) {
    switch (r) {
        case 'MiddleOfTheNight':
            return adhan_1.HighLatitudeRule.MiddleOfTheNight;
        case 'TwilightAngle':
            return adhan_1.HighLatitudeRule.TwilightAngle;
        default:
            return adhan_1.HighLatitudeRule.SeventhOfTheNight;
    }
}
function toAdhanRounding(r) {
    switch (r) {
        case 'Up':
            return adhan_1.Rounding.Up;
        case 'None':
            return adhan_1.Rounding.None;
        default:
            return adhan_1.Rounding.Nearest;
    }
}
function toAdhanShafaq(s) {
    switch (s) {
        case 'Ahmer':
            return adhan_1.Shafaq.Ahmer;
        case 'Abyad':
            return adhan_1.Shafaq.Abyad;
        default:
            return adhan_1.Shafaq.General;
    }
}
function toAdhanPolarCircle(p) {
    switch (p) {
        case 'AqrabBalad':
            return adhan_1.PolarCircleResolution.AqrabBalad;
        case 'AqrabYaum':
            return adhan_1.PolarCircleResolution.AqrabYaum;
        default:
            return adhan_1.PolarCircleResolution.Unresolved;
    }
}
function buildParams(method, params) {
    let cp;
    switch (method) {
        case 'MuslimWorldLeague':
            cp = adhan_1.CalculationMethod.MuslimWorldLeague();
            break;
        case 'Egyptian':
            cp = adhan_1.CalculationMethod.Egyptian();
            break;
        case 'Karachi':
            cp = adhan_1.CalculationMethod.Karachi();
            break;
        case 'UmmAlQura':
            cp = adhan_1.CalculationMethod.UmmAlQura();
            break;
        case 'Dubai':
            cp = adhan_1.CalculationMethod.Dubai();
            break;
        case 'MoonsightingCommittee':
            cp = adhan_1.CalculationMethod.MoonsightingCommittee();
            break;
        case 'Kuwait':
            cp = adhan_1.CalculationMethod.Kuwait();
            break;
        case 'Qatar':
            cp = adhan_1.CalculationMethod.Qatar();
            break;
        case 'Singapore':
            cp = adhan_1.CalculationMethod.Singapore();
            break;
        case 'Tehran':
            cp = adhan_1.CalculationMethod.Tehran();
            break;
        case 'Turkey':
            cp = adhan_1.CalculationMethod.Turkey();
            break;
        case 'NorthAmerica':
            cp = adhan_1.CalculationMethod.NorthAmerica();
            break;
        default:
            cp = adhan_1.CalculationMethod.Other();
            break;
    }
    if (params.fajrAngle !== undefined)
        cp.fajrAngle = params.fajrAngle;
    if (params.ishaAngle !== null)
        cp.ishaAngle = params.ishaAngle;
    if (params.ishaInterval !== null) {
        cp.ishaInterval =
            params.ishaInterval;
    }
    if (params.maghribAngle !== null)
        cp.maghribAngle = params.maghribAngle;
    cp.madhab = toAdhanMadhab(params.madhab);
    cp.highLatitudeRule = toAdhanHighLatitudeRule(params.highLatitudeRule);
    cp.rounding = toAdhanRounding(params.rounding);
    cp.polarCircleResolution = toAdhanPolarCircle(params.polarCircleResolution);
    if (params.shafaq !== undefined)
        cp.shafaq = toAdhanShafaq(params.shafaq);
    if (params.offsetMinutes !== 0) {
        const prayerToAdjKey = {
            fajr: 'fajr',
            sunrise: 'sunrise',
            dhuhr: 'dhuhr',
            asr: 'asr',
            maghrib: 'maghrib',
            isha: 'isha',
        };
        const adjKey = prayerToAdjKey[params.prayer];
        if (adjKey) {
            cp.adjustments[adjKey] = params.offsetMinutes;
        }
    }
    return cp;
}
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
        const month = date.getMonth() + 1;
        if (month >= 5 && month <= 7) {
            params.methodAdjustments.isha = -6;
        }
        params.highLatitudeRule = adhan_1.HighLatitudeRule.TwilightAngle;
        const pt = new adhan_1.PrayerTimes(coordinates, date, params);
        return this._toRaw(pt);
    }
    getPrayerTimesFromConfig(date, resolved) {
        const coordinates = new adhan_1.Coordinates(this.latitude, this.longitude);
        const prayers = [
            'fajr',
            'sunrise',
            'dhuhr',
            'asr',
            'maghrib',
            'isha',
        ];
        const groups = new Map();
        for (const prayer of prayers) {
            const rp = resolved.perPrayer[prayer];
            const key = JSON.stringify({
                method: rp.method,
                fajrAngle: rp.fajrAngle,
                ishaAngle: rp.ishaAngle,
                ishaInterval: rp.ishaInterval,
                maghribAngle: rp.maghribAngle,
                prayer: rp.offsetMinutes !== 0 ? rp.prayer : undefined,
                offsetMinutes: rp.offsetMinutes,
                madhab: rp.madhab,
                highLatitudeRule: rp.highLatitudeRule,
                polarCircleResolution: rp.polarCircleResolution,
                rounding: rp.rounding,
                shafaq: rp.shafaq,
            });
            if (!groups.has(key)) {
                groups.set(key, { params: buildParams(rp.method, rp), keys: [] });
            }
            groups.get(key).keys.push(prayer);
        }
        const result = {};
        for (const { params, keys } of groups.values()) {
            const pt = new adhan_1.PrayerTimes(coordinates, date, params);
            const raw = this._toRaw(pt);
            for (const k of keys) {
                result[k] = raw[k];
            }
        }
        return result;
    }
    _toRaw(pt) {
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