# AGENTS.md

Guide for AI agents and human reviewers working on this repository (for example when reviewing a pull request).

## What this project is

`iqama-engine` is a NestJS REST API for one masjid (Masjid al-Hidayah, Port Coquitlam, B.C.). It takes astronomical prayer times (Azan) from the `adhan` library and applies business rules to produce congregation start times (Iqama) for Fajr, Dhuhr, Asr, Maghrib and Isha. It also serves Hijri-calendar features (moon-sighting override, Eid prayer times, Qiyam time) and an admin API for overrides and Azan settings.

Correctness of the published times is the product. A wrong Iqama time is shown to a congregation, so review times and edge dates carefully.

## Stack

Versions are the ranges in `package.json`; the exact versions are in `package-lock.json`.

- TypeScript `^6.0.3`, NestJS `^11` (`@nestjs/common`, `core`, `config`, `cache-manager`, `platform-express`)
- Prisma `^7.8.0` with the libSQL adapter (`@prisma/adapter-libsql`, `@libsql/client`) on SQLite
- `adhan` `^4.4.3` (prayer times), `dayjs` `^1.11.20` with timezone support, `dayjs-hijri` (Hijri dates)
- `class-validator` / `class-transformer` for DTOs, `cache-manager` `^7.2.8` for the in-memory schedule cache
- Jest `^30` with `ts-jest`, `fast-check` `^4.7.0` (property tests), `supertest`
- ESLint `^9` + Prettier `^3`; Husky runs `lint-staged` on commit
- Node `>=22.23.5` (`engines` in `package.json`; `.nvmrc` pins `22.23.5`, and CI reads `.nvmrc`). Older builds have old timezone data and get B.C. winter time wrong; the app logs a startup error if America/Vancouver is not UTC-7 in January of next year.

## Commands

Run from the repository root.

```bash
# Install (CI uses npm ci)
npm ci

# Environment: copy the template and fill in at least ADMIN_PASSWORD and DATABASE_URL
cp .env.example .env

# Prisma
npx prisma generate          # generate the client (needed before build/test)
npx prisma migrate deploy    # apply migrations to DATABASE_URL
npx prisma db seed           # idempotent seeds: Azan config + Iqama rules (prisma/seed.ts)

# Build, lint, test
npm run build
npm run lint                 # NOTE: runs eslint with --fix, so it can modify files
npm run test                 # TZ=UTC jest (unit + property tests, files named *.spec.ts under src/)
npm run test:cov             # what CI runs
npm run test:e2e             # test/app.e2e-spec.ts (Prisma is mocked)

# Run locally (http://localhost:3000, override with PORT)
npm run start:dev            # watch mode
npm run build && npm run start:prod   # production-style (TZ=UTC node dist/src/main)
```

Environment variables (see `.env.example`):

| Variable                              | Purpose                                                               |
| ------------------------------------- | --------------------------------------------------------------------- |
| `MASJID_LATITUDE`, `MASJID_LONGITUDE` | Coordinates for the Azan calculation (defaults: Port Coquitlam)       |
| `MASJID_TIMEZONE`                     | IANA timezone, default `America/Vancouver`                            |
| `DATABASE_URL`                        | SQLite URL, e.g. `file:./prisma/db.sqlite` (required, app fails fast) |
| `ADMIN_PASSWORD`                      | Shared admin key for `/api/v1/admin/*` and some Hijri endpoints       |
| `CORS_ORIGIN`                         | Comma-separated allowed origins, `*` for any; empty disables CORS     |
| `PORT`                                | HTTP port (default 3000)                                              |
| `TRUST_PROXY`                         | `loopback`, proxy IPs/CIDRs (or hop count, less safe); default off    |

Quick check after starting: `GET /api/v1/health`, then `GET /api/v1/schedule?date=YYYY-MM-DD`.

## Folder layout

```
src/
  adhan/             adhan library adapter (legacy hard-coded params + config-resolved params)
  adhan-config/      admin-editable Azan settings: versions + date-range periods, validator, resolver
  admin/             override CRUD, cache clear (/api/v1/admin)
  auth/              ApiKeyGuard (x-api-key)
  config/            app config (env -> config object)
  health/            /api/v1/health
  hijri-calendar/    moon-sighting override, Eid prayers, Qiyam time, Hijri utils
  override/          OverrideService: query + apply overrides
  prisma/            PrismaService (libSQL adapter)
  rules/             iqama-guardrail.ts (fixed guardrails) and time-utils
  iqama-rules/       admin-editable Iqama rules: evaluator, validator, catalog, versions API (/api/v1/admin/iqama-rules)
  schedule/          public schedule endpoint
  throttle/          rate-limit configuration (@nestjs/throttler)
  schedule-builder/  builds a month of DailySchedule objects, caching and invalidation
  dayjs.ts           dayjs setup (plugins); import dayjs from here, not from 'dayjs'
prisma/              schema.prisma, migrations/, seed.ts (runs seed-adhan-config.ts and seed-iqama-rules.ts)
scripts/             one-off read-only checks (override guardrail, override overlaps)
docs/                operations runbook (Iqama rules deploy and rollback)
test/                e2e test
.kiro/steering/      domain rules for AI agents (read these first, see below)
.kiro/specs/         requirements.md / design.md / tasks.md per feature
deploy.sh, .cpanel.yml, .github/workflows/   deployment
```

## Conventions

- One NestJS module per feature (`*.module.ts`, `*.controller.ts`, `*.service.ts`); DTOs in `dto/` with `class-validator` decorators. A global `ValidationPipe` (`whitelist: true`, `transform: true`) is set in `src/app.setup.ts`.
- Spec files sit next to the code (`foo.service.ts` and `foo.service.spec.ts`). Property tests use `fast-check`, often as `*.pbt.spec.ts` or inside a normal spec.
- Prisma: SQLite, migrations are SQL files under `prisma/migrations/`. Access the DB through `PrismaService`.
- Time handling: use `import dayjs from '../dayjs'` and `dayjs.tz(...)`. Do not call `.hour()`, `.minute()` or `.second()` setters on a timezone-aware value; `dayjs-hijri` replaces `.set()` and drops the timezone. Use the helpers in `src/rules/time-utils.ts` (see the comments there).
- `.kiro/steering/*.md` hold the domain rules and are meant to be read by agents. `.kiro/specs/<feature>/` hold the requirements, design and task list of a feature. Keep both in sync when a rule changes.
- Formatting: Prettier (`singleQuote`, `trailingComma: all`). Husky + lint-staged run on commit.

## Domain invariants a reviewer must check

1. **Timezone.** The masjid timezone is `America/Vancouver`. British Columbia stopped clock changes after 2026-03-08, so local time is UTC-7 all year from then on. Code must not infer "winter" or "summer" clock offsets from DST. Dhuhr is a fixed 13:45 (Friday 13:40) in the stored rules, with no DST logic; past winter dates now show 13:45 too (the old DST rule was removed). `is_dst` in the schedule is a display-only field (`src/schedule-builder/is-dst.ts`). Do not add DST-based rules. Tests and `npm run start:prod` run with `TZ=UTC`, so any code that depends on the process timezone is a bug: always pass the masjid timezone explicitly.
2. **Iqama must never be earlier than the Azan.** This is the critical invariant; the fixed guardrails enforce it (`.kiro/steering/iqama-rules-system.md`).
3. **Weekly window.** Fajr and Isha Iqama are held for a Friday to Thursday window: the schedule builder computes the 7 days of that window and the rule takes the latest per-day result (Fajr is also capped by the earliest `sunrise - 60 min` of the window). Changes to Fajr/Isha must keep this window and the per-week window (`getWeeklyCtx` / `buildWeeklyContext`) consistent.
4. **Overrides.** Admin overrides (FIXED `HH:mm` or OFFSET minutes) replace the rule result for a prayer on a date range and are rounded up to 5 minutes. They are applied by `OverrideService.applyOverrides`. Fixed guardrails run after overrides on every path (Iqama at least Azan + 3 minutes, Fajr at least 60 minutes before sunrise, every time on a 5-minute mark); a changed time carries `iqama_clamped: true`. The newest override wins when several cover a day, and creating or updating an override that overlaps another for the same prayer returns 409. When reviewing override code, check how date strings are compared (SQLite stores dates as `YYYY-MM-DDTHH:mm:ss…`, so queries compare the `YYYY-MM-DD` prefix with raw SQL).
5. **Caching and invalidation.** `ScheduleBuilderService.getMonth` caches one month per key (`schedule:YYYY-MM`) in memory (TTL 10 minutes, max 100 entries, see `src/app.module.ts`) and shares in-flight builds. Anything that changes the schedule (overrides, Azan config versions and periods, moon-sighting overrides, Qiyam config) must call `invalidateCache(...)` for the affected dates. Check that a new write path does this.
6. **Admin auth.** `ApiKeyGuard` (`src/auth/api-key.guard.ts`) reads the `x-api-key` header and compares it with `ADMIN_PASSWORD` (SHA-256 hashes, `timingSafeEqual`). If `ADMIN_PASSWORD` is not set the guard rejects every request (401). Every new write endpoint needs `@UseGuards(ApiKeyGuard)`; routes with that guard are automatically covered by the stricter admin rate limit (120 requests per minute per IP, shared across all admin routes; public routes allow 300 per minute) in `src/throttle/throttle.config.ts`. HTTP setup (helmet, CORS, `trust proxy`, validation) lives in `src/app.setup.ts`. Behind a reverse proxy set `TRUST_PROXY` to `loopback` (proxy on the same host) or the proxy's IPs/CIDRs, otherwise all clients share the proxy's IP and one rate limit. Hop counts and `true` are accepted but only safe when the app port is reachable solely through the proxy (a client could otherwise spoof `X-Forwarded-For`); the app logs a startup warning for them ([Express: behind proxies](https://expressjs.com/en/guide/behind-proxies.html)). Public endpoints today: `GET /api/v1/schedule`, `GET /api/v1/health` (generic `503` body on failure, details only in the server log), and the read endpoints of `/api/v1/hijri-calendar` (status, eid-prayers, qiyam-config).
7. **Azan source.** If any Azan setting exists in the database (`AdhanConfigVersion`), times come from the config-resolved parameters; otherwise from the legacy hard-coded adapter (ISNA 15°/15°, Shafi'i, TwilightAngle, Isha -6 min in May to July). Any code that needs Azan times for another day (for example the weekly window) must use the same source as the day itself.
8. **Hijri features.** Qiyam is injected only on Hijri days 20 to 29 of month 9. Eid times are injected on the astronomical Eid day with fallback times 07:00 and 08:30. See `.kiro/steering/hijri-calendar-module.md`.

## Iqama rules system

Iqama rules can be stored in the database (`IqamaRuleVersion`, append-only) and edited through `/api/v1/admin/iqama-rules` (merged in [PR #3](https://github.com/abudayah/iqama-engine/pull/3)). The pipeline is base, modifiers, override, then fixed guardrails. The stored rules are the only source of Iqama times: the old per-prayer functions and the `IQAMA_RULES` / `IQAMA_RULES_CUTOVER` settings were removed (the variables are ignored if still set). A date before the first version uses the earliest version; no versions or invalid stored rules fail with an explicit 500. The full model and API contract are in `.kiro/steering/iqama-rules-system.md`; deploy and rollback steps are in `docs/iqama-rules-cutover-runbook.md`. A frozen snapshot of the schedule (`src/iqama-rules/fixtures/iqama-snapshot.json`, checked by `iqama-rules.snapshot.spec.ts`) guards the published times. The `/api/v1/admin/iqama-rules` routes use `ApiKeyGuard`, so they share the admin rate limit.

## Pull requests and commits

- Work on a feature branch and open a pull request into `main`. Do not push directly to `main`.
- CI (`.github/workflows/build-and-deploy.yml`) runs on pull requests and pushes: `npm ci`, `prisma generate`, `npm run lint`, `npm run test:cov`, `npm run build`. A push to `main` also builds `dist/` and pushes it to the generated `prod` branch. Do not edit `prod` by hand.
- Keep PRs focused: one concern per PR, with tests. Describe what changed, what was tested and what could not be tested.
- Commit messages: short imperative subject. The history uses prefixes like `feat(asr): ...`, `fix(deploy): ...`, `chore(deploy): ...`.
- Never commit `.env`, a database file, or any secret. Only `.env.example` (placeholders) is tracked.

## How to review (checklist)

1. **Times are correct.** For rule changes, pick concrete dates (a normal day, a Friday, the first Friday of a month, 2027-01-01, a June day with a very late Isha, a day around sunrise for Fajr) and work out the expected Azan and Iqama by hand. Check rounding direction (up or down, 5-minute marks) and that Iqama is never before the Azan.
2. **Tests exist and are meaningful.** New logic has a unit test, and an invariant has a `fast-check` property where it makes sense. Existing tests were not weakened or deleted to make the change pass. If a PR changes rules or Azan inputs, check the snapshot test (`src/iqama-rules/iqama-rules.snapshot.spec.ts`): a diff means published times changed, and regenerating the fixture (`UPDATE_IQAMA_SNAPSHOT=1`) must be intended and reviewed.
3. **Run it.** `npm run build`, `npm run lint` and `npm run test` pass. Note that `npm run lint` rewrites files with `--fix`, so check `git status` afterwards.
4. **Migrations are additive.** New Prisma migrations only add tables or nullable columns; no drops, renames, or data loss without an explicit plan. `schema.prisma` and the SQL migration agree.
5. **No secrets.** No `.env`, passwords, keys, tokens or database files in the diff. New configuration is documented in `.env.example`.
6. **Auth and validation.** New write endpoints are guarded with `ApiKeyGuard` and validate input with DTOs.
7. **Cache.** Anything that changes the schedule invalidates the affected months.
8. **No silent fallbacks.** Code must not hide a failure by quietly using another source (a default time, another rule set, an empty list). If data is missing or invalid, it should fail with a clear error or log a visible warning, and a test should cover it.
9. **Docs match the code.** If a rule, endpoint or env variable changed, `README.md`, `.kiro/steering/` and the relevant `.kiro/specs/` file are updated.
