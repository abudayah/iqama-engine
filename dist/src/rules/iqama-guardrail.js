"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toHHmm = exports.toMin = exports.IQAMA_STEP_MIN = exports.FAJR_SUNRISE_BUFFER_MIN = exports.MIN_IQAMA_GAP_MIN = void 0;
exports.guardrailMinutes = guardrailMinutes;
exports.applyIqamaGuardrail = applyIqamaGuardrail;
const time_utils_1 = require("./time-utils");
exports.MIN_IQAMA_GAP_MIN = 3;
exports.FAJR_SUNRISE_BUFFER_MIN = 60;
exports.IQAMA_STEP_MIN = 5;
const toMin = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};
exports.toMin = toMin;
const toHHmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
exports.toHHmm = toHHmm;
const ceilStep = (v) => Math.ceil(v / exports.IQAMA_STEP_MIN) * exports.IQAMA_STEP_MIN;
const floorStep = (v) => Math.floor(v / exports.IQAMA_STEP_MIN) * exports.IQAMA_STEP_MIN;
function guardrailMinutes(iqamaMin, azanMin, sunriseMin, roundDown = false) {
    let v = roundDown ? floorStep(iqamaMin) : ceilStep(iqamaMin);
    if (sunriseMin !== undefined) {
        v = Math.min(v, floorStep(sunriseMin - exports.FAJR_SUNRISE_BUFFER_MIN));
    }
    return Math.max(v, ceilStep(azanMin + exports.MIN_IQAMA_GAP_MIN));
}
function applyIqamaGuardrail(iqama, azan, sunrise, roundDown = false) {
    const out = (0, exports.toHHmm)(guardrailMinutes((0, exports.toMin)(iqama), (0, exports.toMin)((0, time_utils_1.formatHHmm)(azan)), sunrise ? (0, exports.toMin)((0, time_utils_1.formatHHmm)(sunrise)) : undefined, roundDown));
    return { iqama: out, clamped: out !== iqama };
}
//# sourceMappingURL=iqama-guardrail.js.map