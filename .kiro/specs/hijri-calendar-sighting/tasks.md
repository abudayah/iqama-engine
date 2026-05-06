# Implementation Plan: Hijri Calendar Sighting

## Overview

Implement moon-sighting override capability across the `iqama-engine` (NestJS) and `iqama-ui` (React/TypeScript) workspaces. The backend adds a new `HijriCalendarModule` with two endpoints and two new Prisma models. The frontend adds pure logic functions, a service, a hook, a `SightingCard` component, and an `EidPrayerModal` component wired into the dashboard.

## Tasks

- [x] 1. Add Prisma models and run migration
  - Add `CalendarOverride` and `SpecialPrayer` models to `iqama-engine/prisma/schema.prisma` exactly as specified in the design, including the `@@unique` composite constraints
  - Run `npx prisma migrate dev --name add-hijri-calendar-models` to generate and apply the migration
  - Run `npx prisma generate` to regenerate the Prisma client
  - _Requirements: 3.1, 3.2_

- [x] 2. Create backend DTOs and validation
  - [x] 2.1 Create `iqama-engine/src/hijri-calendar/dto/hijri-calendar-status.dto.ts` with the `HijriCalendarStatusDto` class
    - Fields: `gregorianDate: string`, `hijriMonth: number`, `hijriDay: number`, `hasOverride: boolean`
    - _Requirements: 1.1_
  - [x] 2.2 Create `iqama-engine/src/hijri-calendar/dto/submit-override.dto.ts` with `EidPrayerEntryDto`, `EidConfigDto`, and `SubmitOverrideDto` classes
    - Use `class-validator` decorators: `@IsIn([29, 30])` on `length`, `@IsInt()` and `@Min(1) @Max(12)` on `hijriMonth`, `@ValidateNested()` and `@Type()` on `eidConfig`
    - Implement a custom class-level validator (`@ValidateIf` or a custom `@ValidatorConstraint`) that enforces: `hijriMonth` 9 or 11 requires `eidConfig`; `hijriMonth` 9 requires `eidConfig.type === 'EID_AL_FITR'`; `hijriMonth` 11 requires `eidConfig.type === 'EID_AL_ADHA'`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 3. Implement `CalendarOverrideService`
  - [x] 3.1 Create `iqama-engine/src/hijri-calendar/calendar-override.service.ts`
    - Inject `PrismaService`
    - Implement `getStatus(): Promise<HijriCalendarStatusDto>` — use `dayjs` from `src/dayjs.ts` to get the current Hijri day and month via `iDate()`, query `prisma.calendarOverride.findUnique` with `{ where: { hijri_year_hijri_month: { hijri_year, hijri_month } } }` to set `hasOverride`
    - Implement `upsertCalendarOverride(hijriYear, hijriMonth, length)` — call `prisma.calendarOverride.upsert` with the composite unique key and `is_manual_override: true`
    - Implement `upsertSpecialPrayer(type, hijriYear, date, prayers)` — call `prisma.specialPrayer.upsert` with the composite unique key
    - Implement `submitOverride(dto: SubmitOverrideDto)` — call `upsertCalendarOverride`, then conditionally call `upsertSpecialPrayer` if `dto.eidConfig` is present
    - _Requirements: 1.1, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4_
  - [ ]\* 3.2 Write unit tests for `CalendarOverrideService` in `calendar-override.service.spec.ts`
    - Mock `PrismaService`; test `getStatus` returns correct DTO shape; test `upsertCalendarOverride` calls Prisma with all four required fields; test `upsertSpecialPrayer` calls Prisma with all four required fields; test `submitOverride` calls both upsert methods when `eidConfig` is present and only `upsertCalendarOverride` when absent
    - _Requirements: 1.1, 2.7, 2.8, 3.1, 3.2_
  - [ ]\* 3.3 Write property test for `CalendarOverrideService` — Property 2: CalendarOverride upsert stores all required fields
    - `// Feature: hijri-calendar-sighting, Property 2: CalendarOverride upsert stores all required fields`
    - Generate random valid `(hijriYear, hijriMonth 1–12, length 29|30)` and assert Prisma `upsert` is called with `hijri_year`, `hijri_month`, `length`, and `is_manual_override: true`
    - **Property 2: CalendarOverride upsert stores all required fields**
    - **Validates: Requirements 3.1**
    - _numRuns: 100_
  - [ ]\* 3.4 Write property test for `CalendarOverrideService` — Property 3: SpecialPrayer upsert stores all required fields
    - `// Feature: hijri-calendar-sighting, Property 3: SpecialPrayer upsert stores all required fields`
    - Generate random valid `(type ∈ {EID_AL_FITR, EID_AL_ADHA}, hijriYear, date YYYY-MM-DD, non-empty prayers array)` and assert Prisma `upsert` is called with all four required fields
    - **Property 3: SpecialPrayer upsert stores all required fields**
    - **Validates: Requirements 3.2**
    - _numRuns: 100_
  - [ ]\* 3.5 Write property test for `CalendarOverrideService` — Property 4: CalendarOverride upsert is idempotent
    - `// Feature: hijri-calendar-sighting, Property 4: CalendarOverride upsert is idempotent`
    - For any `(hijriYear, hijriMonth)` pair, call `upsertCalendarOverride` twice and assert Prisma `upsert` (not `create`) is called on both invocations
    - **Property 4: CalendarOverride upsert is idempotent**
    - **Validates: Requirements 3.3**
    - _numRuns: 100_
  - [ ]\* 3.6 Write property test for `CalendarOverrideService` — Property 5: SpecialPrayer upsert is idempotent
    - `// Feature: hijri-calendar-sighting, Property 5: SpecialPrayer upsert is idempotent`
    - For any `(hijriYear, type)` pair, call `upsertSpecialPrayer` twice and assert Prisma `upsert` (not `create`) is called on both invocations
    - **Property 5: SpecialPrayer upsert is idempotent**
    - **Validates: Requirements 3.4**
    - _numRuns: 100_

- [x] 4. Implement `HijriCalendarController` and wire the module
  - [x] 4.1 Create `iqama-engine/src/hijri-calendar/hijri-calendar.controller.ts`
    - Decorate with `@Controller('api/v1/hijri-calendar')` and `@UseGuards(ApiKeyGuard)`
    - Implement `GET /status` handler calling `calendarOverrideService.getStatus()`, returning HTTP 200
    - Implement `POST /override` handler with `@Body() dto: SubmitOverrideDto`, calling `calendarOverrideService.submitOverride(dto)`, returning HTTP 201
    - Configure `ValidationPipe` with `exceptionFactory` to throw `UnprocessableEntityException` (HTTP 422) on validation errors — apply at the controller or handler level
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.9, 2.10_
  - [x] 4.2 Create `iqama-engine/src/hijri-calendar/hijri-calendar.module.ts`
    - Import `PrismaModule`, provide `CalendarOverrideService`, declare `HijriCalendarController`
  - [x] 4.3 Register `HijriCalendarModule` in `iqama-engine/src/app.module.ts`
    - Add `HijriCalendarModule` to the `imports` array alongside `ScheduleModule`, `AdminModule`, `HealthModule`
    - _Requirements: 1.1, 2.1_
  - [ ]\* 4.4 Write unit tests for `HijriCalendarController` in `hijri-calendar.controller.spec.ts`
    - Mock `CalendarOverrideService`; test `GET /status` returns 200 with correct shape; test `POST /override` returns 201 on valid payload; test all five 422 validation branches (invalid length, month 9 without eidConfig, month 11 without eidConfig, month 9 with wrong eid type, month 11 with wrong eid type); test 401 guard behaviour by overriding `ApiKeyGuard`
    - _Requirements: 1.2, 1.3, 2.2, 2.3, 2.4, 2.5, 2.6, 2.9, 2.10_
  - [ ]\* 4.5 Write property test for `HijriCalendarController` — Property 1: Invalid length is always rejected
    - `// Feature: hijri-calendar-sighting, Property 1: Invalid length is always rejected`
    - Generate integers outside `{29, 30}` (e.g., `fc.integer().filter(n => n !== 29 && n !== 30)`) and assert the controller returns HTTP 422
    - **Property 1: Invalid length is always rejected**
    - **Validates: Requirements 2.2**
    - _numRuns: 100_

- [x] 5. Checkpoint — backend complete
  - Ensure all backend tests pass: `cd iqama-engine && npm test`
  - Ask the user if any questions arise before proceeding to the frontend.

- [x] 6. Add frontend types and service
  - [x] 6.1 Extend `iqama-ui/src/types/index.ts` with the new types from the design
    - Add `EidType`, `HijriCalendarStatus`, `EidPrayerEntry`, `EidConfig`, `SubmitOverridePayload`
    - _Requirements: 1.1, 2.1_
  - [x] 6.2 Create `iqama-ui/src/services/hijri-calendar-service.ts`
    - Implement `fetchHijriStatus(): Promise<HijriCalendarStatus>` — call `apiFetch<HijriCalendarStatus>('/api/v1/hijri-calendar/status', { requiresAuth: true })`
    - Implement `submitOverride(payload: SubmitOverridePayload): Promise<void>` — call `apiFetch<void>('/api/v1/hijri-calendar/override', { method: 'POST', requiresAuth: true, ... })`
    - _Requirements: 1.1, 2.1_

- [x] 7. Implement `calculateEidDate` pure function
  - [x] 7.1 Create `iqama-ui/src/logic/calculate-eid-date.ts`
    - Implement `calculateEidDate(currentDate: Date, isSighted: boolean, eidType: 'FITR' | 'ADHA'): Date`
    - When `isSighted` is `true`, month start = `currentDate + 1 day`; when `false`, month start = `currentDate + 2 days`
    - When `eidType` is `'FITR'`, return month start (offset 0); when `'ADHA'`, return month start + 9 days
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [ ]\* 7.2 Write unit tests for `calculateEidDate` in `calculate-eid-date.test.ts`
    - Test all four combinations: `isSighted=true/false` × `eidType=FITR/ADHA` with concrete dates
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [ ]\* 7.3 Write property tests for `calculateEidDate` in `calculate-eid-date.property.test.ts`
    - **Property 8: Eid date is always strictly after current date**
    - `// Feature: hijri-calendar-sighting, Property 8: Eid date is always strictly after current date`
    - Generate arbitrary `currentDate`, `isSighted`, `eidType` and assert result > `currentDate`
    - **Validates: Requirements 6.6**
    - **Property 9: Eid date offset is exact per sighting and type**
    - `// Feature: hijri-calendar-sighting, Property 9: Eid date offset is exact per sighting and type`
    - Generate arbitrary `currentDate` and `isSighted`; assert month start is `+1` or `+2` days; assert FITR adds 0 and ADHA adds 9 additional days
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**
    - _numRuns: 100_

- [x] 8. Implement `ceilToNearest15` pure function
  - [x] 8.1 Create `iqama-ui/src/logic/ceil-to-nearest-15.ts`
    - Implement `ceilToNearest15(time: string): string` — parse `HH:mm`, compute `Math.ceil(totalMinutes / 15) * 15`, handle hour overflow, return formatted `HH:mm`
    - _Requirements: 8.1_
  - [ ]\* 8.2 Write unit tests for `ceilToNearest15` in `ceil-to-nearest-15.test.ts`
    - Test boundary cases: `06:23 → 06:30`, `06:30 → 06:30`, `06:31 → 06:45`, `06:45 → 06:45`, `06:46 → 07:00`, `23:46 → 00:00` (midnight overflow)
    - _Requirements: 8.1_
  - [ ]\* 8.3 Write property tests for `ceilToNearest15` in `ceil-to-nearest-15.property.test.ts`
    - **Property 10: Suggested 1st Prayer time is always on a 15-minute boundary**
    - `// Feature: hijri-calendar-sighting, Property 10: Suggested 1st Prayer time is always on a 15-minute boundary`
    - Generate arbitrary `HH:mm` sunrise times; apply offset (15 or 20 minutes); call `ceilToNearest15`; assert minutes ∈ `{0, 15, 30, 45}`
    - **Validates: Requirements 7.6, 7.7, 8.1, 8.2**
    - **Property 11: 2nd Prayer is always exactly 90 minutes after 1st Prayer**
    - `// Feature: hijri-calendar-sighting, Property 11: 2nd Prayer is always exactly 90 minutes after 1st Prayer`
    - Generate arbitrary valid 1st Prayer times; compute 2nd Prayer as `+90 minutes`; assert the difference is exactly 90 minutes
    - **Validates: Requirements 7.8, 8.3**
    - _numRuns: 100_

- [x] 9. Implement `useSightingStatus` hook
  - Create `iqama-ui/src/hooks/useSightingStatus.ts`
  - Call `fetchHijriStatus()` on mount; expose `{ status: HijriCalendarStatus | null, loading: boolean, error: Error | null }`
  - Implement `shouldShowSightingCard(hijriDay: number, hasOverride: boolean): boolean` as a pure helper exported from the same file — returns `true` when `hijriDay === 29`, or `hijriDay === 30 && !hasOverride`; returns `false` otherwise
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 10. Implement `SightingCard` component
  - [x] 10.1 Create `iqama-ui/src/components/SightingCard.tsx`
    - Accept props: `hijriMonth: number`, `onDecision: (length: 29 | 30) => void`
    - Derive current and next Hijri month names from `hijriMonth` (use a lookup array of the 12 Hijri month names)
    - Render the prompt: "Today is the 29th of [Current Hijri Month Name]. Has the moon for [Next Hijri Month Name] been sighted?"
    - Render two buttons: "Yes, Month ends today (29 Days)" (calls `onDecision(29)`) and "No, Complete 30 days" (calls `onDecision(30)`)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ]\* 10.2 Write unit tests for `SightingCard` in `SightingCard.test.tsx`
    - Test correct prompt text for a given `hijriMonth`; test "Yes" button calls `onDecision(29)`; test "No" button calls `onDecision(30)`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 11. Implement `EidPrayerModal` component
  - [x] 11.1 Create `iqama-ui/src/components/EidPrayerModal.tsx`
    - Accept props as defined in the design: `eidType`, `eidDate`, `sunriseTime`, `hijriYear`, `hijriMonth`, `length`, `onSubmit`, `onClose`
    - Render title: "Confirm Eid al-Fitr Prayers" for `EID_AL_FITR`, "Confirm Eid al-Adha Prayers" for `EID_AL_ADHA`
    - Render message with formatted Eid date (use `eidDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })` or equivalent)
    - Compute default 1st Prayer: `ceilToNearest15(sunriseTime + 20 min)` for FITR, `ceilToNearest15(sunriseTime + 15 min)` for ADHA
    - Compute default 2nd Prayer: 1st Prayer + 90 minutes
    - Render two `<input type="time">` fields labelled "1st Prayer" and "2nd Prayer", pre-populated with the computed defaults
    - On submit, build `SubmitOverridePayload` with `eidConfig: { type: eidType, date: eidDate.toISOString().slice(0, 10), prayers: [{ label: '1st Prayer', time }, { label: '2nd Prayer', time }] }` and call `onSubmit`
    - On success, call `onClose`; on failure, display inline error and keep modal open
    - Do NOT include an iqama time field
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12_
  - [ ]\* 11.2 Write unit tests for `EidPrayerModal` in `EidPrayerModal.test.tsx`
    - Test FITR title and message; test ADHA title and message; test pre-populated time values for both Eid types; test no iqama field is rendered; test success path closes modal; test error path keeps modal open with error message
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.10, 7.11, 7.12_

- [x] 12. Wire `SightingCard` and `EidPrayerModal` into the dashboard
  - Modify `iqama-ui/src/pages/PrayerViewerPage.tsx`:
    - Import and call `useSightingStatus()` to get `status`
    - Import `shouldShowSightingCard` and evaluate visibility using `status.hijriDay` and `status.hasOverride`
    - Import `SightingCard` and render it conditionally (when `shouldShowSightingCard` returns `true`) inside the existing flex column, above the `PrayerTable`
    - In the `onDecision` handler: if `hijriMonth` is `9` or `11`, open `EidPrayerModal` (store `pendingLength` in state); otherwise call `submitOverride` directly and show a success notification on completion or an inline error on failure
    - Import `EidPrayerModal` and render it when `eidModalOpen` state is `true`, passing `calculateEidDate` result as `eidDate`, `todaySchedule.sunrise` as `sunriseTime`, and the override payload fields
    - On `EidPrayerModal` `onSubmit`, call `submitOverride` and handle success/error as per requirements
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.5, 5.6, 7.9, 7.10, 7.11_
  - [ ]\* 12.1 Write property test for `SightingCard` visibility — Property 6: Sighting card hidden before day 29
    - Create `iqama-ui/src/logic/sighting-card.property.test.ts`
    - `// Feature: hijri-calendar-sighting, Property 6: Sighting card hidden before day 29`
    - Generate `hijriDay` in range 1–28 and arbitrary `hasOverride`; assert `shouldShowSightingCard` returns `false`
    - **Property 6: Sighting card hidden before day 29**
    - **Validates: Requirements 4.4**
    - _numRuns: 100_
  - [ ]\* 12.2 Write property test for non-Eid months — Property 7: Non-Eid months dispatch directly without modal
    - `// Feature: hijri-calendar-sighting, Property 7: Non-Eid months dispatch directly without modal`
    - Generate `hijriMonth` values not in `{9, 11}` (months 1–8, 10, 12); render `SightingCard` with that month; simulate a button click; assert `submitOverride` is called and `EidPrayerModal` is not rendered
    - **Property 7: Non-Eid months dispatch directly without modal**
    - **Validates: Requirements 5.5**
    - _numRuns: 100_

- [x] 13. Final checkpoint — Ensure all tests pass
  - Run `cd iqama-engine && npm test` — all backend unit and property tests must pass
  - Run `cd iqama-ui && npm test` — all frontend unit and property tests must pass
  - Ask the user if any questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at the backend/frontend boundary
- Property tests validate universal correctness properties (Properties 1–11 from the design)
- Unit tests validate specific examples and edge cases
- The `ValidationPipe` in the controller must use `exceptionFactory` to emit HTTP 422 (not 400) for DTO validation failures
- The `dayjs-hijri` plugin is already installed and configured in `iqama-engine/src/dayjs.ts` — import from there, not directly from `dayjs`
- The frontend `apiFetch` helper in `iqama-ui/src/api/api-client.ts` handles `x-api-key` injection — use it in the new service following the pattern in `override-service.ts`
