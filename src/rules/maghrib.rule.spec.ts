import { computeMaghribIqama } from './maghrib.rule';
import dayjs from '../dayjs';

describe('Maghrib Rule', () => {
  describe('computeMaghribIqama', () => {
    it('should add 5 minutes to Azan and round up to nearest 5', () => {
      const maghribAzan = dayjs.tz('2025-06-15 20:30', 'America/Vancouver');
      const result = computeMaghribIqama(maghribAzan);

      // 20:30 + 5 = 20:35 (already on 5-minute mark)
      expect(result).toBe('20:35');
    });

    it('should round up 20:31 + 5 = 20:36 to 20:40', () => {
      const maghribAzan = dayjs.tz('2025-06-15 20:31', 'America/Vancouver');
      const result = computeMaghribIqama(maghribAzan);

      expect(result).toBe('20:40');
    });

    it('should round up 20:32 + 5 = 20:37 to 20:40', () => {
      const maghribAzan = dayjs.tz('2025-06-15 20:32', 'America/Vancouver');
      const result = computeMaghribIqama(maghribAzan);

      expect(result).toBe('20:40');
    });

    it('should handle times near midnight', () => {
      const maghribAzan = dayjs.tz('2025-12-15 23:57', 'America/Vancouver');
      const result = computeMaghribIqama(maghribAzan);

      // 23:57 + 5 = 00:02, rounded to 00:05
      expect(result).toBe('00:05');
    });

    it('should handle exact 5-minute intervals', () => {
      const maghribAzan = dayjs.tz('2025-06-15 20:25', 'America/Vancouver');
      const result = computeMaghribIqama(maghribAzan);

      // 20:25 + 5 = 20:30 (already on 5-minute mark)
      expect(result).toBe('20:30');
    });
  });
});
