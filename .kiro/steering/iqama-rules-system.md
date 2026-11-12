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
2. **Modifiers** (fixed order): `limits` (min after Azan; Fajr only: Iqama at least N minutes before sunrise, i.e. latest time = sunrise − N) → `rounding` (CEIL/FLOOR/NEAREST, step 5/10/15/30/60) → `weekdayAdjust` (e.g. `FRI: -5`) → `weeklyLock` (hold the Friday→Thursday result; latest per-day wins; Fajr and Isha use it today).
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
| Fajr    | OFFSET 75, min after Azan 10, ends at least 60 min before sunrise, CEIL 5, weekly lock                                 |
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

| Method | Path       | Purpose                                                                                                                                |
| ------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/`        | mode, cutover, current revision, `effective` (today), `latest` (the baseline), `upcoming[]`, all `versions[]`, default `effectiveFrom` |
| GET    | `/catalog` | rule types, fields, ranges, fixed guardrails (for the UI to render forms)                                                              |
| POST   | `/preview` | real days current vs proposed (14 sample days) + 365-day summary (days changed/clamped, first dates, per prayer); returns `previewId`  |
| PUT    | `/base`    | save a new version. Needs `previewId` and `expectedRevision`. Default `effectiveFrom` = next Friday strictly after today               |

Save rules: 400 for invalid JSON/rules, a past date, a date earlier than the latest version, or a non-Friday start for a changed Fajr/Dhuhr/Asr/Isha. 409 for a stale `expectedRevision`. 422 with a `code` for a bad preview token (`IQAMA_PREVIEW_INVALID`, `IQAMA_PREVIEW_MISMATCH`, `IQAMA_REVISION_STALE`), and 422 `IQAMA_CONFLICTS_NOT_ACKNOWLEDGED` when the preview listed Fajr conflicts and `acknowledgeConflicts: true` was not sent (the token is kept, so the admin can retry). Optional `reason` (string, max 500) is stored with the version and returned in `GET` versions. There is no `who` field: the admin password is shared. Versions are append-only. Saving invalidates the schedule cache.

## Schedule response (see also the UI contract below)

`iqama_clamped?: boolean` is added (only when true) on each prayer entry (`fajr`, `dhuhr`, `asr`, `maghrib`, `isha`) when a guardrail changed the Iqama.

`iqama_conflict?: boolean` is added (only when true) on `fajr` AND on the day object when Azan + 3 minutes forces Fajr to end less than 60 minutes before sunrise. The gap wins, as before, but the day is flagged. `POST /preview` returns these days in `conflicts` (`date`, `prayer`, `azan`, `sunrise`, `iqama`, `brokenLimit`, `wonBy`; up to 100, total in `summary.conflictDays`), and `PUT /base` needs `acknowledgeConflicts: true` when there are any.

## UI contract (exact shapes)

Everything the admin UI may rely on. Dates are `YYYY-MM-DD`; times are `HH:mm`; `RuleSet` = `{ fajr, dhuhr, asr, maghrib, isha }`, each a `PrayerRule` (`base`, optional `limits`, `rounding`, `weekdayAdjust`, `weeklyLock`). Auth for all `/api/v1/admin/*` routes: header `x-api-key`.

**RuleSet serialization.** `settings` is a **JSON string** of the RuleSet in preview and save (`JSON.stringify(ruleSet)`). Key order and whitespace do not matter: the server hashes a canonical form (keys sorted).

**Baseline.** A new version must be built from `latest.rules` (the NEWEST version), never from `effective`. The engine rejects an `effectiveFrom` earlier than the newest version's date (400), so a version cannot be slipped in before a scheduled one. It cannot know what the UI meant to keep: a proposal built from `effective` would silently revert changes scheduled in an upcoming version; the preview would show it, nothing else stops it.

`GET /api/v1/admin/iqama-rules`

```
{ mode: 'legacy'|'shadow'|'db', cutover, currentRevision, today, timezone, defaultEffectiveFrom,
  effective: V | null,          // in force today; null before the cutover (legacy rules apply) or if no version
  latest:    V | null,          // the newest version = baseline; currentRevision === latest.versionId
  upcoming:  V[],               // versions with effectiveFrom > today, oldest first
  versions:  [{ id, effectiveFrom, createdAt, createdBy, reason, settings }] }   // all, oldest first
V = { versionId, effectiveFrom, createdAt, reason: string|null, rules: RuleSet|null, error: string|null }
```

`rules` is null and `error` set only if the stored JSON fails validation. `createdBy` is always `"admin"` (shared password), so the UI should not show it.

`GET /api/v1/admin/iqama-rules/catalog` returns `{ prayers, baseTypes, modifiers, pipeline, guardrails }`:

- `prayers[]`: `{ name, weeklyLockAllowed, fridayStartRequired, sunriseLimitAllowed }`
- `baseTypes[]`: `{ type, label, note?, fields: Field[] }` for `OFFSET`, `FIXED_TIME`, `SCALED_GAP`, `SEASONAL`
- `modifiers[]`: Field objects for `limits`, `rounding`, `weekdayAdjust`, `weeklyLock` (keys of the prayer rule)
- `guardrails`: `{ minGapAfterAzanMinutes: 3, fajrEndsBeforeSunriseMinutes: 60, iqamaStepMinutes: 5, fajrSunriseConflictPolicy: 'gap-wins-with-acknowledgement' }`
- `Field`: `{ name, label, kind: 'int'|'time'|'enum'|'list'|'object'|'bool', required, prayers?, default?, note? }` plus by kind: `int`: `min, max, integer: true`; `time`: `format: 'HH:mm'`; `enum`: `options: [{ value, label }]`; `list`: `minItems, maxItems, item: Field[]` (the fields of one item); `object`: `fields: Field[]`, or `discriminator` + `variants: [{ value, label, fields }]` (the Seasonal `start`: discriminator `kind`, variants `DATE` and `FIRST_FRIDAY`). `default` appears only where it is safe (`weeklyLock` false, rounding `step` 5); everything else has none and must be entered. The validator uses the same ranges (`RANGES` in `iqama-rules.catalog.ts`).

`POST /api/v1/admin/iqama-rules/preview` body `{ settings: string, effectiveFrom?: string }` (default: next Friday after today) →

```
{ previewId, effectiveFrom, currentRevision, requestHash, warnings: Issue[],
  conflicts: [{ date, prayer: 'fajr', azan, sunrise, iqama, brokenLimit, wonBy }],   // up to 100
  days: [{ date, day_of_week, prayers: { fajr|dhuhr|asr|maghrib|isha: { azan, current: { iqama, clamped }, proposed: { iqama, clamped } } } }],  // 14 days
  summary: { from, to, totalDays, daysChanged, daysClamped, daysClampedCurrent, conflictDays,
             firstChangedDates, firstClampedDates,
             ...Moved,                                   // totals: days where at least one prayer matches
             byPrayer: { <prayer>: { daysChanged, daysClamped, ...Moved } } } }
Moved = { changedDays, movedNow, movedProposed, newlyMoved, newlyMovedDates: string[] (first 10), noLongerMoved }
Issue = { path, message }
```

"Moved" means a guardrail changed the time (`iqama_clamped`). For one prayer on one day, with `current` = today's rules and `proposed` = the draft:

- `changedDays`: the Iqama time differs between current and proposed (same count as `daysChanged`).
- `movedNow`: moved today (`current.clamped`). `movedProposed`: moved under the proposal (`proposed.clamped`).
- `newlyMoved`: moved under the proposal AND (not moved today, OR moved to a different time). A day that is already moved and stays exactly the same is NOT newly moved, so an untouched prayer reports 0 (for example Asr from 2027-02-11 to 2027-03-14).
- `noLongerMoved`: moved today but not under the proposal.
- `newlyMovedDates`: the first 10 dates (ascending) with a newly moved time.

In `summary` (totals) each count is the number of days on which at least one prayer matches. The older fields (`daysChanged`, `daysClamped`, `daysClampedCurrent`, `firstChangedDates`, `firstClampedDates`, `byPrayer.*.daysChanged`, `byPrayer.*.daysClamped`) are unchanged. Use `newlyMoved` / `newlyMovedDates` for "this change causes new adjusted days" copy, not `daysClamped`.

`requestHash` = SHA-256 of (canonical RuleSet + `|` + `effectiveFrom`). The token `previewId` is valid for 10 minutes, once, and only for that hash and that `currentRevision`.

`PUT /api/v1/admin/iqama-rules/base` body `{ settings, effectiveFrom?, previewId, expectedRevision, reason?: string (max 500), acknowledgeConflicts?: boolean, requestHash?: string }` → the created row `{ id, effectiveFrom, settings, reason, createdBy, createdAt }`. Sending `requestHash` (from the preview) is optional and is checked against the body.

Errors (all JSON bodies carry `message`):

| Status | When                                                                                                                                                            | Body                                                                                 |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 400    | invalid JSON, past date, date earlier than the newest version, rule validation failed (including a non-Friday `effectiveFrom` when Fajr/Dhuhr/Asr/Isha changes) | `{ message, errors: [{ path, message }], warnings }`, e.g. path `fajr.effectiveFrom` |
| 409    | `expectedRevision` is not the current revision                                                                                                                  | `{ message }` (reload and preview again)                                             |
| 422    | `IQAMA_PREVIEW_INVALID` missing, expired or already used token                                                                                                  | `{ code, message }`                                                                  |
| 422    | `IQAMA_PREVIEW_MISMATCH` settings, `effectiveFrom` or `requestHash` differ from the preview                                                                     | `{ code, message }`                                                                  |
| 422    | `IQAMA_REVISION_STALE` the preview was made against another revision than `expectedRevision`                                                                    | `{ code, message }`                                                                  |
| 422    | `IQAMA_CONFLICTS_NOT_ACKNOWLEDGED` the preview listed Fajr conflicts and `acknowledgeConflicts` is not `true` (token kept, retry allowed)                       | `{ code, message, conflictCount }`                                                   |

After any 422 the UI must discard the preview and ask for a new one.

**Override endpoints.** `POST /api/v1/admin/overrides` and `PATCH /api/v1/admin/overrides/:id` return 409 `{ message }` (naming the clashing override: id, prayer, type, value, dates) when the dates overlap an active override for the SAME prayer. Where overrides are already stored with overlaps, the newest one wins.

**Schedule fields** (`GET /api/v1/schedule`):

- `iqama_clamped: true` on a prayer entry when a guardrail changed that prayer's time (any prayer, any path).
- `iqama_conflict: true` is set at **both** levels, always together: on the prayer entry (`fajr` only today) and on the day object (the day has at least one prayer with a conflict). Read the prayer-level flag to say which prayer; the day-level flag is for calendar-style views. A conflict day usually also has `iqama_clamped` on Fajr, because the gap moved it.
- A conflict never makes the engine fail: the gap after Azan wins, the day is flagged, and the admin acknowledged it when saving.

## Operations

- Cutover steps: `docs/iqama-rules-cutover-runbook.md`
- Check existing overrides against the guardrail: `npx ts-node scripts/check-overrides-guardrail.ts` (read-only)
- List overrides that overlap for the same prayer: `npx ts-node scripts/report-override-overlaps.ts` (read-only; deletes nothing; the newest override wins on shared days)
- `npx prisma db seed` runs `prisma/seed.ts`, which seeds Adhan config and Iqama rules (both idempotent)
