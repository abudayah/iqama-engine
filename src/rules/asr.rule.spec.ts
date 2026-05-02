import { computeAsrIqama } from './asr.rule';
import dayjs from '../dayjs';

describe('Asr Rule', () => {
  describe('computeAsrIqama', () => {
    it('should return 18:00 during Spring/Summer (Mar 15 - Sep 15)', () => {
      expect(computeAsrIqama(dayjs('2025-04-01'))).toBe('18:00');
      expect(computeAsrIqama(dayjs('2025-06-15'))).toBe('18:00');
      expect(computeAsrIqama(dayjs('2025-08-30'))).toBe('18:00');
    });

    it('should return 17:00 during Fall (Sep 16 - Nov 15)', () => {
      expect(computeAsrIqama(dayjs('2025-09-20'))).toBe('17:00');
      expect(computeAsrIqama(dayjs('2025-10-15'))).toBe('17:00');
      expect(computeAsrIqama(dayjs('2025-11-10'))).toBe('17:00');
    });

    it('should return 15:00 during Early Winter (Nov 16 - Jan 15)', () => {
      expect(computeAsrIqama(dayjs('2025-11-20'))).toBe('15:00');
      expect(computeAsrIqama(dayjs('2025-12-15'))).toBe('15:00');
      expect(computeAsrIqama(dayjs('2026-01-10'))).toBe('15:00');
    });

    it('should return 16:00 during Late Winter (Jan 16 - Mar 14)', () => {
      expect(computeAsrIqama(dayjs('2025-01-20'))).toBe('16:00');
      expect(computeAsrIqama(dayjs('2025-02-15'))).toBe('16:00');
      expect(computeAsrIqama(dayjs('2025-03-10'))).toBe('16:00');
    });

    it('should handle boundary dates correctly', () => {
      expect(computeAsrIqama(dayjs('2025-03-15'))).toBe('18:00'); // First day of Spring/Summer
      expect(computeAsrIqama(dayjs('2025-09-15'))).toBe('18:00'); // Last day of Spring/Summer
      expect(computeAsrIqama(dayjs('2025-09-16'))).toBe('17:00'); // First day of Fall
      expect(computeAsrIqama(dayjs('2025-11-15'))).toBe('17:00'); // Last day of Fall
      expect(computeAsrIqama(dayjs('2025-11-16'))).toBe('15:00'); // First day of Early Winter
      expect(computeAsrIqama(dayjs('2026-01-15'))).toBe('15:00'); // Last day of Early Winter
      expect(computeAsrIqama(dayjs('2026-01-16'))).toBe('16:00'); // First day of Late Winter
      expect(computeAsrIqama(dayjs('2025-03-14'))).toBe('16:00'); // Last day of Late Winter
    });

    it('should handle leap years correctly', () => {
      expect(computeAsrIqama(dayjs('2024-02-29'))).toBe('16:00'); // Leap year date
    });
  });
});
