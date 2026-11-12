/**
 * The contract the admin UI relies on: GET shape, catalog metadata, preview
 * binding (requestHash / revision) and saving on top of the newest version.
 */
import { UnprocessableEntityException } from '@nestjs/common';
import { DEFAULT_RULE_SET } from './iqama-rules.seed';
import { RULE_CATALOG } from './iqama-rules.catalog';
import { validateRuleSet } from './iqama-rules.validator';
import { canonicalJson } from './iqama-rules.service';
import { freezeDate, makeStack, versionRow } from './testing';
import { RuleSet } from './iqama-rules.types';

// Wednesday. Next Friday = 2026-11-13 (= seeded version 1).
const NOW = '2026-11-11T20:00:00Z';
const json = (r: RuleSet) => JSON.stringify(r);
const withMaghrib = (minutes: number): RuleSet => ({
  ...DEFAULT_RULE_SET,
  maghrib: { ...DEFAULT_RULE_SET.maghrib, base: { type: 'OFFSET', minutes } },
});
const code = (e: unknown) =>
  (e as UnprocessableEntityException).getResponse() as { code: string };

describe('GET config contract', () => {
  beforeEach(() => freezeDate('2026-12-01T20:00:00Z'));
  afterEach(() => jest.useRealTimers());

  it('returns effective, latest, upcoming and versions with createdAt and reason', async () => {
    const asrLater: RuleSet = {
      ...DEFAULT_RULE_SET,
      asr: { base: { type: 'FIXED_TIME', time: '16:30' } },
    };
    const rows = [
      { ...versionRow(1, '2026-11-13'), reason: 'Initial' },
      { ...versionRow(2, '2026-12-04', asrLater), reason: 'Asr later' },
    ];
    const { service } = await makeStack({ rows });
    const cfg = await service.getConfig();

    expect(cfg.currentRevision).toBe(2);
    expect(cfg.effective).toMatchObject({
      versionId: 1,
      effectiveFrom: '2026-11-13',
      reason: 'Initial',
      rules: DEFAULT_RULE_SET,
    });
    // the baseline for any new version is the NEWEST one, not the one in force today
    expect(cfg.latest).toMatchObject({
      versionId: 2,
      effectiveFrom: '2026-12-04',
      reason: 'Asr later',
      rules: asrLater,
    });
    expect(cfg.latest?.createdAt).toBeInstanceOf(Date);
    expect(cfg.upcoming.map((u) => u.versionId)).toEqual([2]);
    expect(cfg.upcoming[0].rules).toEqual(asrLater);
    expect(cfg.versions.map((v) => [v.id, v.reason])).toEqual([
      [1, 'Initial'],
      [2, 'Asr later'],
    ]);
    expect(cfg.versions[0].createdAt).toBeInstanceOf(Date);
    expect(cfg.currentRevision).toBe(cfg.latest?.versionId);
  });

  it('before the first version, the earliest version is the effective one', async () => {
    jest.useRealTimers();
    freezeDate(NOW);
    const { service } = await makeStack({
      rows: [versionRow(1, '2026-12-04')],
    });
    const cfg = await service.getConfig();
    expect(cfg.effective?.versionId).toBe(1);
    expect(cfg.latest?.versionId).toBe(1);
    expect(cfg.upcoming.map((u) => u.versionId)).toEqual([1]);
  });

  it('with no versions: effective, latest are null, upcoming empty', async () => {
    const { service } = await makeStack({ rows: [] });
    const cfg = await service.getConfig();
    expect([cfg.effective, cfg.latest]).toEqual([null, null]);
    expect(cfg.upcoming).toEqual([]);
    expect(cfg.currentRevision).toBe(0);
  });
});

describe('preview binds to the exact request', () => {
  beforeEach(() => freezeDate(NOW));
  afterEach(() => jest.useRealTimers());

  it('canonicalJson ignores key order and formatting', () => {
    expect(canonicalJson({ b: 1, a: { d: [1, { z: 1, y: 2 }], c: 2 } })).toBe(
      canonicalJson({ a: { c: 2, d: [1, { y: 2, z: 1 }] }, b: 1 }),
    );
  });

  it('echoes effectiveFrom, currentRevision and requestHash (stable across formatting)', async () => {
    const { service } = await makeStack({});
    const a = await service.preview({ settings: json(withMaghrib(10)) });
    expect(a).toMatchObject({
      effectiveFrom: '2026-11-13',
      currentRevision: 1,
    });
    expect(a.requestHash).toMatch(/^[0-9a-f]{64}$/);
    // same rules pretty-printed => same hash; different date or rules => different hash
    const b = await service.preview({
      settings: JSON.stringify(withMaghrib(10), null, 2),
    });
    expect(b.requestHash).toBe(a.requestHash);
    const c = await service.preview({
      settings: json(withMaghrib(10)),
      effectiveFrom: '2026-11-20',
    });
    expect(c.requestHash).not.toBe(a.requestHash);
    const d = await service.preview({ settings: json(withMaghrib(15)) });
    expect(d.requestHash).not.toBe(a.requestHash);
  }, 120_000);

  it('PUT: a different effectiveFrom than previewed is 422 IQAMA_PREVIEW_MISMATCH', async () => {
    const { service } = await makeStack({});
    const settings = json(withMaghrib(10));
    const { previewId } = await service.preview({ settings });
    const err = await service
      .createVersion(
        {
          settings,
          effectiveFrom: '2026-11-20',
          previewId,
          expectedRevision: 1,
        },
        'admin',
      )
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UnprocessableEntityException);
    expect(code(err).code).toBe('IQAMA_PREVIEW_MISMATCH');
  }, 60_000);

  it('PUT: different rules than previewed is 422 IQAMA_PREVIEW_MISMATCH', async () => {
    const { service } = await makeStack({});
    const { previewId } = await service.preview({
      settings: json(withMaghrib(10)),
    });
    const err = await service
      .createVersion(
        { settings: json(withMaghrib(15)), previewId, expectedRevision: 1 },
        'admin',
      )
      .catch((e: unknown) => e);
    expect(code(err).code).toBe('IQAMA_PREVIEW_MISMATCH');
  }, 60_000);

  it('PUT: a requestHash that does not match the body is 422 IQAMA_PREVIEW_MISMATCH', async () => {
    const { service } = await makeStack({});
    const settings = json(withMaghrib(10));
    const { previewId } = await service.preview({ settings });
    const err = await service
      .createVersion(
        { settings, previewId, expectedRevision: 1, requestHash: 'nope' },
        'admin',
      )
      .catch((e: unknown) => e);
    expect(code(err).code).toBe('IQAMA_PREVIEW_MISMATCH');
  }, 60_000);

  it('PUT: unknown, expired or used token is 422 IQAMA_PREVIEW_INVALID', async () => {
    const { service } = await makeStack({});
    const err = await service
      .createVersion(
        {
          settings: json(withMaghrib(10)),
          previewId: 'ipv_missing',
          expectedRevision: 1,
        },
        'admin',
      )
      .catch((e: unknown) => e);
    expect(code(err).code).toBe('IQAMA_PREVIEW_INVALID');
  });

  it('PUT: a token from an older revision is 422 IQAMA_REVISION_STALE; a stale expectedRevision stays 409', async () => {
    const { service, rows, builder } = await makeStack({});
    jest.spyOn(builder, 'invalidateCache').mockResolvedValue(undefined);
    const settings = json(withMaghrib(10));
    const { previewId } = await service.preview({ settings }); // at revision 1

    // someone saves another version in between (revision becomes 2)
    rows.push(versionRow(2, '2026-11-13'));

    // client claims the new revision but presents the old preview
    const err = await service
      .createVersion({ settings, previewId, expectedRevision: 2 }, 'admin')
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UnprocessableEntityException);
    expect(code(err).code).toBe('IQAMA_REVISION_STALE');

    // client that still thinks revision 1: classic optimistic-lock conflict
    await expect(
      service.createVersion(
        { settings, previewId, expectedRevision: 1 },
        'admin',
      ),
    ).rejects.toMatchObject({ status: 409 });
  }, 60_000);
});

describe('saving on top of the newest version', () => {
  beforeEach(() => freezeDate(NOW));
  afterEach(() => jest.useRealTimers());

  const asrLater: RuleSet = {
    ...DEFAULT_RULE_SET,
    asr: { base: { type: 'FIXED_TIME', time: '16:30' } }, // changes from Friday 2026-12-04
  };

  it('a later version that only changes Isha keeps Asr from the future version', async () => {
    const { service, builder, rows } = await makeStack({
      rows: [
        versionRow(1, '2026-11-13'),
        versionRow(2, '2026-12-04', asrLater),
      ],
    });
    jest.spyOn(builder, 'invalidateCache').mockResolvedValue(undefined);

    // The UI builds the proposal from `latest` (v2), changing only Isha.
    const cfg = await service.getConfig();
    const latest = cfg.latest!.rules!;
    const proposal: RuleSet = {
      ...latest,
      isha: { ...latest.isha, limits: { minAfterAzan: 5 } },
    };
    const settings = json(proposal);
    const { previewId, currentRevision } = await service.preview({
      settings,
      effectiveFrom: '2026-12-11', // a Friday after the future version
    });
    const saved = await service.createVersion(
      {
        settings,
        effectiveFrom: '2026-12-11',
        previewId,
        expectedRevision: currentRevision,
      },
      'admin',
    );
    expect(saved.id).toBe(3);
    expect(rows).toHaveLength(3);

    // Real schedule: Asr from 2026-12-11 still has the future version's 16:30 ...
    const days = await builder.buildMonth('2026-12');
    const dec14 = days.find((d) => d.date === '2026-12-14')!;
    expect(dec14.asr.iqama).toBe('16:30');
    // ... and before the new version it also had it (v2), unlike v1's 15:45
    const dec07 = days.find((d) => d.date === '2026-12-07')!;
    expect(dec07.asr.iqama).toBe('16:30');
    const dec01 = days.find((d) => d.date === '2026-12-01')!;
    expect(dec01.asr.iqama).toBe('15:45'); // before v2: v1 (winter)
  }, 120_000);

  it('a version dated before the newest existing one is rejected (400)', async () => {
    const { service } = await makeStack({
      rows: [
        versionRow(1, '2026-11-13'),
        versionRow(2, '2026-12-04', asrLater),
      ],
    });
    await expect(
      service.preview({
        settings: json(DEFAULT_RULE_SET),
        effectiveFrom: '2026-11-20',
      }),
    ).rejects.toThrow(/already exists/);
  });

  it("building from today's version instead of the newest would revert Asr (the failure the UI must avoid)", async () => {
    const { service, builder } = await makeStack({
      rows: [
        versionRow(1, '2026-11-13'),
        versionRow(2, '2026-12-04', asrLater),
      ],
    });
    jest.spyOn(builder, 'invalidateCache').mockResolvedValue(undefined);
    const fromEffective: RuleSet = {
      ...DEFAULT_RULE_SET,
      isha: { ...DEFAULT_RULE_SET.isha },
    };
    const settings = json(fromEffective);
    const p = await service.preview({ settings, effectiveFrom: '2026-12-11' });
    // The engine accepts it (it cannot know intent) but the preview shows Asr changing back.
    expect(p.summary.byPrayer.asr.daysChanged).toBeGreaterThan(0);
  }, 120_000);
});

describe('catalog field metadata', () => {
  type Field = {
    name?: string;
    label?: string;
    kind?: string;
    required?: boolean;
    [k: string]: unknown;
  };

  const walk = (fields: Field[], visit: (f: Field) => void) => {
    for (const f of fields) {
      visit(f);
      if (Array.isArray(f.fields)) walk(f.fields as Field[], visit);
      if (Array.isArray(f.item)) walk(f.item as Field[], visit);
      if (Array.isArray(f.variants))
        for (const v of f.variants as { fields: Field[] }[])
          walk(v.fields, visit);
    }
  };
  const all: Field[] = [
    ...RULE_CATALOG.baseTypes.flatMap((b) => b.fields as unknown as Field[]),
    ...(RULE_CATALOG.modifiers as unknown as Field[]),
  ];

  it('every field has name, label, kind and required', () => {
    const seen: Field[] = [];
    walk(all, (f) => seen.push(f));
    expect(seen.length).toBeGreaterThan(20);
    for (const f of seen) {
      expect(typeof f.name).toBe('string');
      expect(typeof f.label).toBe('string');
      expect(['int', 'time', 'enum', 'list', 'object', 'bool']).toContain(
        f.kind,
      );
      expect(typeof f.required).toBe('boolean');
    }
  });

  it('int fields have min, max and integer; lists have min/maxItems and item; enums have structured options', () => {
    walk(all, (f) => {
      if (f.kind === 'int') {
        expect(typeof f.min).toBe('number');
        expect(typeof f.max).toBe('number');
        expect(f.integer).toBe(true);
      }
      if (f.kind === 'list') {
        expect(typeof f.minItems).toBe('number');
        expect(typeof f.maxItems).toBe('number');
        expect(Array.isArray(f.item)).toBe(true);
      }
      if (f.kind === 'time') expect(f.format).toBe('HH:mm');
      if (f.kind === 'enum') {
        for (const o of f.options as { value: unknown; label: unknown }[]) {
          expect(o).toEqual({
            value: expect.anything(),
            label: expect.any(String),
          });
        }
      }
    });
  });

  it('has no human-readable range strings like "month (1-12)"', () => {
    expect(JSON.stringify(RULE_CATALOG)).not.toMatch(/\(\d+-\d+\)/);
  });

  it('the Seasonal start is a discriminated object with structured month/day fields', () => {
    const seasonal = RULE_CATALOG.baseTypes.find((b) => b.type === 'SEASONAL')!;
    const segments = seasonal.fields[0] as unknown as Field;
    const start = (segments.item as Field[]).find((f) => f.name === 'start')!;
    expect(start.discriminator).toBe('kind');
    const date = (start.variants as { value: string; fields: Field[] }[]).find(
      (v) => v.value === 'DATE',
    )!;
    expect(date.fields.map((f) => [f.name, f.min, f.max])).toEqual([
      ['month', 1, 12],
      ['day', 1, 31],
    ]);
  });

  it('defaults exist only where safe (weekly lock false, rounding step 5; none for numbers)', () => {
    const seen: Field[] = [];
    walk(all, (f) => seen.push(f));
    const withDefault = seen.filter((f) => 'default' in f).map((f) => f.name);
    expect(withDefault.sort()).toEqual(['step', 'weeklyLock']);
  });

  it('the validator enforces the same list sizes the catalog advertises', () => {
    const r: RuleSet = structuredClone(DEFAULT_RULE_SET);
    r.isha.base = {
      type: 'SCALED_GAP',
      points: Array.from({ length: 11 }, (_, i) => ({
        azan: `${String(10 + i).padStart(2, '0')}:00`,
        gapMinutes: 5,
      })),
    };
    r.asr.base = {
      type: 'SEASONAL',
      segments: Array.from({ length: 25 }, (_, i) => ({
        start: {
          kind: 'DATE' as const,
          month: (i % 12) + 1,
          day: (i % 28) + 1,
        },
        time: '16:00',
      })),
    };
    const paths = validateRuleSet(r).errors.map((e) => e.path);
    expect(paths).toEqual(
      expect.arrayContaining(['isha.base.points', 'asr.base.segments']),
    );
  });
});
