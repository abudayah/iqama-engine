import { DEFAULT_RULE_SET } from './iqama-rules.seed';
import { DEFAULT_IQAMA_RULES_CUTOVER } from './iqama-rules.cutover';

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
 * Create version 1 from DEFAULT_RULE_SET, effective from the cutover date
 * (IQAMA_RULES_CUTOVER, a Friday). Earlier dates keep the legacy rules.
 * Idempotent: does nothing when any version already exists.
 * Returns true when it created the row.
 */
export async function seedIqamaRules(
  prisma: IqamaRuleSeedClient,
  effectiveFrom: string = DEFAULT_IQAMA_RULES_CUTOVER,
): Promise<boolean> {
  if ((await prisma.iqamaRuleVersion.count()) > 0) return false;
  await prisma.iqamaRuleVersion.create({
    data: {
      effectiveFrom,
      settings: JSON.stringify(DEFAULT_RULE_SET),
      createdBy: 'seed',
      reason: 'Initial rules (same as the legacy rules)',
    },
  });
  return true;
}
