/**
 * Parse the TRUST_PROXY environment variable for Express's `trust proxy`.
 *
 * - unset, empty, `false`, `0`  -> false (default: ignore X-Forwarded-For)
 * - `true`                      -> true  (trust every hop; only behind a proxy you control)
 * - a number, e.g. `1`          -> trust that many proxy hops
 * - anything else               -> passed through as Express allows: `loopback`,
 *                                  `uniquelocal`, or a comma-separated list of IPs/CIDRs
 */
/**
 * True for values that trust X-Forwarded-For by hop count ('true' or a number).
 * If the Node port can be reached directly, a client can send its own
 * X-Forwarded-For and pick the IP the rate limiter sees. 'loopback', 'uniquelocal'
 * and explicit IPs/CIDRs only trust those addresses, so they are safer.
 */
export function isUnsafeTrustProxy(value: boolean | number | string): boolean {
  return value === true || typeof value === 'number';
}

export const UNSAFE_TRUST_PROXY_WARNING =
  'TRUST_PROXY is a hop count or "true". This is only safe when the app port is ' +
  'reachable ONLY through your reverse proxy: otherwise a client can send its own ' +
  'X-Forwarded-For header and dodge the per-IP rate limits. Prefer "loopback" ' +
  "(proxy on the same host, e.g. Apache/Passenger) or the proxy's IPs/CIDRs, and " +
  'do not expose the app port publicly. ' +
  'See https://expressjs.com/en/guide/behind-proxies.html';

export function parseTrustProxy(
  raw: string | undefined,
): boolean | number | string {
  const v = (raw ?? '').trim();
  if (v === '' || v === 'false' || v === '0') return false;
  if (v === 'true') return true;
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}
