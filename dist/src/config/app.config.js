"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appConfig = void 0;
const config_1 = require("@nestjs/config");
exports.appConfig = (0, config_1.registerAs)('app', () => ({
    masjidLatitude: parseFloat(process.env.MASJID_LATITUDE ?? '49.2652047'),
    masjidLongitude: parseFloat(process.env.MASJID_LONGITUDE ?? '-122.7878735'),
    masjidTimezone: process.env.MASJID_TIMEZONE ?? 'America/Vancouver',
    iqamaRules: process.env.IQAMA_RULES ?? 'legacy',
    iqamaRulesCutover: process.env.IQAMA_RULES_CUTOVER ?? '2026-11-13',
    databaseUrl: process.env.DATABASE_URL,
}));
//# sourceMappingURL=app.config.js.map