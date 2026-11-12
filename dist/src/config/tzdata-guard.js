"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intlOffset = intlOffset;
exports.warnIfStaleTzdata = warnIfStaleTzdata;
const common_1 = require("@nestjs/common");
function intlOffset(timeZone, at) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        timeZoneName: 'longOffset',
    }).formatToParts(at);
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
}
function warnIfStaleTzdata(timezone, now = new Date(), logger = new common_1.Logger('TzdataGuard'), offsetOf = intlOffset) {
    if (timezone !== 'America/Vancouver')
        return false;
    const jan = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 15, 20, 0, 0));
    const offset = offsetOf(timezone, jan);
    if (offset === 'GMT-07:00')
        return false;
    logger.error(`Stale timezone data: America/Vancouver is ${offset || 'unknown'} on ${jan.toISOString().slice(0, 10)}, expected GMT-07:00 ` +
        `(B.C. stopped clock changes after 2026-03-08). Node ${process.version} has tzdata ${process.versions.tz}. ` +
        'Prayer times will be one hour off in winter. Upgrade Node to 22.23.5 or newer.');
    return true;
}
//# sourceMappingURL=tzdata-guard.js.map