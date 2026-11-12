import { intlOffset, warnIfStaleTzdata } from './tzdata-guard';

describe('warnIfStaleTzdata', () => {
  const now = new Date('2026-11-11T20:00:00Z');
  const logger = () => ({ error: jest.fn() });

  it('stays quiet when America/Vancouver is UTC-7 in January', () => {
    const l = logger();
    expect(
      warnIfStaleTzdata('America/Vancouver', now, l, () => 'GMT-07:00'),
    ).toBe(false);
    expect(l.error).not.toHaveBeenCalled();
  });

  it('logs an error when it is UTC-8 (old tzdata), checking January of next year', () => {
    const l = logger();
    const seen: Date[] = [];
    const stale = warnIfStaleTzdata('America/Vancouver', now, l, (_tz, at) => {
      seen.push(at);
      return 'GMT-08:00';
    });
    expect(stale).toBe(true);
    expect(l.error).toHaveBeenCalledTimes(1);
    expect(String(l.error.mock.calls[0][0])).toContain('GMT-08:00');
    expect(String(l.error.mock.calls[0][0])).toContain('22.23.5');
    expect(seen[0].toISOString().slice(0, 10)).toBe('2027-01-15');
  });

  it('ignores other timezones', () => {
    const l = logger();
    expect(
      warnIfStaleTzdata('America/New_York', now, l, () => 'GMT-05:00'),
    ).toBe(false);
    expect(l.error).not.toHaveBeenCalled();
  });

  it('with the real Intl on this Node: no warning (needs Node >= 22.23.5)', () => {
    const l = logger();
    expect(warnIfStaleTzdata('America/Vancouver', now, l)).toBe(false);
    expect(
      intlOffset('America/Vancouver', new Date('2027-01-15T20:00:00Z')),
    ).toBe('GMT-07:00');
  });
});
