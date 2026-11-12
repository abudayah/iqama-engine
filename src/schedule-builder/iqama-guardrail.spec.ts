/**
 * Guardrails: real adhan adapter + stored rules + real override service,
 * only Prisma/cache are faked. Checks the final DailySchedule, not the rules.
 */
import * as fc from 'fast-check';
import dayjs from '../dayjs';
import { DailySchedule } from '../schedule/daily-schedule.interface';
import { makeStack } from '../iqama-rules/testing';

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
const mins = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));

// America/Vancouver in an old tzdata may still switch to PST in winter;
// Etc/GMT+7 is the real post-2026 behaviour (UTC-7 all year).
const FIXED_TZ = 'Etc/GMT+7';

async function makeService(opts: {
  withConfig: boolean;
  tz?: string;
  overrides?: unknown[];
}) {
  const { builder, prisma } = await makeStack({
    adhanConfig: opts.withConfig,
    tz: opts.tz,
    overrides: opts.overrides,
  });
  return { service: builder, prisma };
}

describe('iqama guardrail (final schedule)', () => {
  describe.each([
    [true, 'America/Vancouver'],
    [true, FIXED_TZ],
    [false, FIXED_TZ],
  ])('adhan config = %s, tz = %s', (withConfig, tz) => {
    it('no iqama < azan+3 and Fajr ends >= 60 min before sunrise, 2026-2035', async () => {
      const { service } = await makeService({ withConfig, tz });
      const bad: string[] = [];
      for (let y = 2026; y <= 2035; y++) {
        for (let m = 1; m <= 12; m++) {
          const days = await service.buildMonth(
            `${y}-${String(m).padStart(2, '0')}`,
          );
          for (const d of days) {
            for (const p of PRAYERS) {
              if (mins(d[p].iqama) % 5 !== 0) {
                bad.push(`${d.date} ${p} not on a 5-min mark: ${d[p].iqama}`);
              }
              if (mins(d[p].iqama) < mins(d[p].azan) + 3) {
                bad.push(`${d.date} ${p} ${d[p].azan}->${d[p].iqama}`);
              }
            }
            if (mins(d.fajr.iqama) > mins(d.sunrise) - 60) {
              bad.push(`${d.date} fajr ${d.fajr.iqama} sunrise ${d.sunrise}`);
            }
          }
        }
      }
      expect(bad).toEqual([]);
    }, 300_000);
  });

  it('Dhuhr 2027 is fixed 13:45 (Fri 13:40), never clamped', async () => {
    const { service } = await makeService({ withConfig: true });
    for (const ym of ['2027-01', '2027-07', '2027-12']) {
      for (const d of await service.buildMonth(ym)) {
        const fri = dayjs.tz(d.date, FIXED_TZ).day() === 5;
        expect(d.dhuhr.iqama).toBe(fri ? '13:40' : '13:45');
        expect(d.dhuhr.iqama_clamped).toBeUndefined();
      }
    }
  });

  it('flags iqama_clamped for Asr Late Winter 16:00 (Jan-Mar 14 2027)', async () => {
    const { service } = await makeService({ withConfig: true });
    const days = (
      await Promise.all(
        ['2027-01', '2027-02', '2027-03'].map((m) => service.buildMonth(m)),
      )
    ).flat();
    const clamped = days.filter((d) => d.asr.iqama_clamped);
    expect(clamped).toHaveLength(32); // 2027-02-11 .. 2027-03-14
    for (const d of clamped) {
      expect(d.date <= '2027-03-14').toBe(true);
      expect(mins(d.asr.iqama)).toBeGreaterThanOrEqual(mins(d.asr.azan) + 3);
    }
  });

  describe('overrides', () => {
    const ov = (prayer: string, type: string, value: string) => ({
      id: 1,
      prayer,
      overrideType: type,
      value,
      startDate: new Date('2026-06-10T00:00:00.000Z'),
      endDate: new Date('2026-06-10T00:00:00.000Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    const day = async (overrides: unknown[]): Promise<DailySchedule> => {
      const { service, prisma } = await makeService({
        withConfig: true,
        overrides,
      });
      const days = await service.buildMonth('2026-06');
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1); // per month, not per day
      return days[9];
    };

    it('clamps a FIXED Dhuhr override before azan', async () => {
      const d = await day([ov('dhuhr', 'FIXED', '12:00')]);
      expect(d.dhuhr.iqama_clamped).toBe(true);
      expect(mins(d.dhuhr.iqama)).toBeGreaterThanOrEqual(
        mins(d.dhuhr.azan) + 3,
      );
      expect(d.metadata.has_overrides).toBe(true);
    });

    it('clamps a negative OFFSET override', async () => {
      const d = await day([ov('isha', 'OFFSET', '-30')]);
      expect(d.isha.iqama_clamped).toBe(true);
      expect(mins(d.isha.iqama)).toBeGreaterThanOrEqual(mins(d.isha.azan) + 3);
    });

    it('clamps a Fajr override later than sunrise - 60', async () => {
      const d = await day([ov('fajr', 'FIXED', '05:30')]);
      expect(d.fajr.iqama_clamped).toBe(true);
      expect(mins(d.fajr.iqama)).toBeLessThanOrEqual(mins(d.sunrise) - 60);
    });

    it('keeps a valid override and sets no flag', async () => {
      const d = await day([ov('dhuhr', 'FIXED', '14:00')]);
      expect(d.dhuhr.iqama).toBe('14:00');
      expect(d.dhuhr.iqama_clamped).toBeUndefined();
    });

    it('property: any override keeps iqama >= azan+3', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('dhuhr', 'asr', 'maghrib', 'isha'),
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 59 }),
          async (prayer, h, m) => {
            const v = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            const d = await day([ov(prayer, 'FIXED', v)]);
            const p = d[prayer as 'dhuhr'];
            return mins(p.iqama) >= mins(p.azan) + 3;
          },
        ),
        { numRuns: 25 },
      );
    }, 60_000);
  });
});
