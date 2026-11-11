# Implementation Plan: Iqama Rules Admin

## Overview

Fix Dhuhr after the end of clock changes, add hard guardrails, then move the Iqama rules into versioned admin-editable data behind the `IQAMA_RULES` flag. Engine work is in this repository; Phase 3 (admin UI) is in `iqama-ui`.

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

- [ ] 5. Production cutover (see runbook)
  - [ ] 5.1 Check the production Node/ICU timezone data (America/Vancouver in January 2027 must be UTC-7)
  - [ ] 5.2 Migrate and seed
  - [ ] 5.3 Run `scripts/check-overrides-guardrail.ts` and resolve its findings
  - [ ] 5.4 Deploy with `IQAMA_RULES=shadow`; watch `[iqama shadow]` logs for one week
  - [ ] 5.5 Switch to `IQAMA_RULES=db`

- [ ] 6. Phase 4B: Delete legacy code (only after a clean week of shadow in production)
  - [ ] 6.1 Remove `src/rules/{fajr,dhuhr,asr,maghrib,isha}.rule.ts` and their specs
  - [ ] 6.2 Remove `RulesService.computeIqama`, `IqamaTimes`/`WeeklyContext` legacy parts, and the `legacy` and `shadow` branches in `ScheduleBuilderService`
  - [ ] 6.3 Remove `iqama-rules.golden.spec.ts` (its oracle is gone) and update tests that mock `RulesService`
  - [ ] 6.4 Keep `rules/iqama-guardrail.ts` and `rules/time-utils.ts`; remove `getPrayerTimes` legacy adapter path only if the config fallback is no longer needed
  - [ ] 6.5 Keep `IQAMA_RULES` handling or replace it with db-only; update README, steering and runbook
  - _Do not start before 5.4 is clean._
