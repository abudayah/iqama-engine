import {
  formatHHmm,
  ceilingToNearest5,
  ceilingToNearest30,
} from './time-utils';
import dayjs from '../dayjs';

describe('Time Utils', () => {
  describe('formatHHmm', () => {
    it('should format time as HH:mm', () => {
      const time = dayjs.tz('2025-06-15 09:05', 'America/Vancouver');
      expect(formatHHmm(time)).toBe('09:05');
    });

    it('should handle midnight', () => {
      const time = dayjs.tz('2025-06-15 00:00', 'America/Vancouver');
      expect(formatHHmm(time)).toBe('00:00');
    });

    it('should handle noon', () => {
      const time = dayjs.tz('2025-06-15 12:00', 'America/Vancouver');
      expect(formatHHmm(time)).toBe('12:00');
    });

    it('should handle single-digit hours and minutes', () => {
      const time = dayjs.tz('2025-06-15 03:07', 'America/Vancouver');
      expect(formatHHmm(time)).toBe('03:07');
    });

    it('should handle late evening times', () => {
      const time = dayjs.tz('2025-06-15 23:59', 'America/Vancouver');
      expect(formatHHmm(time)).toBe('23:59');
    });
  });

  describe('ceilingToNearest5', () => {
    it('should not change times already on 5-minute marks', () => {
      const time = dayjs.tz('2025-06-15 10:00', 'America/Vancouver');
      const result = ceilingToNearest5(time);
      expect(formatHHmm(result)).toBe('10:00');
    });

    it('should round up 10:01 to 10:05', () => {
      const time = dayjs.tz('2025-06-15 10:01', 'America/Vancouver');
      const result = ceilingToNearest5(time);
      expect(formatHHmm(result)).toBe('10:05');
    });

    it('should round up 10:04 to 10:05', () => {
      const time = dayjs.tz('2025-06-15 10:04', 'America/Vancouver');
      const result = ceilingToNearest5(time);
      expect(formatHHmm(result)).toBe('10:05');
    });

    it('should round up 10:06 to 10:10', () => {
      const time = dayjs.tz('2025-06-15 10:06', 'America/Vancouver');
      const result = ceilingToNearest5(time);
      expect(formatHHmm(result)).toBe('10:10');
    });

    it('should round up 10:09 to 10:10', () => {
      const time = dayjs.tz('2025-06-15 10:09', 'America/Vancouver');
      const result = ceilingToNearest5(time);
      expect(formatHHmm(result)).toBe('10:10');
    });

    it('should handle times at 5-minute marks', () => {
      const time = dayjs.tz('2025-06-15 10:05', 'America/Vancouver');
      const result = ceilingToNearest5(time);
      expect(formatHHmm(result)).toBe('10:05');
    });

    it('should handle rounding near midnight', () => {
      const time = dayjs.tz('2025-06-15 23:58', 'America/Vancouver');
      const result = ceilingToNearest5(time);
      expect(formatHHmm(result)).toBe('00:00');
    });

    it('should handle rounding that crosses hour boundary', () => {
      const time = dayjs.tz('2025-06-15 10:57', 'America/Vancouver');
      const result = ceilingToNearest5(time);
      expect(formatHHmm(result)).toBe('11:00');
    });
  });

  describe('ceilingToNearest30', () => {
    it('should not change times already on 30-minute marks', () => {
      const time = dayjs.tz('2025-06-15 10:00', 'America/Vancouver');
      const result = ceilingToNearest30(time);
      expect(formatHHmm(result)).toBe('10:00');
    });

    it('should not change times at :30', () => {
      const time = dayjs.tz('2025-06-15 10:30', 'America/Vancouver');
      const result = ceilingToNearest30(time);
      expect(formatHHmm(result)).toBe('10:30');
    });

    it('should round up 10:01 to 10:30', () => {
      const time = dayjs.tz('2025-06-15 10:01', 'America/Vancouver');
      const result = ceilingToNearest30(time);
      expect(formatHHmm(result)).toBe('10:30');
    });

    it('should round up 10:15 to 10:30', () => {
      const time = dayjs.tz('2025-06-15 10:15', 'America/Vancouver');
      const result = ceilingToNearest30(time);
      expect(formatHHmm(result)).toBe('10:30');
    });

    it('should round up 10:29 to 10:30', () => {
      const time = dayjs.tz('2025-06-15 10:29', 'America/Vancouver');
      const result = ceilingToNearest30(time);
      expect(formatHHmm(result)).toBe('10:30');
    });

    it('should round up 10:31 to 11:00', () => {
      const time = dayjs.tz('2025-06-15 10:31', 'America/Vancouver');
      const result = ceilingToNearest30(time);
      expect(formatHHmm(result)).toBe('11:00');
    });

    it('should round up 10:45 to 11:00', () => {
      const time = dayjs.tz('2025-06-15 10:45', 'America/Vancouver');
      const result = ceilingToNearest30(time);
      expect(formatHHmm(result)).toBe('11:00');
    });

    it('should round up 10:59 to 11:00', () => {
      const time = dayjs.tz('2025-06-15 10:59', 'America/Vancouver');
      const result = ceilingToNearest30(time);
      expect(formatHHmm(result)).toBe('11:00');
    });

    it('should handle rounding near midnight', () => {
      const time = dayjs.tz('2025-06-15 23:45', 'America/Vancouver');
      const result = ceilingToNearest30(time);
      expect(formatHHmm(result)).toBe('00:00');
    });

    it('should handle times with seconds', () => {
      const time = dayjs.tz('2025-06-15 10:00', 'America/Vancouver').second(30);
      const result = ceilingToNearest30(time);
      expect(formatHHmm(result)).toBe('10:30');
    });

    it('should bump sub-minute seconds to next minute before rounding', () => {
      const time = dayjs.tz('2025-06-15 10:29', 'America/Vancouver').second(30);
      const result = ceilingToNearest30(time);
      // 10:29:30 -> bumps to minute 30 -> rounds to 10:30
      expect(formatHHmm(result)).toBe('10:30');
    });
  });
});
