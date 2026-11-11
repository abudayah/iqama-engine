import { Dayjs } from 'dayjs';
import { formatHHmm } from './time-utils';

/** Minimum minutes between Azan and Iqama, on every path (rules and overrides). */
export const MIN_IQAMA_GAP_MIN = 3;
/** Fajr Iqama must end at least this many minutes before sunrise. */
export const FAJR_SUNRISE_BUFFER_MIN = 60;

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const toHHmm = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/**
 * Final safety net for a single prayer.
 *  - Fajr (sunrise given): Iqama <= floor5(sunrise - 60 min).
 *  - Then, always: Iqama >= ceil5(Azan + 3 min). The min gap wins when both
 *    conflict (an Iqama before the Azan is never acceptable).
 * Returns the (possibly adjusted) Iqama and whether it was changed.
 *
 * shortcut: same-day HH:mm arithmetic, no midnight wrap; fine at this
 * latitude (latest Isha Azan ~23:20), revisit if the masjid moves north.
 */
export function applyIqamaGuardrail(
  iqama: string,
  azan: Dayjs,
  sunrise?: Dayjs,
): { iqama: string; clamped: boolean } {
  let v = toMin(iqama);
  if (sunrise) {
    const cap =
      Math.floor((toMin(formatHHmm(sunrise)) - FAJR_SUNRISE_BUFFER_MIN) / 5) *
      5;
    v = Math.min(v, cap);
  }
  const floor =
    Math.ceil((toMin(formatHHmm(azan)) + MIN_IQAMA_GAP_MIN) / 5) * 5;
  v = Math.max(v, floor);
  const out = toHHmm(v);
  return { iqama: out, clamped: out !== iqama };
}
