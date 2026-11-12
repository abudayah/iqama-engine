/**
 * One-off, read-only: list active overrides that overlap another active
 * override for the SAME prayer. (Different prayers may overlap.)
 * Where two overlap, the NEWEST one wins; the older one is shadowed on the
 * shared days. Nothing is changed or deleted.
 *
 *   npx ts-node scripts/report-override-overlaps.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const ymd = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  const prisma = app.get(PrismaService);
  const all = await prisma.override.findMany({
    where: { deletedAt: null },
    orderBy: [{ prayer: 'asc' }, { startDate: 'asc' }],
  });

  let pairs = 0;
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i];
      const b = all[j];
      if (a.prayer !== b.prayer) continue;
      const from =
        ymd(a.startDate) > ymd(b.startDate) ? a.startDate : b.startDate;
      const to = ymd(a.endDate) < ymd(b.endDate) ? a.endDate : b.endDate;
      if (ymd(from) > ymd(to)) continue;
      pairs++;
      const newer = a.createdAt >= b.createdAt ? a : b;
      const older = newer === a ? b : a;
      console.log(
        `${a.prayer}: #${older.id} (${older.overrideType} ${older.value}, ${ymd(older.startDate)}..${ymd(older.endDate)}) overlaps ` +
          `#${newer.id} (${newer.overrideType} ${newer.value}, ${ymd(newer.startDate)}..${ymd(newer.endDate)}) ` +
          `on ${ymd(from)}..${ymd(to)}; newest (#${newer.id}) wins`,
      );
    }
  }
  console.log(
    pairs === 0
      ? `No overlapping overrides among ${all.length} active override(s).`
      : `${pairs} overlapping pair(s) among ${all.length} active override(s).`,
  );
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
