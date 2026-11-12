"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const app_module_1 = require("./app.module");
const app_setup_1 = require("./app.setup");
const tzdata_guard_1 = require("./config/tzdata-guard");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    (0, tzdata_guard_1.warnIfStaleTzdata)(app.get(config_1.ConfigService).get('app.masjidTimezone') ?? '');
    (0, app_setup_1.configureApp)(app);
    await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
//# sourceMappingURL=main.js.map