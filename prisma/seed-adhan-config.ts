/**
 * seed-adhan-config.ts
 *
 * Seeds the initial Adhan configuration that exactly reproduces the
 * previous hard-coded adapter behaviour:
 *   - Method: NorthAmerica (ISNA, 15°/15°)
 *   - Madhab: Shafi
 *   - High latitude rule: TwilightAngle
 *   - Isha offset: -6 min for May–Jul (as a period, NOT a method adjustment)
 *
 * Run: npx ts-node prisma/seed-adhan-config.ts
 * Or add to package.json prisma.seed and run: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const DATABASE_URL = process.env['DATABASE_URL'] ?? 'file:./prisma/db.sqlite';

const adapter = new PrismaLibSql({ url: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Idempotent: only seed if no version exists
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
      reason: 'Initial seed — matches previous hardcoded ISNA configuration',
      createdBy: 'seed',
    },
  });

  // ─── Summer Isha -6 offset period (seed current and next year) ────────────
  // This reproduces the `params.methodAdjustments.isha = -6` for May–Jul
  // that was previously hardcoded in the adapter for this latitude.
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
