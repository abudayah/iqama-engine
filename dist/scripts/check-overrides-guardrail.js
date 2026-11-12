"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/prisma/prisma.service");
const schedule_builder_service_1 = require("../src/schedule-builder/schedule-builder.service");
const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ['error'],
    });
    const prisma = app.get(prisma_service_1.PrismaService);
    const builder = app.get(schedule_builder_service_1.ScheduleBuilderService);
    const overrides = await prisma.override.findMany({
        where: { deletedAt: null },
    });
    console.log(`Checking ${overrides.length} active override(s)...`);
    const months = new Set();
    for (const o of overrides) {
        const start = o.startDate.toISOString().slice(0, 10);
        const end = o.endDate.toISOString().slice(0, 10);
        for (let m = start.slice(0, 7); m <= end.slice(0, 7);) {
            months.add(m);
            const [y, mo] = m.split('-').map(Number);
            m = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
        }
    }
    let clamped = 0;
    for (const month of [...months].sort()) {
        for (const day of await builder.buildMonth(month)) {
            for (const o of overrides) {
                const prayer = o.prayer;
                const covers = day.date >= o.startDate.toISOString().slice(0, 10) &&
                    day.date <= o.endDate.toISOString().slice(0, 10);
                if (!covers || !PRAYERS.includes(prayer))
                    continue;
                if (day[prayer].iqama_clamped) {
                    clamped++;
                    console.log(`override #${o.id} ${prayer} ${o.overrideType} ${o.value}: ${day.date} azan ${day[prayer].azan} -> iqama ${day[prayer].iqama} (clamped)` +
                        (prayer === 'fajr' ? `, sunrise ${day.sunrise}` : ''));
                }
            }
        }
    }
    console.log(clamped === 0
        ? 'No override would be clamped.'
        : `${clamped} override day(s) would be clamped.`);
    await app.close();
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=check-overrides-guardrail.js.map