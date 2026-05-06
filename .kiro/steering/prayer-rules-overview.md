---
inclusion: fileMatch
fileMatchPattern: 'src/rules/**'
---

# Prayer Time Calculation Rules — Overview

This document explains the Islamic prayer time (Iqama) calculation rules used in the iqama-engine. These rules transform raw astronomical prayer times (Azan) from the `adhan` library into congregation start times (Iqama) that are practical for the community.

## Glossary

- **Azan**: The raw astronomical prayer time calculated by the `adhan` library
- **Iqama**: The congregation start time (when the prayer actually begins)
- **DST**: Daylight Saving Time
- **CeilingToNearest5**: Round up to the nearest 5-minute boundary (e.g., 20:31 → 20:35)
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

## Detailed Rule Descriptions

### Fajr (FR3) - Dynamic with Override Support

**Calculation**:

- Max_Delay = Azan + 75 min
- Safe_Sunrise_Limit = Sunrise - 45 min
- Base_Target = min(Max_Delay, Safe_Sunrise_Limit)
- If Base_Target < Azan + 10 min: Base_Target = Azan + 10 min
- Iqama = CeilingToNearest5(Base_Target)

**Admin Overrides**: Use overrides for fixed times during special periods (Ramadan, summer months).

### Dhuhr (FR2) - Fixed by DST

**Calculation**:

- DST (Daylight Saving Time): 1:45 PM
- Standard Time: 12:45 PM

### Asr (FR4) - Seasonal Fixed Times

**Calculation**:

- Spring/Summer (Mar 15 - Sep 15): 6:00 PM
- Fall (Sep 16 - Nov 15): 5:00 PM
- Early Winter (Nov 16 - Jan 15): 3:00 PM
- Late Winter (Jan 16 - Mar 14): 4:00 PM

**Benefits**: Only 4 changes per year, easy to remember and announce, predictable for congregation.

### Maghrib (FR1) - Simple Offset

**Calculation**: Iqama = CeilingToNearest5(Azan + 5 min)

### Isha (FR5) - Seasonal Scaling

**Calculation**: Delay scales from 15 min (summer) to 90 min (winter) based on Maghrib time, then CeilingToNearest5.

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

## Recent Changes (May 2026)

### Asr Rule Simplified

**Previous**: Dynamic calculation with CeilingToNearest30(Azan + 15 min) - resulted in 13 changes per year

**Current**: Seasonal fixed times - only 4 changes per year

- Easier to remember and announce
- More predictable for congregation
- Still follows general sun position
- Matches community expectations

### Fajr Rule Enhanced

**Change**: Added documentation for admin override usage

- Dynamic calculation remains as default
- Overrides recommended for special periods
- Provides flexibility while maintaining sunrise protection

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
