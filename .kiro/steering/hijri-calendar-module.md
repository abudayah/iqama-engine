---
inclusion: fileMatch
fileMatchPattern: 'src/hijri-calendar/**'
---

# Hijri Calendar Module

This document describes the `src/hijri-calendar/` module, which manages Islamic calendar features: moon-sighting overrides, Eid prayer times, and Qiyam al-Layl configuration.

## Overview

The Hijri calendar module extends the base prayer schedule with three features:

1. **Moon Sighting Override** — Admin can declare a Hijri month as 29 or 30 days
2. **Eid Prayer Times** — Admin sets prayer times for Eid al-Fitr and Eid al-Adha
3. **Qiyam al-Layl** — Admin sets the nightly start time for the last 10 nights of Ramadan

## Services

### `QiyamConfigService`

Stores and retrieves the Qiyam al-Layl start time per Hijri year.

- **Table**: `QiyamConfig` (`hijri_year` PK, `start_time` HH:mm)
- **`getForYear(hijriYear)`** — returns config or `null` if not set
- **`upsert(hijriYear, startTime)`** — creates or updates the config

### `CalendarOverrideService`

Stores moon-sighting length overrides for a given Hijri year + month.

- **Table**: `CalendarOverride` (`hijri_year`, `hijri_month`, `length` 29|30)
- **`getOverride(year, month)`** — returns override or `null`
- **`upsert(year, month, length)`** — creates or updates the override
- **`delete(year, month)`** — removes the override (reverts to astronomical)

### `HijriCalendarController`

REST endpoints consumed by the admin UI.

| Method   | Path                           | Description                          |
| -------- | ------------------------------ | ------------------------------------ |
| `GET`    | `/hijri-calendar/status`       | Current Hijri date + override status |
| `POST`   | `/hijri-calendar/override`     | Set month length override            |
| `DELETE` | `/hijri-calendar/override`     | Remove month length override         |
| `GET`    | `/hijri-calendar/eid-prayers`  | List Eid prayer records              |
| `POST`   | `/hijri-calendar/eid-prayers`  | Save Eid prayer times                |
| `GET`    | `/hijri-calendar/qiyam-config` | Get Qiyam config for current year    |
| `POST`   | `/hijri-calendar/qiyam-config` | Save Qiyam start time                |

## Schedule Integration

`ScheduleBuilderService.buildMonth()` integrates Hijri calendar data into each `DailySchedule`:

### Qiyam al-Layl injection

```
if (qiyamConfig && isQiyamNight(date)) {
  schedule.qiyam_time = qiyamConfig.start_time;
}
```

**`isQiyamNight` rule**: Hijri month = 9 (Ramadan) AND Hijri day ∈ {20, 21, …, 29}.

- Day 30 is **excluded** — it is Eid eve, not a Qiyam night.
- The qualifying range is the last 10 nights of Ramadan (nights 20–29).

### Eid prayer injection

```
if (isAstronomicalEidDay(date)) {
  schedule.eid_prayer_1 = ...;
  schedule.eid_prayer_2 = ...;
}
```

**`isAstronomicalEidDay` rule**: 1st Shawwal (month 10, day 1) OR 10th Dhul-Hijjah (month 12, day 10).

Fallback times when no `SpecialPrayer` record exists: `07:00` / `08:30`.

## Hijri Date Conversion

The module uses the `dayjs-hijri` plugin via `(date as any).calendar('hijri')`.

- `.month()` returns 0-indexed month → add 1 for 1-based comparison
- `.date()` returns the Hijri day of month (1-based)
- `.year()` returns the Hijri year (e.g., 1447)

## Critical Rules

1. **Qiyam days 20–29 only**: Never inject `qiyam_time` on day 30 of Ramadan.
2. **Eid uses astronomical date**: The `eid_prayer_1`/`eid_prayer_2` fields are injected based on the astronomical Hijri calendar, not the moon-sighting override. The override affects the _display_ date in the admin UI.
3. **Qiyam config is per Hijri year**: Fetch once per `buildMonth` call using the Hijri year of the first day of the month.
4. **Fallback Eid times**: Always provide fallback times (07:00 / 08:30) so the schedule is never missing Eid prayer data.

## Testing

- **Unit tests**: `src/schedule-builder/schedule-builder.service.spec.ts` — qiyam injection section
- **Property-based tests**: `src/schedule-builder/schedule-builder.service.pbt.spec.ts` — Property 2
- Key test dates for Hijri 1447 / Gregorian 2026-03:
  - `2026-03-08` = Hijri 9/19 → no qiyam
  - `2026-03-09` = Hijri 9/20 → qiyam ✓
  - `2026-03-18` = Hijri 9/29 → qiyam ✓
  - `2026-03-19` = Hijri 9/30 → no qiyam
