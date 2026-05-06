# Implementation Plan: Eid Display & Admin

## Overview

Implement the Eid prayer card on the public prayer viewer and the admin "Eid & Moon Sighting" tab. The backend adds a public `GET /eid-prayers` endpoint backed by a new `getEidPrayers` service method. The frontend adds an `EidCard` component wired into `PrayerViewerPage`, a `useEidPrayers` hook, and a new `EidMoonSightingPage` accessible via a third admin tab.

## Tasks

- [x] 1. Create `EidPrayerEntryDto` and `EidPrayerRecordDto` in the backend
  - Create `iqama-engine/src/hijri-calendar/dto/eid-prayer-record.dto.ts`
  - Define `EidPrayerEntryDto` with `label: string` and `time: string` fields
  - Define `EidPrayerRecordDto` with `type: 'EID_AL_FITR' | 'EID_AL_ADHA'`, `date: string`, `prayers: EidPrayerEntryDto[]`, and `source: 'override' | 'astronomical'` fields
  - _Requirements: 2.1_

- [x] 2. Implement `getEidPrayers` on `CalendarOverrideService`
  - [x] 2.1 Add the `isInApproachWindow(today, eidDate)` pure helper function
    - Implement as a module-level function in `calendar-override.service.ts`
    - Return `true` iff `0 <= dayjs(eidDate).diff(dayjs(today), 'day') <= 3`
    - _Requirements: 1.7, 1.8_

  - [x] 2.2 Add the `computeFallbackDate` helper and `ASTRONOMICAL_FALLBACK_PRAYERS` constant
    - Define `ASTRONOMICAL_FALLBACK_PRAYERS = [{ label: '1st Prayer', time: '07:00' }, { label: '2nd Prayer', time: '08:30' }]` as a module-level constant
    - Implement `computeFallbackDate(eidType, currentHijriYear, calendarOverride?)` following the algorithm in the design: use `dayjs-hijri` to get the astronomical date, then shift by `calendarOverride.length` days when an override exists for the preceding month
    - For `EID_AL_FITR`: preceding month is 9, Eid is 1st Shawwal (month 10, day 1), offset 0
    - For `EID_AL_ADHA`: preceding month is 11, Eid is 10th Dhul-Hijjah (month 12, day 10), offset 9
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 2.3 Implement `getEidPrayers(today: string): Promise<EidPrayerRecordDto[]>` on `CalendarOverrideService`
    - Parse `today` with `dayjs-hijri` to obtain `currentHijriYear`
    - For each Eid type, query `SpecialPrayer` for `{ hijri_year: currentHijriYear, type }`
    - If found: use stored `date` and `prayers`, set `source = 'override'`
    - If not found: query `CalendarOverride` for the preceding month, call `computeFallbackDate`, set `source = 'astronomical'` and `prayers = ASTRONOMICAL_FALLBACK_PRAYERS`
    - Apply `isInApproachWindow` filter; return only matching records
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 10.1, 10.2, 10.3, 10.4_

  - [ ]\* 2.4 Write unit tests for `getEidPrayers`
    - Test: returns `source: 'override'` and exact prayers when `SpecialPrayer` record exists
    - Test: returns `source: 'astronomical'` and placeholder prayers when no `SpecialPrayer` record exists
    - Test: uses override-adjusted date when `CalendarOverride` exists for the preceding month
    - Test: returns empty array when today is 4 days before Eid (outside window)
    - Test: includes record when today equals Eid date (boundary day 0)
    - Test: includes record when today is 3 days before Eid (boundary day 3)
    - Test: excludes record when today is 4 days before Eid (boundary day 4)
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8, 3.1, 3.2, 3.3_

  - [ ]\* 2.5 Write property tests for `isInApproachWindow` and `getEidPrayers`
    - **Property 1: Eid card visibility window is exact** — generate random `(today, eidDate)` pairs; verify `isInApproachWindow` returns `true` iff `0 <= diff <= 3`
    - **Validates: Requirements 1.7, 1.8**
    - **Property 2: Source field accurately reflects record existence** — generate random Eid type / Hijri year combinations with mocked DB presence/absence; verify `source` field
    - **Validates: Requirements 1.4, 1.5, 1.6**
    - **Property 3: Override prayers are returned unchanged (round-trip)** — generate random `prayers` arrays; mock DB to return them; verify exact round-trip
    - **Validates: Requirements 1.4, 2.3**
    - **Property 5: Override-adjusted fallback date shifts by exactly the override length** — generate random `CalendarOverride` records with `length` ∈ {29, 30}; verify date shift formula
    - **Validates: Requirements 3.3**
    - **Property 6: All computed Eid dates are formatted as YYYY-MM-DD** — generate random `today` values; verify all returned `date` fields match `^\d{4}-\d{2}-\d{2}$`
    - **Validates: Requirements 2.1, 3.4**
    - Run each property with `{ numRuns: 100 }`
    - Tag each test: `// Feature: eid-display-admin, Property N: <property_text>`

- [x] 3. Restructure `HijriCalendarController` and add `GET /eid-prayers` handler
  - Move `@UseGuards(ApiKeyGuard)` from the class level to the individual `getStatus` and `submitOverride` route handlers
  - Add `@Get('eid-prayers')` handler with no guard that calls `this.calendarOverrideService.getEidPrayers(dayjs().format('YYYY-MM-DD'))` and returns `EidPrayerRecordDto[]`
  - Import `EidPrayerRecordDto` from the new DTO file
  - _Requirements: 1.1, 1.2, 1.3, 1.10_

- [x] 4. Checkpoint — backend
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 5. Add `EidPrayerRecord` type to `iqama-ui/src/types/index.ts`
  - Add `export interface EidPrayerRecord` with fields: `type: EidType`, `date: string`, `prayers: EidPrayerEntry[]`, `source: 'override' | 'astronomical'`
  - (`EidType` and `EidPrayerEntry` are already defined in the file)
  - _Requirements: 5.4_

- [x] 6. Add `fetchEidPrayers()` to `hijri-calendar-service.ts`
  - Add `export async function fetchEidPrayers(): Promise<EidPrayerRecord[]>` that calls `apiFetch<EidPrayerRecord[]>('/api/v1/hijri-calendar/eid-prayers')` without `requiresAuth`
  - Import `EidPrayerRecord` from `../types`
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 7. Create `useEidPrayers` hook
  - Create `iqama-ui/src/hooks/useEidPrayers.ts`
  - Mirror the pattern of `useSightingStatus`: call `fetchEidPrayers()` on mount, expose `{ records: EidPrayerRecord[], loading: boolean, error: Error | null, refetch: () => void }`
  - Default `records` to `[]`
  - Implement `refetch` as a callback that re-triggers the fetch (increment a counter state or similar)
  - _Requirements: 5.1, 5.3_

  - [ ]\* 7.1 Write unit tests for `useEidPrayers`
    - Test: returns `records: []` and `loading: true` on mount before fetch resolves
    - Test: returns fetched records on successful fetch
    - Test: sets `error` on fetch failure, `records` remains `[]`
    - Test: calling `refetch()` triggers a new fetch
    - _Requirements: 5.1, 5.3_

- [x] 8. Create `EidCard` component
  - Create `iqama-ui/src/components/EidCard.tsx`
  - Accept `{ record: EidPrayerRecord }` props
  - Render Eid type name ("Eid al-Fitr" or "Eid al-Adha"), Gregorian date formatted as a human-readable string (e.g., "Friday, June 27, 2025"), and one row per entry in `record.prayers` showing `label` and `time`
  - When `record.source === 'astronomical'`: render a notice banner reading "Preliminary times — subject to moon-sighting confirmation"
  - When `record.source === 'override'`: omit the notice banner
  - _Requirements: 4.3, 4.4, 4.5_

  - [ ]\* 8.1 Write unit tests for `EidCard`
    - Test: renders Eid type name, formatted date, and prayer times for a concrete `EidPrayerRecord`
    - Test: shows preliminary notice when `source === 'astronomical'`
    - Test: does not show preliminary notice when `source === 'override'`
    - _Requirements: 4.3, 4.4, 4.5_

  - [ ]\* 8.2 Write property test for `EidCard`
    - **Property 7: EidCard renders all required fields for any valid record** — generate random `EidPrayerRecord` objects; render `EidCard`; verify Eid type name, formatted date, and all `label`/`time` pairs are present in output
    - **Validates: Requirements 4.3, 8.2**
    - Run with `{ numRuns: 100 }`
    - Tag: `// Feature: eid-display-admin, Property 7: <property_text>`

- [x] 9. Wire `EidCard` into `PrayerViewerPage`
  - Call `useEidPrayers()` at the top of `PrayerViewerPage`
  - Render one `<EidCard>` per record above the prayer table (inside the `flex-1 -mt-4` container, before the sighting card section), keyed by `record.type`
  - When `records` is empty or `useEidPrayers` returns an error, render nothing (silent degradation)
  - Import `EidCard` from `../components/EidCard` and `useEidPrayers` from `../hooks/useEidPrayers`
  - _Requirements: 4.1, 4.2, 4.6, 4.7_

  - [ ]\* 9.1 Write unit tests for `PrayerViewerPage` (EidCard integration)
    - Test: renders `EidCard` above prayer table when `useEidPrayers` returns one or more records
    - Test: does not render `EidCard` when `useEidPrayers` returns an empty array
    - Test: does not render `EidCard` when `useEidPrayers` returns an error
    - _Requirements: 4.1, 4.2, 4.6_

  - [ ]\* 9.2 Write property test for `PrayerViewerPage` (EidCard count)
    - **Property 8: One EidCard rendered per EidPrayerRecord** — generate arrays of 0–2 `EidPrayerRecord` objects; render `PrayerViewerPage` with mocked hook; verify exactly N `EidCard` components are rendered above the prayer table
    - **Validates: Requirements 4.1, 4.2, 4.7**
    - Run with `{ numRuns: 100 }`
    - Tag: `// Feature: eid-display-admin, Property 8: <property_text>`

- [x] 10. Create `EidMoonSightingPage`
  - Create `iqama-ui/src/pages/EidMoonSightingPage.tsx`
  - Call `useSightingStatus()` and `useEidPrayers()` at the top
  - **Status section**: display current Hijri date (e.g., "Ramadan 29, 1446") and an override status badge — green "Override submitted" when `hasOverride: true`, gray "No override yet" when `hasOverride: false`; show loading state while fetching; show error message if fetch fails
  - **Saved Eid records section**: render a card for each Eid type (`EID_AL_FITR`, `EID_AL_ADHA`); when `source === 'override'` show type name, date, and prayer times; when `source === 'astronomical'` show placeholder text indicating no override has been saved; include an "Edit" button per card that opens `EidPrayerModal` pre-populated with existing times
  - **Moon sighting section**: always render `SightingCard` (not gated by Hijri day); implement `onDecision` with the same logic as `PrayerViewerPage` — direct POST for non-Eid months, `EidPrayerModal` for months 9/11
  - Manage local state: `eidModalOpen`, `pendingLength`, `editingEidType`, `sightingError`, `sightingSuccess`
  - Call `refetch()` on `useEidPrayers` after successful modal submission
  - Show inline success notification after successful non-modal submission
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]\* 10.1 Write unit tests for `EidMoonSightingPage`
    - Test: displays Hijri date from `useSightingStatus`
    - Test: shows "Override submitted" badge when `hasOverride: true`
    - Test: shows "No override yet" badge when `hasOverride: false`
    - Test: renders `SightingCard` regardless of Hijri day value
    - Test: opens `EidPrayerModal` when Imam selects length on month 9 or 11
    - Test: dispatches POST directly for non-Eid months
    - Test: renders Edit button for each Eid type; clicking opens `EidPrayerModal`
    - Test: shows placeholder text when `source === 'astronomical'`
    - Test: calls `refetch()` on `useEidPrayers` after successful modal submission
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 11. Add `/admin/eid` route to `App.tsx` and "Eid & Moon Sighting" tab to `AdminNav`
  - [x] 11.1 Add `<Route path="eid" element={<EidMoonSightingPage />} />` as a nested child under the `/admin` route in `App.tsx`; import `EidMoonSightingPage` from `./pages/EidMoonSightingPage`
    - _Requirements: 6.3, 6.4_

  - [x] 11.2 Add a third `<NavLink to="/admin/eid">` in `AdminNav.tsx` labelled "Eid & Moon Sighting" using the same active/inactive className pattern as the existing tabs
    - _Requirements: 6.1, 6.2_

  - [ ]\* 11.3 Write unit tests for `AdminNav`
    - Test: renders three tabs including "Eid & Moon Sighting"
    - Test: active styling is applied to the "Eid & Moon Sighting" tab when `/admin/eid` route is active
    - _Requirements: 6.1, 6.2_

- [x] 12. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (Properties 1–8 from the design)
- Unit tests validate specific examples and edge cases
- The `isInApproachWindow` pure function is the key testable unit for Properties 1–6 on the backend
- `EidCard` and `PrayerViewerPage` are the key testable units for Properties 7–8 on the frontend
