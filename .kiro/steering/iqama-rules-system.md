---
inclusion: fileMatch
fileMatchPattern: '{src/iqama-rules/**,src/schedule-builder/**,src/override/**,src/rules/**,src/adhan/**,prisma/seed*,scripts/**}'
---

# Iqama Rules System (admin-configurable rules)

Iqama rules are data, not code. A rule set (one rule per prayer) is stored in the `IqamaRuleVersion` table and evaluated by a pure evaluator. It is the only source of Iqama times: the old per-prayer functions (`src/rules/*.rule.ts`), the `IQAMA_RULES` flag (legacy / shadow / db) and the `IQAMA_RULES_CUTOVER` date were removed. The environment variables are ignored if still set (the app logs one info line at startup). `src/rules/` now only holds `iqama-guardrail.ts` and `time-utils.ts`.

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

## Dates and history

A date uses the version with the greatest `effectiveFrom` <= that date (ties: higher id). A date before the first version uses the earliest version, so past dates keep working. Production's version 1 starts on 2026-11-13 (a Friday). Behaviour change from the removal: past winter dates now show Dhuhr 13:45 (Friday 13:40); the old DST rule showed 12:45 (Friday 12:40) before 2026-11-13.

## Default seed rules (version 1)

> Only the seed (`src/iqama-rules/iqama-rules.seed.ts`, what a fresh database starts with). **The live rules are whatever is stored and the Imam edits them in the admin; read them via `GET /api/v1/admin/iqama-rules` (`effective` / `latest`). Do not copy times from here.**

- **Fajr:** `OFFSET` Azan + 75, at least 10 after Azan, ends at least 60 before sunrise, round up to 5, weekly lock.
- **Dhuhr:** `FIXED_TIME` 13:45, Friday −5 (Friday shows the Khutbah start, 5 minutes before the prayer).
- **Asr:** `SEASONAL`, 5 segments: starts on the first Friday of January, September, October and November, plus the fixed date March 15; the times are in the seed file.
- **Maghrib:** `OFFSET` Azan + 5, round up to 5.
- **Isha:** `SCALED_GAP` 15 minutes at Azan 20:00 falling to 5 at 22:00, at least 3 after Azan, round down to 5, weekly lock.

## How the pieces behave

- **Azan.** Times come from the `adhan` library with the stored Azan settings (admin `adhan-config`; seeded default: ISNA 15°/15°, Shafi'i, `TwilightAngle` high-latitude rule, a summer Isha −6 minute period). Each day uses its own Azan; B.C. is UTC-7 all year since 2026-03-08, so no rule may depend on DST (`is_dst` is display-only).
- **Weekly lock (Friday to Thursday).** The week runs from a Friday through the next Thursday. The locked prayer shows the latest per-day result of that week, so the congregation sees one stable time all week. With a sunrise limit the held time is also capped by the earliest `sunrise − N` in the week and floored to the rounding step, so every day of the week respects the limit.
- **Fajr and sunrise.** The limit keeps Fajr at least N minutes before sunrise; the min-after-Azan limit raises it first and the sunrise limit wins in the rule. The fixed guardrail then enforces Azan + 3: if the two cannot both hold on some day, the gap wins, the day is flagged `iqama_conflict`, and saving a proposal with such days needs `acknowledgeConflicts: true`.
- **Seasonal segments.** A segment holds from its start until the next segment's start; the last one wraps over New Year. `FIRST_FRIDAY` starts are computed for each year (the first Friday of that month), so the time only changes on a Jumu'ah; between the 1st of that month and its first Friday the previous season still applies. `DATE` starts are fixed calendar dates. Both switch on the start day itself.
- **Scaled gap.** Between points the gap interpolates linearly with the Azan time and is held flat outside them.
- **Known clamp.** With clocks fixed at UTC-7, an Asr time of 16:00 in the late-winter segment is below Azan + 3 from 2027-02-11 to 2027-03-14 (32 days); the guardrail raises those days (`iqama_clamped: true`). An admin can change the rule; the snapshot test still records the seed behaviour.
- **Hijri features** (Qiyam, Eid, moon sighting) are documented in `hijri-calendar-module.md`.

## Changing rules or tests

Time changes are normal data changes: use the admin (preview, then save a new version on a Friday for Fajr/Dhuhr/Asr/Isha). A code change to rules, the evaluator, the guardrails or the Azan inputs must keep the snapshot test green or regenerate it on purpose and review the diff (see the code map). Each rule type has unit tests plus fast-check properties (Iqama >= Azan + 3, rounding invariants, validator ranges).

## Code map (`src/iqama-rules/`)

- `iqama-rules.types.ts` — rule model types, `LOCKABLE_PRAYERS`
- `iqama-rules.evaluator.ts` — pure `evaluateRule`, `evaluateIqama` (rule → override → guardrail)
- `iqama-rules.validator.ts` — `validateRuleSet(rules, effectiveFrom?, previous?)` → errors + warnings
- `iqama-rules.catalog.ts` — `RANGES` (single source for validator and API) and `RULE_CATALOG`
- `iqama-rules.resolver.ts` — pick the version for a date (earliest version before the first), validate stored rules
- `iqama-rules.seed.ts` / `iqama-rules.seed-db.ts` — default rules / idempotent DB seed
- `iqama-rules.service.ts`, `.controller.ts`, `.module.ts`, `dto/` — admin API
- Snapshot test: `iqama-rules.snapshot.spec.ts` against `fixtures/iqama-snapshot.json` (seed rules, default Azan config, UTC-7, every day 2026-11-13 to 2035-12-31; Azan, Iqama and the `iqama_clamped` / `iqama_conflict` flags). A diff means published times changed. Regenerate only on purpose: `UPDATE_IQAMA_SNAPSHOT=1 npx jest src/iqama-rules/iqama-rules.snapshot`.

## Failures (no silent fallback)

If there is no stored version at all, or the stored JSON is unreadable or fails the validator, building the schedule fails with HTTP 500 and code `IQAMA_RULES_MISSING` or `IQAMA_RULES_INVALID` (also logged). Overrides and guardrails always apply.

## Admin API — `/api/v1/admin/iqama-rules` (header `X-API-Key`, same guard as adhan-config)

| Method | Path       | Purpose                                                                                                                                                 |
| ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/`        | mode (always `db`, deprecated), current revision, `effective` (today), `latest` (the baseline), `upcoming[]`, all `versions[]`, default `effectiveFrom` |
| GET    | `/catalog` | rule types, fields, ranges, fixed guardrails (for the UI to render forms)                                                                               |
| POST   | `/preview` | real days current vs proposed (14 sample days) + 365-day summary (days changed/clamped, first dates, per prayer); returns `previewId`                   |
| PUT    | `/base`    | save a new version. Needs `previewId` and `expectedRevision`. Default `effectiveFrom` = next Friday strictly after today                                |

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
{ mode: 'db' (deprecated constant), currentRevision, today, timezone, defaultEffectiveFrom,
  effective: V | null,          // in force today (the earliest version if today is before the first one); null only if no version
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

- Deploy and rollback steps: `docs/iqama-rules-cutover-runbook.md`
- Check existing overrides against the guardrail: `npx ts-node scripts/check-overrides-guardrail.ts` (read-only)
- List overrides that overlap for the same prayer: `npx ts-node scripts/report-override-overlaps.ts` (read-only; deletes nothing; the newest override wins on shared days)
- `npx prisma db seed` runs `prisma/seed.ts`, which seeds Adhan config and Iqama rules (both idempotent)
