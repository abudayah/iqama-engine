# Design Document — Hijri Calendar Sighting

## Overview

This feature adds moon-sighting override capability to the iqama system. The Imam can manually confirm whether the new moon has been sighted on the 29th (or 30th) of a Hijri month, overriding the pre-calculated astronomical calendar. For months 9 (Ramadan) and 11 (Dhul-Qi'dah), the system additionally collects two Eid prayer times with auto-suggested defaults derived from the local sunrise time.

The feature spans both the `iqama-engine` (NestJS backend) and `iqama-ui` (React/TypeScript frontend). The backend exposes two new endpoints under `/api/v1/hijri-calendar` and persists decisions to two new database tables. The frontend adds a `SightingCard` component to the dashboard, a `EidPrayerModal`, and a pure `calculateEidDate` function.

### Key Design Decisions

- **Separate module**: The new `HijriCalendarModule` is independent of the existing `OverrideModule` (which handles iqama time overrides). The naming collision is avoided by calling the new service `CalendarOverrideService` and the new Prisma models `CalendarOverride` and `SpecialPrayer`.
- **Hijri date via dayjs-hijri**: The backend already has `dayjs-hijri` installed and configured in `src/dayjs.ts`. The status endpoint uses this to derive the current Hijri day and month.
- **Pure function for Eid date**: `calculateEidDate` lives in `iqama-ui/src/logic/` alongside the other pure functions (`derive-next-prayer`, `derive-countdown`). It has no side effects and is fully unit/property testable.
- **Rounding utility**: `ceilToNearest15` is a pure function in `iqama-ui/src/logic/` that implements ceiling-to-nearest-15-minute rounding. It is shared by the `EidPrayerModal` default-time logic.
- **Upsert semantics**: Both `CalendarOverride` and `SpecialPrayer` use Prisma `upsert` with composite unique keys to prevent duplicates on re-submission.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  iqama-ui (React / Vite / TypeScript)                           │
│                                                                 │
│  Dashboard                                                      │
│  └── SightingCard (visibility logic via useSightingStatus)      │
│       ├── "Yes" / "No" buttons                                  │
│       └── opens EidPrayerModal (months 9 & 11)                  │
│                                                                 │
│  Logic (pure functions)                                         │
│  ├── calculateEidDate(currentDate, isSighted, eidType) → Date   │
│  └── ceilToNearest15(time: string) → string                     │
│                                                                 │
│  Services                                                       │
│  └── hijri-calendar-service.ts                                  │
│       ├── fetchHijriStatus() → HijriCalendarStatus              │
│       └── submitOverride(payload) → void                        │
│                                                                 │
│  Hooks                                                          │
│  └── useSightingStatus() → { status, loading, error }           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (x-api-key)
┌──────────────────────────▼──────────────────────────────────────┐
│  iqama-engine (NestJS)                                          │
│                                                                 │
│  HijriCalendarModule                                            │
│  ├── HijriCalendarController                                    │
│  │    ├── GET  /api/v1/hijri-calendar/status                    │
│  │    └── POST /api/v1/hijri-calendar/override                  │
│  └── CalendarOverrideService                                    │
│       ├── getStatus() → HijriCalendarStatusDto                  │
│       ├── submitOverride(dto) → void                            │
│       ├── upsertCalendarOverride(...)                           │
│       └── upsertSpecialPrayer(...)                              │
│                                                                 │
│  Auth: ApiKeyGuard (existing, reused)                           │
│  DB:   PrismaService (existing, reused)                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Prisma ORM
┌──────────────────────────▼──────────────────────────────────────┐
│  MySQL / MariaDB                                                │
│  ├── CalendarOverride  (hijri_year, hijri_month, length, ...)   │
│  └── SpecialPrayer     (type, hijri_year, date, prayers)        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### Backend — `HijriCalendarModule`

**File layout** (new files only):

```
iqama-engine/src/hijri-calendar/
├── hijri-calendar.module.ts
├── hijri-calendar.controller.ts
├── hijri-calendar.controller.spec.ts
├── calendar-override.service.ts
├── calendar-override.service.spec.ts
└── dto/
    ├── hijri-calendar-status.dto.ts
    └── submit-override.dto.ts
```

**`GET /api/v1/hijri-calendar/status`**

- Guard: `ApiKeyGuard`
- Returns `HijriCalendarStatusDto`:

```typescript
interface HijriCalendarStatusDto {
  gregorianDate: string; // YYYY-MM-DD
  hijriMonth: number; // 1–12
  hijriDay: number; // 1–30
  hasOverride: boolean; // true if CalendarOverride exists for current year+month
}
```

**`POST /api/v1/hijri-calendar/override`**

- Guard: `ApiKeyGuard`
- Body: `SubmitOverrideDto`
- Returns: HTTP 201 on success, HTTP 422 on validation failure

```typescript
interface EidPrayerEntry {
  label: string; // "1st Prayer" | "2nd Prayer"
  time: string; // HH:mm
}

interface EidConfigDto {
  type: 'EID_AL_FITR' | 'EID_AL_ADHA';
  date: string; // YYYY-MM-DD (Gregorian Eid date)
  prayers: EidPrayerEntry[];
}

interface SubmitOverrideDto {
  hijriYear: number;
  hijriMonth: number; // 1–12
  length: 29 | 30;
  eidConfig?: EidConfigDto;
}
```

**Validation rules** (enforced via `class-validator` in the DTO):

| Condition                                              | Response |
| ------------------------------------------------------ | -------- |
| `length` not 29 or 30                                  | HTTP 422 |
| `hijriMonth` = 9 and `eidConfig` absent                | HTTP 422 |
| `hijriMonth` = 11 and `eidConfig` absent               | HTTP 422 |
| `hijriMonth` = 9 and `eidConfig.type` ≠ `EID_AL_FITR`  | HTTP 422 |
| `hijriMonth` = 11 and `eidConfig.type` ≠ `EID_AL_ADHA` | HTTP 422 |

### Frontend — New Files

```
iqama-ui/src/
├── components/
│   ├── SightingCard.tsx
│   ├── SightingCard.test.tsx
│   ├── EidPrayerModal.tsx
│   └── EidPrayerModal.test.tsx
├── hooks/
│   └── useSightingStatus.ts
├── logic/
│   ├── calculate-eid-date.ts
│   ├── calculate-eid-date.test.ts
│   ├── calculate-eid-date.property.test.ts
│   ├── ceil-to-nearest-15.ts
│   ├── ceil-to-nearest-15.test.ts
│   └── ceil-to-nearest-15.property.test.ts
├── services/
│   └── hijri-calendar-service.ts
└── types/
    └── index.ts   (extended with new types)
```

**`SightingCard` props:**

```typescript
interface SightingCardProps {
  hijriMonth: number; // 1–12, current month
  onDecision: (length: 29 | 30) => void;
}
```

**`EidPrayerModal` props:**

```typescript
interface EidPrayerModalProps {
  eidType: 'EID_AL_FITR' | 'EID_AL_ADHA';
  eidDate: Date;
  sunriseTime: string; // HH:mm
  hijriYear: number;
  hijriMonth: number;
  length: 29 | 30;
  onSubmit: (payload: SubmitOverridePayload) => Promise<void>;
  onClose: () => void;
}
```

**`calculateEidDate` signature:**

```typescript
function calculateEidDate(
  currentDate: Date,
  isSighted: boolean,
  eidType: 'FITR' | 'ADHA',
): Date;
```

**`ceilToNearest15` signature:**

```typescript
function ceilToNearest15(time: string): string; // "HH:mm" → "HH:mm"
```

---

## Data Models

### New Prisma Models

```prisma
model CalendarOverride {
  id                Int      @id @default(autoincrement())
  hijri_year        Int
  hijri_month       Int      // 1–12
  length            Int      // 29 or 30
  is_manual_override Boolean @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([hijri_year, hijri_month])
}

model SpecialPrayer {
  id         Int      @id @default(autoincrement())
  type       String   // "EID_AL_FITR" | "EID_AL_ADHA"
  hijri_year Int
  date       String   // YYYY-MM-DD Gregorian date
  prayers    Json     // Array of { label: string, time: string }
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([hijri_year, type])
}
```

The `@@unique` constraints on `[hijri_year, hijri_month]` and `[hijri_year, type]` enable Prisma `upsert` operations that satisfy the "no duplicate" requirements (3.3, 3.4).

### Frontend Types (additions to `iqama-ui/src/types/index.ts`)

```typescript
export type EidType = 'EID_AL_FITR' | 'EID_AL_ADHA';

export interface HijriCalendarStatus {
  gregorianDate: string; // YYYY-MM-DD
  hijriMonth: number;
  hijriDay: number;
  hasOverride: boolean;
}

export interface EidPrayerEntry {
  label: string;
  time: string; // HH:mm
}

export interface EidConfig {
  type: EidType;
  date: string; // YYYY-MM-DD
  prayers: EidPrayerEntry[];
}

export interface SubmitOverridePayload {
  hijriYear: number;
  hijriMonth: number;
  length: 29 | 30;
  eidConfig?: EidConfig;
}
```

### Sighting Card Visibility Logic

The visibility decision is a pure function of `hijriDay` and `hasOverride`:

```
shouldShow(hijriDay, hasOverride):
  if hijriDay === 29 → true
  if hijriDay === 30 AND NOT hasOverride → true
  otherwise → false
```

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property Reflection

Before listing properties, redundancy is eliminated:

- 6.2 (isSighted=true → +1 day) and 6.3 (isSighted=false → +2 days) are both subsumed by 6.6 (result always strictly after currentDate). However, 6.6 alone does not verify the _exact_ offset — it only verifies the direction. Properties for 6.2 and 6.3 are kept as they verify the precise computation. 6.6 is kept as a separate invariant.
- 6.4 (FITR offset=0) and 6.5 (ADHA offset=9) can be combined into a single property that covers both Eid types with their respective offsets.
- 7.6 (FITR sunrise+20) and 7.7 (ADHA sunrise+15) can be combined into a single property parameterised by Eid type and offset.
- 8.1 and 8.2 both test the 15-minute ceiling rounding function. 8.2 is a specialisation of 8.1 (restricted to 04:00–08:00). They are combined into one property over all times, which subsumes the restricted range.
- 8.3 and 7.8 both state that 2nd Prayer = 1st Prayer + 90 minutes. They are merged into one property.
- 3.3 and 3.4 (upsert idempotence) are structurally identical for two different models. They are kept as two separate properties since they test different code paths.

After reflection, the final property set is:

---

### Property 1: Invalid length is always rejected

_For any_ integer value that is not `29` or `30`, submitting it as the `length` field in a `POST /api/v1/hijri-calendar/override` request SHALL result in an HTTP 422 response.

**Validates: Requirements 2.2**

---

### Property 2: CalendarOverride upsert stores all required fields

_For any_ valid combination of `hijriYear` (integer), `hijriMonth` (1–12), and `length` (29 or 30), calling `upsertCalendarOverride` SHALL invoke Prisma with a record containing all four required fields: `hijri_year`, `hijri_month`, `length`, and `is_manual_override = true`.

**Validates: Requirements 3.1**

---

### Property 3: SpecialPrayer upsert stores all required fields

_For any_ valid `SpecialPrayer` input (`type` ∈ {EID_AL_FITR, EID_AL_ADHA}, `hijri_year`, `date` in YYYY-MM-DD format, non-empty `prayers` array), calling `upsertSpecialPrayer` SHALL invoke Prisma with a record containing all four required fields: `type`, `hijri_year`, `date`, and `prayers`.

**Validates: Requirements 3.2**

---

### Property 4: CalendarOverride upsert is idempotent

_For any_ `(hijriYear, hijriMonth)` pair, calling `upsertCalendarOverride` twice with the same key SHALL result in a Prisma `upsert` call (not `create`) on both invocations, ensuring no duplicate records are inserted.

**Validates: Requirements 3.3**

---

### Property 5: SpecialPrayer upsert is idempotent

_For any_ `(hijriYear, type)` pair, calling `upsertSpecialPrayer` twice with the same key SHALL result in a Prisma `upsert` call (not `create`) on both invocations, ensuring no duplicate records are inserted.

**Validates: Requirements 3.4**

---

### Property 6: Sighting card hidden before day 29

_For any_ Hijri day value in the range 1–28 (inclusive), the `shouldShowSightingCard` function SHALL return `false` regardless of the `hasOverride` value.

**Validates: Requirements 4.4**

---

### Property 7: Non-Eid months dispatch directly without modal

_For any_ Hijri month value not in `{9, 11}` (i.e., months 1–8, 10, 12), selecting a length in the `SightingCard` SHALL trigger a direct `POST /api/v1/hijri-calendar/override` dispatch and SHALL NOT open the `EidPrayerModal`.

**Validates: Requirements 5.5**

---

### Property 8: Eid date is always strictly after current date

_For any_ valid combination of `currentDate`, `isSighted` (true or false), and `eidType` (FITR or ADHA), the result of `calculateEidDate(currentDate, isSighted, eidType)` SHALL be strictly after `currentDate`.

**Validates: Requirements 6.6**

---

### Property 9: Eid date offset is exact per sighting and type

_For any_ `currentDate` and `isSighted` value, `calculateEidDate` SHALL return:

- `currentDate + 1 day` as the month start when `isSighted = true`
- `currentDate + 2 days` as the month start when `isSighted = false`
- Month start + 0 additional days for `FITR`
- Month start + 9 additional days for `ADHA`

**Validates: Requirements 6.2, 6.3, 6.4, 6.5**

---

### Property 10: Suggested 1st Prayer time is always on a 15-minute boundary

_For any_ sunrise time (HH:mm), the suggested 1st Prayer time computed by `ceilToNearest15(sunrise + offset)` SHALL have a minutes component that is one of `{0, 15, 30, 45}`.

**Validates: Requirements 7.6, 7.7, 8.1, 8.2**

---

### Property 11: 2nd Prayer is always exactly 90 minutes after 1st Prayer

_For any_ valid 1st Prayer time (HH:mm), the 2nd Prayer time SHALL equal the 1st Prayer time plus exactly `90` minutes.

**Validates: Requirements 7.8, 8.3**

---

## Error Handling

### Backend

| Scenario                                 | Behaviour                                                          |
| ---------------------------------------- | ------------------------------------------------------------------ |
| Missing or invalid API key               | `ApiKeyGuard` returns HTTP 401 (existing behaviour)                |
| `length` not 29 or 30                    | `class-validator` throws `UnprocessableEntityException` (HTTP 422) |
| `hijriMonth` 9 or 11 without `eidConfig` | Custom validator throws HTTP 422                                   |
| `eidConfig.type` mismatch for month      | Custom validator throws HTTP 422                                   |
| Prisma write failure                     | Unhandled exception propagates as HTTP 500 (NestJS default)        |
| Hijri date library failure               | Caught in service, returns HTTP 500 with descriptive message       |

NestJS's built-in `ValidationPipe` with `exceptionFactory` is used to return HTTP 422 (Unprocessable Entity) instead of the default 400 for DTO validation failures, matching the requirements.

### Frontend

| Scenario                                 | Behaviour                                                      |
| ---------------------------------------- | -------------------------------------------------------------- |
| `fetchHijriStatus` network error         | `useSightingStatus` sets `error` state; card not rendered      |
| `submitOverride` failure (non-Eid month) | `SightingCard` shows inline error message                      |
| `submitOverride` failure (Eid month)     | `EidPrayerModal` stays open, displays error message (Req 7.11) |
| `submitOverride` success                 | Modal closes (if open), success notification shown             |

---

## Testing Strategy

### Backend (Jest + `@nestjs/testing`)

**Unit tests** (`*.spec.ts` in `src/hijri-calendar/`):

- `CalendarOverrideService`: mock `PrismaService`, test `getStatus`, `upsertCalendarOverride`, `upsertSpecialPrayer` with example inputs and edge cases.
- `HijriCalendarController`: mock `CalendarOverrideService`, test all validation branches (422 cases), 201 success, 401 auth guard.

**Property-based tests** (Jest + `fast-check`):

- `calendar-override.service.property.spec.ts`: Properties 2, 3, 4, 5 — generate random valid inputs and verify Prisma is called with correct fields and upsert semantics.
- `hijri-calendar.controller.property.spec.ts`: Property 1 — generate integers outside {29, 30} and verify 422 response.

Each property test runs a minimum of **100 iterations** (`{ numRuns: 100 }`).

Tag format: `// Feature: hijri-calendar-sighting, Property N: <property_text>`

### Frontend (Vitest + `fast-check` + `@testing-library/react`)

**Unit tests** (`*.test.ts` / `*.test.tsx`):

- `calculate-eid-date.test.ts`: Concrete examples for each branch (isSighted true/false × FITR/ADHA).
- `ceil-to-nearest-15.test.ts`: Concrete examples including boundary cases (e.g., 06:23 → 06:30, 06:30 → 06:30, 06:31 → 06:45).
- `SightingCard.test.tsx`: Render tests for day 29, day 30 with/without override, button labels, modal trigger for months 9/11.
- `EidPrayerModal.test.tsx`: Render tests for FITR/ADHA titles, messages, time pickers, no iqama field, success/error states.

**Property-based tests** (`*.property.test.ts`):

- `calculate-eid-date.property.test.ts`: Properties 8 and 9.
- `ceil-to-nearest-15.property.test.ts`: Properties 10 and 11.
- `sighting-card.property.test.ts`: Properties 6 and 7.

Each property test runs a minimum of **100 iterations** (`{ numRuns: 100 }`).

Tag format: `// Feature: hijri-calendar-sighting, Property N: <property_text>`

### Integration

The existing `test/` directory in `iqama-engine` can host an e2e test that spins up the NestJS app with a test database and exercises the full request/response cycle for both endpoints.
