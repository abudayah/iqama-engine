# Requirements Document

## Introduction

This feature enables the Imam to manually override pre-calculated Hijri calendar dates based on physical moon sighting. The system strictly enforces the Islamic rule that a Hijri month is either 29 or 30 days. When the upcoming month is Shawwal (following Ramadan, month 9) or Dhul-Hijjah (following Dhul-Qi'dah, month 11), the system automatically prompts the Imam to schedule two Eid prayer times with auto-suggested defaults derived from the local sunrise time. The sighting card is visible on the 29th of the current Hijri month and remains visible on the 30th if no decision has yet been made.

## Glossary

- **Hijri_Calendar**: The Islamic lunar calendar used to determine Islamic months and dates.
- **Calendar_Override_Service**: The backend NestJS service responsible for persisting and retrieving Hijri calendar length decisions and Eid prayer configurations.
- **Hijri_Calendar_Controller**: The NestJS controller exposing the `/api/v1/hijri-calendar` endpoints.
- **Sighting_Card**: The frontend UI component rendered on the dashboard when the Imam must decide whether the new moon has been sighted.
- **Eid_Prayer_Modal**: The frontend modal component that collects Eid prayer times when the upcoming month requires Eid scheduling.
- **Eid_Date_Calculator**: The frontend pure function that computes the Gregorian date of Eid based on the current date and the moon-sighting decision.
- **CalendarOverride**: The database record storing the Imam's decision about a Hijri month's length.
- **SpecialPrayer**: The database record storing the Eid prayer schedule for a given year and Eid type.
- **Imam**: The authenticated administrator who submits moon-sighting decisions and Eid prayer configurations.
- **Visibility_Window**: The period during which the Sighting_Card is displayed — the 29th of the current Hijri month, and the 30th if no decision has been submitted.
- **EID_AL_FITR**: The Eid celebration on the 1st of Shawwal, following the end of Ramadan (Hijri month 9).
- **EID_AL_ADHA**: The Eid celebration on the 10th of Dhul-Hijjah, following the end of Dhul-Qi'dah (Hijri month 11).

---

## Requirements

### Requirement 1: Hijri Calendar Status Endpoint

**User Story:** As an Imam, I want the dashboard to know the current Hijri date and whether I have already submitted a moon-sighting decision, so that the sighting card is shown only when my input is needed.

#### Acceptance Criteria

1. THE Hijri_Calendar_Controller SHALL expose a `GET /api/v1/hijri-calendar/status` endpoint that returns the current Gregorian date, the current Hijri month number, the current Hijri day number, and a boolean indicating whether a CalendarOverride already exists for the current Hijri year and month.
2. WHEN the `GET /api/v1/hijri-calendar/status` endpoint is called, THE Hijri_Calendar_Controller SHALL return an HTTP 200 response.
3. THE Hijri_Calendar_Controller SHALL require a valid API key on the `GET /api/v1/hijri-calendar/status` endpoint.

---

### Requirement 2: Submit Moon-Sighting Override

**User Story:** As an Imam, I want to submit whether the new moon has been sighted, so that the system uses the correct month length instead of the pre-calculated default.

#### Acceptance Criteria

1. THE Hijri_Calendar_Controller SHALL expose a `POST /api/v1/hijri-calendar/override` endpoint that accepts a payload containing `hijriYear`, `hijriMonth`, `length`, and an optional `eidConfig` object.
2. WHEN a `POST /api/v1/hijri-calendar/override` request is received with a `length` value other than `29` or `30`, THE Hijri_Calendar_Controller SHALL return an HTTP 422 response with a descriptive validation error message.
3. WHEN a `POST /api/v1/hijri-calendar/override` request is received with `hijriMonth` equal to `9` and `eidConfig` is absent, THE Hijri_Calendar_Controller SHALL return an HTTP 422 response indicating that `eidConfig` is required for month 9.
4. WHEN a `POST /api/v1/hijri-calendar/override` request is received with `hijriMonth` equal to `11` and `eidConfig` is absent, THE Hijri_Calendar_Controller SHALL return an HTTP 422 response indicating that `eidConfig` is required for month 11.
5. WHEN a `POST /api/v1/hijri-calendar/override` request is received with `hijriMonth` equal to `9` and `eidConfig.type` is not `EID_AL_FITR`, THE Hijri_Calendar_Controller SHALL return an HTTP 422 response indicating the Eid type mismatch.
6. WHEN a `POST /api/v1/hijri-calendar/override` request is received with `hijriMonth` equal to `11` and `eidConfig.type` is not `EID_AL_ADHA`, THE Hijri_Calendar_Controller SHALL return an HTTP 422 response indicating the Eid type mismatch.
7. WHEN a valid `POST /api/v1/hijri-calendar/override` request is received, THE Calendar_Override_Service SHALL persist a CalendarOverride record with `hijri_year`, `hijri_month`, `length`, and `is_manual_override` set to `true`.
8. WHEN a valid `POST /api/v1/hijri-calendar/override` request is received with an `eidConfig` object, THE Calendar_Override_Service SHALL persist a SpecialPrayer record containing `type`, `hijri_year`, `date`, and the `prayers` array.
9. WHEN a valid `POST /api/v1/hijri-calendar/override` request is received, THE Hijri_Calendar_Controller SHALL return an HTTP 201 response.
10. THE Hijri_Calendar_Controller SHALL require a valid API key on the `POST /api/v1/hijri-calendar/override` endpoint.

---

### Requirement 3: Calendar Override Persistence

**User Story:** As a system operator, I want moon-sighting decisions and Eid prayer schedules stored in the database, so that the iqama engine can use them to override the default astronomical calendar.

#### Acceptance Criteria

1. THE Calendar_Override_Service SHALL store each CalendarOverride with the fields: `hijri_year` (integer), `hijri_month` (integer 1–12), `length` (integer, constrained to `29` or `30`), and `is_manual_override` (boolean).
2. THE Calendar_Override_Service SHALL store each SpecialPrayer with the fields: `type` (string, one of `EID_AL_FITR` or `EID_AL_ADHA`), `hijri_year` (integer), `date` (the Gregorian date string in `YYYY-MM-DD` format), and `prayers` (a serialised array of objects each containing `label` and `time`).
3. WHEN a CalendarOverride already exists for a given `hijri_year` and `hijri_month`, THE Calendar_Override_Service SHALL update the existing record rather than inserting a duplicate.
4. WHEN a SpecialPrayer already exists for a given `hijri_year` and `type`, THE Calendar_Override_Service SHALL update the existing record rather than inserting a duplicate.

---

### Requirement 4: Sighting Card Visibility

**User Story:** As an Imam, I want the moon-sighting card to appear automatically on the 29th of the current Hijri month and remain visible on the 30th if I have not yet decided, so that I am prompted at the right time without manual navigation.

#### Acceptance Criteria

1. WHEN the current Hijri day is `29`, THE Sighting_Card SHALL be rendered on the dashboard regardless of whether a decision has been submitted.
2. WHEN the current Hijri day is `30` and no CalendarOverride has been submitted for the current Hijri year and month, THE Sighting_Card SHALL be rendered on the dashboard.
3. WHEN the current Hijri day is `30` and a CalendarOverride has already been submitted for the current Hijri year and month, THE Sighting_Card SHALL not be rendered.
4. WHEN the current Hijri day is less than `29`, THE Sighting_Card SHALL not be rendered.

---

### Requirement 5: Moon-Sighting Decision Interaction

**User Story:** As an Imam, I want to tap a single button to record whether the moon was sighted, so that the month length is captured with minimal friction.

#### Acceptance Criteria

1. THE Sighting_Card SHALL display the prompt: "Today is the 29th of [Current Hijri Month Name]. Has the moon for [Next Hijri Month Name] been sighted?"
2. THE Sighting_Card SHALL present two actions: "Yes, Month ends today (29 Days)" and "No, Complete 30 days".
3. WHEN the Imam selects "Yes, Month ends today (29 Days)", THE Sighting_Card SHALL record a selected length of `29`.
4. WHEN the Imam selects "No, Complete 30 days", THE Sighting_Card SHALL record a selected length of `30`.
5. WHEN the Imam selects a length and the current Hijri month is not `9` or `11`, THE Sighting_Card SHALL immediately dispatch a `POST /api/v1/hijri-calendar/override` request with the selected length and display a success notification upon completion.
6. WHEN the Imam selects a length and the current Hijri month is `9` or `11`, THE Sighting_Card SHALL open the Eid_Prayer_Modal instead of dispatching the override request directly.

---

### Requirement 6: Eid Date Calculation

**User Story:** As an Imam, I want the system to automatically calculate the Gregorian date of Eid based on my moon-sighting decision, so that I do not have to compute it manually.

#### Acceptance Criteria

1. THE Eid_Date_Calculator SHALL accept the current Gregorian date, a boolean indicating whether the moon was sighted (`isSighted`), and an Eid type (`FITR` or `ADHA`).
2. WHEN `isSighted` is `true`, THE Eid_Date_Calculator SHALL compute the new month start as the current Gregorian date plus `1` day.
3. WHEN `isSighted` is `false`, THE Eid_Date_Calculator SHALL compute the new month start as the current Gregorian date plus `2` days.
4. WHEN the Eid type is `FITR`, THE Eid_Date_Calculator SHALL return the new month start date (offset of `0` additional days from month start).
5. WHEN the Eid type is `ADHA`, THE Eid_Date_Calculator SHALL return the new month start date plus `9` additional days.
6. FOR ALL valid combinations of `currentDate`, `isSighted`, and `eidType`, THE Eid_Date_Calculator SHALL return a date that is strictly after `currentDate`.

---

### Requirement 7: Eid Prayer Modal

**User Story:** As an Imam, I want a modal to appear when Eid scheduling is required, so that I can confirm the Eid date and set the two prayer times before submitting.

#### Acceptance Criteria

1. WHEN the Eid_Prayer_Modal is opened for `EID_AL_FITR`, THE Eid_Prayer_Modal SHALL display the title "Confirm Eid al-Fitr Prayers".
2. WHEN the Eid_Prayer_Modal is opened for `EID_AL_ADHA`, THE Eid_Prayer_Modal SHALL display the title "Confirm Eid al-Adha Prayers".
3. WHEN the Eid_Prayer_Modal is opened for `EID_AL_FITR`, THE Eid_Prayer_Modal SHALL display the message: "Based on your selection, the 1st of Shawwal will be on [formatted Eid date]. Please confirm the prayer timings."
4. WHEN the Eid_Prayer_Modal is opened for `EID_AL_ADHA`, THE Eid_Prayer_Modal SHALL display the message: "Based on your selection, Eid al-Adha (10th of Dhul-Hijjah) will be on [formatted Eid date]. Please confirm the prayer timings."
5. THE Eid_Prayer_Modal SHALL display two time picker inputs labelled "1st Prayer" and "2nd Prayer".
6. WHEN the Eid_Prayer_Modal is opened for `EID_AL_FITR`, THE Eid_Prayer_Modal SHALL pre-populate the 1st Prayer time picker with the local sunrise time plus `20` minutes, rounded up to the nearest `15`-minute mark.
7. WHEN the Eid_Prayer_Modal is opened for `EID_AL_ADHA`, THE Eid_Prayer_Modal SHALL pre-populate the 1st Prayer time picker with the local sunrise time plus `15` minutes, rounded up to the nearest `15`-minute mark.
8. THE Eid_Prayer_Modal SHALL pre-populate the 2nd Prayer time picker with the 1st Prayer time plus `90` minutes.
9. WHEN the Imam submits the Eid_Prayer_Modal, THE Eid_Prayer_Modal SHALL dispatch a single `POST /api/v1/hijri-calendar/override` request containing the calendar override fields (`hijriYear`, `hijriMonth`, `length`) and the `eidConfig` object (`type`, `date`, `prayers` array with `label` and `time` for each prayer).
10. WHEN the `POST /api/v1/hijri-calendar/override` request succeeds, THE Eid_Prayer_Modal SHALL close and display a success notification.
11. IF the `POST /api/v1/hijri-calendar/override` request fails, THEN THE Eid_Prayer_Modal SHALL display an error message and remain open.
12. THE Eid_Prayer_Modal SHALL not include an iqama time field for either Eid prayer.

---

### Requirement 8: Default Time Suggestion Rounding

**User Story:** As an Imam, I want the suggested Eid prayer times to be rounded to clean 15-minute intervals, so that the pre-filled times look natural and are easy to communicate to the congregation.

#### Acceptance Criteria

1. THE Eid_Prayer_Modal SHALL round the suggested 1st Prayer time up to the nearest `15`-minute mark (e.g., 06:23 → 06:30, 06:30 → 06:30, 06:31 → 06:45).
2. FOR ALL sunrise times in the range `04:00`–`08:00`, THE Eid_Prayer_Modal SHALL produce a suggested 1st Prayer time that falls on a `15`-minute boundary (i.e., minutes value is one of `0`, `15`, `30`, or `45`).
3. FOR ALL valid 1st Prayer times, THE Eid_Prayer_Modal SHALL produce a 2nd Prayer time that is exactly `90` minutes later.
