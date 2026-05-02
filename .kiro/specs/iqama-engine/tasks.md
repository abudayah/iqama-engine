# Implementation Plan: iqama-engine

## Overview

Build a NestJS REST API that computes Islamic congregation (Iqama) times by applying a deterministic rules engine (FR1–FR5) on top of raw astronomical prayer times from the `adhan` library. The implementation proceeds layer by layer: project scaffolding → configuration → data layer → pure rule functions → orchestration services → HTTP layer → integration tests.

## Tasks

- [x] 1. Scaffold NestJS project and install dependencies
  - Run `nest new iqama-engine` (or equivalent) to generate the base project
  - Install runtime dependencies: `adhan`, `dayjs`, `@nestjs/config`, `@nestjs/cache-manager`, `cache-manager`, `@prisma/client`, `prisma`, `class-validator`, `class-transformer`
  - Install dev dependencies: `fast-check`, `@types/node`, Jest/ts-jest (already included by NestJS CLI)
  - Remove boilerplate `AppController` and `AppService` files; keep only `AppModule`
  - _Requirements: 1.1, 1.2_

- [ ] 2. Configuration module
  - [x] 2.1 Create `src/config/app.config.ts` with a `ConfigService`-backed configuration factory
    - Expose `MASJID_LATITUDE` (default `49.2514`), `MASJID_LONGITUDE` (default `-122.7740`), `MASJID_TIMEZONE` (default `America/Vancouver`), `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`, `DATABASE_URL`
    - Register `ConfigModule.forRoot({ isGlobal: true })` in `AppModule`
    - _Requirements: 1.4, 1.5_
  - [x] 2.2 Create `.env.example` at the project root documenting all six environment variables with their defaults and descriptions
    - _Requirements: 1.4, 1.5_

- [ ] 3. Prisma setup and Override data model
  - [x] 3.1 Initialise Prisma (`npx prisma init`) and write `prisma/schema.prisma`
    - Define the `Override` model with fields: `id`, `prayer`, `overrideType`, `value`, `startDate`, `endDate`, `createdAt`, `updatedAt` exactly as specified in the design
    - Set `DATABASE_URL` as the datasource env variable
    - _Requirements: 7.5_
  - [x] 3.2 Create `src/prisma/prisma.module.ts` and `src/prisma/prisma.service.ts`
    - `PrismaService` extends `PrismaClient` and implements `OnModuleInit` / `OnModuleDestroy`
    - Export `PrismaService` from `PrismaModule`
    - _Requirements: 7.5_

- [ ] 4. AdhanAdapter — wrap the `adhan` library
  - [x] 4.1 Create `src/adhan/adhan.module.ts` and `src/adhan/adhan.adapter.ts`
    - Inject `ConfigService` to read `MASJID_LATITUDE`, `MASJID_LONGITUDE`, `MASJID_TIMEZONE`
    - Initialise `Coordinates`, `CalculationMethod.NorthAmerica()` (ISNA), `Madhab.Shafi`, `Rounding.None`
    - Implement `getPrayerTimes(date: Date): RawPrayerTimes` — returns `{ fajr, sunrise, dhuhr, asr, maghrib, isha }` as UTC `Date` objects
    - Convert each returned `Date` to the Masjid_Timezone using `dayjs.tz` before returning
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 5. Time utilities
  - [x] 5.1 Create `src/rules/time-utils.ts` with `ceilingToNearest5`, `ceilingToNearest30`, and `formatHHmm`
    - Implement exactly as specified in the design (sub-minute seconds bump to next minute before rounding)
    - _Requirements: 11.1, 11.3, 11.4_
  - [ ]* 5.2 Write property test for `ceilingToNearest5` and `ceilingToNearest30`
    - **Property 14: Rounding functions are pure and produce correct boundaries**
    - For any minute value in `[0, 59]`, `ceilingToNearest5` returns a multiple of 5 that is `>= input` and is the smallest such multiple
    - For any minute value in `[0, 59]`, `ceilingToNearest30` returns 0 or 30 (within the hour), is `>= input`, and is the smallest such multiple
    - **Validates: Requirements 11.3, 11.4**
  - [ ]* 5.3 Write property test for `formatHHmm` round-trip
    - **Property 13: HH:mm formatting round-trip is identity**
    - For any `HH:mm` string in `[00:00, 23:59]`, parse to dayjs and re-format — must produce the identical string
    - **Validates: Requirements 11.2**

- [ ] 6. FR1 — Maghrib rule
  - [x] 6.1 Create `src/rules/fr1-maghrib.rule.ts`
    - Implement `computeMaghribIqama(maghribAzan: Dayjs): string` → `formatHHmm(ceilingToNearest5(azan.add(5, 'minute')))`
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ]* 6.2 Write unit tests for FR1
    - Test with a known Azan time (e.g., 20:31 → 20:40, 20:25 → 20:30)
    - _Requirements: 2.1_
  - [ ]* 6.3 Write property test for FR1
    - **Property 1: Maghrib Iqama formula holds for all Azan times**
    - For any valid Maghrib Azan (minutes since midnight in `[0, 1439]`), `iqama == ceilingToNearest5(azan + 5)`
    - **Validates: Requirements 2.1**

- [ ] 7. FR2 — Dhuhr DST toggle rule
  - [x] 7.1 Create `src/rules/fr2-dhuhr.rule.ts`
    - Implement `computeDhuhrIqama(date: string, tz: string): string`
    - DST detection: compare `dayjs.tz(date, tz).utcOffset()` against `dayjs.tz(date, tz).startOf('year').utcOffset()`
    - Return `"13:45"` if DST active, `"12:45"` otherwise
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [ ]* 7.2 Write unit tests for FR2
    - Test a known DST date (e.g., July 1) → `13:45`
    - Test a known non-DST date (e.g., January 15) → `12:45`
    - _Requirements: 3.1, 3.2_
  - [ ]* 7.3 Write property test for FR2
    - **Property 2: DST flag is correct for all dates**
    - For any date in the Masjid_Timezone, `is_dst` must equal `true` iff UTC offset > UTC offset of Jan 1 of the same year
    - **Validates: Requirements 3.3**

- [ ] 8. FR3 — Fajr dynamic limits rule
  - [x] 8.1 Create `src/rules/fr3-fajr.rule.ts`
    - Implement `computeFajrIqama(fajrAzan: Dayjs, sunrise: Dayjs): string`
    - Compute `maxDelay = fajrAzan + 75 min`, `safeSunriseLimit = sunrise - 45 min`, `baseTarget = min(maxDelay, safeSunriseLimit)`
    - Apply floor clamp: if `baseTarget < fajrAzan + 10 min`, set `baseTarget = fajrAzan + 10 min`
    - Return `formatHHmm(ceilingToNearest5(baseTarget))`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ]* 8.2 Write unit tests for FR3
    - Test branch where `maxDelay` wins (short summer night)
    - Test branch where `safeSunriseLimit` wins (long winter night)
    - Test branch where floor clamp is applied (extreme edge case)
    - _Requirements: 4.1–4.5_
  - [ ]* 8.3 Write property test for FR3
    - **Property 3: Fajr Iqama satisfies the floor clamp and rounding invariants**
    - For any Fajr Azan and Sunrise time, `iqama >= azan + 10 min` AND `iqama minutes % 5 == 0`
    - **Validates: Requirements 4.4, 4.5**

- [ ] 9. FR4 — Asr clean interval rounding rule
  - [x] 9.1 Create `src/rules/fr4-asr-isha.rule.ts` with `computeAsrIqama(asrAzan: Dayjs): string`
    - Compute `ceilingToNearest30(asrAzan + 15 min)` and format as HH:mm
    - _Requirements: 5.1_
  - [ ]* 9.2 Write unit tests for Asr rule
    - Test Azan at 15:10 → rounds to 15:30; Azan at 15:20 → rounds to 16:00
    - _Requirements: 5.1_
  - [ ]* 9.3 Write property test for Asr rule
    - **Property 4: Asr Iqama always lands on a :00 or :30 boundary**
    - For any Asr Azan, `iqama.minute() in [0, 30]` AND `iqama >= azan + 15 min`
    - **Validates: Requirements 5.1**

- [ ] 10. FR4 — Isha seasonal scale rule
  - [x] 10.1 Add `computeIshaIqama(ishaAzan: Dayjs): string` to `src/rules/fr4-asr-isha.rule.ts`
    - Implement the three-branch gap interpolation: `> 22:30 → gap=5`, `< 20:00 → gap=15`, else linear interpolation
    - Return `formatHHmm(ceilingToNearest5(ishaAzan + gap))`
    - _Requirements: 5.2, 5.3, 5.4_
  - [ ]* 10.2 Write unit tests for Isha rule
    - Test Azan at 23:00 (after 22:30) → gap = 5
    - Test Azan at 19:30 (before 20:00) → gap = 15
    - Test Azan at 21:15 (interpolated midpoint) → gap ≈ 10
    - _Requirements: 5.2, 5.3, 5.4_
  - [ ]* 10.3 Write property test for Isha rule
    - **Property 5: Isha gap is always in [5, 15] minutes and output is rounded to nearest 5**
    - For any Isha Azan, gap ∈ [5, 15], gap decreases monotonically as Azan increases in [20:00, 22:30], and `iqama == ceilingToNearest5(azan + gap)`
    - **Validates: Requirements 5.2, 5.3, 5.4**

- [ ] 11. FR5 — Friday Block Shift rule
  - [x] 11.1 Create `src/rules/fr5-friday-block.rule.ts`
    - Implement `getPrecedingFridayDate(date: string, tz: string): string` — returns the same date if Friday, else the most recent preceding Friday
    - _Requirements: 6.1, 6.2_
  - [x] 11.2 Integrate Friday Block into `RulesService` (create `src/rules/rules.module.ts` and `src/rules/rules.service.ts`)
    - `computeIqama(date: string, raw: RawPrayerTimes, fridayRaw?: RawPrayerTimes): IqamaTimes`
    - When `fridayRaw` is provided, pass it to FR3 and FR4 for Fajr, Asr, Isha; use `raw` for Maghrib and Dhuhr
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [ ]* 11.3 Write unit tests for Friday Block
    - Test that a Saturday uses the preceding Friday's Fajr/Asr/Isha values
    - Test that a Friday uses its own values
    - Test that Maghrib and Dhuhr are always from the requested date
    - _Requirements: 6.1–6.5_
  - [ ]* 11.4 Write property test for Friday Block — non-Friday dates
    - **Property 6: Friday Block — non-Friday dates use the preceding Friday's Fajr, Asr, and Isha Iqama**
    - For any non-Friday date D, computed Fajr/Asr/Isha must equal values computed for the immediately preceding Friday
    - **Validates: Requirements 6.2, 6.3, 6.4**
  - [ ]* 11.5 Write property test for Friday Block — Maghrib and Dhuhr independence
    - **Property 7: Maghrib and Dhuhr are never affected by the Friday Block**
    - For any non-Friday date D, Maghrib iqama = `ceilingToNearest5(D's Maghrib Azan + 5)` and Dhuhr iqama = DST-determined fixed value for D
    - **Validates: Requirements 2.2, 2.3, 3.5, 6.5**

- [x] 12. Checkpoint — Ensure all rule unit and property tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. OverrideService — admin override interception
  - [x] 13.1 Create `src/override/override.module.ts` and `src/override/override.service.ts`
    - Inject `PrismaService`; implement `getOverridesForDate(date: string): Promise<Override[]>`
    - Query: `WHERE startDate <= date AND endDate >= date`
    - _Requirements: 7.1, 7.5_
  - [x] 13.2 Implement override application logic in `OverrideService` or a helper
    - `FIXED` override: return `override.value` directly, skip FR1–FR5
    - `OFFSET` override: return `formatHHmm(ceilingToNearest5(azan + offsetMinutes))`
    - Set `hasOverrides = true` when at least one override was applied
    - _Requirements: 7.2, 7.3, 7.4, 7.6_
  - [ ]* 13.3 Write unit tests for OverrideService
    - Test FIXED override returns exact value regardless of Azan
    - Test OFFSET override applies `ceilingToNearest5(azan + offset)`
    - Test no-override path falls through to rules engine
    - Test `has_overrides` flag is set correctly
    - _Requirements: 7.2, 7.3, 7.4, 7.6_
  - [ ]* 13.4 Write property test for override logic
    - **Property 8: FIXED override always replaces the Iqama; OFFSET override applies CeilingToNearest5; has_overrides reflects override application**
    - For any prayer and Azan time: FIXED → iqama equals override value exactly; OFFSET → iqama equals `ceilingToNearest5(azan + offset)`; `has_overrides` is true iff at least one override applied
    - **Validates: Requirements 7.2, 7.3, 7.6**

- [ ] 14. CacheService — monthly cache build and retrieval
  - [x] 14.1 Create `src/cache/cache.module.ts` and `src/cache/cache.service.ts`
    - Configure `CacheModule.registerAsync` with Upstash Redis as primary store and in-memory fallback
    - Implement `getOrBuildMonth(yearMonth: string): Promise<DailySchedule[]>`
    - Cache key: `"schedule:YYYY-MM"`, TTL: 30 days (2_592_000_000 ms)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [x] 14.2 Implement the monthly build loop inside `CacheService`
    - Enumerate all days in the month; for each day determine `fridayDate` (may fall in prior month)
    - Fetch overrides, apply FR6 → FR1–FR5, build `DailySchedule` objects
    - Ensure cross-month Friday Block lookback computes the prior month's Friday data correctly
    - _Requirements: 10.2, 10.6_
  - [ ]* 14.3 Write unit tests for CacheService
    - Test cache hit path returns filtered results without rebuilding
    - Test cache miss path builds the full month and stores it
    - Test in-memory fallback activates when Redis is unavailable
    - _Requirements: 10.1, 10.3, 10.5_
  - [ ]* 14.4 Write property test for monthly cache completeness
    - **Property 11: Monthly cache contains exactly one entry per day in the month**
    - For any year-month, the built array has exactly `daysInMonth` entries with `date` fields covering every day from 1st to last
    - **Validates: Requirements 10.2**
  - [ ]* 14.5 Write property test for cross-month Friday Block lookback
    - **Property 12: Cross-month Friday Block lookback is correct for the first days of a month**
    - For any month where the 1st is not a Friday, Fajr/Asr/Isha for the first day(s) equal the values computed for the preceding Friday (which may be in the prior month)
    - **Validates: Requirements 10.6**

- [ ] 15. ScheduleService — orchestration
  - [x] 15.1 Create `src/schedule/schedule.module.ts` and `src/schedule/schedule.service.ts`
    - Inject `CacheService`; implement `getScheduleForDate(date: string): Promise<DailySchedule>`
    - Implement `getScheduleForRange(startDate: string, endDate: string): Promise<DailySchedule[]>`
    - Delegate to `CacheService.getOrBuildMonth`, then filter to the requested date(s)
    - _Requirements: 8.2, 8.3, 9.1, 9.2, 9.3_
  - [ ]* 15.2 Write property test for single-date response shape
    - **Property 9: Single-date response contains all required fields and all time values are valid HH:mm strings**
    - For any valid `YYYY-MM-DD`, response has all required fields and every `azan`/`iqama` matches `/^\d{2}:\d{2}$/`
    - **Validates: Requirements 8.2, 9.1, 9.2, 9.3**
  - [ ]* 15.3 Write property test for date-range response length
    - **Property 10: Date-range response contains exactly the right number of entries**
    - For any valid `start_date <= end_date`, response array length equals `daysBetween + 1` and dates form a contiguous ascending sequence
    - **Validates: Requirements 8.3**

- [ ] 16. ScheduleController and request validation
  - [x] 16.1 Create `src/schedule/dto/schedule-query.dto.ts` with `ScheduleQueryDto`
    - Add `@IsOptional()`, `@Matches(/^\d{4}-\d{2}-\d{2}$/)` decorators for `date`, `start_date`, `end_date`
    - Enable `ValidationPipe` globally in `main.ts` with `transform: true`
    - _Requirements: 8.1, 8.6_
  - [x] 16.2 Create `src/schedule/schedule.controller.ts`
    - `@Get()` handler on `@Controller('api/v1/schedule')` accepting `ScheduleQueryDto`
    - Implement mutual-exclusion validation: `date` + (`start_date` or `end_date`) → 400; neither `date` nor both `start_date`+`end_date` → 400; only one of `start_date`/`end_date` → 400; `start_date > end_date` → 400
    - Delegate to `ScheduleService.getScheduleForDate` or `getScheduleForRange`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [x] 16.3 Create `src/schedule/dto/daily-schedule.dto.ts` with the `DailySchedule` response interface/class
    - _Requirements: 9.1, 9.2, 9.3_
  - [ ]* 16.4 Write unit tests for controller validation
    - Test all five 400 error cases with descriptive messages matching the design's error table
    - _Requirements: 8.4, 8.5, 8.6_

- [x] 17. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Integration tests
  - [x] 18.1 Write integration test: `GET /api/v1/schedule?date=YYYY-MM-DD` returns a valid `DailySchedule`
    - Verify all required fields are present and all time values match `/^\d{2}:\d{2}$/`
    - _Requirements: 8.2, 9.1, 9.2, 9.3_
  - [x] 18.2 Write integration test: `GET /api/v1/schedule?start_date=...&end_date=...` returns correct array length
    - Verify array length and contiguous date sequence
    - _Requirements: 8.3_
  - [x] 18.3 Write integration tests for all 400 error cases
    - `date` + `start_date` → 400; missing params → 400; invalid format → 400; `start_date > end_date` → 400
    - _Requirements: 8.4, 8.5, 8.6_
  - [ ]* 18.4 Write integration test: override records are reflected with `has_overrides: true`
    - Seed a FIXED and an OFFSET override in the test database; verify response reflects them
    - _Requirements: 7.2, 7.3, 7.6_
  - [ ]* 18.5 Write integration test: cache hit path is served from cache
    - Mock Redis; make two requests for the same month; verify the build function is called only once
    - _Requirements: 10.1, 10.3_

- [x] 19. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with a minimum of 100 iterations per property
- The tag format for property tests is: `// Feature: iqama-engine, Property N: <property text>`
- All 14 correctness properties from the design document are covered by property test sub-tasks
- Checkpoints at tasks 12, 17, and 19 ensure incremental validation
- The Friday Block (FR5) is a pure date-routing concern — FR3/FR4 remain unaware of it
- Override interception (FR6) happens before the rules engine, keeping rules pure and independently testable
