import dayjs from '../dayjs';
import { applyIqamaGuardrail } from './iqama-guardrail';

const tz = 'America/Vancouver';
const t = (hhmm: string) => dayjs.tz(`2027-02-01 ${hhmm}`, tz);

describe('applyIqamaGuardrail', () => {
  it('leaves a valid iqama untouched', () => {
    expect(applyIqamaGuardrail('13:20', t('13:10'))).toEqual({
      iqama: '13:20',
      clamped: false,
    });
  });

  it('accepts exactly azan + 3 when it is a rounding mark', () => {
    expect(applyIqamaGuardrail('13:15', t('13:12')).clamped).toBe(false);
  });

  it('raises to the first 5-min mark at or after azan + 3', () => {
    // 16:00 iqama, azan 16:20 → 16:23 → 16:25
    expect(applyIqamaGuardrail('16:00', t('16:20'))).toEqual({
      iqama: '16:25',
      clamped: true,
    });
    // azan 16:22 → 16:25 exactly
    expect(applyIqamaGuardrail('16:00', t('16:22')).iqama).toBe('16:25');
    // azan 16:23 → 16:26 → 16:30
    expect(applyIqamaGuardrail('16:00', t('16:23')).iqama).toBe('16:30');
  });

  it('clamps an override earlier than azan', () => {
    expect(applyIqamaGuardrail('12:45', t('12:58'))).toEqual({
      iqama: '13:05',
      clamped: true,
    });
  });

  it('caps Fajr 60 min before sunrise (override later than that)', () => {
    // sunrise 07:58 → cap 06:58 → floor5 06:55
    expect(applyIqamaGuardrail('07:30', t('06:00'), t('07:58'))).toEqual({
      iqama: '06:55',
      clamped: true,
    });
  });

  it('does not touch Fajr already before the sunrise cap', () => {
    expect(applyIqamaGuardrail('06:30', t('06:00'), t('07:58'))).toEqual({
      iqama: '06:30',
      clamped: false,
    });
  });

  it('min gap wins when it conflicts with the sunrise cap', () => {
    // cap = 06:55, min-gap floor = 07:00 → 07:00
    expect(applyIqamaGuardrail('07:30', t('06:57'), t('07:55')).iqama).toBe(
      '07:00',
    );
  });
});

describe('applyIqamaGuardrail: 5-minute marks', () => {
  it('keeps a value already on a 5-minute mark', () => {
    expect(applyIqamaGuardrail('09:05', t('08:00'))).toEqual({
      iqama: '09:05',
      clamped: false,
    });
  });

  it('rounds an off-mark override up: 09:04 -> 09:05', () => {
    expect(applyIqamaGuardrail('09:04', t('08:00'))).toEqual({
      iqama: '09:05',
      clamped: true,
    });
  });

  it('rounds down when the rule rounding mode is FLOOR', () => {
    expect(applyIqamaGuardrail('23:23', t('23:00'), undefined, true)).toEqual({
      iqama: '23:20',
      clamped: true,
    });
  });

  it('FLOOR never goes below azan + 3 (rounds up instead)', () => {
    // 23:19 floors to 23:15, below azan 23:16 + 3 -> first mark >= 23:19 = 23:20
    expect(
      applyIqamaGuardrail('23:19', t('23:16'), undefined, true).iqama,
    ).toBe('23:20');
  });

  it('Fajr: round up would pass sunrise - 60, so take the last mark <= sunrise - 60', () => {
    // sunrise 07:58 -> limit 06:58 -> last mark 06:55; 06:57 rounds up to 07:00 (too late)
    expect(applyIqamaGuardrail('06:57', t('06:00'), t('07:58'))).toEqual({
      iqama: '06:55',
      clamped: true,
    });
  });

  it('Fajr: the azan + 3 gap wins over the sunrise cap', () => {
    // azan 06:54 -> first mark >= 06:57 is 07:00, above the 06:55 cap
    expect(applyIqamaGuardrail('06:50', t('06:54'), t('07:58')).iqama).toBe(
      '07:00',
    );
  });
});
