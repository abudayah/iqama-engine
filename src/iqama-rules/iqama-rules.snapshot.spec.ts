/**
 * Frozen snapshot of the schedule the seed rules produce (db mode, default Azan
 * config, UTC-7 all year) for every day from 2026-11-13 to 2035-12-31: all five
 * prayers, Azan + Iqama, with iqama_clamped / iqama_conflict flags.
 *
 * It replaced the old "golden master" that compared the new rule engine with the
 * legacy per-prayer functions. A diff here means the published times changed.
 * If the change is intended, regenerate and review the diff:
 *   UPDATE_IQAMA_SNAPSHOT=1 npx jest src/iqama-rules/iqama-rules.snapshot
 *
 * Row format: "<date>|<azan>><iqama>[c][!]|..." for fajr, dhuhr, asr, maghrib, isha.
 *   c = iqama_clamped, ! = iqama_conflict.
 */
import * as fs from 'fs';
import * as path from 'path';
import { DailySchedule } from '../schedule/daily-schedule.interface';
import { makeStack } from './testing';

const FIXTURE = path.join(__dirname, 'fixtures', 'iqama-snapshot.json');
const FIRST = '2026-11-13';
const LAST = '2035-12-31';
const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

const row = (d: DailySchedule): string =>
  [
    d.date,
    ...PRAYERS.map((p) => {
      const e = d[p];
      return `${e.azan}>${e.iqama}${e.iqama_clamped ? 'c' : ''}${e.iqama_conflict ? '!' : ''}`;
    }),
  ].join('|');

async function buildAll(): Promise<string[]> {
  const { builder } = await makeStack({ mode: 'db', adhanConfig: true });
  const rows: string[] = [];
  for (let y = 2026; y <= 2035; y++) {
    for (let m = 1; m <= 12; m++) {
      const ym = `${y}-${String(m).padStart(2, '0')}`;
      if (ym < FIRST.slice(0, 7)) continue;
      for (const d of await builder.buildMonth(ym)) {
        if (d.date >= FIRST && d.date <= LAST) rows.push(row(d));
      }
    }
  }
  return rows;
}

describe('schedule snapshot (seed rules, default Azan config, 2026-11-13 .. 2035-12-31)', () => {
  it('matches the frozen fixture', async () => {
    const rows = await buildAll();

    if (process.env.UPDATE_IQAMA_SNAPSHOT === '1') {
      fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
      fs.writeFileSync(
        FIXTURE,
        JSON.stringify(
          {
            description:
              'Seed rules, default Azan config, timezone UTC-7 all year. Row: date|azan>iqama[c=clamped][!=conflict] for fajr,dhuhr,asr,maghrib,isha',
            from: FIRST,
            to: LAST,
            rows,
          },
          null,
          0,
        ).replace(/","/g, '",\n"') + '\n',
      );
    }

    const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) as {
      from: string;
      to: string;
      rows: string[];
    };
    expect(fixture.from).toBe(FIRST);
    expect(fixture.rows).toHaveLength(rows.length);
    const diffs: string[] = [];
    rows.forEach((r, i) => {
      if (r !== fixture.rows[i])
        diffs.push(`expected ${fixture.rows[i]}\n     got ${r}`);
    });
    expect(diffs.slice(0, 5)).toEqual([]);
    expect(diffs).toHaveLength(0);
  }, 300_000);

  it('the snapshot itself satisfies the fixed rules', () => {
    const { rows } = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) as {
      rows: string[];
    };
    const mins = (t: string) =>
      Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    expect(rows.length).toBeGreaterThan(3000);
    for (const r of rows) {
      const [date, ...cells] = r.split('|');
      cells.forEach((c) => {
        const [azan, rest] = c.split('>');
        const iqama = rest.slice(0, 5);
        expect(mins(iqama)).toBeGreaterThanOrEqual(mins(azan) + 3);
        expect(mins(iqama) % 5).toBe(0);
      });
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
