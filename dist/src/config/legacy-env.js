"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REMOVED_ENV_VARS = void 0;
exports.logIgnoredLegacyEnv = logIgnoredLegacyEnv;
const common_1 = require("@nestjs/common");
exports.REMOVED_ENV_VARS = ['IQAMA_RULES', 'IQAMA_RULES_CUTOVER'];
function logIgnoredLegacyEnv(env = process.env, logger = new common_1.Logger('Config')) {
    const found = exports.REMOVED_ENV_VARS.filter((name) => env[name] !== undefined);
    if (found.length > 0) {
        logger.log(`Ignoring removed setting(s): ${found.join(', ')}. The Iqama rules now always come from the database (IqamaRuleVersion); you can delete these from the environment.`);
    }
    return [...found];
}
//# sourceMappingURL=legacy-env.js.map