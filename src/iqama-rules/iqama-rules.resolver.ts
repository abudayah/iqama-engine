import { HttpException } from '@nestjs/common';
export {
  DEFAULT_IQAMA_RULES_CUTOVER,
  parseCutover,
} from './iqama-rules.cutover';
import { validateRuleSet } from './iqama-rules.validator';
import {
  IqamaRuleVersionRecord,
  IqamaRulesMode,
  RuleSet,
  ValidationIssue,
} from './iqama-rules.types';

/** Anything but 'shadow' or 'db' means 'legacy'. */
export function parseIqamaRulesMode(v: unknown): IqamaRulesMode {
  return v === 'shadow' || v === 'db' ? v : 'legacy';
}

/**
 * Explicit failure instead of a silent fallback to legacy rules (HTTP 500).
 *  IQAMA_RULES_MISSING: no stored version covers a date on or after the cutover.
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
 * Active version for a date: greatest effectiveFrom <= date
 * (ties: higher id wins). Undefined when no version covers the date.
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
  return best;
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
