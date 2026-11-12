# Iqama rules cutover runbook

Moves production from the hard-coded rules (`IQAMA_RULES=legacy`) to the database rules (`db`), with a week of shadow comparison first. Rollback at any step: set `IQAMA_RULES=legacy` and restart.

Run on the production host, in the app directory.

The DB rules apply from `IQAMA_RULES_CUTOVER` (default `2026-11-13`, a Friday). Earlier dates always keep the legacy behaviour, including the old Dhuhr DST logic, so past schedules do not change. Set it in `.env` only if you need a different Friday; if the rules table is seeded, the cutover must not be later than the first date you want the DB rules to serve.

## 1. Check the timezone data (blocker)

British Columbia stopped clock changes after 2026-03-08 (UTC-7 all year). The Azan times use the host's timezone data. If it is old, winter Azan times come out one hour early and the fixed Dhuhr 13:45 would be about 95 minutes after Azan.

```bash
node -e "console.log(process.version, process.versions.tz); for (const d of ['2027-01-15T20:00:00Z','2027-07-15T20:00:00Z']) console.log(d, new Date(d).toLocaleString('en-CA',{timeZone:'America/Vancouver',timeZoneName:'short'}))"
```

Expected: both lines show `MST` (UTC-7). In the January line, `PST` means the data is old.

If it shows `PST` in January:

1. Update Node to 22.23.5 or newer (tzdata 2026e; see `.nvmrc` and `engines` in `package.json`). The app also logs `Stale timezone data` at startup if America/Vancouver is not UTC-7 in January of next year.
2. Re-run the command above until January shows `MST`.
3. Do not continue until it does. (Setting `MASJID_TIMEZONE=Etc/GMT+7` in `.env` also gives UTC-7 year-round and is a valid stopgap; it changes how the host formats times, so check the schedule output after.)

## 2. Migrate and seed

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

The migrations include `20261111000000_iqama_rule_reason` (adds the optional `reason` column). Run `migrate deploy` before starting the new build: the app reads that column.

`db seed` is idempotent. Expected output includes `IqamaRuleVersion already seeded — skipping.` on a repeat run, or `Iqama rules seeded (version 1).` the first time.

Check:

```bash
sqlite3 prisma/db.sqlite "select id, effectiveFrom from IqamaRuleVersion;"
```

Expected: one row, `1|2026-11-13` (the cutover). A database seeded by an earlier build may show `1|1970-01-01`; that is fine, the cutover is configuration. (Use your `DATABASE_URL` path if different.)

## 3. Check existing overrides against the guardrail

Read-only.

```bash
npx ts-node scripts/check-overrides-guardrail.ts
```

It prints each override day that the guardrail would clamp (iqama earlier than Azan + 3 min, Fajr later than sunrise − 60 min, or not on a 5-minute mark; overrides are already rounded up to 5 minutes when saved, so the last case is rare). For each line, ask the admin to fix or delete that override, or accept that the clamped time will be shown. Expected on a clean system: `No override would be clamped.`

Then list overrides that overlap for the same prayer (read-only, deletes nothing):

```bash
npx ts-node scripts/report-override-overlaps.ts
```

Where two overlap, the newest wins on the shared days. Ask the admin to delete or shorten the older one. New overlaps are rejected with 409 from now on.

## 4. Deploy in shadow mode

In `.env`:

```
IQAMA_RULES=shadow
```

Deploy (`./deploy.sh`) or restart the app. Shadow serves the legacy times and logs differences.

Confirm it started in shadow mode:

```bash
curl -s -H "X-API-Key: $ADMIN_API_KEY" http://127.0.0.1:3000/api/v1/admin/iqama-rules | head -c 300
```

The JSON starts with `"mode":"shadow"`.

## 5. Watch for one week

Look for differences between legacy and DB rules:

```bash
grep -h "\[iqama shadow\]" <your app log path> | sort | uniq -c | sort -rn | head -50
```

(For pm2: `pm2 logs <app> --nostream --lines 5000 | grep "\[iqama shadow\]"`.)

- Expected: no `[iqama shadow]` lines. The seed rules reproduce the legacy rules exactly.
- Also look for `[iqama rules] IQAMA_RULES_MISSING` or `IQAMA_RULES_INVALID` error lines: in shadow they are only logged (legacy is still served), but they would be HTTP 500 in `db` mode. Fix them before switching.
- Each line reads `[iqama shadow] <date> <prayer>: legacy=<HH:mm> db=<HH:mm>`. Any line means a real difference. Stop here, keep `legacy`, and report the dates and prayers.
- Logs only appear when a month is built, so view each upcoming month once (or wait for normal traffic) so it is compared.
- Do not edit rules in the admin API during the watch week; that would create expected differences.

## 6. Switch to the database rules

After one clean week:

In `.env`:

```
IQAMA_RULES=db
```

Restart the app. Then:

1. `GET /api/v1/admin/iqama-rules` shows `"mode":"db"`.
2. Open today's and next Friday's schedule and compare with what was shown before the switch (`GET /api/v1/schedule?date=YYYY-MM-DD`).
3. Look for `IQAMA_RULES_MISSING` or `IQAMA_RULES_INVALID` in the log. There should be none. In `db` mode these are HTTP 500 errors, not silent fallbacks; if one appears, set `IQAMA_RULES=legacy` (rollback) and fix the stored rules or the seed.

## Rollback

```
IQAMA_RULES=legacy
```

Restart the app. No data change is needed: the rule table is only read in `shadow` and `db`. Saved versions stay (append-only) and can be used again later. The schedule cache refreshes within 10 minutes, or immediately on restart.

## Not part of this cutover

The legacy `src/rules/*.rule.ts` files and the golden-master test stay in the repository. They are deleted only after a week of clean shadow in production (see `.kiro/specs/iqama-rules-admin/tasks.md`).
