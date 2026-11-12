import { isDstActive } from './is-dst';

describe('isDstActive (display-only is_dst field)', () => {
  const tz = 'America/Vancouver';

  it('is true during daylight saving time', () => {
    expect(isDstActive('2025-04-15', tz)).toBe(true);
    expect(isDstActive('2025-07-01', tz)).toBe(true);
    expect(isDstActive('2025-10-15', tz)).toBe(true);
  });

  it('is false during standard time', () => {
    expect(isDstActive('2025-12-15', tz)).toBe(false);
    expect(isDstActive('2025-01-15', tz)).toBe(false);
    expect(isDstActive('2025-02-15', tz)).toBe(false);
  });
});
