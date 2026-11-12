# Implementation Plan: Iqama Rules Admin

## Overview

Fix Dhuhr after the end of clock changes, add hard guardrails, then move the Iqama rules into versioned admin-editable data (rolled out behind a flag that has since been removed). Engine work is in this repository; Phase 3 (admin UI) is in `iqama-ui`.

## Tasks

- [x] 0. Phase 0: Dhuhr fix and guardrails (commit `phase 0`)
  - [x] 0.1 Dhuhr fixed 13:45, Friday 13:40; DST detection removed from the rule
  - [x] 0.2 Guardrail on every path incl. overrides: Iqama ≥ Azan + 3 (first 5-min mark), `iqama_clamped`
  - [x] 0.3 Fajr ends ≥ 60 min before sunrise, also for overrides
  - [x] 0.4 Asr Late Winter not redesigned; 32 affected days listed (2027-02-11 to 2027-03-14)
  - [x] 0.5 Weekly context uses config-resolved Azan times
  - [x] 0.6 Overrides fetched per month
  - [x] 0.7 Tests: all days 2026–2035, override clamping, Dhuhr 2027
  - [x] 0.8 Docs: floor is 3 minutes, Dhuhr rule
  - _Requirements: 1, 2, 7_

- [x] 1. Phase 1: Rule model, evaluator, validator, seed (commits `phase 1`)
  - [x] 1.1 Types for bases and modifiers
  - [x] 1.2 Pure evaluator (base → modifiers → override → guardrails)
  - [x] 1.3 Validator with errors and warnings
  - [x] 1.4 Seed rule set reproducing today's five rules
  - [x] 1.5 Golden master against the legacy rule functions, 2026–2035
  - [x] 1.6 fast-check properties (Iqama ≥ Azan + 3, rounding, range rejection)
  - [x] 1.7 Friday start for Fajr/Dhuhr/Asr/Isha is a validation error; Maghrib any day
  - _Requirements: 3, 4_

- [x] 2. Phase 2: Storage, API, flag, seed, tools (commit `phase 2`)
  - [x] 2.1 `IqamaRuleVersion` model and migration
  - [x] 2.2 Service and controller at `/api/v1/admin/iqama-rules` (GET, `/catalog`, `/preview`, `PUT /base`)
  - [x] 2.3 Idempotent seed, chained through `prisma/seed.ts` and `deploy.sh`
  - [x] 2.4 `IQAMA_RULES=legacy|shadow|db` in `ScheduleBuilderService`
  - [x] 2.5 `scripts/check-overrides-guardrail.ts`
  - [x] 2.6 Tests: service, controller, preview, flag modes, seed idempotency
  - _Requirements: 5, 6_

- [x] 3. Phase 3: Admin UI (repository `iqama-ui`)
  - Done in the UI repository; not tracked here.

- [x] 4. Phase 4A: Docs, steering, spec, runbook (commit `phase 4`)
  - [x] 4.1 Steering `iqama-rules-system.md`, updated `prayer-rules-overview.md`, README
  - [x] 4.2 This spec
  - [x] 4.3 `docs/iqama-rules-cutover-runbook.md`

- [x] 4b. Fixed rule 5: every final Iqama on a 5-minute mark (commit `phase 4: 5-minute mark guardrail`)
  - [x] 4b.1 `IQAMA_STEP_MIN = 5` in `iqama-guardrail.ts`; round up, or down for FLOOR rules, never below Azan + 3; Fajr sunrise − 60 handled
  - [x] 4b.2 Catalog `guardrails.iqamaStepMinutes`; validator: rounding step must be a multiple of 5
  - [x] 4b.3 Tests (all days 2026–2035 on a mark, override 09:04 → 09:05, FLOOR stays floor, Fajr conflict); golden master unchanged (zero diffs)

- [x] 4c. Phase 5: override overlap, history cutover, no silent fallback, reason, Fajr conflict (commit `phase 5`)
  - [x] 4c.1 Newest override wins; 409 on same-prayer overlap; `scripts/report-override-overlaps.ts`
  - [x] 4c.2 `IQAMA_RULES_CUTOVER` (default 2026-11-13): legacy before it (old Dhuhr DST logic kept), DB rules from it; seed version 1 at the cutover
  - [x] 4c.3 `db` mode fails loudly (`IQAMA_RULES_MISSING` / `IQAMA_RULES_INVALID`); stored JSON validated at read time
  - [x] 4c.4 Optional `reason` (migration `20261111000000_iqama_rule_reason`)
  - [x] 4c.5 Fajr conflict: `iqama_conflict`, preview `conflicts`, `acknowledgeConflicts`
  - _Requirements: 6, 8_

- [x] 4d. Phase 6: engine contract for the UI review (commit `phase 6`)
  - [x] 4d.1 `GET /` returns `effective`, `latest`, `upcoming[]`, `versions[]` with `createdAt` and `reason`
  - [x] 4d.2 Preview echoes `effectiveFrom`, `currentRevision`, `requestHash`; `PUT /base` 422 `IQAMA_PREVIEW_INVALID` / `IQAMA_PREVIEW_MISMATCH` / `IQAMA_REVISION_STALE`
  - [x] 4d.3 Test: a later version that changes only Isha keeps Asr from an existing future version
  - [x] 4d.4 Catalog with structured field metadata (no range strings); `fajrSunriseConflictPolicy`
  - [x] 4d.5 `iqama_conflict` on both the Fajr entry and the day; contract documented in the steering file
  - _Requirements: 9_

- [x] 5. Production cutover (see runbook)
  - [x] 5.1 Production timezone data checked (America/Vancouver is UTC-7 in January 2027)
  - [x] 5.2 Migrated and seeded; version 1 effective 2026-11-13
  - [x] 5.3 Overrides checked with `scripts/check-overrides-guardrail.ts`
  - [x] 5.4 Ran with `IQAMA_RULES=shadow`, then `IQAMA_RULES=db`; verified identical to the old rules for 140 days

- [x] 6. Phase 4B: Delete legacy code (commits `test: replace the legacy golden master with a frozen schedule snapshot` and `refactor: remove the legacy Iqama rules`)
  - [x] 6.1 Frozen snapshot (`src/iqama-rules/fixtures/iqama-snapshot.json`, 2026-11-13 to 2035-12-31) and `iqama-rules.snapshot.spec.ts` replace the golden master; checked equal to the legacy output on all 3336 days first
  - [x] 6.2 Removed `src/rules/{fajr,dhuhr,asr,maghrib,isha}.rule.ts`, `rules.service.ts`, `rules.module.ts` and their specs
  - [x] 6.3 Removed the `legacy` and `shadow` modes, the `IQAMA_RULES` flag and `IQAMA_RULES_CUTOVER` (ignored with one startup info line if still set)
  - [x] 6.4 Kept `rules/iqama-guardrail.ts` and `rules/time-utils.ts`; moved `isDstActive` (display-only `is_dst`) to `schedule-builder/is-dst.ts`; the Azan adapter fallback (`getPrayerTimes`) stays
  - [x] 6.5 Dates before the first version use the earliest version; no versions or invalid stored rules stay an explicit 500
  - [x] 6.6 README, steering, AGENTS.md, `.env.example` and the runbook updated (rollback = revert the PR and run `deploy.sh`)
  - _Requirements: 10_
