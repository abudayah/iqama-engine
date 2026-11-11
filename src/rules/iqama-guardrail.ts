import { Dayjs } from 'dayjs';
import { formatHHmm } from './time-utils';

/** Minimum minutes between Azan and Iqama, on every path (rules and overrides). */
export const MIN_IQAMA_GAP_MIN = 3;
/** Fajr Iqama must end at least this many minutes before sunrise. */
export const FAJR_SUNRISE_BUFFER_MIN = 60;

export const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const toHHmm = (min: number): string =>
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
export function guardrailMinutes(
  iqamaMin: number,
  azanMin: number,
  sunriseMin?: number,
): number {
  let v = iqamaMin;
  if (sunriseMin !== undefined) {
    v = Math.min(v, Math.floor((sunriseMin - FAJR_SUNRISE_BUFFER_MIN) / 5) * 5);
  }
  return Math.max(v, Math.ceil((azanMin + MIN_IQAMA_GAP_MIN) / 5) * 5);
}

export function applyIqamaGuardrail(
  iqama: string,
  azan: Dayjs,
  sunrise?: Dayjs,
): { iqama: string; clamped: boolean } {
  const out = toHHmm(
    guardrailMinutes(
      toMin(iqama),
      toMin(formatHHmm(azan)),
      sunrise ? toMin(formatHHmm(sunrise)) : undefined,
    ),
  );
  return { iqama: out, clamped: out !== iqama };
}
