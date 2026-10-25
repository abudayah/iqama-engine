"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_libsql_1 = require("@prisma/adapter-libsql");
const DATABASE_URL = process.env['DATABASE_URL'] ?? 'file:./prisma/db.sqlite';
const adapter = new adapter_libsql_1.PrismaLibSql({ url: DATABASE_URL });
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    const existing = await prisma.adhanConfigVersion.count();
    if (existing > 0) {
        console.log('AdhanConfigVersion already seeded — skipping.');
        return;
    }
    const baseSettings = {
        general: {
            method: 'NorthAmerica',
            madhab: 'shafi',
            highLatitudeRule: 'TwilightAngle',
            polarCircleResolution: 'Unresolved',
            rounding: 'Nearest',
        },
        prayers: {},
    };
    await prisma.adhanConfigVersion.create({
        data: {
            effectiveFrom: '1970-01-01',
            settings: JSON.stringify(baseSettings),
            createdBy: 'seed',
        },
    });
    const ishaOffsetSettings = {
        prayers: {
            isha: { offsetMinutes: -6 },
        },
    };
    const currentYear = new Date().getFullYear();
    for (const year of [currentYear, currentYear + 1]) {
        const existing = await prisma.adhanConfigPeriod.findFirst({
            where: {
                label: `Summer Isha Adjustment ${year}`,
                deletedAt: null,
            },
        });
        if (!existing) {
            await prisma.adhanConfigPeriod.create({
                data: {
                    label: `Summer Isha Adjustment ${year}`,
                    startDate: `${year}-05-01`,
                    endDate: `${year}-07-31`,
                    settings: JSON.stringify(ishaOffsetSettings),
                    createdBy: 'seed',
                },
            });
            console.log(`Created Summer Isha Adjustment period for ${year}`);
        }
    }
    console.log('Adhan config seeded successfully.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed-adhan-config.js.map