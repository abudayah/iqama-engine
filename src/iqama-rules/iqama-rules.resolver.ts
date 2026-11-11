import {
  IqamaRuleVersionRecord,
  IqamaRulesMode,
  RuleSet,
} from './iqama-rules.types';

export interface ParsedRuleVersion {
  id: number;
  effectiveFrom: string;
  rules: RuleSet;
}

/** Parse stored versions once; skips (and reports) rows with invalid JSON. */
export function parseRuleVersions(
  versions: Pick<IqamaRuleVersionRecord, 'id' | 'effectiveFrom' | 'settings'>[],
  onBad?: (id: number) => void,
): ParsedRuleVersion[] {
  const out: ParsedRuleVersion[] = [];
  for (const v of versions) {
    try {
      out.push({
        id: v.id,
        effectiveFrom: v.effectiveFrom,
        rules: JSON.parse(v.settings) as RuleSet,
      });
    } catch {
      onBad?.(v.id);
    }
  }
  return out;
}

/**
 * Active rule set for a date: greatest effectiveFrom <= date
 * (ties: higher id wins). Undefined when no version covers the date.
 */
export function resolveRuleSet(
  date: string,
  versions: ParsedRuleVersion[],
): RuleSet | undefined {
  let best: ParsedRuleVersion | undefined;
  for (const v of versions) {
    if (v.effectiveFrom > date) continue;
    if (
      !best ||
      v.effectiveFrom > best.effectiveFrom ||
      (v.effectiveFrom === best.effectiveFrom && v.id > best.id)
    )
      best = v;
  }
  return best?.rules;
}

/** Anything but 'shadow' or 'db' means 'legacy'. */
export function parseIqamaRulesMode(v: unknown): IqamaRulesMode {
  return v === 'shadow' || v === 'db' ? v : 'legacy';
}
