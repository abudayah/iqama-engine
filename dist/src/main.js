"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const rawOrigin = process.env.CORS_ORIGIN ?? '';
    if (rawOrigin) {
        const origins = rawOrigin
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean);
        app.enableCors({
            origin: origins.length === 1 && origins[0] === '*' ? '*' : origins,
            methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'x-api-key'],
            credentials: false,
        });
    }
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
    }));
    await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
//# sourceMappingURL=main.js.map