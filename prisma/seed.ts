/**
 * seed.ts — entry point for `prisma db seed` (see prisma.config.ts).
 * Runs each idempotent seed script one after the other.
 * (Prisma does not run a shell, so `a && b` cannot be used in the config.)
 */
import { execFileSync } from 'child_process';
import { join } from 'path';

for (const script of ['seed-adhan-config.ts', 'seed-iqama-rules.ts']) {
  execFileSync(
    process.execPath,
    [require.resolve('ts-node/dist/bin.js'), join(__dirname, script)],
    { stdio: 'inherit' },
  );
}
