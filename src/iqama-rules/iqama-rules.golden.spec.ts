/**
 * Golden master: the new evaluator + seed config must reproduce the legacy
 * src/rules/*.rule.ts functions (the oracle) for every day 2026-2035.
 */
import dayjs from '../dayjs';
import { ConfigService } from '@nestjs/config';
import { AdhanAdapter, RawPrayerTimes } from '../adhan/adhan.adapter';
import { computeWeeklyFajrIqama } from '../rules/fajr.rule';
import { computeDhuhrIqama } from '../rules/dhuhr.rule';
import { computeAsrIqama } from '../rules/asr.rule';
import { computeMaghribIqama } from '../rules/maghrib.rule';
import { computeWeeklyIshaIqama } from '../rules/isha.rule';
import { applyIqamaGuardrail } from '../rules/iqama-guardrail';
import { DEFAULT_RULE_SET } from './iqama-rules.seed';
import { evaluateIqama, evaluateRule, toDayCtx } from './iqama-rules.evaluator';
import { PRAYER_NAMES } from './iqama-rules.types';

describe.each(['Etc/GMT+7', 'America/Vancouver'])(
  'golden master vs legacy rules (%s)',
  (tz) => {
    const cfg: Record<string, unknown> = {
      'app.masjidLatitude': 49.2652047,
      'app.masjidLongitude': -122.7878735,
      'app.masjidTimezone': tz,
    };
    const adapter = new AdhanAdapter({
      get: (k: string) => cfg[k],
    } as unknown as ConfigService);
    const cache = new Map<string, RawPrayerTimes>();
    const rawOf = (date: string) => {
      let r = cache.get(date);
      if (!r) {
        r = adapter.getPrayerTimes(dayjs.tz(`${date}T12:00:00`, tz).toDate());
        cache.set(date, r);
      }
      return r;
    };
    // Friday -> Thursday window containing `date` (same as ScheduleBuilder).
    const weekDates = (date: string): string[] => {
      const d = dayjs.tz(date, tz);
      const start = d.subtract((d.day() + 2) % 7, 'day');
      return Array.from({ length: 7 }, (_, i) =>
        start.add(i, 'day').format('YYYY-MM-DD'),
      );
    };

    it('matches every prayer, every day, 2026-2035 (before and after guardrail)', () => {
      const diffs: string[] = [];
      const start = dayjs.tz('2026-01-01', tz);
      for (let i = 0; i < 3652; i++) {
        const date = start.add(i, 'day').format('YYYY-MM-DD');
        const raw = rawOf(date);
        const wk = weekDates(date).map((d) => ({ d, raw: rawOf(d) }));

        const legacy = {
          fajr: computeWeeklyFajrIqama(
            wk.map(({ raw: r }) => ({ fajrAzan: r.fajr, sunrise: r.sunrise })),
          ),
          dhuhr: computeDhuhrIqama(date, tz),
          asr: computeAsrIqama(raw.asr),
          maghrib: computeMaghribIqama(raw.maghrib),
          isha: computeWeeklyIshaIqama(wk.map(({ raw: r }) => r.isha)),
        };

        for (const p of PRAYER_NAMES) {
          const rule = DEFAULT_RULE_SET[p];
          const pick = (r: RawPrayerTimes) =>
            toDayCtx(date, r[p], p === 'fajr' ? r.sunrise : undefined);
          const day = pick(raw);
          const week = wk.map(({ d, raw: r }) => ({ ...pick(r), date: d }));

          const got = evaluateRule(rule, day, week);
          if (got !== legacy[p])
            diffs.push(`${date} ${p} rule ${got} != ${legacy[p]}`);

          const g = applyIqamaGuardrail(
            legacy[p],
            raw[p],
            p === 'fajr' ? raw.sunrise : undefined,
          );
          const full = evaluateIqama(p, rule, day, week);
          if (full.iqama !== g.iqama || full.clamped !== g.clamped)
            diffs.push(
              `${date} ${p} final ${full.iqama}/${full.clamped} != ${g.iqama}/${g.clamped}`,
            );
        }
      }
      expect(diffs).toEqual([]);
    }, 120_000);
  },
);
