import { computeAsrIqama } from './asr.rule';
import dayjs from '../dayjs';

describe('Asr Rule (Friday-anchored seasonal schedule)', () => {
  describe('computeAsrIqama', () => {
    // First-Friday anchors used below (verified):
    //   Sep 2025 = 5th, Oct 2025 = 3rd, Nov 2025 = 7th, Jan 2026 = 2nd
    //   Sep 2026 = 4th, Oct 2026 = 2nd, Nov 2026 = 6th, Jan 2027 = 1st

    it('Spring/Summer = 18:00 (Mar 15 → first Friday of Sep)', () => {
      expect(computeAsrIqama(dayjs('2025-03-15'))).toBe('18:00');
      expect(computeAsrIqama(dayjs('2025-04-01'))).toBe('18:00');
      expect(computeAsrIqama(dayjs('2025-06-15'))).toBe('18:00');
      expect(computeAsrIqama(dayjs('2025-08-30'))).toBe('18:00');
      // September before the first Friday (Sep 5, 2025) is still Spring/Summer
      expect(computeAsrIqama(dayjs('2025-09-01'))).toBe('18:00');
      expect(computeAsrIqama(dayjs('2025-09-04'))).toBe('18:00');
    });

    it('Early Fall = 17:00 (first Friday of Sep → first Friday of Oct)', () => {
      // First Friday of Sep 2025 = the 5th
      expect(computeAsrIqama(dayjs('2025-09-05'))).toBe('17:00');
      expect(computeAsrIqama(dayjs('2025-09-20'))).toBe('17:00');
      expect(computeAsrIqama(dayjs('2025-09-30'))).toBe('17:00');
      // October before the first Friday (Oct 3, 2025) still holds 17:00
      expect(computeAsrIqama(dayjs('2025-10-01'))).toBe('17:00');
      expect(computeAsrIqama(dayjs('2025-10-02'))).toBe('17:00');
    });

    it('Fall = 16:30 (first Friday of Oct → first Friday of Nov)', () => {
      // First Friday of Oct 2025 = the 3rd
      expect(computeAsrIqama(dayjs('2025-10-03'))).toBe('16:30');
      expect(computeAsrIqama(dayjs('2025-10-15'))).toBe('16:30');
      expect(computeAsrIqama(dayjs('2025-10-31'))).toBe('16:30');
      // November before the first Friday (Nov 7, 2025) still holds 16:30
      expect(computeAsrIqama(dayjs('2025-11-01'))).toBe('16:30');
      expect(computeAsrIqama(dayjs('2025-11-06'))).toBe('16:30');
    });

    it('Winter = 15:45 (first Friday of Nov → first Friday of Jan)', () => {
      // First Friday of Nov 2025 = the 7th
      expect(computeAsrIqama(dayjs('2025-11-07'))).toBe('15:45');
      expect(computeAsrIqama(dayjs('2025-11-20'))).toBe('15:45');
      expect(computeAsrIqama(dayjs('2025-12-01'))).toBe('15:45');
      expect(computeAsrIqama(dayjs('2025-12-31'))).toBe('15:45');
      // January before the first Friday (Jan 2, 2026) still holds 15:45
      expect(computeAsrIqama(dayjs('2026-01-01'))).toBe('15:45');
    });

    it('Late Winter = 16:00 (first Friday of Jan → Mar 14)', () => {
      // First Friday of Jan 2026 = the 2nd
      expect(computeAsrIqama(dayjs('2026-01-02'))).toBe('16:00');
      expect(computeAsrIqama(dayjs('2026-01-20'))).toBe('16:00');
      expect(computeAsrIqama(dayjs('2026-02-15'))).toBe('16:00');
      expect(computeAsrIqama(dayjs('2026-03-14'))).toBe('16:00');
    });

    it('transitions land exactly on the anchor Friday (same-day change)', () => {
      // Sep 4 (Fri) 2026 is the first Friday → change happens that day
      expect(computeAsrIqama(dayjs('2026-09-03'))).toBe('18:00'); // Thu
      expect(computeAsrIqama(dayjs('2026-09-04'))).toBe('17:00'); // Fri
      // Oct 2 (Fri) 2026
      expect(computeAsrIqama(dayjs('2026-10-01'))).toBe('17:00'); // Thu
      expect(computeAsrIqama(dayjs('2026-10-02'))).toBe('16:30'); // Fri
      // Nov 6 (Fri) 2026
      expect(computeAsrIqama(dayjs('2026-11-05'))).toBe('16:30'); // Thu
      expect(computeAsrIqama(dayjs('2026-11-06'))).toBe('15:45'); // Fri
      // Jan 1 (Fri) 2027
      expect(computeAsrIqama(dayjs('2026-12-31'))).toBe('15:45'); // Thu
      expect(computeAsrIqama(dayjs('2027-01-01'))).toBe('16:00'); // Fri
    });

    it('Mar 14 / Mar 15 boundary (Late Winter → Spring/Summer)', () => {
      expect(computeAsrIqama(dayjs('2026-03-14'))).toBe('16:00');
      expect(computeAsrIqama(dayjs('2026-03-15'))).toBe('18:00');
    });

    it('handles leap years correctly', () => {
      expect(computeAsrIqama(dayjs('2024-02-29'))).toBe('16:00'); // Late Winter
    });
  });
});
