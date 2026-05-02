---
inclusion: fileMatch
fileMatchPattern: 'src/rules/**'
---

# Prayer Time Calculation Rules — Overview

This document explains the Islamic prayer time (Iqama) calculation rules used in the iqama-engine. These rules transform raw astronomical prayer times (Azan) from the `adhan` library into congregation start times (Iqama) that are practical for the community.

## Glossary

- **Azan**: The raw astronomical prayer time calculated by the `adhan` library
- **Iqama**: The congregation start time (when the prayer actually begins)
- **Friday Block**: A mechanism that locks Fajr, Asr, and Isha Iqama times to the preceding Friday's values for the entire week
- **DST**: Daylight Saving Time
- **CeilingToNearest5**: Round up to the nearest 5-minute boundary (e.g., 20:31 → 20:35)
- **CeilingToNearest30**: Round up to the nearest 30-minute boundary (e.g., 15:20 → 15:30, 15:35 → 16:00)

## The Five Prayers

1. **Fajr** (Dawn) — Dynamic calculation with sunrise protection
2. **Dhuhr** (Noon) — Fixed time based on DST status
3. **Asr** (Afternoon) — Clean 30-minute intervals
4. **Maghrib** (Sunset) — Simple 5-minute offset
5. **Isha** (Night) — Seasonal scaling based on sunset time

## Rule Files

Each prayer has its own rule file in `src/rules/`:

- `fajr.rule.ts` — Fajr calculation (FR3)
- `dhuhr.rule.ts` — Dhuhr calculation (FR2)
- `asr.rule.ts` — Asr calculation (FR4)
- `maghrib.rule.ts` — Maghrib calculation (FR1)
- `isha.rule.ts` — Isha calculation (FR4)
- `friday-block.rule.ts` — Friday Block mechanism (FR5)

## Key Principles

### 1. Predictability
Iqama times should be easy to remember and consistent. This is why we use rounding functions (CeilingToNearest5, CeilingToNearest30) to create clean clock times.

### 2. Practicality
Rules balance religious requirements with practical concerns:
- Fajr: Protect sleep in summer, allow time for work commute in winter
- Dhuhr: Fixed time regardless of astronomical noon
- Asr: Clean intervals for easy scheduling
- Maghrib: Quick start after sunset
- Isha: Avoid unreasonably late nights in summer

### 3. Friday Block Stability
Fajr, Asr, and Isha times remain constant throughout the week (locked to Friday's calculation). This allows worshippers to memorize the schedule without checking daily. Maghrib and Dhuhr are excluded because:
- Maghrib changes significantly day-to-day (sunset time varies)
- Dhuhr is already a fixed time (DST-based)

## Rule Execution Order

1. **Friday Block** (FR5) — Determine if we should use Friday's data
2. **Individual Prayer Rules** (FR1-FR4) — Calculate Iqama for each prayer
3. **Override Interception** (FR6) — Apply admin overrides if present

## When to Modify Rules

**DO modify** when:
- Community feedback indicates a rule is impractical
- Seasonal edge cases are discovered
- New requirements emerge (e.g., Ramadan adjustments)

**DO NOT modify** without:
- Understanding the impact on the entire week (Friday Block)
- Testing across all seasons (summer/winter extremes)
- Consulting the requirements and design documents
- Updating property-based tests

## Testing Philosophy

Each rule should have:
1. **Unit tests** — Concrete examples with known inputs/outputs
2. **Property tests** — Invariants that must hold for all inputs
3. **Integration tests** — End-to-end API validation

See the design document for the 14 correctness properties that govern these rules.
