"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureApp = configureApp;
const common_1 = require("@nestjs/common");
const helmet_1 = __importDefault(require("helmet"));
const trust_proxy_1 = require("./config/trust-proxy");
function configureApp(app) {
    const trustProxy = (0, trust_proxy_1.parseTrustProxy)(process.env.TRUST_PROXY);
    if ((0, trust_proxy_1.isUnsafeTrustProxy)(trustProxy)) {
        new common_1.Logger('TrustProxy').warn(trust_proxy_1.UNSAFE_TRUST_PROXY_WARNING);
    }
    app.set('trust proxy', trustProxy);
    app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
    app.use((_req, res, next) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        next();
    });
    const rawOrigin = process.env.CORS_ORIGIN ?? '';
    if (rawOrigin) {
        const origins = rawOrigin
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean);
        app.enableCors({
            origin: origins.length === 1 && origins[0] === '*' ? '*' : origins,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'x-api-key', 'Cache-Control'],
            credentials: false,
        });
    }
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
    }));
}
//# sourceMappingURL=app.setup.js.map