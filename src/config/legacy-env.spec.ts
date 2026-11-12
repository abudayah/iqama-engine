import { logIgnoredLegacyEnv } from './legacy-env';

describe('logIgnoredLegacyEnv', () => {
  it('logs one info line naming the removed variables that are set', () => {
    const logger = { log: jest.fn() };
    const found = logIgnoredLegacyEnv(
      { IQAMA_RULES: 'db', IQAMA_RULES_CUTOVER: '2026-11-13', PORT: '3000' },
      logger,
    );
    expect(found).toEqual(['IQAMA_RULES', 'IQAMA_RULES_CUTOVER']);
    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(String(logger.log.mock.calls[0][0])).toContain(
      'IQAMA_RULES, IQAMA_RULES_CUTOVER',
    );
  });

  it('logs nothing when they are not set', () => {
    const logger = { log: jest.fn() };
    expect(logIgnoredLegacyEnv({ PORT: '3000' }, logger)).toEqual([]);
    expect(logger.log).not.toHaveBeenCalled();
  });

  it('also counts an empty value as set (it is still in the environment)', () => {
    const logger = { log: jest.fn() };
    expect(logIgnoredLegacyEnv({ IQAMA_RULES: '' }, logger)).toEqual([
      'IQAMA_RULES',
    ]);
    expect(logger.log).toHaveBeenCalledTimes(1);
  });
});
