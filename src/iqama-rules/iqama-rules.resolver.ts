import { HttpException } from '@nestjs/common';
import { validateRuleSet } from './iqama-rules.validator';
import {
  IqamaRuleVersionRecord,
  RuleSet,
  ValidationIssue,
} from './iqama-rules.types';

/**
 * Explicit failure instead of a silent fallback (HTTP 500).
 *  IQAMA_RULES_MISSING: there is no stored rule version at all.
 *  IQAMA_RULES_INVALID: the stored JSON is unreadable or fails validation.
 */
export class IqamaRulesError extends HttpException {
  constructor(
    readonly code: 'IQAMA_RULES_MISSING' | 'IQAMA_RULES_INVALID',
    message: string,
    readonly issues?: ValidationIssue[],
  ) {
    super({ statusCode: 500, code, message, issues }, 500);
  }
}

type VersionRow = Pick<
  IqamaRuleVersionRecord,
  'id' | 'effectiveFrom' | 'settings'
>;

/**
 * Active version for a date: greatest effectiveFrom <= date (ties: higher id
 * wins). A date before the first version uses the earliest version, so past
 * dates keep working. Undefined only when there are no versions at all.
 */
export function resolveRuleVersion<T extends VersionRow>(
  date: string,
  versions: T[],
): T | undefined {
  let best: T | undefined;
  for (const v of versions) {
    if (v.effectiveFrom > date) continue;
    if (
      !best ||
      v.effectiveFrom > best.effectiveFrom ||
      (v.effectiveFrom === best.effectiveFrom && v.id > best.id)
    )
      best = v;
  }
  if (best) return best;
  // Before the first version: the earliest one (lowest effectiveFrom, then id).
  let earliest: T | undefined;
  for (const v of versions) {
    if (
      !earliest ||
      v.effectiveFrom < earliest.effectiveFrom ||
      (v.effectiveFrom === earliest.effectiveFrom && v.id < earliest.id)
    )
      earliest = v;
  }
  return earliest;
}

/** Parse and validate a stored version (runtime validator, not a cast). */
export function loadRuleSet(version: VersionRow): RuleSet {
  let parsed: unknown;
  try {
    parsed = JSON.parse(version.settings);
  } catch {
    throw new IqamaRulesError(
      'IQAMA_RULES_INVALID',
      `IqamaRuleVersion ${version.id} is not valid JSON`,
    );
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new IqamaRulesError(
      'IQAMA_RULES_INVALID',
      `IqamaRuleVersion ${version.id} is not a rule set`,
    );
  }
  const { errors } = validateRuleSet(parsed as RuleSet);
  if (errors.length > 0) {
    throw new IqamaRulesError(
      'IQAMA_RULES_INVALID',
      `IqamaRuleVersion ${version.id} fails validation: ${errors
        .map((e) => `${e.path} ${e.message}`)
        .join('; ')}`,
      errors,
    );
  }
  return parsed as RuleSet;
}
