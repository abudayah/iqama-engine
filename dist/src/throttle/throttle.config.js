"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.THROTTLER_OPTIONS = exports.ADMIN_LIMIT_PER_MIN = exports.PUBLIC_LIMIT_PER_MIN = exports.THROTTLE_WINDOW_MS = void 0;
exports.isAdminRoute = isAdminRoute;
const constants_1 = require("@nestjs/common/constants");
const crypto_1 = require("crypto");
const api_key_guard_1 = require("../auth/api-key.guard");
exports.THROTTLE_WINDOW_MS = 60_000;
exports.PUBLIC_LIMIT_PER_MIN = 300;
exports.ADMIN_LIMIT_PER_MIN = 120;
function isAdminRoute(context) {
    const guards = [
        ...(Reflect.getMetadata(constants_1.GUARDS_METADATA, context.getHandler()) ?? []),
        ...(Reflect.getMetadata(constants_1.GUARDS_METADATA, context.getClass()) ?? []),
    ];
    return guards.includes(api_key_guard_1.ApiKeyGuard);
}
exports.THROTTLER_OPTIONS = [
    {
        name: 'default',
        ttl: exports.THROTTLE_WINDOW_MS,
        limit: exports.PUBLIC_LIMIT_PER_MIN,
        skipIf: isAdminRoute,
    },
    {
        name: 'admin',
        ttl: exports.THROTTLE_WINDOW_MS,
        limit: exports.ADMIN_LIMIT_PER_MIN,
        skipIf: (context) => !isAdminRoute(context),
        generateKey: (_context, tracker, name) => (0, crypto_1.createHash)('sha256').update(`${name}:${tracker}`).digest('hex'),
    },
];
//# sourceMappingURL=throttle.config.js.map