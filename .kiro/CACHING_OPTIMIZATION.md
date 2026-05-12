# Caching Optimization for iqama-engine

## Overview

Implemented in-memory caching to dramatically reduce API latency by caching computed prayer schedules and automatically invalidating cache when admin makes changes.

## Changes Made

### 1. Added Caching Dependencies

- Installed `@nestjs/cache-manager` and `cache-manager`
- Configured global cache module in `app.module.ts` with:
  - TTL: 0 (infinite - manual invalidation only)
  - Max entries: 100 months

### 2. Schedule Builder Service (`schedule-builder.service.ts`)

**Added:**

- Cache manager injection via `CACHE_MANAGER` token
- `getMonth()` now checks cache before building schedules
- `invalidateCache(startDate?, endDate?)` method to clear affected months
- Smart invalidation: clears specific months or entire cache

**Cache Key Format:** `schedule:YYYY-MM`

### 3. Admin Controller (`admin.controller.ts`)

**Cache invalidation triggers:**

- `POST /overrides` - invalidates affected date range
- `PATCH /overrides/:id` - invalidates both old and new date ranges
- `DELETE /overrides/:id` - invalidates affected date range
- `DELETE /overrides` - clears entire cache

### 4. Hijri Calendar Controller (`hijri-calendar.controller.ts`)

**Cache invalidation triggers:**

- `POST /override` - clears entire cache (Hijri dates affect display)
- `DELETE /override` - clears entire cache
- `POST /qiyam-config` - clears entire cache (affects Ramadan months)

### 5. Module Updates

- `AdminModule` - imports `ScheduleBuilderModule`
- `HijriCalendarModule` - imports `ScheduleBuilderModule`

### 6. Test Updates

All test files updated with cache manager mocks:

- `schedule-builder.service.spec.ts`
- `schedule-builder.service.pbt.spec.ts`
- `admin.controller.spec.ts`
- `hijri-calendar.controller.spec.ts`

## Performance Impact

### Before Caching

- Every API request recalculates entire month (30-31 days)
- Each day requires:
  - Adhan time calculation
  - Override queries
  - Weekly context building
  - Iqama rule computation
  - Hijri date conversion

### After Caching

- **First request:** Same as before (cache miss)
- **Subsequent requests:** Instant response from cache (cache hit)
- **Admin changes:** Affected months invalidated immediately
- **Expected improvement:** 95%+ latency reduction for cached requests

## Cache Invalidation Strategy

### Granular Invalidation

When admin changes affect specific dates:

1. Parse start/end dates
2. Identify affected months
3. Delete only those month keys

### Full Invalidation

When changes affect unpredictable ranges:

- Hijri calendar overrides (affects date display globally)
- Qiyam config changes (affects Ramadan, but Gregorian dates vary)
- Clear all overrides operation

## Testing

All 173 tests pass, including:

- Unit tests for schedule building
- Property-based tests for Qiyam injection
- Admin controller tests
- Hijri calendar controller tests

## Deployment Notes

1. **No database changes required** - caching is in-memory only
2. **Cache is per-instance** - if running multiple instances, each has its own cache
3. **Cache survives** - until process restart or manual invalidation
4. **No breaking changes** - API contracts unchanged

## Future Enhancements

Consider for production:

1. **Redis** - for shared cache across multiple instances
2. **Cache warming** - pre-populate cache for current/next month on startup
3. **Metrics** - track cache hit/miss rates
4. **TTL strategy** - add time-based expiration for stale data protection

## Monitoring

Watch for:

- Memory usage (100 months × ~30KB = ~3MB max)
- Cache hit rate (should be >90% in production)
- Admin operation latency (should remain unchanged)
