# Iqama rules: deploy and rollback runbook

The Iqama times come only from the database rules (`IqamaRuleVersion`). The old hard-coded rules, the `IQAMA_RULES` flag (legacy / shadow / db) and `IQAMA_RULES_CUTOVER` were removed. Production had already run `IQAMA_RULES=db` with version 1 (effective 2026-11-13) and was checked identical to the old rules for 140 days.

Run on the production host, in the app directory.

## 1. Check the timezone data (blocker)

British Columbia stopped clock changes after 2026-03-08 (UTC-7 all year). The Azan times use the host's timezone data. If it is old, winter Azan times come out one hour early.

```bash
node -e "console.log(process.version, process.versions.tz); for (const d of ['2027-01-15T20:00:00Z','2027-07-15T20:00:00Z']) console.log(d, new Date(d).toLocaleString('en-CA',{timeZone:'America/Vancouver',timeZoneName:'short'}))"
```

Expected: Node 22.23.5 or newer (tzdata 2026e; see `.nvmrc` and `engines` in `package.json`) and both lines UTC-7 (a `PST` in the January line means old data). The app also logs `Stale timezone data` at startup if America/Vancouver is not UTC-7 in January of next year. Do not continue until it is right.

## 2. Deploy

```bash
./deploy.sh
```

It pulls `main`, installs, runs `npx prisma migrate deploy`, `npx prisma db seed` (idempotent: it never changes an existing version) and the build. Check the rule table:

```bash
sqlite3 prisma/db.sqlite "select id, effectiveFrom, reason from IqamaRuleVersion;"
```

Expected: the existing rows, for example `1|2026-11-13|…`. (Use your `DATABASE_URL` path if different.) A database with no version at all gets version 1 from the seed.

If `IQAMA_RULES` or `IQAMA_RULES_CUTOVER` is still in the environment or `.env`, nothing breaks: they are ignored and the app logs one line at startup (`Ignoring removed setting(s): …`). You can delete them.

Optional read-only checks (they delete nothing):

```bash
npx ts-node scripts/check-overrides-guardrail.ts   # overrides the guardrails would move
npx ts-node scripts/report-override-overlaps.ts    # overlapping overrides for the same prayer
```

## 3. Verify

1. `GET /api/v1/schedule?date=YYYY-MM-DD` for today and next Friday: the times are the ones shown before the deploy.
2. `GET /api/v1/admin/iqama-rules` (header `x-api-key`) shows `effective` with the expected version.
3. The log has no `IQAMA_RULES_MISSING` or `IQAMA_RULES_INVALID` lines. They mean the stored rules are missing or fail validation; the schedule then answers HTTP 500. There is no silent fallback.

## What changed for users

- A date before the first stored version (2026-11-13) uses the earliest version. Past winter Dhuhr dates therefore show 13:45 (Friday 13:40); the old DST rule showed 12:45 (Friday 12:40) for dates before 2026-11-13. Dates from 2026-11-13 are unchanged.
- `GET /api/v1/admin/iqama-rules` no longer returns `cutover`; `mode` is always `"db"` (deprecated).

## Rollback

There is no flag any more. Revert the pull request that removed the legacy code, then deploy again:

```bash
git revert -m 1 <merge commit of the removal PR>   # on main, through a pull request
./deploy.sh
```

The database needs no change: rule versions are append-only and the old code reads the same table. After the revert, `IQAMA_RULES=db` and `IQAMA_RULES_CUTOVER` work again as before.

## Rule changes (no deploy)

Rules are edited through the admin API/UI (`/api/v1/admin/iqama-rules`): preview, then save as a new version. Saving never changes older versions. To undo a rule change, save a new version with the previous rules.
