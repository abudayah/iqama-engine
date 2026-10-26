---
inclusion: fileMatch
fileMatchPattern: 'src/rules/asr.rule.ts'
---

# Asr Iqama Seasonal Schedule (Friday-anchored)

## Overview

The Asr Iqama uses **seasonal fixed times** instead of dynamic calculations.
Critically, the time only ever **changes on a Friday**: each season begins on
the **first Friday of its anchor month**, so the congregation always starts a
new time on a Jumu'ah (the day most people attend). This gives predictability
and easy communication.

Only the **Iqama** follows this schedule. The Asr **Azan** still varies daily
from astronomical calculation.

## The Schedule

```
Spring/Summer : Mar 15            → first Friday of Sep   6:00 PM (18:00)
Early Fall    : first Friday Sep  → first Friday of Oct   5:00 PM (17:00)
Fall          : first Friday Oct  → first Friday of Nov   4:30 PM (16:30)
Winter        : first Friday Nov  → first Friday of Jan   3:45 PM (15:45)
Late Winter   : first Friday Jan  → Mar 14                4:00 PM (16:00)
```

Transition behavior: the new time takes effect **on** the anchor Friday (same
day). Between the 1st of an anchor month and its first Friday, the previous
season's time continues to apply — the change waits for the Friday.

## Implementation Details

### "First Friday" is computed, not hardcoded

Because the first Friday of Sep/Oct/Nov/Jan falls on a different calendar date
every year, the rule computes it at runtime via `firstFridayDate(dateInMonth)`.
This keeps the rule correct year over year with no code edits. The Mar 15 and
Mar 14 boundaries are fixed calendar dates (not Friday-anchored).

### Date Logic (by season)

1. **Late Winter → 16:00**:
   - January from the first Friday onward (`month === 1 && day >= firstFriday`)
   - All of February, plus March 1–14

2. **Spring/Summer → 18:00**:
   - March 15 onward
   - All of April through August
   - September before the first Friday

3. **Early Fall → 17:00**:
   - September from the first Friday onward
   - October before the first Friday

4. **Fall → 16:30**:
   - October from the first Friday onward
   - November before the first Friday

5. **Winter → 15:45**:
   - November from the first Friday onward, and all of December
   - January before the first Friday

### Return Format

24-hour `HH:mm` string: `'18:00'`, `'17:00'`, `'16:30'`, `'15:45'`, `'16:00'`.

## Why Friday-anchored seasonal times?

### Benefits

1. **Changes land on Jumu'ah**: The congregation only ever experiences a new
   Asr time starting on a Friday, when attendance and announcements are highest.
2. **Predictability**: The time holds for months at a stretch.
3. **Easy to announce**: "Starting this Friday, Asr is 4:30."
4. **Maintenance-free**: First-Friday dates are computed, not hardcoded.

## Change Dates (announcement anchors)

- **Mar 15**: Switch to 6:00 PM (Spring/Summer begins — fixed date)
- **First Friday of September**: Switch to 5:00 PM (Early Fall)
- **First Friday of October**: Switch to 4:30 PM (Fall)
- **First Friday of November**: Switch to 3:45 PM (Winter)
- **First Friday of January**: Switch to 4:00 PM (Late Winter)

## Testing Considerations

1. **Test the anchor Fridays**: the Thursday before (old time) vs the Friday
   itself (new time) for Sep/Oct/Nov/Jan.
2. **Test the pre-Friday hold**: e.g. Oct 1 with a first Friday on Oct 3 still
   returns the Early Fall time (17:00).
3. **Test the fixed Mar boundary**: Mar 14 (16:00) vs Mar 15 (18:00).
4. **Verify across multiple years** since first-Friday dates shift annually.
5. **Verify return format**: must be `HH:mm`.

## Comparison with Azan

The Asr **Azan** varies daily from astronomical calculation; only the **Iqama**
uses this fixed schedule, so the gap between Azan and Iqama varies seasonally.

## Admin Overrides

Admins can still create overrides (special events, community requests, testing,
temporary adjustments). Overrides (P0) take precedence over this schedule.

## Critical Rules

1. **Iqama >= Azan**: enforced at the service level; if the seasonal time were
   earlier than Azan, the system uses Azan + 5 minutes.
2. **Return format**: `'HH:mm'` (24-hour).
3. **Month indexing**: dayjs months are 0-indexed; the rule adds 1 for clarity.
4. **Boundary precision**: be exact with `>=` / `<` against `firstFridayDate`.

## Example Usage

```typescript
import { computeAsrIqama } from './asr.rule';
import dayjs from 'dayjs';

// May 2, 2026 - Spring/Summer
computeAsrIqama(dayjs('2026-05-02 17:10')); // '18:00'

// Sep 4, 2026 is the first Friday of September → Early Fall begins
computeAsrIqama(dayjs('2026-09-04')); // '17:00'

// Nov 20, 2026 - Winter
computeAsrIqama(dayjs('2026-11-20 14:30')); // '15:45'
```

## Summary

The Asr schedule is **simple, predictable, and Friday-anchored**: times change
only on the first Friday of the season's anchor month (except the fixed Mar 15 /
Mar 14 spring boundary), while the Azan stays astronomically accurate.
