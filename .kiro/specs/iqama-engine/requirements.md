# Requirements Document

## Introduction

The `iqama-engine` is a NestJS REST API that acts as a deterministic rules engine. It accepts raw astronomical prayer times produced by the `adhan` npm library and applies a set of explicit community rounding and offset rules to calculate congregation (Iqama) times for a mosque. The engine supports a single-date and date-range query API, a Redis-backed monthly cache, admin overrides stored in PostgreSQL, and a Friday Block Shift mechanism that locks Fajr, Asr, and Isha Iqama times to the preceding Friday's calculated values for the rest of the week.

---

## Glossary

- **Adhan_Library**: The `adhan` npm package used to compute raw astronomical prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha, Sunrise) for a given date and location.
- **Azan**: The raw astronomical prayer time produced by the Adhan_Library for a given prayer and date.
- **Iqama**: The congregation start time calculated by the Rules_Engine from the Azan time.
- **Rules_Engine**: The NestJS service that applies FR1–FR6 sequentially to produce Iqama times.
- **Schedule_Service**: The NestJS service that orchestrates cache lookup, override resolution, and Rules_Engine invocation to produce a full daily schedule.
- **Cache_Service**: The NestJS service responsible for computing and storing a full month's schedule in Redis and retrieving filtered results.
- **Override_Service**: The NestJS service that queries the Overrides table in PostgreSQL to intercept prayer times before the Rules_Engine runs.
- **Overrides_Table**: A PostgreSQL table managed by Prisma ORM containing admin-defined fixed or offset prayer time overrides with a date range.
- **Friday_Block**: The mechanism by which Fajr, Asr, and Isha Iqama times are locked to the values calculated for the immediately preceding Friday (or the current day if it is Friday).
- **DST**: Daylight Saving Time status of a given date as determined by `dayjs` with the `timezone` plugin.
- **CeilingToNearest5**: A rounding function that rounds a time up to the nearest 5-minute boundary (e.g., 20:31 → 20:35).
- **CeilingToNearest30**: A rounding function that rounds a time up to the nearest 30-minute boundary on the clock (i.e., `:00` or `:30`).
- **ISNA**: Islamic Society of North America prayer time calculation method, as implemented in the Adhan_Library.
- **Asr_Standard**: The Shafi/Maliki/Hanbali juristic method for Asr calculation (shadow ratio = 1), as opposed to the Hanafi method (shadow ratio = 2).
- **Masjid_Coordinates**: The configured latitude and longitude of the mosque, used as input to the Adhan_Library. Default values: latitude `49.2514`, longitude `-122.7740` (Masjid Alhidayah — Islamic Society of BC, 2626 Kingsway Ave, Port Coquitlam, BC V3C 1T7).
- **Masjid_Timezone**: The configured IANA timezone string used for all date/time arithmetic. Default value: `America/Vancouver`.

---

## Requirements

### Requirement 1: Adhan Library Configuration

**User Story:** As a mosque administrator, I want the prayer time engine to use the correct location, calculation method, and timezone, so that all raw Azan times are astronomically accurate for my community.

#### Acceptance Criteria

1. THE Rules_Engine SHALL initialize the Adhan_Library with Masjid_Coordinates, the ISNA calculation method, and the Asr_Standard juristic method.
2. THE Rules_Engine SHALL perform all date and time arithmetic in the Masjid_Timezone using `dayjs` with the `timezone` and `utc` plugins.
3. WHEN the Adhan_Library produces a raw prayer time, THE Rules_Engine SHALL convert that time to the Masjid_Timezone before applying any rules.
4. THE Rules_Engine SHALL expose Masjid_Coordinates and Masjid_Timezone as environment-variable-backed configuration values so they can be changed without code modification.
5. THE Rules_Engine SHALL use the following default values when the corresponding environment variables are not set: latitude `49.2514`, longitude `-122.7740`, timezone `America/Vancouver` (corresponding to Masjid Alhidayah — Islamic Society of BC, 2626 Kingsway Ave, Port Coquitlam, BC V3C 1T7).

---

### Requirement 2: FR1 — Maghrib Iqama Calculation

**User Story:** As a worshipper, I want the Maghrib Iqama time to be a clean, rounded time shortly after sunset, so that the congregation starts at a predictable interval.

#### Acceptance Criteria

1. WHEN the Rules_Engine calculates Maghrib Iqama for any date, THE Rules_Engine SHALL compute `Iqama = CeilingToNearest5(Azan + 5 minutes)`.
2. THE Rules_Engine SHALL calculate Maghrib Iqama using the astronomical Azan for the specific requested date, not a Friday Block value.
3. THE Rules_Engine SHALL NOT apply the Friday_Block to Maghrib Iqama.

---

### Requirement 3: FR2 — Dhuhr DST Toggle

**User Story:** As a worshipper, I want the Dhuhr Iqama time to reflect whether we are in summer or winter, so that the congregation time is consistent and predictable regardless of the raw astronomical noon.

#### Acceptance Criteria

1. WHEN the Rules_Engine calculates Dhuhr Iqama and DST is active on the requested date, THE Rules_Engine SHALL return `13:45` as the Dhuhr Iqama time.
2. WHEN the Rules_Engine calculates Dhuhr Iqama and DST is not active on the requested date, THE Rules_Engine SHALL return `12:45` as the Dhuhr Iqama time.
3. THE Rules_Engine SHALL determine DST status using `dayjs` with the `timezone` plugin applied to the Masjid_Timezone.
4. THE Rules_Engine SHALL ignore the raw Dhuhr Azan time when computing Dhuhr Iqama.
5. THE Rules_Engine SHALL NOT apply the Friday_Block to Dhuhr Iqama.

---

### Requirement 4: FR3 — Dynamic Fajr Iqama Calculation

**User Story:** As a worshipper, I want the Fajr Iqama time to protect my sleep in summer while still allowing me to pray and commute to work in winter, so that the congregation time is practical year-round.

#### Acceptance Criteria

1. WHEN the Rules_Engine calculates Fajr Iqama, THE Rules_Engine SHALL compute `Max_Delay = Azan + 75 minutes`.
2. WHEN the Rules_Engine calculates Fajr Iqama, THE Rules_Engine SHALL compute `Safe_Sunrise_Limit = Sunrise - 45 minutes`.
3. WHEN the Rules_Engine calculates Fajr Iqama, THE Rules_Engine SHALL compute `Base_Target = Math.min(Max_Delay, Safe_Sunrise_Limit)`.
4. WHEN `Base_Target` is less than `Azan + 10 minutes`, THE Rules_Engine SHALL set `Base_Target = Azan + 10 minutes`.
5. WHEN the Rules_Engine calculates Fajr Iqama, THE Rules_Engine SHALL compute `Iqama = CeilingToNearest5(Base_Target)`.
6. THE Rules_Engine SHALL use the Sunrise time for the specific date being evaluated (the preceding Friday's Sunrise when the Friday_Block is active).

---

### Requirement 5: FR4 — Asr and Isha Clean Interval Rounding

**User Story:** As a worshipper, I want Asr and Isha Iqama times to snap to clean clock intervals that account for the season, so that the schedule is easy to remember and avoids unreasonably late nights.

#### Acceptance Criteria

1. WHEN the Rules_Engine calculates Asr Iqama, THE Rules_Engine SHALL compute a target of `Azan + 15 minutes` and then round that target up to the nearest 30-minute clock mark (`:00` or `:30`) using CeilingToNearest30.
2. WHEN the Rules_Engine calculates Isha Iqama and the Isha Azan time is after 22:30 (local), THE Rules_Engine SHALL compute `Iqama = CeilingToNearest5(Azan + 5 minutes)`.
3. WHEN the Rules_Engine calculates Isha Iqama and the Isha Azan time is before 20:00 (local), THE Rules_Engine SHALL compute `Iqama = CeilingToNearest5(Azan + 15 minutes)`.
4. WHEN the Rules_Engine calculates Isha Iqama and the Isha Azan time is between 20:00 and 22:30 (local, inclusive), THE Rules_Engine SHALL linearly interpolate the gap between 5 minutes and 15 minutes proportional to the Azan time's position in that window, then compute `Iqama = CeilingToNearest5(Azan + interpolated_gap)`.

---

### Requirement 6: FR5 — Friday Block Shift

**User Story:** As a worshipper, I want Fajr, Asr, and Isha Iqama times to remain constant throughout the week, so that I can memorise the schedule without checking it daily.

#### Acceptance Criteria

1. WHEN the requested date is a Friday, THE Rules_Engine SHALL calculate Fajr, Asr, and Isha Iqama using that Friday's own astronomical data (FR3 and FR4 applied normally).
2. WHEN the requested date is Saturday through Thursday, THE Rules_Engine SHALL identify the immediately preceding Friday's date.
3. WHEN the requested date is Saturday through Thursday, THE Rules_Engine SHALL compute Fajr, Asr, and Isha Iqama using the preceding Friday's Azan and Sunrise times as inputs to FR3 and FR4.
4. THE Rules_Engine SHALL return the preceding Friday's calculated Iqama values as the Iqama times for the requested date.
5. THE Rules_Engine SHALL NOT apply the Friday_Block to Maghrib or Dhuhr Iqama.

---

### Requirement 7: FR6 — Admin Override Interception

**User Story:** As a mosque administrator, I want to be able to override any prayer's Iqama time for a specific date range, so that I can accommodate special events or Ramadan schedules without changing the codebase.

#### Acceptance Criteria

1. WHEN the Schedule_Service processes a request for a given date, THE Override_Service SHALL query the Overrides_Table for all records where `startDate <= requestedDate AND endDate >= requestedDate`.
2. WHEN a matching override record exists for a specific prayer with `overrideType = 'FIXED'`, THE Schedule_Service SHALL return the override's `value` field as the Iqama time for that prayer and SHALL NOT invoke FR1–FR5 for that prayer.
3. WHEN a matching override record exists for a specific prayer with `overrideType = 'OFFSET'`, THE Schedule_Service SHALL add the override's `value` (in minutes) to the raw Azan time and return `CeilingToNearest5(Azan + offset)` as the Iqama time for that prayer, skipping FR1–FR5 for that prayer.
4. WHEN no matching override record exists for a prayer, THE Schedule_Service SHALL proceed with FR1–FR5 for that prayer.
5. THE Override_Service SHALL use Prisma ORM to query a PostgreSQL database.
6. THE Schedule_Service SHALL set `has_overrides = true` in the response metadata when at least one override was applied for that date.

---

### Requirement 8: API Endpoint — Single Date and Date Range

**User Story:** As a frontend developer, I want to query the schedule for a single date or a range of dates via a REST API, so that I can display prayer times in a web or mobile application.

#### Acceptance Criteria

1. THE Schedule_Service SHALL expose a `GET /api/v1/schedule` endpoint.
2. WHEN the request includes a `date` query parameter in `YYYY-MM-DD` format, THE Schedule_Service SHALL return a single schedule object for that date.
3. WHEN the request includes `start_date` and `end_date` query parameters in `YYYY-MM-DD` format, THE Schedule_Service SHALL return an array of schedule objects for each date in the inclusive range.
4. IF the `date` parameter is provided alongside `start_date` or `end_date`, THEN THE Schedule_Service SHALL return a 400 Bad Request error with a descriptive message.
5. IF neither `date` nor both of `start_date` and `end_date` are provided, THEN THE Schedule_Service SHALL return a 400 Bad Request error with a descriptive message.
6. IF a date parameter value does not conform to `YYYY-MM-DD` format, THEN THE Schedule_Service SHALL return a 400 Bad Request error with a descriptive message.

---

### Requirement 9: Response Schema

**User Story:** As a frontend developer, I want the API to return a consistent, well-structured JSON object for each day, so that I can reliably parse and display the data.

#### Acceptance Criteria

1. THE Schedule_Service SHALL return each daily schedule as a JSON object containing: `date` (YYYY-MM-DD), `day_of_week` (full English weekday name), `is_dst` (boolean), `fajr`, `dhuhr`, `asr`, `maghrib`, `isha` (each with `azan` and `iqama` as HH:mm strings), and a `metadata` object.
2. THE Schedule_Service SHALL include in `metadata`: `calculation_method` (string, value `"ISNA"`) and `has_overrides` (boolean).
3. THE Schedule_Service SHALL format all `azan` and `iqama` time values as 24-hour `HH:mm` strings in the Masjid_Timezone.

---

### Requirement 10: Monthly Cache Strategy

**User Story:** As a system operator, I want the API to serve responses quickly and avoid redundant computation, so that the service can handle concurrent requests efficiently.

#### Acceptance Criteria

1. WHEN the Schedule_Service receives a request for any date in a given month, THE Cache_Service SHALL check whether a full month's schedule for that month is already stored in the cache.
2. WHEN no cached month exists, THE Cache_Service SHALL compute the schedule for every day in that calendar month, store the full array in Redis under a key scoped to the year and month, and set a TTL of 30 days.
3. WHEN a cached month exists, THE Cache_Service SHALL retrieve the cached array and filter it to return only the requested date(s).
4. THE Cache_Service SHALL use `@nestjs/cache-manager` with an Upstash Redis store as the primary cache backend.
5. WHERE an Upstash Redis connection is unavailable, THE Cache_Service SHALL fall back to an in-memory cache store so that the service remains operational.
6. WHEN computing a month's schedule, THE Cache_Service SHALL ensure that the Friday_Block lookback for the first days of the month correctly references the preceding month's Friday data (i.e., it SHALL compute the preceding Friday's data even if that Friday falls in the prior month).

---

### Requirement 11: Pretty-Printer and Round-Trip Consistency

**User Story:** As a developer, I want the time formatting functions to be invertible and consistent, so that serialisation and deserialisation of schedule data does not introduce drift.

#### Acceptance Criteria

1. THE Schedule_Service SHALL provide a time formatting function that converts a `Date` or `dayjs` object to an `HH:mm` string in the Masjid_Timezone.
2. FOR ALL valid `HH:mm` time strings produced by the formatting function, parsing the string back to a time value and re-formatting it SHALL produce the identical `HH:mm` string (round-trip property).
3. THE CeilingToNearest5 function SHALL be a pure function: given the same input minute value, it SHALL always return the same output minute value.
4. THE CeilingToNearest30 function SHALL be a pure function: given the same input minute value, it SHALL always return the same output minute value.
