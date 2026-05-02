import { computeIshaIqama } from './isha.rule';
import dayjs from '../dayjs';

describe('Isha Rule', () => {
  describe('computeIshaIqama', () => {
    it('should use 15-minute gap when Isha Azan is before 8 PM', () => {
      const ishaAzan = dayjs.tz('2025-12-15 18:15', 'America/Vancouver');
      const result = computeIshaIqama(ishaAzan);

      // 18:15 + 15 min = 18:30
      expect(result).toBe('18:30');
    });

    it('should use 5-minute gap when Isha Azan is after 10:30 PM', () => {
      const ishaAzan = dayjs.tz('2025-06-21 23:50', 'America/Vancouver');
      const result = computeIshaIqama(ishaAzan);

      // 23:50 + 5 min = 23:55
      expect(result).toBe('23:55');
    });

    it('should scale gap between 15-5 minutes for times between 8 PM and 10:30 PM', () => {
      // Isha at 9:00 PM (between 8 PM and 10:30 PM)
      const ishaAzan = dayjs.tz('2025-04-15 21:00', 'America/Vancouver');
      const result = computeIshaIqama(ishaAzan);

      // Should be between 21:05 (min) and 21:15 (max)
      const [hour, min] = result.split(':').map(Number);
      const resultMinutes = hour * 60 + min;
      const minMinutes = 21 * 60 + 5;
      const maxMinutes = 21 * 60 + 15;

      expect(resultMinutes).toBeGreaterThanOrEqual(minMinutes);
      expect(resultMinutes).toBeLessThanOrEqual(maxMinutes);
    });

    it('should round up to nearest 5 minutes', () => {
      const ishaAzan = dayjs.tz('2025-12-15 18:32', 'America/Vancouver');
      const result = computeIshaIqama(ishaAzan);

      // 18:32 + 15 = 18:47, rounded to 18:50
      expect(result).toBe('18:50');
    });

    it('should handle Isha exactly at 8 PM boundary', () => {
      const ishaAzan = dayjs.tz('2025-03-15 20:00', 'America/Vancouver');
      const result = computeIshaIqama(ishaAzan);

      // At boundary, should use 15 minutes
      expect(result).toBe('20:15');
    });

    it('should handle Isha exactly at 10:30 PM boundary', () => {
      const ishaAzan = dayjs.tz('2025-06-15 22:30', 'America/Vancouver');
      const result = computeIshaIqama(ishaAzan);

      // At boundary, should use 5 minutes
      expect(result).toBe('22:35');
    });

    it('should handle times crossing midnight', () => {
      const ishaAzan = dayjs.tz('2025-06-21 23:58', 'America/Vancouver');
      const result = computeIshaIqama(ishaAzan);

      // 23:58 + 5 = 00:03, rounded to 00:05
      expect(result).toBe('00:05');
    });
  });
});
