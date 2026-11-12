"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNSAFE_TRUST_PROXY_WARNING = void 0;
exports.isUnsafeTrustProxy = isUnsafeTrustProxy;
exports.parseTrustProxy = parseTrustProxy;
function isUnsafeTrustProxy(value) {
    return value === true || typeof value === 'number';
}
exports.UNSAFE_TRUST_PROXY_WARNING = 'TRUST_PROXY is a hop count or "true". This is only safe when the app port is ' +
    'reachable ONLY through your reverse proxy: otherwise a client can send its own ' +
    'X-Forwarded-For header and dodge the per-IP rate limits. Prefer "loopback" ' +
    "(proxy on the same host, e.g. Apache/Passenger) or the proxy's IPs/CIDRs, and " +
    'do not expose the app port publicly. ' +
    'See https://expressjs.com/en/guide/behind-proxies.html';
function parseTrustProxy(raw) {
    const v = (raw ?? '').trim();
    if (v === '' || v === 'false' || v === '0')
        return false;
    if (v === 'true')
        return true;
    if (/^\d+$/.test(v))
        return Number(v);
    return v;
}
//# sourceMappingURL=trust-proxy.js.map