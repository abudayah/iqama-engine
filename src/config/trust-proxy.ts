/**
 * Parse the TRUST_PROXY environment variable for Express's `trust proxy`.
 *
 * - unset, empty, `false`, `0`  -> false (default: ignore X-Forwarded-For)
 * - `true`                      -> true  (trust every hop; only behind a proxy you control)
 * - a number, e.g. `1`          -> trust that many proxy hops
 * - anything else               -> passed through as Express allows: `loopback`,
 *                                  `uniquelocal`, or a comma-separated list of IPs/CIDRs
 */
export function parseTrustProxy(
  raw: string | undefined,
): boolean | number | string {
  const v = (raw ?? '').trim();
  if (v === '' || v === 'false' || v === '0') return false;
  if (v === 'true') return true;
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}
