/**
 * Test helpers: the real adhan adapter, rules, overrides and schedule builder,
 * with Prisma replaced by an in-memory fake. Used by the Phase 2 specs.
 */
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AdhanAdapter } from '../adhan/adhan.adapter';
import { QiyamConfigService } from '../hijri-calendar/qiyam-config.service';
import { OverrideService } from '../override/override.service';
import { PrismaService } from '../prisma/prisma.service';
import { RulesService } from '../rules/rules.service';
import { ScheduleBuilderService } from '../schedule-builder/schedule-builder.service';
import { IqamaRulesService } from './iqama-rules.service';
import { DEFAULT_RULE_SET } from './iqama-rules.seed';
import { IqamaRuleVersionRecord, RuleSet } from './iqama-rules.types';

export const TEST_TZ = 'Etc/GMT+7';
export const TEST_CUTOVER = '2026-11-13';

export const versionRow = (
  id: number,
  effectiveFrom: string,
  rules: RuleSet = DEFAULT_RULE_SET,
): IqamaRuleVersionRecord => ({
  id,
  effectiveFrom,
  settings: JSON.stringify(rules),
  reason: null,
  createdBy: 'test',
  createdAt: new Date(),
});

export async function makeStack(opts: {
  mode?: string;
  rows?: IqamaRuleVersionRecord[];
}) {
  const rows = opts.rows ?? [versionRow(1, TEST_CUTOVER)];
  const cfg: Record<string, unknown> = {
    'app.masjidLatitude': 49.2652047,
    'app.masjidLongitude': -122.7878735,
    'app.masjidTimezone': TEST_TZ,
    'app.iqamaRules': opts.mode,
    'app.iqamaRulesCutover': TEST_CUTOVER,
  };
  const iqamaRuleVersion = {
    findMany: jest.fn(() =>
      Promise.resolve(
        [...rows].sort(
          (a, b) =>
            a.effectiveFrom.localeCompare(b.effectiveFrom) || a.id - b.id,
        ),
      ),
    ),
    findFirst: jest.fn(() => {
      const latest = [...rows].sort((a, b) => b.id - a.id)[0];
      return Promise.resolve(latest ? { id: latest.id } : null);
    }),
    create: jest.fn(
      ({
        data,
      }: {
        data: {
          effectiveFrom: string;
          settings: string;
          createdBy: string;
          reason?: string | null;
        };
      }) => {
        const row = { id: rows.length + 1, createdAt: new Date(), ...data };
        rows.push(row);
        return Promise.resolve(row);
      },
    ),
  };
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    specialPrayer: { findMany: jest.fn().mockResolvedValue([]) },
    adhanConfigVersion: { findMany: jest.fn().mockResolvedValue([]) },
    adhanConfigPeriod: { findMany: jest.fn().mockResolvedValue([]) },
    iqamaRuleVersion,
  };
  const module = await Test.createTestingModule({
    providers: [
      ScheduleBuilderService,
      IqamaRulesService,
      AdhanAdapter,
      RulesService,
      OverrideService,
      { provide: PrismaService, useValue: prisma },
      { provide: ConfigService, useValue: { get: (k: string) => cfg[k] } },
      {
        provide: QiyamConfigService,
        useValue: { getForYear: jest.fn().mockResolvedValue(null) },
      },
      { provide: CACHE_MANAGER, useValue: {} },
    ],
  }).compile();
  return {
    builder: module.get(ScheduleBuilderService),
    service: module.get(IqamaRulesService),
    prisma,
    rows,
  };
}

/** Freeze only `new Date()`; timers stay real so async code keeps working. */
export function freezeDate(iso: string): void {
  jest.useFakeTimers({
    now: new Date(iso),
    doNotFake: [
      'nextTick',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
      'queueMicrotask',
      'performance',
      'hrtime',
    ],
  });
}
