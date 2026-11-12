import { Dayjs } from 'dayjs';
import { formatHHmm } from './time-utils';

/** Minimum minutes between Azan and Iqama, on every path (rules and overrides). */
export const MIN_IQAMA_GAP_MIN = 3;
/** Fajr Iqama must end at least this many minutes before sunrise. */
export const FAJR_SUNRISE_BUFFER_MIN = 60;
/** Every final Iqama lands on a multiple of this many minutes. */
export const IQAMA_STEP_MIN = 5;

export const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const toHHmm = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

const ceilStep = (v: number) => Math.ceil(v / IQAMA_STEP_MIN) * IQAMA_STEP_MIN;
const floorStep = (v: number) =>
  Math.floor(v / IQAMA_STEP_MIN) * IQAMA_STEP_MIN;

/**
 * Final safety net for a single prayer (minutes since midnight). In order:
 *  1. A value already on a 5-minute mark is kept; otherwise it is rounded UP,
 *     or DOWN when `roundDown` (the prayer's own rule rounding mode is FLOOR).
 *  2. Fajr (sunrise given): Iqama <= last 5-mark <= sunrise - 60 min.
 *  3. Iqama >= first 5-mark >= Azan + 3 min. This gap wins over steps 1-2 (an
 *     Iqama before the Azan is never acceptable), so a FLOOR never goes below it.
 *
 * shortcut: same-day HH:mm arithmetic, no midnight wrap; fine at this
 * latitude (latest Isha Azan ~23:20), revisit if the masjid moves north.
 */
export function guardrailMinutes(
  iqamaMin: number,
  azanMin: number,
  sunriseMin?: number,
  roundDown = false,
): number {
  let v = roundDown ? floorStep(iqamaMin) : ceilStep(iqamaMin);
  if (sunriseMin !== undefined) {
    v = Math.min(v, floorStep(sunriseMin - FAJR_SUNRISE_BUFFER_MIN));
  }
  return Math.max(v, ceilStep(azanMin + MIN_IQAMA_GAP_MIN));
}

/** Returns the (possibly adjusted) Iqama and whether the guardrail moved it. */
export function applyIqamaGuardrail(
  iqama: string,
  azan: Dayjs,
  sunrise?: Dayjs,
  roundDown = false,
): { iqama: string; clamped: boolean } {
  const out = toHHmm(
    guardrailMinutes(
      toMin(iqama),
      toMin(formatHHmm(azan)),
      sunrise ? toMin(formatHHmm(sunrise)) : undefined,
      roundDown,
    ),
  );
  return { iqama: out, clamped: out !== iqama };
}
