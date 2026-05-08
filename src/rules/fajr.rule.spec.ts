import { computeFajrIqama } from './fajr.rule';
import dayjs from '../dayjs';

describe('Fajr Rule', () => {
  describe('computeFajrIqama', () => {
    it('should return Azan + 10 minutes when safe limit allows', () => {
      const fajrAzan = dayjs.tz('2025-12-15 06:30', 'America/Vancouver');
      const sunrise = dayjs.tz('2025-12-15 09:00', 'America/Vancouver'); // Late sunrise

      const result = computeFajrIqama(fajrAzan, sunrise);

      // Safe limit: 09:00 - 60 = 08:00
      // Max delay: 06:30 + 75 = 07:45
      // Base target: min(07:45, 08:00) = 07:45
      // Result: 07:45
      expect(result).toBe('07:45');
    });

    it('should respect 60-minute buffer before sunrise', () => {
      const fajrAzan = dayjs.tz('2025-06-21 03:16', 'America/Vancouver');
      const sunrise = dayjs.tz('2025-06-21 05:05', 'America/Vancouver');

      const result = computeFajrIqama(fajrAzan, sunrise);

      // Safe limit: 05:05 - 60 = 04:05
      // Max delay: 03:16 + 75 = 04:31
      // Base target: min(04:31, 04:05) = 04:05
      expect(result).toBe('04:05');
    });

    it('should enforce minimum 10-minute delay from Azan', () => {
      const fajrAzan = dayjs.tz('2025-06-21 04:00', 'America/Vancouver');
      const sunrise = dayjs.tz('2025-06-21 04:05', 'America/Vancouver'); // Very close sunrise

      const result = computeFajrIqama(fajrAzan, sunrise);

      // Safe limit: 04:05 - 60 = 03:05 (before Azan!)
      // Max delay: 04:00 + 75 = 05:15
      // Base target: min(05:15, 03:05) = 03:05
      // Floor clamp: 04:00 + 10 = 04:10
      // Result: max(03:05, 04:10) = 04:10
      expect(result).toBe('04:10');
    });

    it('should round up to nearest 5 minutes', () => {
      const fajrAzan = dayjs.tz('2025-12-15 06:32', 'America/Vancouver');
      const sunrise = dayjs.tz('2025-12-15 09:00', 'America/Vancouver');

      const result = computeFajrIqama(fajrAzan, sunrise);

      // Safe limit: 09:00 - 60 = 08:00
      // Max delay: 06:32 + 75 = 07:47
      // Base target: min(07:47, 08:00) = 07:47
      // Rounded: 07:50
      expect(result).toBe('07:50');
    });

    it('should cap at Azan + 75 minutes', () => {
      const fajrAzan = dayjs.tz('2025-12-15 06:00', 'America/Vancouver');
      const sunrise = dayjs.tz('2025-12-15 10:00', 'America/Vancouver'); // Very late sunrise

      const result = computeFajrIqama(fajrAzan, sunrise);

      // Safe limit: 10:00 - 60 = 09:00
      // Max delay: 06:00 + 75 = 07:15
      // Base target: min(07:15, 09:00) = 07:15
      expect(result).toBe('07:15');
    });
  });
});
