/**
 * seed-iqama-rules.ts
 *
 * Seeds IqamaRuleVersion #1 (effectiveFrom 1970-01-01) with the rules that
 * reproduce today's hard-coded iqama behaviour. Idempotent.
 *
 * Run: npx ts-node prisma/seed-iqama-rules.ts
 * (also chained from `npx prisma db seed`, see prisma.config.ts)
 */

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { seedIqamaRules } from '../src/iqama-rules/iqama-rules.seed-db';

const DATABASE_URL = process.env['DATABASE_URL'] ?? 'file:./prisma/db.sqlite';

const adapter = new PrismaLibSql({ url: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

seedIqamaRules(prisma)
  .then((created) =>
    console.log(
      created
        ? 'Iqama rules seeded (version 1).'
        : 'IqamaRuleVersion already seeded — skipping.',
    ),
  )
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
