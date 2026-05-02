"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appConfig = void 0;
const config_1 = require("@nestjs/config");
exports.appConfig = (0, config_1.registerAs)('app', () => ({
    masjidLatitude: parseFloat(process.env.MASJID_LATITUDE ?? '49.2514'),
    masjidLongitude: parseFloat(process.env.MASJID_LONGITUDE ?? '-122.7740'),
    masjidTimezone: process.env.MASJID_TIMEZONE ?? 'America/Vancouver',
    upstashRedisUrl: process.env.UPSTASH_REDIS_URL,
    upstashRedisToken: process.env.UPSTASH_REDIS_TOKEN,
    databaseUrl: process.env.DATABASE_URL,
}));
//# sourceMappingURL=app.config.js.map