# Design Document — Iqama Rules Admin

## Overview

Rules move from code to versioned JSON, evaluated by a pure function. The schedule builder picks the engine from the `IQAMA_RULES` flag. Guardrails are shared constants that wrap every path.

```
Azan + sunrise (config-resolved)
        │
        ▼
  base ──► modifiers ──► override ──► guardrails ──► iqama (+ iqama_clamped)
 (rule)   (limits →       (existing     (constants in
           rounding →      OverrideService) iqama-guardrail.ts)
           weekday adjust →
           weekly lock)
```

## Key Design Decisions

- **Guardrails are not rules.** `src/rules/iqama-guardrail.ts` exports `MIN_IQAMA_GAP_MIN = 3`, `FAJR_SUNRISE_BUFFER_MIN = 60`, `IQAMA_STEP_MIN = 5` and `guardrailMinutes`. The builder applies them after overrides for all five prayers; the evaluator uses the same function. Nothing is stored or editable.
- **Min gap wins** over the Fajr sunrise cap: an Iqama before the Azan is never acceptable.
- **Pure evaluator** (`iqama-rules.evaluator.ts`) works in minutes since midnight. Inputs are a `DayCtx` (`date`, `azanMin`, `sunriseMin?`) and, for weekly lock, the Friday→Thursday window. No dayjs, no I/O.
- **Modifier order** inside a day: min-after-Azan raises the target, the sunrise limit caps it (limit wins), rounding applies, and if rounding broke a limit it steps back the other way (Isha's FLOOR falls back to CEIL when below the minimum). Then weekday adjust. Weekly lock last: latest per-day result of the window, capped by the smallest sunrise limit of the window and floored to the rounding step.
- **SEASONAL** resolves each segment's start for the date's year (first Friday computed at runtime) and takes the latest started segment; before the first segment of the year the last segment still runs (New Year wrap).
- **Weekly lock vs Friday start.** `weeklyLock` only changes how the day's time is computed (Fajr, Isha today). The Friday-start validation applies to all of Fajr, Dhuhr, Asr and Isha when their rule changes, regardless of `weeklyLock`. The validator compares against the previous version so unchanged prayers are not blocked.
- **Versions are append-only**, mirroring `AdhanConfigVersion`; a rule set holds all five prayers, so one save is one version. `effectiveFrom` may not be earlier than the latest existing version.
- **Preview builds real days.** `ScheduleBuilderService.buildMonth(month, { rules })` accepts `'legacy'` or an in-memory list of versions, so preview compares the actual schedule (including overrides and guardrails) for current and proposed rules over 365 days, without touching the flag or the DB.
- **Preview token / optimistic locking** copy the adhan-config scheme: in-memory token (10 min, single use) bound to a hash of settings, `effectiveFrom` and revision; `expectedRevision` must equal the newest version id.
- **Flag in the builder, per call.** `legacy` never reads the rules table. `shadow` computes both from the same raw Azan data and logs differences before overrides/guardrails; `db` falls back to legacy (warning) when no version covers a date.
- **Weekly context** keeps full raw times for the 7 days (`rawWeek`), built from the config-resolved adapter, so any prayer can use the weekly lock.
- **Overrides** are fetched once per month (`getOverridesForRange`) and filtered per day in memory.
- **Cutover.** `IQAMA_RULES_CUTOVER` (default 2026-11-13) is configuration, not data. `ScheduleBuilderService` uses the legacy functions for earlier dates in every mode; `computeDhuhrIqama(date, tz, cutover)` keeps the DST logic before it. The rule table is therefore only consulted from the cutover on. `iqama-rules.cutover.ts` has no imports so the seed script can load it with plain ts-node.
- **No silent fallback.** `ruleSetFor(date)` in the builder resolves the covering version and runs `loadRuleSet` (JSON parse + `validateRuleSet`, not a cast), cached per version per build. Problems throw `IqamaRulesError` (HTTP 500, code `IQAMA_RULES_MISSING` | `IQAMA_RULES_INVALID`) in `db` mode; in `shadow` they are logged and legacy is served.
- **Override precedence.** `applyOverrides` sorts by `createdAt`, `id` ascending, so the newest is applied last. `OverrideService.assertNoOverlap` (raw SQL on the YYYY-MM-DD prefix, same prayer, active only) guards create and update.
- **Fajr conflict.** After the guardrail the builder compares the final Fajr with sunrise − 60; if it is later, the entry gets `iqama_conflict`. The preview stores the conflict count with its token so `PUT /base` can demand `acknowledgeConflicts` without rescanning.
- **Seed** is a function over a minimal Prisma slice (`seedIqamaRules`) so it is unit-testable; `prisma/seed.ts` runs the Adhan and Iqama seeds one after the other because Prisma does not run a shell for `a && b`.

## Components

| File (under `src/`)                                                   | Responsibility                                                      |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `iqama-rules/iqama-rules.types.ts`                                    | Rule model, `DayCtx`, validation types                              |
| `iqama-rules/iqama-rules.evaluator.ts`                                | `evaluateRule`, `evaluateIqama`, `firstFriday`, `toDayCtx`          |
| `iqama-rules/iqama-rules.validator.ts`                                | `validateRuleSet(rules, effectiveFrom?, previous?)`                 |
| `iqama-rules/iqama-rules.catalog.ts`                                  | `RANGES`, `RULE_CATALOG`                                            |
| `iqama-rules/iqama-rules.resolver.ts`                                 | Version lookup, JSON parse, flag parsing                            |
| `iqama-rules/iqama-rules.seed.ts`, `.seed-db.ts`                      | Default rules, idempotent DB seed                                   |
| `iqama-rules/iqama-rules.service.ts`                                  | Config, catalog, preview, save                                      |
| `iqama-rules/iqama-rules.controller.ts`, `dto/`                       | `/api/v1/admin/iqama-rules`                                         |
| `rules/iqama-guardrail.ts`                                            | Guardrail constants and functions                                   |
| `schedule-builder/schedule-builder.service.ts`                        | Flag modes, guardrail application, month overrides, `iqama_clamped` |
| `prisma/schema.prisma`, migration `20261110000000_iqama_rule_version` | `IqamaRuleVersion`                                                  |
| `scripts/check-overrides-guardrail.ts`                                | One-off override check                                              |

## API

`GET /` → `{ mode, cutover, currentRevision, today, timezone, defaultEffectiveFrom, effective, latest, upcoming[], versions[] }` (see UI Contract)

`GET /catalog` → base types with fields and ranges, modifiers, pipeline, prayers (`weeklyLockAllowed`, `fridayStartRequired`, `sunriseLimitAllowed`), guardrails.

`POST /preview` `{ settings: string, effectiveFrom? }` → `{ previewId, currentRevision, effectiveFrom, warnings, days[14], summary }` where `summary = { from, to, totalDays, daysChanged, daysClamped, daysClampedCurrent, firstChangedDates, firstClampedDates, changedDays, movedNow, movedProposed, newlyMoved, newlyMovedDates, noLongerMoved, byPrayer }`; `byPrayer[p]` also carries the same moved counts (see the steering UI contract).

`PUT /base` `{ settings: string, effectiveFrom?, previewId, expectedRevision, reason?, acknowledgeConflicts?, requestHash? }` → the created version.

## UI Contract

The exact request/response shapes, field metadata and error codes the admin UI relies on are in `.kiro/steering/iqama-rules-system.md`, section "UI contract (exact shapes)". Decisions behind it:

- **Baseline is the newest version.** `GET /` returns `latest` (full rules, `versionId`, `effectiveFrom`, `createdAt`, `reason`), `effective` (in force today) and `upcoming[]`. A new version is built from `latest.rules`. The engine already rejects an `effectiveFrom` earlier than the newest version.
- **Preview binds to the request.** The token is tied to a `requestHash` (SHA-256 of the canonical RuleSet and `effectiveFrom`) and to the revision. `PUT /base` answers 422 `IQAMA_PREVIEW_MISMATCH` / `IQAMA_REVISION_STALE` / `IQAMA_PREVIEW_INVALID`; a stale `expectedRevision` stays 409.
- **Catalog carries field metadata** (`kind`, `required`, `min`, `max`, `integer`, `minItems`, `maxItems`, structured `options`, discriminated `variants`), so forms and validation need no hard-coded ranges. `default` exists only where safe. The `guardrails` block includes `fajrSunriseConflictPolicy: 'gap-wins-with-acknowledgement'`.
- **`iqama_conflict` is set on both the Fajr entry and the day**, so the day-level and prayer-level readings agree.

## Testing Strategy

- **Golden master** (`iqama-rules.golden.spec.ts`): the evaluator with the seed rules equals the legacy `*.rule.ts` functions for all five prayers, every day 2026–2035, before and after the guardrail, in `Etc/GMT+7` and `America/Vancouver`. Legacy functions are the oracle.
- **Guardrail**: unit tests plus a full-schedule test (2026–2035, three setups) that no Iqama is below Azan + 3 and Fajr ends ≥ 60 min before sunrise; override clamping; fast-check property over random overrides.
- **Evaluator / validator**: unit tests and fast-check properties (output ≥ Azan + 3, rounding invariants, range rejection).
- **Service, controller, flag modes, seed**: preview numbers, token/lock errors, Friday rules, legacy/shadow/db behaviour (db with seed rules equals legacy), seed idempotency.

## Known Risks

- Host timezone data must know that B.C. is UTC-7 all year; otherwise winter Azan times shift an hour. Checked in the cutover runbook.
- Asr "Late Winter 16:00" is clamped for 32 days in 2027 (Feb 11 – Mar 14) until the rule is changed by an admin.
