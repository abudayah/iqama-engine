import { computeDhuhrIqama, isDstActive } from './dhuhr.rule';

describe('Dhuhr Rule', () => {
  describe('isDstActive', () => {
    it('should return true during DST period (March-November)', () => {
      expect(isDstActive('2025-04-15', 'America/Vancouver')).toBe(true);
      expect(isDstActive('2025-07-01', 'America/Vancouver')).toBe(true);
      expect(isDstActive('2025-10-15', 'America/Vancouver')).toBe(true);
    });

    it('should return false during standard time (November-March)', () => {
      expect(isDstActive('2025-12-15', 'America/Vancouver')).toBe(false);
      expect(isDstActive('2025-01-15', 'America/Vancouver')).toBe(false);
      expect(isDstActive('2025-02-15', 'America/Vancouver')).toBe(false);
    });
  });

  describe('computeDhuhrIqama', () => {
    const tz = 'America/Vancouver';
    const cutover = '2026-11-13';

    it('is 13:45 on non-Fridays from the cutover on, year-round', () => {
      expect(computeDhuhrIqama('2026-12-14', tz, cutover)).toBe('13:45');
      expect(computeDhuhrIqama('2027-07-05', tz, cutover)).toBe('13:45');
    });

    it('is 13:40 on Fridays from the cutover on, year-round', () => {
      expect(computeDhuhrIqama('2026-11-13', tz, cutover)).toBe('13:40');
      expect(computeDhuhrIqama('2026-12-11', tz, cutover)).toBe('13:40');
    });

    it('stays 13:45 / 13:40 after clocks stopped changing (2027+)', () => {
      expect(computeDhuhrIqama('2027-01-01', tz, cutover)).toBe('13:40'); // Friday
      expect(computeDhuhrIqama('2027-01-04', tz, cutover)).toBe('13:45');
      expect(computeDhuhrIqama('2027-07-09', tz, cutover)).toBe('13:40'); // Friday
    });

    it('keeps the historical DST rule before the cutover', () => {
      // DST: 13:45 (Fri 13:40); standard time: 12:45 (Fri 12:40)
      expect(computeDhuhrIqama('2025-06-16', tz, cutover)).toBe('13:45');
      expect(computeDhuhrIqama('2025-06-13', tz, cutover)).toBe('13:40');
      expect(computeDhuhrIqama('2025-12-15', tz, cutover)).toBe('12:45');
      expect(computeDhuhrIqama('2025-12-12', tz, cutover)).toBe('12:40');
      expect(computeDhuhrIqama('2026-06-01', tz, cutover)).toBe('13:45'); // DST in 2026
    });
  });
});
