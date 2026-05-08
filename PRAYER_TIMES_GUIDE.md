# Prayer Times Calculation Guide

This document explains how prayer times (Azan and Iqama) are calculated in the Iqama Engine.

---

## Overview

**Azan** = The call to prayer (astronomical calculation)  
**Iqama** = When the congregation prayer actually starts

The system calculates both times for the five daily prayers:

1. **Fajr** (Dawn)
2. **Dhuhr** (Noon)
3. **Asr** (Afternoon)
4. **Maghrib** (Sunset)
5. **Isha** (Night)

---

## Azan Calculation

### Method: ISNA (Islamic Society of North America)

All Azan times are calculated using the **ISNA method** with the following parameters:

- **Location**: Masjid al-Hidayah, Port Coquitlam, BC, Canada
  - Address: 2626 Kingsway Ave, Port Coquitlam, BC V3C 1T5
  - Latitude: 49.2652047°N
  - Longitude: 122.7878735°W
- **Calculation Parameters**:
  - Fajr angle: 15° (ISNA standard)
  - Isha angle: 15° (ISNA standard)
  - Madhab: Shafi'i (for Asr calculation)

### What This Means

The system uses astronomical calculations based on the sun's position to determine the exact time for each prayer. These times change gradually throughout the year as the sun's position changes.

**Library Used**: `adhan` (TypeScript implementation of astronomical prayer time calculations)

---

## Iqama Calculation Rules

Each prayer has its own rule for calculating when the congregation starts.

### 1. Fajr Iqama (Weekly Fixed)

Fajr Iqama uses a **weekly fixed time** (FR3-W). Rather than changing every day, the system analyses the full Friday-to-Thursday week and locks in a single Iqama time for all seven days.

**Per-day formula (FR3)**:

```
P0: Safe_Sunrise_Limit = Sunrise - 60 minutes  ← hard ceiling, never exceeded
P2: Max_Delay          = Azan + 75 minutes
P2: Base_Target        = minimum of (Max_Delay, Safe_Sunrise_Limit)
P2: If Base_Target < Azan + 10 minutes: Base_Target = Azan + 10 minutes
    (floor clamp is itself capped to Safe_Sunrise_Limit so P0 always wins)
P3: Daily candidate    = CeilingToNearest5(Base_Target)
    If rounding up would breach Safe_Sunrise_Limit:
        Daily candidate = FloorToNearest5(Safe_Sunrise_Limit)
```

**Weekly rule (FR3-W)**:

```
1. Compute the per-day FR3 result for each day in the window
2. Weekly candidate = latest per-day result
3. Min_Safe_Limit   = minimum Safe_Sunrise_Limit across all 7 days
4. If Weekly candidate > Min_Safe_Limit:
       Weekly Iqama = FloorToNearest5(Min_Safe_Limit)
   Else:
       Weekly Iqama = Weekly candidate
```

Taking the latest candidate ensures the chosen time is safe for every day in the week. Capping against the **minimum** safe limit (not just the day with the latest sunrise) guarantees P0 is respected for every single day in the window — including days mid-week where sunrise arrives earlier.

**Why weekly?**

- Congregation can be told one fixed time for the whole week
- Eliminates daily changes that cause confusion
- Respects the sunrise safety buffer for **every day** in the window — the weekly time is capped against the most restrictive day, not just the day with the latest sunrise
- Result is always a clean 5-minute boundary (CeilingToNearest5, or FloorToNearest5 when the ceiling is the binding constraint)
- Consistent with how the masjid announces times on a weekly basis

**Admin Overrides**:
For special periods (Ramadan, summer months), admins can set fixed Fajr Iqama times that override the weekly calculation entirely.

---

### 2. Dhuhr Iqama (Fixed by DST)

**Calculation**:

```
If DST (Daylight Saving Time):  1:45 PM
If Standard Time:               12:45 PM
```

**Friday (Jumu'ah) rule**:

```
Iqama = base time - 5 minutes  (shows Khutbah start time)
DST Friday:           1:40 PM
Standard Time Friday: 12:40 PM
```

The UI also renames the row from "Dhuhr" to "Friday" on Fridays.

**Why Fixed?**

- Dhuhr is a midday prayer that people plan their lunch/work around
- Fixed time provides predictability
- DST adjustment keeps it consistent year-round

---

### 3. Asr Iqama (Seasonal Fixed Times)

**Calculation**:

```
Spring/Summer (Mar 15 - Sep 15):  6:00 PM
Fall (Sep 16 - Nov 15):           5:00 PM
Early Winter (Nov 16 - Jan 15):   3:00 PM
Late Winter (Jan 16 - Mar 14):    4:00 PM
```

**Why Seasonal?**

- Only **4 changes per year** (easy to remember and announce)
- Follows general sun position without frequent changes
- Predictable for congregation planning
- Reduces confusion compared to monthly changes

**Change Dates**:

- March 15: Switch to 6:00 PM (Spring/Summer time)
- September 16: Switch to 5:00 PM (Fall time)
- November 16: Switch to 3:00 PM (Early Winter time)
- January 16: Switch to 4:00 PM (Late Winter time)

---

### 4. Maghrib Iqama (Simple Offset)

**Calculation**:

```
Iqama = Round up to nearest 5 minutes (Azan + 5 minutes)
```

**Why Simple?**

- Maghrib must be prayed soon after sunset
- 5-minute buffer allows people to arrive and prepare
- Minimal delay is religiously preferred

---

### 5. Isha Iqama (Weekly Fixed)

Isha Iqama uses the same **weekly fixed time** approach as Fajr (FR4-W). The system analyses the full Friday-to-Thursday week and locks in a single Iqama time for all seven days.

**Per-day formula (FR4)**:

```
If Isha Azan > 10:30 PM:  gap = 5 minutes
If Isha Azan < 8:00 PM:   gap = 15 minutes
Otherwise:                gap = linear interpolation between 15 and 5 minutes
                               over the 8:00 PM → 10:30 PM range
Daily candidate = Round up to nearest 5 minutes (Azan + gap)
```

**Weekly rule (FR4-W)**:

```
Weekly Iqama = latest daily candidate across Friday → Thursday
```

Taking the latest candidate ensures every day in the week has an adequate gap between Azan and Iqama.

**Why weekly?**

- Same benefits as Fajr — one announced time covers the whole week
- Prevents the Iqama from feeling rushed on the day with the latest Isha
- Automatically scales with the season (summer nights stay reasonable, winter nights get a proper gap)

---

## Weekly Window

Both Fajr and Isha use a **Friday → Thursday** window. This matches the Islamic week and the typical announcement cycle at the masjid.

- The window is recalculated for every day: each day looks back to the most recent Friday and forward to the following Thursday.
- All 7 days in the window share the same Fajr and Isha Iqama time.
- Dhuhr, Asr, and Maghrib are **not affected** — they continue to use their own per-day or seasonal rules.

---

## Admin Override System

### What Are Overrides?

Admins can set specific prayer times for specific date ranges that override the automatic calculations.

### When to Use Overrides

**Common Use Cases**:

- **Ramadan**: Fixed Fajr times for consistency during the fasting month
- **Summer Months**: Lock Fajr at a specific time (e.g., 4:30 AM)
- **Special Events**: Adjust times for community events
- **Daylight Saving Transitions**: Smooth out any abrupt changes

### How Overrides Work

1. Admin creates an override via the API
2. Override is stored in the database
3. When calculating prayer times, the system applies overrides after the rule calculation
4. If a FIXED override exists, it replaces the rule result — then rounded (P3) and P0-capped
5. If an OFFSET override exists, it shifts the Azan by ±N minutes — then rounded (P3) and P0-capped
6. For Fajr specifically: if rounding up would breach Safe_Sunrise_Limit, the result is floored down to the nearest 5-minute boundary instead

### Override Priority

```
Override (if exists) → Calculation Rule → Azan (minimum fallback)
```

**P0 always wins**: Even admin overrides cannot push Fajr Iqama past Sunrise - 60 min. The override value is rounded and then capped to the safe limit.

**Critical Rule**: Iqama can never be earlier than Azan (religiously invalid)

---

## Accuracy & Validation

### Comparison with CSV Data (Website)

The system has been validated against 397 days of prayer time data:

**Results**:

- **79.8%** of days: All prayers within 5 minutes
- **82.9%** of days: All prayers within 10 minutes
- **Dhuhr, Asr, Maghrib**: 100% excellent accuracy (< 2 min average)

**Expected Differences**:

- Summer Fajr/Isha may differ by 20-30 minutes from Vancouver data
- This is **correct** because Port Coquitlam is ~15km east of Vancouver
- Port Coquitlam calculations are more accurate for your masjid location

### Testing

The system includes comprehensive testing:

- **Unit tests**: Individual prayer calculations
- **Property tests**: Invariants (e.g., Iqama ≥ Azan)
- **Integration tests**: Full API validation
- **Validation scripts**: Compare against CSV data

**Run Tests**:

```bash
npm test                    # Unit tests
npm run test:e2e           # Integration tests
bash run_all_tests.sh      # Full validation suite
```

---

## Quick Reference

| Prayer      | Iqama Rule                                           | Changes Per Year       |
| ----------- | ---------------------------------------------------- | ---------------------- |
| **Fajr**    | Weekly fixed (FR3-W) — latest of Fri→Thu window      | Weekly                 |
| **Dhuhr**   | Fixed (12:45 PM / 1:45 PM); Friday: −5 min (Khutbah) | 2 (DST transitions)    |
| **Asr**     | Seasonal fixed                                       | 4 (seasonal)           |
| **Maghrib** | Azan + 5 min                                         | Daily (follows sunset) |
| **Isha**    | Weekly fixed (FR4-W) — latest of Fri→Thu window      | Weekly                 |

---

## Configuration

### Location Settings

Update in `src/adhan/adhan.adapter.ts`:

```typescript
coordinates: new Coordinates(49.2628, -122.7811);
```

### Calculation Method

Update in `src/adhan/adhan.adapter.ts`:

```typescript
params: CalculationMethod.NorthAmerica();
```

### Seasonal Dates

Update in `src/rules/asr.rule.ts` to adjust seasonal boundaries.

---

## Support & Questions

For questions about:

- **Calculation accuracy**: See `VALIDATION.md` and `ANALYSIS_RESULTS.md`
- **Rule details**: See individual rule files in `src/rules/`
- **API usage**: See `README.md`
- **Testing**: See `TESTING_SUMMARY.md`

---

## Summary

✅ **Azan**: Astronomical calculations using ISNA method  
✅ **Fajr & Isha**: Weekly fixed times (Friday → Thursday window) for predictability  
✅ **Dhuhr**: Fixed time, DST-aware, Friday Khutbah adjustment  
✅ **Asr**: Simplified to 4 seasonal times (easy to remember)  
✅ **Maghrib**: Simple 5-minute offset  
✅ **Overrides**: Admin control for special periods  
✅ **Validated**: 80% of days within 5 minutes of reference data

The system is designed to be **accurate, predictable, and flexible** for your masjid's needs.
