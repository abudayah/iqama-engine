# Design Document — Eid Display & Admin

## Overview

This feature extends the existing `hijri-calendar-sighting` feature with two enhancements:

**Enhancement 1 — Eid prayer card on the public prayer viewer:** A new `EidCard` component appears above the prayer table on `PrayerViewerPage` when an Eid day is approaching (within 3 days) or is today. It displays Eid prayer times sourced from `SpecialPrayer` database records, falling back to astronomical placeholder times when no override has been submitted. A new public `GET /api/v1/hijri-calendar/eid-prayers` endpoint serves this data.

**Enhancement 2 — Admin "Eid & Moon Sighting" tab:** A third tab is added to the admin panel at `/admin/eid`. It shows the current Hijri date, override status, saved Eid prayer records with inline editing, and a `SightingCard` that allows the Imam to submit a moon-sighting decision at any time — reusing the existing `SightingCard` and `EidPrayerModal` components.

### Key Design Decisions

- **Public endpoint, no guard**: `GET /api/v1/hijri-calendar/eid-prayers` is added to `HijriCalendarController` outside the class-level `@UseGuards(ApiKeyGuard)` decorator, using a method-level `@SkipGuard` or by restructuring the controller to apply the guard per-route. The cleanest approach is to move the guard off the class level and apply it explicitly to `getStatus` and `submitOverride` only.
- **Visibility window as a pure function**: The `isEidVisible(today, eidDate)` predicate — `today <= eidDate && eidDate <= today + 3` — is a pure function in the service, making it directly property-testable.
- **Astronomical fallback with override adjustment**: When a `CalendarOverride` exists for the preceding month (month 9 for Fitr, month 11 for Adha), the Eid date is computed as `1st of preceding month + length days` rather than the raw astronomical calendar. This ensures the fallback respects any already-submitted moon-sighting decision.
- **Placeholder times**: Astronomical fallback always returns `07:00` / `08:30` as placeholder prayer times. The `EidCard` shows a "preliminary, subject to moon-sighting confirmation" notice when `source === "astronomical"`.
- **Admin page reuses existing components**: `SightingCard` and `EidPrayerModal` are used as-is. The admin page always renders `SightingCard` (not gated by Hijri day 29/30), giving the Imam access at any time.
- **`useEidPrayers` hook**: Mirrors the pattern of `useSightingStatus` — fetches on mount, exposes `{ records, loading, error }`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  iqama-ui (React / Vite / TypeScript)                               │
│                                                                     │
│  PrayerViewerPage                                                   │
│  └── EidCard (one per EidPrayerRecord, above prayer table)          │
│       ├── Eid type name + date                                      │
│       ├── Prayer times (1st Prayer, 2nd Prayer)                     │
│       └── Preliminary notice (when source === "astronomical")       │
│                                                                     │
│  AdminPage (/admin)                                                 │
│  └── EidMoonSightingPage (/admin/eid)                               │
│       ├── Hijri date + override status (from /status)               │
│       ├── Saved Eid records with Edit buttons (from /eid-prayers)   │
│       │    └── EidPrayerModal (on Edit click)                       │
│       └── SightingCard (always visible, any Hijri day)              │
│            └── EidPrayerModal (for months 9 & 11)                   │
│                                                                     │
│  Hooks                                                              │
│  ├── useSightingStatus()  → { status, loading, error }  (existing)  │
│  └── useEidPrayers()      → { records, loading, error } (new)       │
│                                                                     │
│  Services                                                           │
│  └── hijri-calendar-service.ts                                      │
│       ├── fetchHijriStatus()   (existing)                           │
│       ├── submitOverride()     (existing)                           │
│       └── fetchEidPrayers()    (new, no auth)                       │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────────────────┐
│  iqama-engine (NestJS)                                              │
│                                                                     │
│  HijriCalendarModule                                                │
│  ├── HijriCalendarController                                        │
│  │    ├── GET  /api/v1/hijri-calendar/status        (ApiKeyGuard)   │
│  │    ├── POST /api/v1/hijri-calendar/override      (ApiKeyGuard)   │
│  │    └── GET  /api/v1/hijri-calendar/eid-prayers   (no guard)      │
│  └── CalendarOverrideService                                        │
│       ├── getStatus()                                               │
│       ├── submitOverride()                                          │
│       ├── upsertCalendarOverride()                                  │
│       ├── upsertSpecialPrayer()                                     │
│       └── getEidPrayers(today: string) → EidPrayerRecordDto[]  (new)│
│                                                                     │
│  Auth: ApiKeyGuard (applied per-route, not class-level)             │
│  DB:   PrismaService (existing, reused)                             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ Prisma ORM
┌──────────────────────────▼──────────────────────────────────────────┐
│  MySQL / MariaDB                                                    │
│  ├── CalendarOverride  (hijri_year, hijri_month, length, ...)       │
│  └── SpecialPrayer     (type, hijri_year, date, prayers)            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### Backend — New Files

```
iqama-engine/src/hijri-calendar/
├── dto/
│   └── eid-prayer-record.dto.ts    (new)
└── calendar-override.service.ts   (extended)
    hijri-calendar.controller.ts   (extended)
```

#### `GET /api/v1/hijri-calendar/eid-prayers`

- **Guard**: None (public endpoint)
- **Returns**: `EidPrayerRecordDto[]`
- **HTTP 200** always (empty array when no Eid is in window)

```typescript
// dto/eid-prayer-record.dto.ts
export class EidPrayerEntryDto {
  label: string; // "1st Prayer" | "2nd Prayer"
  time: string; // HH:mm
}

export class EidPrayerRecordDto {
  type: 'EID_AL_FITR' | 'EID_AL_ADHA';
  date: string; // YYYY-MM-DD
  prayers: EidPrayerEntryDto[];
  source: 'override' | 'astronomical';
}
```

#### Controller restructuring

The class-level `@UseGuards(ApiKeyGuard)` is moved to individual route handlers so the new endpoint can be public:

```typescript
@Controller('api/v1/hijri-calendar')
@UsePipes(new ValidationPipe({ ... }))
export class HijriCalendarController {
  @Get('status')
  @UseGuards(ApiKeyGuard)
  async getStatus(): Promise<HijriCalendarStatusDto> { ... }

  @Post('override')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.CREATED)
  async submitOverride(@Body() dto: SubmitOverrideDto): Promise<void> { ... }

  @Get('eid-prayers')
  // No guard — public endpoint
  async getEidPrayers(): Promise<EidPrayerRecordDto[]> {
    const today = dayjs().format('YYYY-MM-DD');
    return this.calendarOverrideService.getEidPrayers(today);
  }
}
```

#### `CalendarOverrideService.getEidPrayers(today: string)`

Algorithm:

1. Parse `today` with `dayjs-hijri` to get the current Hijri year.
2. For each Eid type (`EID_AL_FITR`, `EID_AL_ADHA`):
   a. Query `SpecialPrayer` for `{ hijri_year: currentHijriYear, type }`.
   b. If found: use stored `date` and `prayers`; set `source = "override"`.
   c. If not found: compute `fallbackDate` (see below); set `source = "astronomical"` and `prayers = ASTRONOMICAL_FALLBACK_PRAYERS`.
   d. Apply visibility filter: include only if `today <= eidDate <= today + 3`.
3. Return the filtered array.

**Fallback date computation:**

```
computeFallbackDate(eidType, currentHijriYear, calendarOverride?):
  if eidType === EID_AL_FITR:
    precedingMonth = 9  (Ramadan)
    eidDayOffset = 0    (1st of Shawwal = 0 days after month start)
  else:
    precedingMonth = 11 (Dhul-Qi'dah)
    eidDayOffset = 9    (10th of Dhul-Hijjah = 9 days after month start)

  if calendarOverride exists for (currentHijriYear, precedingMonth):
    // Use override-adjusted month start
    astronomicalMonthStart = dayjs-hijri(currentHijriYear, precedingMonth, 1).toGregorian()
    eidDate = astronomicalMonthStart + calendarOverride.length + eidDayOffset days
  else:
    // Pure astronomical
    if eidType === EID_AL_FITR:
      eidDate = dayjs-hijri(currentHijriYear, 10, 1).toGregorian()  // 1st Shawwal
    else:
      eidDate = dayjs-hijri(currentHijriYear, 12, 10).toGregorian() // 10th Dhul-Hijjah
```

**Astronomical fallback prayers constant:**

```typescript
const ASTRONOMICAL_FALLBACK_PRAYERS = [
  { label: '1st Prayer', time: '07:00' },
  { label: '2nd Prayer', time: '08:30' },
];
```

**Visibility predicate (pure function):**

```typescript
function isInApproachWindow(today: string, eidDate: string): boolean {
  const t = dayjs(today);
  const e = dayjs(eidDate);
  const diff = e.diff(t, 'day');
  return diff >= 0 && diff <= 3;
}
```

### Frontend — New Files

```
iqama-ui/src/
├── components/
│   └── EidCard.tsx                    (new)
├── hooks/
│   └── useEidPrayers.ts               (new)
├── pages/
│   └── EidMoonSightingPage.tsx        (new)
└── services/
    └── hijri-calendar-service.ts      (extended)
```

**Modified files:**

```
iqama-ui/src/
├── types/index.ts                     (add EidPrayerRecord)
├── App.tsx                            (add /admin/eid route)
├── components/AdminNav.tsx            (add third tab)
└── pages/PrayerViewerPage.tsx         (wire EidCard above prayer table)
```

#### `EidPrayerRecord` type (addition to `types/index.ts`)

```typescript
export interface EidPrayerRecord {
  type: EidType; // 'EID_AL_FITR' | 'EID_AL_ADHA'
  date: string; // YYYY-MM-DD
  prayers: EidPrayerEntry[];
  source: 'override' | 'astronomical';
}
```

#### `fetchEidPrayers()` (addition to `hijri-calendar-service.ts`)

```typescript
export async function fetchEidPrayers(): Promise<EidPrayerRecord[]> {
  return apiFetch<EidPrayerRecord[]>('/api/v1/hijri-calendar/eid-prayers');
  // requiresAuth intentionally omitted — public endpoint
}
```

#### `useEidPrayers` hook

```typescript
// hooks/useEidPrayers.ts
export function useEidPrayers(): {
  records: EidPrayerRecord[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
};
```

Mirrors `useSightingStatus`: fetches on mount, exposes `records` (defaults to `[]`), `loading`, `error`, and a `refetch` callback for post-submit refresh.

#### `EidCard` component

```typescript
// components/EidCard.tsx
interface EidCardProps {
  record: EidPrayerRecord;
}

export function EidCard({ record }: EidCardProps);
```

Renders:

- Eid type name ("Eid al-Fitr" or "Eid al-Adha")
- Gregorian date formatted as human-readable string (e.g., "Friday, June 27, 2025")
- Prayer times: one row per entry in `record.prayers` showing `label` and `time`
- When `record.source === "astronomical"`: a notice banner reading "Preliminary times — subject to moon-sighting confirmation"
- When `record.source === "override"`: no notice banner

#### `PrayerViewerPage` changes

The `useEidPrayers()` hook is called at the top of the component. When `records` is non-empty, one `EidCard` per record is rendered above the prayer table (inside the `flex-1 -mt-4` container, before the sighting card):

```tsx
{
  records.map((record) => (
    <div key={record.type} className="px-4 pt-4">
      <EidCard record={record} />
    </div>
  ));
}
```

No error UI is shown for `useEidPrayers` failures — the page degrades silently (requirement 4.6).

#### `EidMoonSightingPage`

```typescript
// pages/EidMoonSightingPage.tsx
export function EidMoonSightingPage();
```

Layout:

1. **Status section**: Hijri date (e.g., "Ramadan 29, 1446") + override status badge (green "Override submitted" or gray "No override yet").
2. **Saved Eid records section**: Two cards (one per Eid type). Each shows type name, date, prayer times (or placeholder if `source === "astronomical"`), and an "Edit" button that opens `EidPrayerModal` pre-populated with existing times.
3. **Moon sighting section**: `SightingCard` always rendered (not gated by Hijri day). Selecting a length triggers the same `onDecision` logic as `PrayerViewerPage` — direct POST for non-Eid months, `EidPrayerModal` for months 9/11.

State managed locally:

- `eidModalOpen`, `pendingLength`, `editingEidType` (for Edit flow)
- `sightingError`, `sightingSuccess`
- Calls `refetch()` on `useEidPrayers` after successful modal submission

#### `AdminNav` changes

A third `NavLink` is added:

```tsx
<NavLink to="/admin/eid" className={...}>
  Eid & Moon Sighting
</NavLink>
```

Active styling matches the existing pattern (blue underline + blue text).

#### `App.tsx` changes

```tsx
import { EidMoonSightingPage } from './pages/EidMoonSightingPage';

// Inside the /admin route children:
<Route path="eid" element={<EidMoonSightingPage />} />;
```

---

## Data Models

No new database models are required. The existing `CalendarOverride` and `SpecialPrayer` models (introduced by `hijri-calendar-sighting`) are sufficient.

### Existing models (read-only for this feature)

```prisma
model CalendarOverride {
  id                 Int      @id @default(autoincrement())
  hijri_year         Int
  hijri_month        Int      // 1–12
  length             Int      // 29 or 30
  is_manual_override Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

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

### Frontend types (additions to `iqama-ui/src/types/index.ts`)

```typescript
export interface EidPrayerRecord {
  type: EidType; // 'EID_AL_FITR' | 'EID_AL_ADHA'
  date: string; // YYYY-MM-DD
  prayers: EidPrayerEntry[]; // EidPrayerEntry already defined
  source: 'override' | 'astronomical';
}
```

(`EidType` and `EidPrayerEntry` are already defined in `types/index.ts` from the prior feature.)

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property Reflection

Before listing properties, redundancy is eliminated:

- Requirements 1.7 and 1.8 together define the visibility window. They are two sides of the same invariant: an Eid type is included if and only if `0 <= eidDate - today <= 3`. These are combined into one bidirectional property.
- Requirements 1.4 and 2.3 both state that stored prayers are returned unchanged. They are merged into one round-trip property.
- Requirements 1.6 and 1.4 together define the `source` field: `"override"` when a record exists, `"astronomical"` when it does not. These are combined into one property about source accuracy.
- Requirements 3.1 and 3.2 both test fallback date computation (FITR vs ADHA). They are combined into one parameterised property covering both types.
- Requirements 3.3 and 3.4 (date format) are a format invariant that applies to all computed dates — kept as one property.
- Requirements 4.3 and 8.2 both test that rendered EidCard/admin records display all required fields. They are combined into one rendering property.
- Requirement 4.7 (one EidCard per record) is a distinct cardinality property, kept separate.

After reflection, the final property set is:

---

### Property 1: Eid card visibility window is exact

_For any_ today date and Eid date, the `isInApproachWindow(today, eidDate)` function SHALL return `true` if and only if `0 <= daysBetween(today, eidDate) <= 3`. It SHALL return `false` for any negative difference (Eid has passed) and for any difference greater than 3 (Eid is more than 3 days away).

**Validates: Requirements 1.7, 1.8**

---

### Property 2: Source field accurately reflects record existence

_For any_ Eid type and Hijri year, when `getEidPrayers` is called:

- If a `SpecialPrayer` record exists for that type and year, the returned record SHALL have `source === "override"`.
- If no `SpecialPrayer` record exists, the returned record SHALL have `source === "astronomical"`.

**Validates: Requirements 1.4, 1.5, 1.6**

---

### Property 3: Override prayers are returned unchanged (round-trip)

_For any_ `prayers` array stored in a `SpecialPrayer` record, calling `getEidPrayers` SHALL return that exact `prayers` array in the corresponding `EidPrayerRecord` without modification.

**Validates: Requirements 1.4, 2.3**

---

### Property 4: Astronomical fallback date is always in the future relative to the current Hijri year

_For any_ `today` date in the current Hijri year, the fallback Eid date computed by `getEidPrayers` for both `EID_AL_FITR` (1st Shawwal) and `EID_AL_ADHA` (10th Dhul-Hijjah) SHALL be a date that is strictly after the 1st of Ramadan (month 9) of the same Hijri year — i.e., the computed date is always a valid future Eid date within the current Hijri year.

**Validates: Requirements 3.1, 3.2**

---

### Property 5: Override-adjusted fallback date shifts by exactly the override length

_For any_ `CalendarOverride` record with `length` ∈ {29, 30} for the preceding month (month 9 for Fitr, month 11 for Adha), the computed fallback Eid date SHALL equal the Gregorian date of the 1st of that preceding month plus `length` days (for Fitr) or plus `length + 9` days (for Adha).

**Validates: Requirements 3.3**

---

### Property 6: All computed Eid dates are formatted as YYYY-MM-DD

_For any_ input to `getEidPrayers`, every `date` field in the returned `EidPrayerRecord` objects SHALL match the regular expression `^\d{4}-\d{2}-\d{2}$`.

**Validates: Requirements 2.1, 3.4**

---

### Property 7: EidCard renders all required fields for any valid record

_For any_ `EidPrayerRecord` object, rendering `EidCard` SHALL produce output that contains the Eid type name, the formatted date string, and the `label` and `time` for each entry in the `prayers` array.

**Validates: Requirements 4.3, 8.2**

---

### Property 8: One EidCard rendered per EidPrayerRecord

_For any_ array of N `EidPrayerRecord` objects (N ∈ {0, 1, 2}), `PrayerViewerPage` SHALL render exactly N `EidCard` components above the prayer table.

**Validates: Requirements 4.1, 4.2, 4.7**

---

## Error Handling

### Backend

| Scenario                                         | Behaviour                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| `getEidPrayers` — Prisma read failure            | Unhandled exception propagates as HTTP 500 (NestJS default)      |
| `getEidPrayers` — `dayjs-hijri` failure          | Caught in service, returns HTTP 500 with descriptive message     |
| `getStatus` / `submitOverride` — missing API key | `ApiKeyGuard` returns HTTP 401 (unchanged from prior feature)    |
| `submitOverride` — validation failure            | `ValidationPipe` returns HTTP 422 (unchanged from prior feature) |

The `eid-prayers` endpoint has no authentication, so there are no auth error cases for it.

### Frontend

| Scenario                                 | Behaviour                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `fetchEidPrayers` network/API error      | `useEidPrayers` sets `error` state; `PrayerViewerPage` renders no `EidCard` (silent degradation per Req 4.6) |
| `fetchHijriStatus` failure on admin page | `EidMoonSightingPage` displays error message (Req 7.6)                                                       |
| `fetchEidPrayers` failure on admin page  | `EidMoonSightingPage` displays error message (Req 8.1)                                                       |
| `submitOverride` failure (non-Eid month) | Inline error shown below `SightingCard` (Req 9.5)                                                            |
| `submitOverride` failure (Eid month)     | `EidPrayerModal` stays open, displays inline error (Req 9.5)                                                 |
| `submitOverride` success                 | Modal closes (if open), success notification shown, `useEidPrayers` refetched (Req 9.4)                      |

---

## Testing Strategy

### Backend (Jest + `@nestjs/testing` + `fast-check`)

**Unit tests** (`*.spec.ts` in `src/hijri-calendar/`):

- `calendar-override.service.spec.ts` (extended):
  - `getEidPrayers` with a mocked `SpecialPrayer` record → verifies `source: "override"` and exact prayers passthrough.
  - `getEidPrayers` with no record → verifies `source: "astronomical"` and placeholder prayers `[{label: "1st Prayer", time: "07:00"}, {label: "2nd Prayer", time: "08:30"}]`.
  - `getEidPrayers` with a `CalendarOverride` for the preceding month → verifies override-adjusted date.
  - `getEidPrayers` with today outside the window → verifies empty array returned.
  - `getEidPrayers` with today equal to Eid date → verifies record included.
  - `getEidPrayers` with today 3 days before Eid → verifies record included.
  - `getEidPrayers` with today 4 days before Eid → verifies record excluded.

- `hijri-calendar.controller.spec.ts` (extended):
  - `GET /api/v1/hijri-calendar/eid-prayers` without API key → verifies HTTP 200 (no 401).
  - `GET /api/v1/hijri-calendar/eid-prayers` → verifies service method called and result returned.

**Property-based tests** (Jest + `fast-check`):

- `calendar-override.service.property.spec.ts` (extended):
  - **Property 1**: Generate random `(today, eidDate)` pairs; verify `isInApproachWindow` returns `true` iff `0 <= diff <= 3`.
  - **Property 2**: Generate random `SpecialPrayer` records (present/absent); verify `source` field accuracy.
  - **Property 3**: Generate random `prayers` arrays; mock DB to return them; verify round-trip.
  - **Property 5**: Generate random `CalendarOverride` records with `length` ∈ {29, 30}; verify date shift.
  - **Property 6**: Generate random `today` values; verify all returned `date` fields match `YYYY-MM-DD`.

Each property test runs a minimum of **100 iterations** (`{ numRuns: 100 }`).

Tag format: `// Feature: eid-display-admin, Property N: <property_text>`

### Frontend (Vitest + `fast-check` + `@testing-library/react`)

**Unit tests** (`*.test.tsx`):

- `EidCard.test.tsx`:
  - Renders Eid type name, date, prayer times for a concrete `EidPrayerRecord`.
  - Shows preliminary notice when `source === "astronomical"`.
  - Hides preliminary notice when `source === "override"`.

- `useEidPrayers.test.ts`:
  - Returns `records: []` and `loading: true` on mount.
  - Returns fetched records on success.
  - Sets `error` on fetch failure.
  - `refetch()` triggers a new fetch.

- `EidMoonSightingPage.test.tsx`:
  - Displays Hijri date from `useSightingStatus`.
  - Shows "Override submitted" badge when `hasOverride: true`.
  - Shows "No override yet" badge when `hasOverride: false`.
  - Renders `SightingCard` regardless of Hijri day.
  - Opens `EidPrayerModal` when Imam selects length on month 9 or 11.
  - Dispatches POST directly for non-Eid months.
  - Displays Edit button for each Eid type; clicking opens `EidPrayerModal`.
  - Shows placeholder text when `source === "astronomical"`.
  - Refreshes Eid records after successful modal submission.

- `AdminNav.test.tsx` (extended):
  - Renders three tabs including "Eid & Moon Sighting".
  - Active styling applied to `/admin/eid` when route is active.

- `PrayerViewerPage.test.tsx` (extended):
  - Renders `EidCard` above prayer table when `useEidPrayers` returns records.
  - Does not render `EidCard` when `useEidPrayers` returns empty array.
  - Does not render `EidCard` when `useEidPrayers` returns an error.

**Property-based tests** (`*.property.test.ts`):

- `eid-card.property.test.ts`:
  - **Property 7**: Generate random `EidPrayerRecord` objects; render `EidCard`; verify all required fields present in output.
  - **Property 8**: Generate arrays of 0–2 `EidPrayerRecord` objects; render `PrayerViewerPage`; verify EidCard count matches array length.

Each property test runs a minimum of **100 iterations** (`{ numRuns: 100 }`).

Tag format: `// Feature: eid-display-admin, Property N: <property_text>`

### Integration

The existing `test/` e2e suite in `iqama-engine` can be extended with:

- `GET /api/v1/hijri-calendar/eid-prayers` without API key → HTTP 200.
- `GET /api/v1/hijri-calendar/eid-prayers` with a seeded `SpecialPrayer` record → verifies `source: "override"` and correct prayers in response.
