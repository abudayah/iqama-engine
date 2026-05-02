---
inclusion: fileMatch
fileMatchPattern: 'src/rules/asr.rule.ts'
---

# Asr Iqama Seasonal Schedule

## Overview

The Asr Iqama uses **seasonal fixed times** instead of dynamic calculations. This provides predictability and ease of communication for the congregation.

## The Schedule

```
Spring/Summer (Mar 15 - Sep 15):  6:00 PM (18:00)
Fall (Sep 16 - Nov 15):           5:00 PM (17:00)
Early Winter (Nov 16 - Jan 15):   3:00 PM (15:00)
Late Winter (Jan 16 - Mar 14):    4:00 PM (16:00)
```

## Implementation Details

### Date Logic

The rule uses month and day to determine the season:

1. **Spring/Summer**:
   - March 15 onwards (month === 3 && day >= 15)
   - All of April through August (month >= 4 && month <= 8)
   - September 1-15 (month === 9 && day <= 15)

2. **Fall**:
   - September 16 onwards (month === 9 && day >= 16)
   - All of October (month === 10)
   - November 1-15 (month === 11 && day <= 15)

3. **Early Winter**:
   - November 16 onwards (month === 11 && day >= 16)
   - All of December (month === 12)
   - January 1-15 (month === 1 && day <= 15)

4. **Late Winter**:
   - January 16 onwards (month === 1 && day >= 16)
   - All of February (month === 2)
   - March 1-14 (month === 3 && day < 15)

### Return Format

The function returns a string in 24-hour format (HH:mm):

- `'18:00'` for 6:00 PM
- `'17:00'` for 5:00 PM
- `'15:00'` for 3:00 PM
- `'16:00'` for 4:00 PM

## Why Seasonal Fixed Times?

### Previous Approach

- Dynamic calculation: `CeilingToNearest30(Azan + 15 min)`
- Resulted in **13 changes per year**
- Changed approximately every 30 days
- Used 8 different times throughout the year

### Current Approach

- Seasonal fixed times
- Only **4 changes per year**
- Changes every ~91 days
- Uses 4 different times throughout the year

### Benefits

1. **Predictability**: Congregation knows the time for months at a time
2. **Easy to Announce**: Simple seasonal schedule to communicate
3. **Easy to Remember**: Only 4 times to remember
4. **Reduced Confusion**: Fewer changes means fewer missed prayers
5. **Community Alignment**: Matches website expectations (6:00 PM in spring/summer)

## Change Dates

Mark these dates on the calendar for announcements:

- **March 15**: Switch to 6:00 PM (Spring/Summer begins)
- **September 16**: Switch to 5:00 PM (Fall begins)
- **November 16**: Switch to 3:00 PM (Early Winter begins)
- **January 16**: Switch to 4:00 PM (Late Winter begins)

## Testing Considerations

When testing or modifying this rule:

1. **Test all season boundaries**: Especially the transition dates
2. **Test edge cases**:
   - March 14 vs March 15
   - September 15 vs September 16
   - November 15 vs November 16
   - January 15 vs January 16
3. **Test month boundaries**: Ensure correct behavior at month transitions
4. **Verify return format**: Must be HH:mm string format

## Comparison with Azan

The Asr **Azan** (call to prayer) still varies daily based on astronomical calculations. Only the **Iqama** (congregation start time) uses this fixed schedule.

Example for May 2, 2026:

- Asr Azan: 17:10 (5:10 PM) - calculated astronomically
- Asr Iqama: 18:00 (6:00 PM) - fixed seasonal time

This means there can be a gap of 30-90 minutes between Azan and Iqama depending on the season and sun position.

## Admin Overrides

While this rule provides fixed seasonal times, admins can still create overrides for:

- Special events
- Community requests
- Testing purposes
- Temporary adjustments

Overrides take precedence over this seasonal schedule.

## Related Documentation

- `PRAYER_TIMES_GUIDE.md` - Complete prayer times documentation
- `ASR_SCHEDULE_ANNOUNCEMENT.md` - Congregation announcement template
- `IMPLEMENTATION_SUMMARY.md` - Technical details of the change

## Maintenance Notes

### If Adjusting Seasonal Boundaries

Consider:

1. **Daylight patterns**: Times should roughly follow daylight availability
2. **Community feedback**: Are the times practical for work/school schedules?
3. **Consistency**: Keep changes to 4 per year for predictability
4. **Communication**: Update announcement materials

### If Adjusting Times

Consider:

1. **Gap from Azan**: Ensure reasonable time for people to arrive
2. **Work schedules**: Especially for Fall/Winter times
3. **Consistency**: Use 30-minute or 1-hour intervals for simplicity
4. **Testing**: Validate across full year before deploying

## Critical Rules

1. **Iqama >= Azan**: The seasonal time must never be earlier than the Azan
   - This is validated at the service level
   - If seasonal time < Azan, the system will use Azan + 5 minutes
2. **Return format**: Must be 'HH:mm' string (24-hour format)
3. **Month indexing**: dayjs months are 0-indexed, but we add 1 for clarity
4. **Boundary dates**: Be precise with >= and <= operators

## Example Usage

```typescript
import { computeAsrIqama } from './asr.rule';
import dayjs from 'dayjs';

// May 2, 2026 - Spring/Summer season
const asrAzan = dayjs('2026-05-02 17:10');
const iqama = computeAsrIqama(asrAzan);
// Returns: '18:00'

// November 20, 2026 - Early Winter season
const asrAzan2 = dayjs('2026-11-20 14:30');
const iqama2 = computeAsrIqama(asrAzan2);
// Returns: '15:00'
```

## Summary

The Asr seasonal schedule provides a **simple, predictable, and practical** approach to Iqama times while maintaining the accuracy of astronomical Azan calculations. This balance serves the community's needs for both religious accuracy and practical scheduling.
