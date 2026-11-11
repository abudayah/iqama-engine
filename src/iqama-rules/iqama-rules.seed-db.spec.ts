import { DEFAULT_RULE_SET } from './iqama-rules.seed';
import { seedIqamaRules } from './iqama-rules.seed-db';
import { validateRuleSet } from './iqama-rules.validator';
import { RuleSet } from './iqama-rules.types';

describe('seedIqamaRules', () => {
  const makeClient = () => {
    const rows: {
      effectiveFrom: string;
      settings: string;
      createdBy: string;
    }[] = [];
    return {
      rows,
      iqamaRuleVersion: {
        count: jest.fn(() => Promise.resolve(rows.length)),
        create: jest.fn(({ data }: { data: (typeof rows)[number] }) => {
          rows.push(data);
          return Promise.resolve(data);
        }),
      },
    };
  };

  it('creates version 1 from the default rules', async () => {
    const c = makeClient();
    expect(await seedIqamaRules(c)).toBe(true);
    expect(c.rows).toHaveLength(1);
    expect(c.rows[0].effectiveFrom).toBe('1970-01-01');
    const stored = JSON.parse(c.rows[0].settings) as RuleSet;
    expect(stored).toEqual(DEFAULT_RULE_SET);
    expect(validateRuleSet(stored).errors).toEqual([]);
  });

  it('is idempotent', async () => {
    const c = makeClient();
    await seedIqamaRules(c);
    expect(await seedIqamaRules(c)).toBe(false);
    expect(await seedIqamaRules(c)).toBe(false);
    expect(c.iqamaRuleVersion.create).toHaveBeenCalledTimes(1);
  });

  it('never touches existing data', async () => {
    const c = makeClient();
    c.rows.push({
      effectiveFrom: '2026-01-02',
      settings: '{}',
      createdBy: 'admin',
    });
    expect(await seedIqamaRules(c)).toBe(false);
    expect(c.rows).toHaveLength(1);
  });
});
