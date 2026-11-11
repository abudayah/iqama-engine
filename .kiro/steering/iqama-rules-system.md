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
2. **Modifiers** (fixed order): `limits` (min after Azan; Fajr only: latest = sunrise − N) → `rounding` (CEIL/FLOOR/NEAREST, step 5/10/15/30/60) → `weekdayAdjust` (e.g. `FRI: -5`) → `weeklyLock` (hold the Friday→Thursday result; latest per-day wins; Fajr and Isha use it today).
3. **Override** — admin FIXED/OFFSET override (existing `OverrideService`, rounded up to 5 min). Overrides are short exceptions. **The newest override for a prayer wins** where several cover a day. Creating or updating an override whose dates overlap an active override for the SAME prayer is rejected with 409 naming the clashing override (different prayers may overlap).
4. **Guardrails** — constants in `src/rules/iqama-guardrail.ts`. No admin setting. They run on every path including overrides. A changed time sets `iqama_clamped: true` on that prayer.

## The fixed rules

1. Iqama is at least **Azan + 3 min** (raised to the first 5-min mark at or after Azan + 3), overrides included.
2. **Fajr** Iqama ends at least **60 min before sunrise** (also for overrides). If it conflicts with rule 1, rule 1 wins.
3. **Fajr, Dhuhr, Asr and Isha** may only change on a **Friday**. A non-Friday `effectiveFrom` is a validation error when one of those four rules changes.
4. **Maghrib** may start on any day and has no weekly lock.
5. Every final Iqama lands on a **5-minute mark** (`IQAMA_STEP_MIN = 5`). Already on a mark: kept. Otherwise rounded **up**, or **down** when that prayer's own rule rounding mode is FLOOR (e.g. Isha); a floor never goes below Azan + 3 (it rounds up instead). Fajr: if rounding up would pass sunrise − 60, the last mark ≤ sunrise − 60 is used, but never below Azan + 3 (the gap wins). `iqama_clamped: true` only if the guardrail moved the time. The catalog exposes it as `guardrails.iqamaStepMinutes`; rule rounding steps must be multiples of 5 (5/10/15/30/60).

`weeklyLock` is a computation switch; the Friday-start rule (3) applies to the four prayers whether or not their `weeklyLock` is on.

## Cutover date and history

`IQAMA_RULES_CUTOVER` (default `2026-11-13`, a Friday) is the first date served by the DB rules. **Dates before it always use the legacy functions**, including the old Dhuhr DST logic (13:45 in DST, 12:45 in standard time; Friday −5), so past schedules do not change. From the cutover on, Dhuhr is the fixed 13:45 (Fri 13:40). The seed creates version 1 with `effectiveFrom` = the cutover (a database seeded earlier keeps its older row; the cutover is configuration, so it still applies).

## Today's rules (seed, version 1, effectiveFrom = cutover)

| Prayer  | Rule                                                                                                                   |
| ------- | ---------------------------------------------------------------------------------------------------------------------- |
| Fajr    | OFFSET 75, min after Azan 10, latest sunrise − 60, CEIL 5, weekly lock                                                 |
| Dhuhr   | FIXED_TIME 13:45, Friday −5 (13:40). B.C. no longer changes clocks, so no DST logic (from the cutover).                |
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

| Value                                 | Behaviour                                                                                                                                                                                                                                                                          |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `legacy` (default; any unknown value) | Old `src/rules` functions. DB rules are never read.                                                                                                                                                                                                                                |
| `shadow`                              | Computes both, logs `[iqama shadow] <date> <prayer>: legacy=… db=…`, serves legacy.                                                                                                                                                                                                |
| `db`                                  | Serves the DB rules from the cutover. **No silent fallback:** if no version covers a date on or after the cutover, or the stored JSON is unreadable or fails the validator, the request fails with HTTP 500 and code `IQAMA_RULES_MISSING` or `IQAMA_RULES_INVALID` (also logged). |

Overrides and guardrails apply in all three modes. Before the cutover every mode serves legacy. In `shadow`, a missing or invalid version is logged as an error and legacy is still served (shadow never breaks the schedule).

## Admin API — `/api/v1/admin/iqama-rules` (header `X-API-Key`, same guard as adhan-config)

| Method | Path       | Purpose                                                                                                                               |
| ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/`        | mode, current revision, all versions, rules effective today, default `effectiveFrom`                                                  |
| GET    | `/catalog` | rule types, fields, ranges, fixed guardrails (for the UI to render forms)                                                             |
| POST   | `/preview` | real days current vs proposed (14 sample days) + 365-day summary (days changed/clamped, first dates, per prayer); returns `previewId` |
| PUT    | `/base`    | save a new version. Needs `previewId` and `expectedRevision`. Default `effectiveFrom` = next Friday strictly after today              |

Save rules: 400 for invalid JSON/rules, a past date, a date earlier than the latest version, or a non-Friday start for a changed Fajr/Dhuhr/Asr/Isha. 409 for a stale `expectedRevision`. 422 for a missing, expired, reused or mismatched preview token, and 422 `IQAMA_CONFLICTS_NOT_ACKNOWLEDGED` when the preview listed Fajr conflicts and `acknowledgeConflicts: true` was not sent (the token is kept, so the admin can retry). Optional `reason` (string, max 500) is stored with the version and returned in `GET` versions. There is no `who` field: the admin password is shared. Versions are append-only. Saving invalidates the schedule cache.

## Schedule response

`iqama_clamped?: boolean` is added (only when true) on each prayer entry (`fajr`, `dhuhr`, `asr`, `maghrib`, `isha`) when a guardrail changed the Iqama.

`iqama_conflict?: boolean` is added (only when true) on `fajr` when Azan + 3 minutes forces Fajr to end less than 60 minutes before sunrise. The gap wins, as before, but the day is flagged. `POST /preview` returns these days in `conflicts` (`date`, `prayer`, `azan`, `sunrise`, `iqama`, `brokenLimit`, `wonBy`; up to 100, total in `summary.conflictDays`), and `PUT /base` needs `acknowledgeConflicts: true` when there are any.

## Operations

- Cutover steps: `docs/iqama-rules-cutover-runbook.md`
- Check existing overrides against the guardrail: `npx ts-node scripts/check-overrides-guardrail.ts` (read-only)
- List overrides that overlap for the same prayer: `npx ts-node scripts/report-override-overlaps.ts` (read-only; deletes nothing; the newest override wins on shared days)
- `npx prisma db seed` runs `prisma/seed.ts`, which seeds Adhan config and Iqama rules (both idempotent)
