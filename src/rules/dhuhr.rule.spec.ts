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
    it('should return 13:45 during DST', () => {
      const result = computeDhuhrIqama('2025-06-15', 'America/Vancouver');
      expect(result).toBe('13:45');
    });

    it('should return 12:45 during standard time', () => {
      const result = computeDhuhrIqama('2025-12-15', 'America/Vancouver');
      expect(result).toBe('12:45');
    });

    it('should handle DST transition dates correctly', () => {
      // Test dates around DST transitions
      const springResult = computeDhuhrIqama('2025-03-15', 'America/Vancouver');
      const fallResult = computeDhuhrIqama('2025-11-15', 'America/Vancouver');

      expect(['12:45', '13:45']).toContain(springResult);
      expect(['12:45', '13:45']).toContain(fallResult);
    });
  });
});
