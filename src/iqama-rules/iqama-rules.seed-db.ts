import { DEFAULT_RULE_SET } from './iqama-rules.seed';

/** Minimal slice of the Prisma client used by the seed (keeps it testable). */
export interface IqamaRuleSeedClient {
  iqamaRuleVersion: {
    count(): Promise<number>;
    create(args: {
      data: { effectiveFrom: string; settings: string; createdBy: string };
    }): Promise<unknown>;
  };
}

/**
 * Create version 1 (effectiveFrom 1970-01-01) from DEFAULT_RULE_SET.
 * Idempotent: does nothing when any version already exists.
 * Returns true when it created the row.
 */
export async function seedIqamaRules(
  prisma: IqamaRuleSeedClient,
): Promise<boolean> {
  if ((await prisma.iqamaRuleVersion.count()) > 0) return false;
  await prisma.iqamaRuleVersion.create({
    data: {
      effectiveFrom: '1970-01-01',
      settings: JSON.stringify(DEFAULT_RULE_SET),
      createdBy: 'seed',
    },
  });
  return true;
}
