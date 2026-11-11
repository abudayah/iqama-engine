---
inclusion: fileMatch
fileMatchPattern: '{src/iqama-rules/**,src/schedule-builder/**,src/override/**,prisma/seed*,scripts/**}'
---

# Iqama Rules System (admin-configurable rules)

Iqama rules are data, not code. A rule set (one rule per prayer) is stored in the `IqamaRuleVersion` table and evaluated by a pure evaluator. The legacy `src/rules/*.rule.ts` functions still exist and are the oracle for the golden-master test until legacy is deleted (see `.kiro/specs/iqama-rules-admin/tasks.md`).

## Pipeline (fixed order, per prayer)

```
base -> modifiers -> admin override -> hard guardrails
```

1. **Base** (one of):
   - `OFFSET` — Azan + N minutes (-120..120)
   - `FIXED_TIME` — a clock time `HH:mm`
   - `SCALED_GAP` — gap after Azan scales linearly with Azan time between points (flat outside them)
   - `SEASONAL` — yearly segments starting on a calendar date (`DATE`) or on the first Friday of a month (`FIRST_FRIDAY`); the last segment wraps over New Year
2. **Modifiers** (fixed order): `limits` (min after Azan; Fajr only: latest = sunrise − N) → `rounding` (CEIL/FLOOR/NEAREST, step 1/5/10/15/30/60) → `weekdayAdjust` (e.g. `FRI: -5`) → `weeklyLock` (hold the Friday→Thursday result; latest per-day wins; Fajr and Isha use it today).
3. **Override** — admin FIXED/OFFSET override (existing `OverrideService`, rounded up to 5 min). Overrides are short exceptions.
4. **Guardrails** — constants in `src/rules/iqama-guardrail.ts`. No admin setting. They run on every path including overrides. A changed time sets `iqama_clamped: true` on that prayer.

## The fixed rules

1. Iqama is at least **Azan + 3 min** (raised to the first 5-min mark at or after Azan + 3), overrides included.
2. **Fajr** Iqama ends at least **60 min before sunrise** (also for overrides). If it conflicts with rule 1, rule 1 wins.
3. **Fajr, Dhuhr, Asr and Isha** may only change on a **Friday**. A non-Friday `effectiveFrom` is a validation error when one of those four rules changes.
4. **Maghrib** may start on any day and has no weekly lock.

`weeklyLock` is a computation switch; the Friday-start rule (3) applies to the four prayers whether or not their `weeklyLock` is on.

## Today's rules (seed, version 1, effectiveFrom 1970-01-01)

| Prayer  | Rule                                                                                                                   |
| ------- | ---------------------------------------------------------------------------------------------------------------------- |
| Fajr    | OFFSET 75, min after Azan 10, latest sunrise − 60, CEIL 5, weekly lock                                                 |
| Dhuhr   | FIXED_TIME 13:45, Friday −5 (13:40). B.C. no longer changes clocks, so no DST logic.                                   |
| Asr     | SEASONAL: Jan first Friday 16:00, Mar 15 18:00, Sep first Friday 17:00, Oct first Friday 16:30, Nov first Friday 15:45 |
| Maghrib | OFFSET 5, CEIL 5                                                                                                       |
| Isha    | SCALED_GAP 15 min at 20:00 → 5 min at 22:00, min after Azan 3, FLOOR 5, weekly lock                                    |

Known effect: with clocks fixed at UTC-7, the Asr 16:00 "Late Winter" segment is below the 3-minute floor from 2027-02-11 to 2027-03-14 (32 days). The guardrail raises those days (`iqama_clamped: true`); the rule was deliberately not redesigned.

## Code map (`src/iqama-rules/`)

- `iqama-rules.types.ts` — rule model types, `LOCKABLE_PRAYERS`
- `iqama-rules.evaluator.ts` — pure `evaluateRule`, `evaluateIqama` (rule → override → guardrail)
- `iqama-rules.validator.ts` — `validateRuleSet(rules, effectiveFrom?, previous?)` → errors + warnings
- `iqama-rules.catalog.ts` — `RANGES` (single source for validator and API) and `RULE_CATALOG`
- `iqama-rules.resolver.ts` — pick the version for a date; `IQAMA_RULES` parsing
- `iqama-rules.seed.ts` / `iqama-rules.seed-db.ts` — default rules / idempotent DB seed
- `iqama-rules.service.ts`, `.controller.ts`, `.module.ts`, `dto/` — admin API
- Golden master: `iqama-rules.golden.spec.ts` (new evaluator vs legacy functions, every day 2026–2035)

## IQAMA_RULES flag (read in `ScheduleBuilderService`)

| Value                                 | Behaviour                                                                              |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| `legacy` (default; any unknown value) | Old `src/rules` functions. DB rules are never read.                                    |
| `shadow`                              | Computes both, logs `[iqama shadow] <date> <prayer>: legacy=… db=…`, serves legacy.    |
| `db`                                  | Serves the DB rules. If no version covers a date, falls back to legacy with a warning. |

Overrides and guardrails apply in all three modes.

## Admin API — `/api/v1/admin/iqama-rules` (header `X-API-Key`, same guard as adhan-config)

| Method | Path       | Purpose                                                                                                                               |
| ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/`        | mode, current revision, all versions, rules effective today, default `effectiveFrom`                                                  |
| GET    | `/catalog` | rule types, fields, ranges, fixed guardrails (for the UI to render forms)                                                             |
| POST   | `/preview` | real days current vs proposed (14 sample days) + 365-day summary (days changed/clamped, first dates, per prayer); returns `previewId` |
| PUT    | `/base`    | save a new version. Needs `previewId` and `expectedRevision`. Default `effectiveFrom` = next Friday strictly after today              |

Save rules: 400 for invalid JSON/rules, a past date, a date earlier than the latest version, or a non-Friday start for a changed Fajr/Dhuhr/Asr/Isha. 409 for a stale `expectedRevision`. 422 for a missing, expired, reused or mismatched preview token. Versions are append-only. Saving invalidates the schedule cache.

## Schedule response

`iqama_clamped?: boolean` is added (only when true) on each prayer entry (`fajr`, `dhuhr`, `asr`, `maghrib`, `isha`) when a guardrail changed the Iqama.

## Operations

- Cutover steps: `docs/iqama-rules-cutover-runbook.md`
- Check existing overrides against the guardrail: `npx ts-node scripts/check-overrides-guardrail.ts` (read-only)
- `npx prisma db seed` runs `prisma/seed.ts`, which seeds Adhan config and Iqama rules (both idempotent)
