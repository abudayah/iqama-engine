# Requirements Document

## Introduction

Iqama (congregation start) rules are hard-coded in `src/rules/*.rule.ts`. Two problems came up: British Columbia stopped clock changes after 2026-03-08 (UTC-7 all year), which broke the DST-based Dhuhr rule from 2027 (Dhuhr Iqama 11–46 minutes before Azan), and admin overrides had no minimum gap after Azan. This feature (1) fixes Dhuhr, (2) adds hard guardrails that hold on every path, and (3) moves the rules into versioned, admin-editable data, rolled out behind a flag with a shadow-comparison period.

This document covers the engine. The admin UI lives in the `iqama-ui` repository.

## Glossary

- **Azan**: Calculated prayer time from the `adhan` library (config-resolved).
- **Iqama**: Congregation start time.
- **Rule set**: One rule per prayer (Fajr, Dhuhr, Asr, Maghrib, Isha), stored as JSON in `IqamaRuleVersion`.
- **Base**: The starting calculation: `OFFSET`, `FIXED_TIME`, `SCALED_GAP` or `SEASONAL`.
- **Modifiers**: Limits, rounding, weekday adjust and weekly lock, applied in that fixed order.
- **Override**: A short admin exception (FIXED or OFFSET) for given dates, via the existing override API.
- **Guardrails**: Fixed constants in code that run last on every path.
- **Weekly lock**: Holding one Iqama for the Friday→Thursday window (latest per-day result wins).
- **Shadow mode**: Compute both engines, log differences, serve the legacy result.
- **`iqama_clamped`**: Boolean on a prayer entry, present when a guardrail changed the Iqama.

## Requirements

### Requirement 1: Dhuhr without DST

**User Story:** As a congregant, I want Dhuhr Iqama to stay correct after clocks stopped changing.

#### Acceptance Criteria

1. THE Dhuhr rule SHALL return 13:45 on every day except Friday, and 13:40 on Friday, in every month and year.
2. THE Dhuhr rule SHALL NOT depend on daylight saving detection.
3. THE `is_dst` schedule field MAY remain as a display-only value.

### Requirement 2: Hard guardrails

**User Story:** As the masjid admin, I want no schedule to ever show an Iqama before or too close to the Azan.

#### Acceptance Criteria

1. THE schedule builder SHALL ensure Iqama ≥ Azan + 3 minutes for all five prayers on every path, including overrides; a violating value SHALL be raised to the first 5-minute mark at or after Azan + 3.
2. THE schedule builder SHALL ensure Fajr Iqama ends at least 60 minutes before sunrise on every path, including overrides.
3. WHEN rules 1 and 2 conflict, rule 1 SHALL win.
4. WHEN a guardrail changes a time, THE prayer entry SHALL include `iqama_clamped: true`; otherwise the field SHALL be absent.
5. THE guardrails SHALL be constants in code with no admin setting.
6. THE schedule builder SHALL ensure every final Iqama is a multiple of 5 minutes on every path, including overrides. A value already on a mark SHALL be kept; otherwise it SHALL be rounded up, or down when the prayer's own rule rounding mode is FLOOR, never below Azan + 3 (it then rounds up).
7. WHEN rounding up would pass Fajr's sunrise − 60 minutes, THE builder SHALL use the last 5-minute mark at or before sunrise − 60, but never below Azan + 3.
8. `iqama_clamped: true` SHALL be set only when a guardrail moved the time.
9. THE rounding step of a rule SHALL be a multiple of 5; the catalog SHALL expose `guardrails.iqamaStepMinutes`.

### Requirement 3: Rule model and evaluation

**User Story:** As the admin, I want to change rules without a code release.

#### Acceptance Criteria

1. THE rule model SHALL support the bases `OFFSET`, `FIXED_TIME`, `SCALED_GAP` (with points) and `SEASONAL` (segments starting on a calendar date or on the first Friday of a month).
2. THE rule model SHALL support the modifiers limits (min after Azan; Fajr only: latest = sunrise − N), rounding (CEIL, FLOOR, NEAREST with a step), weekday adjust, and weekly lock.
3. THE pipeline order SHALL be fixed: base → modifiers → override → guardrails.
4. THE evaluator SHALL be a pure function of the rule, the day's Azan/sunrise and, for weekly lock, the Friday→Thursday window.
5. THE seed rules SHALL reproduce the legacy rules for every day 2026–2035 (golden master).
6. THE weekly lock SHALL be available for Fajr, Dhuhr, Asr and Isha, never Maghrib.

### Requirement 4: Validation

#### Acceptance Criteria

1. THE validator SHALL return errors (block saving) and warnings (advice).
2. THE validator SHALL reject out-of-range values, malformed times, invalid segment starts, non-increasing scaled-gap points, a sunrise limit on any prayer except Fajr, and a weekly lock on Maghrib.
3. WHEN the rule of Fajr, Dhuhr, Asr or Isha changes, a non-Friday `effectiveFrom` SHALL be an error. Maghrib MAY start on any day.
4. THE validator SHALL warn when limits are below the guardrails.

### Requirement 5: Versioned storage and admin API

#### Acceptance Criteria

1. THE system SHALL store versions in an append-only `IqamaRuleVersion` table (`effectiveFrom`, JSON settings, `createdBy`, `createdAt`); the active version for a date is the one with the greatest `effectiveFrom` ≤ the date (ties: higher id).
2. THE API at `/api/v1/admin/iqama-rules` SHALL use the same admin guard as adhan-config and offer: `GET /` (mode, revision, versions, effective rules, default date), `GET /catalog` (rule types, fields, ranges), `POST /preview`, `PUT /base`.
3. `POST /preview` SHALL compute real days (current vs proposed, with `iqama_clamped`) and a 365-day summary (days changed, days clamped, first affected dates, per prayer), and return a preview token.
4. `PUT /base` SHALL require the preview token and `expectedRevision`, default `effectiveFrom` to the next Friday after today, reject past dates and dates earlier than the latest version, and invalidate the schedule cache.
5. A stale revision SHALL return 409; a missing, expired, reused or mismatched token SHALL return 422.
6. A seed script SHALL create version 1 (effectiveFrom 1970-01-01) idempotently and run as part of `prisma db seed` and `deploy.sh`.

### Requirement 6: Safe rollout

#### Acceptance Criteria

1. THE flag `IQAMA_RULES` SHALL accept `legacy` (default), `shadow` and `db`; any other value SHALL behave as `legacy`.
2. IN `shadow` mode THE builder SHALL serve the legacy result and log `[iqama shadow] <date> <prayer>: legacy=… db=…` for each difference.
3. IN `db` mode THE builder SHALL serve DB rules, and fall back to legacy with a warning for dates no version covers.
4. THE weekly context SHALL use config-resolved Azan times, and overrides SHALL be fetched once per month.
5. A one-off script SHALL list existing overrides that the guardrails would clamp.
6. A runbook SHALL describe the cutover and the rollback (`IQAMA_RULES=legacy`).

### Requirement 7: Known effect on Asr

#### Acceptance Criteria

1. THE Asr "Late Winter 16:00" season is not redesigned. With UTC-7 it is below the 3-minute floor from 2027-02-11 to 2027-03-14 (32 days); the guardrail raises those days and flags them.
