import { Dayjs } from 'dayjs';
export declare const MIN_IQAMA_GAP_MIN = 3;
export declare const FAJR_SUNRISE_BUFFER_MIN = 60;
export declare const IQAMA_STEP_MIN = 5;
export declare const toMin: (hhmm: string) => number;
export declare const toHHmm: (min: number) => string;
export declare function guardrailMinutes(iqamaMin: number, azanMin: number, sunriseMin?: number, roundDown?: boolean): number;
export declare function applyIqamaGuardrail(iqama: string, azan: Dayjs, sunrise?: Dayjs, roundDown?: boolean): {
    iqama: string;
    clamped: boolean;
};
