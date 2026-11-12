"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_IQAMA_RULES_CUTOVER = void 0;
exports.parseCutover = parseCutover;
exports.DEFAULT_IQAMA_RULES_CUTOVER = '2026-11-13';
function parseCutover(v) {
    return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
        ? v
        : exports.DEFAULT_IQAMA_RULES_CUTOVER;
}
//# sourceMappingURL=iqama-rules.cutover.js.map