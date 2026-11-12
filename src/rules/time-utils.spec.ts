import { formatHHmm, ceilingToNearest5, setTimeInTz } from './time-utils';
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
});

describe('ceilingToNearest5 with seconds (setTimeInTz keeps the timezone)', () => {
  it('bumps sub-minute seconds to the next minute before rounding', () => {
    // 10:04:30 -> minute 05 -> already on a mark
    const time = setTimeInTz(
      dayjs.tz('2025-06-15 10:04', 'America/Vancouver'),
      10,
      4,
      30,
    );
    expect(formatHHmm(ceilingToNearest5(time))).toBe('10:05');
  });

  it('rounds 10:05:30 up to 10:10', () => {
    const time = setTimeInTz(
      dayjs.tz('2025-06-15 10:05', 'America/Vancouver'),
      10,
      5,
      30,
    );
    expect(formatHHmm(ceilingToNearest5(time))).toBe('10:10');
  });
});
