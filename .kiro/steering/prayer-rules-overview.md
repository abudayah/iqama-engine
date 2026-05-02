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

1. **Fajr** (Dawn) — Dynamic calculation with sunrise protection
2. **Dhuhr** (Noon) — Fixed time based on DST status
3. **Asr** (Afternoon) — Clean 30-minute intervals
4. **Maghrib** (Sunset) — Simple 5-minute offset
5. **Isha** (Night) — Seasonal scaling based on sunset time

Each prayer uses its own astronomical time for maximum accuracy.

## Rule Files

Each prayer has its own rule file in `src/rules/`:

- `fajr.rule.ts` — Fajr calculation (FR3)
- `dhuhr.rule.ts` — Dhuhr calculation (FR2)
- `asr.rule.ts` — Asr calculation (FR4)
- `maghrib.rule.ts` — Maghrib calculation (FR1)
- `isha.rule.ts` — Isha calculation (FR4)

## Key Principles

### 1. Accuracy
Each day uses its own astronomical prayer times for maximum accuracy. Prayer times change gradually throughout the year following the sun's position.

### 2. Predictability
Iqama times use rounding functions (CeilingToNearest5, CeilingToNearest30) to create clean clock times that are easy to remember.

### 3. Practicality
Rules balance religious requirements with practical concerns:
- Fajr: Protect sleep in summer, allow time for work commute in winter
- Dhuhr: Fixed time regardless of astronomical noon
- Asr: Clean intervals for easy scheduling
- Maghrib: Quick start after sunset
- Isha: Avoid unreasonably late nights in summer

## Rule Execution Order

1. **Individual Prayer Rules** (FR1-FR4) — Calculate Iqama for each prayer based on that day's Azan
2. **Override Interception** (FR6) — Apply admin overrides if present

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

## Testing Philosophy

Each rule should have:
1. **Unit tests** — Concrete examples with known inputs/outputs
2. **Property tests** — Invariants that must hold for all inputs
3. **Integration tests** — End-to-end API validation

### Critical Invariant

**Iqama must always be >= Azan** for all prayers. This is the most important correctness property.

