---
inclusion: fileMatch
fileMatchPattern: '{src/rules/**,src/adhan/**}'
---

# Prayer Time Calculation Rules — Overview

This document explains the Islamic prayer time (Iqama) calculation rules used in the iqama-engine. These rules transform raw astronomical prayer times (Azan) from the `adhan` library into congregation start times (Iqama) that are practical for the community.

## Azan Calculation Method

- **Method**: ISNA (Islamic Society of North America) — 15° for both Fajr and Isha
- **High Latitude Rule**: `TwilightAngle` — caps Fajr and Isha in June/July when the 15° angle is unreachable at ~49.3°N. Zero effect on all other months.
- **Madhab**: Shafi'i (for Asr)
- **Rationale**: Aligns with IslamicFinder and FCNA guidance for Canada. See `PRAYER_TIMES_GUIDE.md` for full details.

## Glossary

- **Azan**: The raw astronomical prayer time calculated by the `adhan` library
- **Iqama**: The congregation start time (when the prayer actually begins)
- **DST**: Daylight Saving Time
- **CeilingToNearest5**: Round up to the nearest 5-minute boundary (e.g., 20:31 → 20:35)
- **FloorToNearest5**: Round down to the nearest 5-minute boundary (e.g., 04:39 → 04:35). Used when rounding up would breach a P0 safety ceiling.
- **CeilingToNearest30**: Round up to the nearest 30-minute boundary (e.g., 15:20 → 15:30, 15:35 → 16:00)

## The Five Prayers

1. **Fajr** (Dawn) — Dynamic calculation with sunrise protection (supports admin overrides)
2. **Dhuhr** (Noon) — Fixed time based on DST status
3. **Asr** (Afternoon) — Seasonal fixed times (4 changes per year)
4. **Maghrib** (Sunset) — Simple 5-minute offset
5. **Isha** (Night) — Seasonal scaling based on sunset time

Each prayer uses its own astronomical time for maximum accuracy, with Asr using simplified seasonal times for predictability.

## Rule Files

Each prayer has its own rule file in `src/rules/`:

- `fajr.rule.ts` — Fajr calculation (FR3) - Dynamic with override support
- `dhuhr.rule.ts` — Dhuhr calculation (FR2) - Fixed by DST
- `asr.rule.ts` — Asr calculation (FR4) - Seasonal fixed times
- `maghrib.rule.ts` — Maghrib calculation (FR1) - Simple offset
- `isha.rule.ts` — Isha calculation (FR5) - Seasonal scaling

## Rule Priority Guide

- P0: Safety & Shariah Constraints – Highest priority. These are non-negotiable boundaries.
  - Example: Iqama must be at least 4 minutes after Azan.

  - Example: Iqama must not exceed 75 minutes after Azan.

  - Example: Fajr Iqama must never overlap with Sunrise (enforced via Safe_Sunrise_Limit = Sunrise - 60 min).

- P1: Admin Overrides – Manual intervention. Direct overrides set by an admin for specific dates (e.g., Ramadan or special events) override the standard automated calculations.

- P2: Seasonal & Calendar Rules – Primary Logic. These are the specific prayer rules (FR1–FR5) that dictate how a prayer behaves based on the date (e.g., Asr seasonal fixed times or Dhuhr DST adjustments).

- P3: Formatting & Rounding – User Experience. Constraints like CeilingToNearest5 ensure the times are "clean" for the congregation. This is applied after the primary time is determined but must still respect P0.

- P4: Default Fallbacks – The Safety Net. If a calculation fails or a specific seasonal rule isn't found, the system falls back to a safe default (e.g., Azan + 10 minutes).

- P5: UI/UX Enhancements – Presentation only. Lowest priority; affects how the time is labeled or displayed (e.g., renaming "Dhuhr" to "Friday"), but does not change the underlying time logic.

## General prayer rules

- P0: Iqama must be after azan at least by 4 minutes.
- P0: Max_Delay between azan and Iqama = Azan + 75 min.

## Detailed Rule Descriptions

### Fajr (FR3) - Dynamic with Override Support

**Calculation**:

- P0: Safe_Sunrise_Limit = Sunrise - 60 min (safety boundary — Iqama must never encroach on sunrise)
- P1: Admin Overrides — applied instead of FR3 calculation; still rounded (P3) and capped to P0.
- P2: Base_Target = min(Max_Delay, Safe_Sunrise_Limit)
- P2: If Base_Target < Azan + 10 min: Base_Target = Azan + 10 min (floor clamp, itself capped to P0)
- P3: Iqama = CeilingToNearest5(Base_Target)
  - If rounding up would breach Safe_Sunrise_Limit → FloorToNearest5(Safe_Sunrise_Limit) instead
  - Result is always a clean 5-minute boundary; P0 is never breached

**Weekly rule (FR3-W)**:

- Compute the per-day FR3 result for each day in the Friday→Thursday window.
- Take the **latest** per-day result as the candidate weekly time.
- Cap the candidate against the **minimum** Safe_Sunrise_Limit across all 7 days (string comparison on HH:mm).
  - If the cap lands on a non-5-min boundary → FloorToNearest5 of that limit.
  - This guarantees P0 is respected for every day in the week, not just the day with the latest sunrise.

**Admin Overrides**: Use overrides for fixed times during special periods (Ramadan, summer months). All override values are rounded (P3) and capped to P0 before being applied.

### Dhuhr (FR2) - Fixed by DST, Friday Jumu'ah adjustment

**Calculation**:

- P1: DST (Daylight Saving Time): 1:45 PM
- P1: Standard Time: 12:45 PM

**Friday (Jumu'ah) rule**:

- The iqama column shows the **Khutbah start time**, which is 5 minutes before the actual prayer
- P1: DST Friday: 1:40 PM (`13:45 - 5 min`)
- P1: Standard Time Friday: 12:40 PM (`12:45 - 5 min`)
- P2: The UI renames the row label from "Dhuhr" to **"Friday"** on Fridays

### Asr (FR4) - Seasonal Fixed Times

**Calculation**:

- Spring/Summer (Mar 15 - Sep 15): 6:00 PM
- Fall (Sep 16 - Nov 15): 5:00 PM
- Early Winter (Nov 16 - Jan 15): 3:00 PM
- Late Winter (Jan 16 - Mar 14): 4:00 PM

**Benefits**: Only 4 changes per year, easy to remember and announce, predictable for congregation.

### Maghrib (FR1) - Simple Offset

**Calculation**: P0: Iqama = CeilingToNearest5(Azan + 5 min)

### Isha (FR5) - Seasonal Scaling

**Calculation**: Delay scales from 15 min (winter, Azan < 20:00) to 5 min (summer, Azan > 22:00) via linear interpolation over the 20:00→22:00 window, then rounded to the nearest 5-minute boundary.

**Rounding (P3)**: FloorToNearest5 is preferred to bring a late summer Isha time earlier. Falls back to CeilingToNearest5 only if flooring would leave less than 4 minutes after Azan (P0 minimum gap).

## Key Principles

### 1. Accuracy

Each day uses its own astronomical prayer times for maximum accuracy. Prayer times change gradually throughout the year following the sun's position.

### 2. Predictability

Iqama times balance accuracy with predictability:

- **Fajr**: Dynamic calculation with 5-minute rounding
- **Dhuhr**: Fixed time (DST-aware)
- **Asr**: Seasonal fixed times (only 4 changes per year)
- **Maghrib**: 5-minute rounding
- **Isha**: 5-minute rounding with seasonal scaling

This creates clean clock times that are easy to remember and announce.

### 3. Practicality

Rules balance religious requirements with practical concerns:

- **Fajr**: Protect sleep in summer, allow time for work commute in winter (use admin overrides for fixed times)
- **Dhuhr**: Fixed time regardless of astronomical noon
- **Asr**: Seasonal fixed times for easy scheduling (changes only 4 times per year)
- **Maghrib**: Quick start after sunset
- **Isha**: Avoid unreasonably late nights in summer

## Rule Execution Order

1. **Individual Prayer Rules** (FR1-FR5) — Calculate Iqama for each prayer based on that day's Azan
2. **Override Interception** (FR6) — Apply admin overrides if present

## Admin Override System

### When to Use Overrides

**Fajr**:

- Ramadan: Fixed time for consistency during fasting month
- Summer months: Lock at specific time (e.g., 4:30 AM)
- Winter: Dynamic calculation usually works well

**Other Prayers**:

- Special events or community needs
- Temporary adjustments during DST transitions
- Testing or validation purposes

### How Overrides Work

1. Admin creates override via API
2. Override stored in database with date and prayer
3. System checks for overrides before applying calculation rules
4. If override exists, it's used instead of calculation
5. Critical rule: Iqama can never be earlier than Azan

**Override types**:

- **FIXED** — sets Iqama to an exact HH:mm time
- **OFFSET** — shifts Iqama by ±N minutes relative to Azan (range: -120 to +120, step 5). Negative offsets are supported in the UI but the backend still enforces Iqama ≥ Azan.

**Priority**: Override → Calculation Rule → Azan (minimum)

## When to Modify Rules

**DO modify** when:

- Community feedback indicates a rule is impractical
- Seasonal edge cases are discovered
- New requirements emerge (e.g., Ramadan adjustments)

**DO NOT modify** without:

- Testing across all seasons (summer/winter extremes)
- Consulting the requirements and design documents
- Updating property-based tests
- Ensuring the critical invariant: Iqama >= Azan

## Hijri Calendar Module

The `src/hijri-calendar/` module handles Islamic calendar features that extend the base schedule:

### Qiyam al-Layl (`qiyam_time`)

- Injected into `DailySchedule` on **Hijri days 20–29 of month 9 (Ramadan)** only.
- Day 30 is intentionally excluded (it is Eid eve, not a Qiyam night).
- The start time is stored per Hijri year in `QiyamConfig` and fetched once per `buildMonth` call.
- Field: `qiyam_time?: string` (HH:mm) on `DailySchedule`.

### Eid Prayer Times (`eid_prayer_1`, `eid_prayer_2`)

- Injected on the **astronomical Eid day** (1st Shawwal or 10th Dhul-Hijjah).
- Times come from `SpecialPrayer` records saved by the admin; fallback to 07:00 / 08:30 if none exist.
- Fields: `eid_prayer_1?: string`, `eid_prayer_2?: string` on `DailySchedule`.

### Moon Sighting Override

- Admins can override the Hijri month length (29 or 30 days) via `HijriCalendarController`.
- Affects which Gregorian date is treated as the 1st of the next month.
- Stored in `CalendarOverride` table.

### Friday (Jumu'ah) Rule Added

**Change**: Dhuhr iqama on Fridays shows the Khutbah start time (5 minutes before the actual prayer)

- DST Friday iqama: `13:40` (was `13:45`)
- Standard Time Friday iqama: `12:40` (was `12:45`)
- UI renames the Dhuhr row to "Friday" on Fridays
- Implemented in `dhuhr.rule.ts` and `PrayerTable.tsx`

### Asr Rule Simplified

**Previous**: Dynamic calculation with CeilingToNearest30(Azan + 15 min) - resulted in 13 changes per year

**Current**: Seasonal fixed times - only 4 changes per year

- Easier to remember and announce
- More predictable for congregation
- Still follows general sun position
- Matches community expectations

### Fajr Rule Enhanced

**Changes**:

1. **P0 strictly enforced at every step** — Safe_Sunrise_Limit (Sunrise - 60 min) is now the hard ceiling applied after the floor clamp, after CeilingToNearest5 rounding, and after admin overrides. No step can breach it.

2. **FloorToNearest5 on P0 breach** — When CeilingToNearest5 would push the result past Safe_Sunrise_Limit, the system floors down to the nearest 5-minute boundary instead of clamping to the raw limit minute. Result is always a clean 5-min boundary.

3. **Weekly cap uses minimum safeLimit across all 7 days** — The weekly fixed time is capped against the smallest Safe_Sunrise_Limit string across the entire Friday→Thursday window (not just the day with the earliest sunrise Dayjs object). This prevents a day mid-week with an early sunrise from being silently breached by a weekly time derived from a day with a later sunrise.

4. **Admin overrides also rounded and P0-capped** — FIXED and OFFSET overrides for Fajr now go through CeilingToNearest5 (P3) and the P0 re-cap, same as the calculation path.

- Implemented in `fajr.rule.ts` (`computeFajrIqama`, `computeWeeklyFajrIqama`) and `override.service.ts` (`applyOverrides`)

### Isha Rounding Changed to FloorToNearest5

**Change**: Isha Iqama now prefers `FloorToNearest5` instead of `CeilingToNearest5`.

- **Reason**: In summer (Jun–Jul), Isha Azan is already late (~23:08–23:17). Rounding down brings the Iqama to the earliest clean 5-min boundary, making it more convenient for the congregation.
- **P0 safety net**: If flooring would leave less than 4 minutes between Azan and Iqama, the system falls back to `CeilingToNearest5`.
- **Example**: Azan `23:16` + 5 min gap = `23:21` → floor = `23:20` (gap 4 min ✓). Old behaviour: `23:25`.
- **Winter unaffected**: In winter, Isha Azan is early (~18:00) with a 15-min gap, so floor and ceiling produce the same or very similar results.
- Implemented in `isha.rule.ts` (`computeIshaIqama`)

### High Latitude Rule Added (TwilightAngle)

**Change**: Added `HighLatitudeRule.TwilightAngle` to the adhan adapter.

- **Problem**: At ~49.3°N, the 15° ISNA twilight angle is unreachable in June and July. Without a rule, the library returns an astronomically impossible Isha time (e.g. 23:50 in mid-June vs IslamicFinder's 23:07).
- **Fix**: `TwilightAngle` caps Fajr and Isha to the point where the angle is actually reachable, bringing summer Isha times within ~7–8 min of IslamicFinder.
- **Scope**: June and July only — all other months are unaffected.
- **Authority**: Aligns with FCNA guidance (13° for Canada) and IslamicFinder's observed behaviour.
- Implemented in `src/adhan/adhan.adapter.ts`

### Hijri Calendar Module Added

**New module**: `src/hijri-calendar/` — Ramadan, Eid, and Qiyam management

- `QiyamConfigService` — stores/retrieves Qiyam start time per Hijri year
- `CalendarOverrideService` — stores moon-sighting length overrides
- `HijriCalendarController` — REST endpoints for admin UI
- `ScheduleBuilderService` updated to inject `qiyam_time` and Eid prayer times

**See**: `PRAYER_TIMES_GUIDE.md` for complete documentation

## Testing Philosophy

Each rule should have:

1. **Unit tests** — Concrete examples with known inputs/outputs
2. **Property tests** — Invariants that must hold for all inputs
3. **Integration tests** — End-to-end API validation

### Critical Invariant

**Iqama must always be >= Azan** for all prayers. This is the most important correctness property.
