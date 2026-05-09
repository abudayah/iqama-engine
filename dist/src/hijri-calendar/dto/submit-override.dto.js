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
exports.SubmitOverrideDto = exports.EidConfigDto = exports.EidPrayerEntryDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class EidPrayerEntryDto {
    label;
    time;
}
exports.EidPrayerEntryDto = EidPrayerEntryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EidPrayerEntryDto.prototype, "label", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EidPrayerEntryDto.prototype, "time", void 0);
class EidConfigDto {
    type;
    date;
    prayers;
}
exports.EidConfigDto = EidConfigDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['EID_AL_FITR', 'EID_AL_ADHA']),
    __metadata("design:type", String)
], EidConfigDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EidConfigDto.prototype, "date", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => EidPrayerEntryDto),
    __metadata("design:type", Array)
], EidConfigDto.prototype, "prayers", void 0);
class SubmitOverrideDto {
    hijriYear;
    hijriMonth;
    length;
    eidConfig;
}
exports.SubmitOverrideDto = SubmitOverrideDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], SubmitOverrideDto.prototype, "hijriYear", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], SubmitOverrideDto.prototype, "hijriMonth", void 0);
__decorate([
    (0, class_validator_1.IsIn)([29, 30]),
    __metadata("design:type", Number)
], SubmitOverrideDto.prototype, "length", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => EidConfigDto),
    __metadata("design:type", EidConfigDto)
], SubmitOverrideDto.prototype, "eidConfig", void 0);
//# sourceMappingURL=submit-override.dto.js.map