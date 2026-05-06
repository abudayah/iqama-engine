# Requirements Document

## Introduction

This feature adds two related enhancements to the existing `hijri-calendar-sighting` feature in the iqama system.

**Enhancement 1 — Eid prayer card on the public prayer viewer:** When an Eid day is approaching or has arrived, a dedicated `EidCard` component appears above the prayer table on `PrayerViewerPage`. The card displays the Eid prayer times (1st Prayer and 2nd Prayer) sourced from `SpecialPrayer` database records. If no moon-sighting override has been submitted, the system falls back to the pre-calculated astronomical Hijri calendar to determine the expected Eid date and retrieves the corresponding `SpecialPrayer` record. The card is visible on the Eid day itself and for a configurable window of up to 3 days before. A new `GET /api/v1/hijri-calendar/eid-prayers` endpoint serves this data.

**Enhancement 2 — Admin "Eid & Moon Sighting" tab:** A third tab is added to the admin panel at the `/admin/eid` route. This tab shows the current Hijri date, the moon-sighting override status for the current month, saved Eid al-Fitr and Eid al-Adha prayer records with inline editing, and a form that allows the admin to submit a moon-sighting decision at any time — reusing the existing `SightingCard` and `EidPrayerModal` flow.

## Glossary

- **Eid_Prayer_Service**: The backend NestJS service method responsible for computing and returning upcoming or current Eid prayer records.
- **Hijri_Calendar_Controller**: The existing NestJS controller exposing `/api/v1/hijri-calendar` endpoints (extended by this feature).
- **Calendar_Override_Service**: The existing NestJS service extended to support the new `getEidPrayers` method.
- **EidCard**: The new frontend React component rendered above the prayer table on `PrayerViewerPage` when an Eid is approaching or active.
- **Eid_Moon_Sighting_Page**: The new admin page rendered at `/admin/eid`, containing the "Eid & Moon Sighting" tab content.
- **Admin_Nav**: The existing frontend navigation component extended with a third tab linking to `/admin/eid`.
- **SpecialPrayer**: The existing database model storing Eid prayer schedules (`type`, `hijri_year`, `date`, `prayers`).
- **CalendarOverride**: The existing database model storing the Imam's moon-sighting decision for a given Hijri year and month.
- **Fallback_Eid_Date**: The expected Gregorian Eid date computed from the astronomical Hijri calendar when no `SpecialPrayer` record exists for the current Hijri year.
- **Approach_Window**: The configurable number of days before the Eid date during which the `EidCard` is displayed. Defaults to `3` days.
- **EID_AL_FITR**: The Eid celebration on the 1st of Shawwal (Hijri month 10), following the end of Ramadan.
- **EID_AL_ADHA**: The Eid celebration on the 10th of Dhul-Hijjah (Hijri month 12), following the end of Dhul-Qi'dah.
- **EidPrayerRecord**: The response object returned by `GET /api/v1/hijri-calendar/eid-prayers`, containing `type`, `date`, `prayers`, and `source`.
- **SightingCard**: The existing frontend component that prompts the Imam to record a moon-sighting decision.
- **EidPrayerModal**: The existing frontend modal that collects Eid prayer times when the upcoming month requires Eid scheduling.

---

## Requirements

### Requirement 1: Eid Prayers Endpoint

**User Story:** As a public viewer, I want the system to serve upcoming or current Eid prayer times so that the prayer viewer can display them without requiring the Imam to have submitted a manual override.

#### Acceptance Criteria

1. THE Hijri_Calendar_Controller SHALL expose a `GET /api/v1/hijri-calendar/eid-prayers` endpoint that returns an array of `EidPrayerRecord` objects for Eid events that are currently active or within the Approach_Window.
2. WHEN the `GET /api/v1/hijri-calendar/eid-prayers` endpoint is called, THE Hijri_Calendar_Controller SHALL return an HTTP 200 response.
3. THE Hijri_Calendar_Controller SHALL NOT require an API key on the `GET /api/v1/hijri-calendar/eid-prayers` endpoint, as it is consumed by the public prayer viewer.
4. WHEN a `SpecialPrayer` record exists in the database for the current Hijri year and a given Eid type, THE Eid_Prayer_Service SHALL use that record's `date` and `prayers` fields as the authoritative source.
5. WHEN no `SpecialPrayer` record exists for the current Hijri year and a given Eid type, THE Eid_Prayer_Service SHALL compute the Fallback_Eid_Date using the astronomical Hijri calendar via `dayjs-hijri` and return a record with `source` set to `"astronomical"`.
6. WHEN a `SpecialPrayer` record exists for the current Hijri year and a given Eid type, THE Eid_Prayer_Service SHALL return a record with `source` set to `"override"`.
7. WHEN the current Gregorian date is within the Approach_Window of an Eid date (i.e., the Eid date is between today and today plus 3 days inclusive) OR the current Gregorian date equals the Eid date, THE Eid_Prayer_Service SHALL include that Eid type in the response array.
8. WHEN the current Gregorian date is more than 3 days before an Eid date OR the current Gregorian date is after the Eid date, THE Eid_Prayer_Service SHALL NOT include that Eid type in the response array.
9. THE Eid_Prayer_Service SHALL evaluate both EID_AL_FITR and EID_AL_ADHA independently and include each in the response only when its individual visibility condition is met.
10. WHEN no Eid events are within the Approach_Window or active, THE Hijri_Calendar_Controller SHALL return an empty array with HTTP 200.

---

### Requirement 2: Eid Prayer Record Response Shape

**User Story:** As a frontend developer, I want a well-defined response shape from the Eid prayers endpoint so that the `EidCard` component can render prayer times without additional transformation.

#### Acceptance Criteria

1. THE Eid_Prayer_Service SHALL return each `EidPrayerRecord` with the following fields: `type` (string, one of `"EID_AL_FITR"` or `"EID_AL_ADHA"`), `date` (string in `YYYY-MM-DD` format), `prayers` (array of objects each containing `label` (string) and `time` (string in `HH:mm` format)), and `source` (string, one of `"override"` or `"astronomical"`).
2. WHEN the `source` is `"astronomical"`, THE Eid_Prayer_Service SHALL return a `prayers` array with two entries: `{ label: "1st Prayer", time: "07:00" }` and `{ label: "2nd Prayer", time: "08:30" }` as default placeholder times.
3. WHEN the `source` is `"override"`, THE Eid_Prayer_Service SHALL return the `prayers` array exactly as stored in the `SpecialPrayer` database record.

---

### Requirement 3: Fallback Eid Date Computation

**User Story:** As a system operator, I want the backend to compute the expected Eid date from the astronomical calendar when no override has been submitted, so that the Eid card appears even before the Imam has confirmed the moon sighting.

#### Acceptance Criteria

1. WHEN computing the Fallback_Eid_Date for EID_AL_FITR and no `CalendarOverride` exists for Hijri month 9 of the current year, THE Eid_Prayer_Service SHALL use `dayjs-hijri` to find the Gregorian date corresponding to the 1st of Shawwal (Hijri month 10) of the current Hijri year.
2. WHEN computing the Fallback_Eid_Date for EID_AL_ADHA and no `CalendarOverride` exists for Hijri month 11 of the current year, THE Eid_Prayer_Service SHALL use `dayjs-hijri` to find the Gregorian date corresponding to the 10th of Dhul-Hijjah (Hijri month 12) of the current Hijri year.
3. WHEN a `CalendarOverride` record exists for the relevant preceding Hijri month (month 9 for Fitr, month 11 for Adha), THE Eid_Prayer_Service SHALL use the `length` field from that record to compute the Eid date by adding `length` days to the 1st of that preceding month, rather than using the raw astronomical calendar.
4. THE Eid_Prayer_Service SHALL return the Fallback_Eid_Date as a `YYYY-MM-DD` string in the `date` field of the `EidPrayerRecord`.

---

### Requirement 4: EidCard Component on Public Prayer Viewer

**User Story:** As a mosque attendee, I want to see Eid prayer times displayed prominently above the prayer table when Eid is approaching or has arrived, so that I know when to attend the Eid prayer.

#### Acceptance Criteria

1. THE EidCard SHALL be rendered above the prayer table on `PrayerViewerPage` when the `GET /api/v1/hijri-calendar/eid-prayers` endpoint returns one or more `EidPrayerRecord` objects.
2. WHEN the `EidPrayerRecord` array is empty, THE EidCard SHALL NOT be rendered on `PrayerViewerPage`.
3. THE EidCard SHALL display the Eid type name (e.g., "Eid al-Fitr" or "Eid al-Adha"), the Eid date formatted as a human-readable string, and the prayer times for each entry in the `prayers` array.
4. WHEN the `source` field of an `EidPrayerRecord` is `"astronomical"`, THE EidCard SHALL display a notice indicating that the times are preliminary and subject to moon-sighting confirmation.
5. WHEN the `source` field of an `EidPrayerRecord` is `"override"`, THE EidCard SHALL NOT display the preliminary notice.
6. WHEN the `GET /api/v1/hijri-calendar/eid-prayers` request fails, THE `PrayerViewerPage` SHALL NOT render the EidCard and SHALL continue to display the prayer table normally.
7. WHEN multiple `EidPrayerRecord` objects are returned (e.g., both Eid al-Fitr and Eid al-Adha are within the Approach_Window simultaneously), THE `PrayerViewerPage` SHALL render one EidCard per record, each above the prayer table.

---

### Requirement 5: Eid Prayers Frontend Service

**User Story:** As a frontend developer, I want a typed service function to fetch Eid prayer data so that the `PrayerViewerPage` can retrieve it consistently alongside other data fetches.

#### Acceptance Criteria

1. THE `hijri-calendar-service` module SHALL expose a `fetchEidPrayers()` function that calls `GET /api/v1/hijri-calendar/eid-prayers` and returns a `Promise<EidPrayerRecord[]>`.
2. THE `fetchEidPrayers()` function SHALL NOT require an API key in the request headers.
3. WHEN the `GET /api/v1/hijri-calendar/eid-prayers` request returns a non-2xx status, THE `fetchEidPrayers()` function SHALL throw an `Error` with a descriptive message.
4. THE `EidPrayerRecord` type SHALL be added to `iqama-ui/src/types/index.ts` with fields: `type` (`EidType`), `date` (string), `prayers` (`EidPrayerEntry[]`), and `source` (`"override" | "astronomical"`).

---

### Requirement 6: Admin "Eid & Moon Sighting" Tab Navigation

**User Story:** As an Imam, I want a dedicated "Eid & Moon Sighting" tab in the admin panel so that I can manage Eid prayer times and submit moon-sighting decisions at any time, not just when the dashboard card appears.

#### Acceptance Criteria

1. THE Admin_Nav SHALL render a third tab labelled "Eid & Moon Sighting" that links to `/admin/eid`.
2. WHEN the `/admin/eid` route is active, THE Admin_Nav SHALL apply the active tab styling (blue underline and blue text) to the "Eid & Moon Sighting" tab.
3. THE `/admin/eid` route SHALL be registered as a nested child route under `/admin` in the React Router configuration.
4. THE Eid_Moon_Sighting_Page SHALL be rendered as the content of the `/admin/eid` route.

---

### Requirement 7: Admin Eid & Moon Sighting Page — Status Display

**User Story:** As an Imam, I want the Eid & Moon Sighting page to show me the current Hijri date and whether I have already submitted a moon-sighting override for this month, so that I have full context before taking action.

#### Acceptance Criteria

1. THE Eid_Moon_Sighting_Page SHALL display the current Hijri date in a human-readable format (e.g., "Ramadan 29, 1446").
2. THE Eid_Moon_Sighting_Page SHALL display whether a moon-sighting override has been submitted for the current Hijri year and month, using the `hasOverride` field from the `GET /api/v1/hijri-calendar/status` response.
3. WHEN `hasOverride` is `true`, THE Eid_Moon_Sighting_Page SHALL display a status indicator showing that an override has been submitted for the current month.
4. WHEN `hasOverride` is `false`, THE Eid_Moon_Sighting_Page SHALL display a status indicator showing that no override has been submitted for the current month.
5. WHEN the `GET /api/v1/hijri-calendar/status` request is loading, THE Eid_Moon_Sighting_Page SHALL display a loading state.
6. IF the `GET /api/v1/hijri-calendar/status` request fails, THEN THE Eid_Moon_Sighting_Page SHALL display an error message.

---

### Requirement 8: Admin Eid & Moon Sighting Page — Saved Eid Records Display

**User Story:** As an Imam, I want to see the saved Eid al-Fitr and Eid al-Adha prayer records on the admin page so that I can review and edit them at any time.

#### Acceptance Criteria

1. THE Eid_Moon_Sighting_Page SHALL fetch and display saved `SpecialPrayer` records for both EID_AL_FITR and EID_AL_ADHA for the current Hijri year using the `GET /api/v1/hijri-calendar/eid-prayers` endpoint.
2. WHEN a `SpecialPrayer` record exists for a given Eid type, THE Eid_Moon_Sighting_Page SHALL display the Eid type name, the Gregorian date, the 1st Prayer time, and the 2nd Prayer time.
3. WHEN no `SpecialPrayer` record exists for a given Eid type (i.e., `source` is `"astronomical"`), THE Eid_Moon_Sighting_Page SHALL display a placeholder indicating that no override has been saved for that Eid type.
4. THE Eid_Moon_Sighting_Page SHALL display an "Edit" action for each Eid type that opens the `EidPrayerModal` pre-populated with the existing prayer times.
5. WHEN the Imam submits the `EidPrayerModal` from the admin page, THE Eid_Moon_Sighting_Page SHALL refresh the displayed Eid records to reflect the updated values.

---

### Requirement 9: Admin Eid & Moon Sighting Page — Manual Moon-Sighting Submission

**User Story:** As an Imam, I want to submit a moon-sighting decision directly from the admin panel at any time, so that I am not limited to the dashboard card's visibility window.

#### Acceptance Criteria

1. THE Eid_Moon_Sighting_Page SHALL render the `SightingCard` component to allow the Imam to submit a moon-sighting decision regardless of the current Hijri day.
2. WHEN the Imam selects a length on the `SightingCard` and the current Hijri month is not `9` or `11`, THE Eid_Moon_Sighting_Page SHALL dispatch a `POST /api/v1/hijri-calendar/override` request and display a success notification upon completion.
3. WHEN the Imam selects a length on the `SightingCard` and the current Hijri month is `9` or `11`, THE Eid_Moon_Sighting_Page SHALL open the `EidPrayerModal` to collect Eid prayer times before dispatching the override request.
4. WHEN the `POST /api/v1/hijri-calendar/override` request succeeds from the admin page, THE Eid_Moon_Sighting_Page SHALL update the displayed `hasOverride` status to `true` without requiring a full page reload.
5. IF the `POST /api/v1/hijri-calendar/override` request fails from the admin page, THEN THE Eid_Moon_Sighting_Page SHALL display an inline error message.

---

### Requirement 10: Eid Prayers Endpoint — Backend Data Retrieval

**User Story:** As a system operator, I want the backend to retrieve saved Eid prayer records from the database so that the endpoint can serve accurate, admin-confirmed prayer times when available.

#### Acceptance Criteria

1. THE Calendar_Override_Service SHALL expose a `getEidPrayers(today: string)` method that accepts the current Gregorian date as a `YYYY-MM-DD` string and returns an array of `EidPrayerRecord` objects.
2. WHEN `getEidPrayers` is called, THE Calendar_Override_Service SHALL query the `SpecialPrayer` table for records matching the current Hijri year for both `EID_AL_FITR` and `EID_AL_ADHA`.
3. WHEN `getEidPrayers` is called, THE Calendar_Override_Service SHALL compute the Eid date for each type (using the stored `date` if a record exists, or the Fallback_Eid_Date otherwise) and include only those Eid types whose date falls within the Approach_Window or equals today.
4. THE Calendar_Override_Service SHALL determine the current Hijri year using `dayjs-hijri` applied to the `today` parameter.
