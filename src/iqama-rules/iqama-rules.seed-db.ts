import { DEFAULT_RULE_SET } from './iqama-rules.seed';

/** First date of seeded version 1 (a Friday). Production was seeded with this date. */
export const SEED_EFFECTIVE_FROM = '2026-11-13';

/** Minimal slice of the Prisma client used by the seed (keeps it testable). */
export interface IqamaRuleSeedClient {
  iqamaRuleVersion: {
    count(): Promise<number>;
    create(args: {
      data: {
        effectiveFrom: string;
        settings: string;
        createdBy: string;
        reason?: string;
      };
    }): Promise<unknown>;
  };
}

/**
 * Create version 1 from DEFAULT_RULE_SET, effective from `effectiveFrom` (a Friday).
 * Dates before it use this earliest version.
 * Idempotent: does nothing when any version already exists.
 * Returns true when it created the row.
 */
export async function seedIqamaRules(
  prisma: IqamaRuleSeedClient,
  effectiveFrom: string = SEED_EFFECTIVE_FROM,
): Promise<boolean> {
  if ((await prisma.iqamaRuleVersion.count()) > 0) return false;
  await prisma.iqamaRuleVersion.create({
    data: {
      effectiveFrom,
      settings: JSON.stringify(DEFAULT_RULE_SET),
      createdBy: 'seed',
      reason: 'Initial rules',
    },
  });
  return true;
}
