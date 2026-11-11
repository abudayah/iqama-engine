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
