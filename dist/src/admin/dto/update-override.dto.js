"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateOverrideDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_override_dto_1 = require("./create-override.dto");
class UpdateOverrideDto extends (0, mapped_types_1.PartialType)(create_override_dto_1.CreateOverrideDto) {
}
exports.UpdateOverrideDto = UpdateOverrideDto;
//# sourceMappingURL=update-override.dto.js.map