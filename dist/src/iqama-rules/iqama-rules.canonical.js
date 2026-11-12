"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalJson = canonicalJson;
function canonicalJson(value) {
    if (Array.isArray(value))
        return `[${value.map(canonicalJson).join(',')}]`;
    if (value && typeof value === 'object') {
        const o = value;
        return `{${Object.keys(o)
            .filter((k) => o[k] !== undefined)
            .sort()
            .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}
//# sourceMappingURL=iqama-rules.canonical.js.map