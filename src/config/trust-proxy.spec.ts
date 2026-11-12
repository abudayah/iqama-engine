import { isUnsafeTrustProxy, parseTrustProxy } from './trust-proxy';

describe('parseTrustProxy', () => {
  it.each([undefined, '', '  ', 'false', '0'])('%p -> off', (v) => {
    expect(parseTrustProxy(v)).toBe(false);
  });

  it('true -> true', () => {
    expect(parseTrustProxy('true')).toBe(true);
  });

  it('a number -> that many hops', () => {
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy(' 2 ')).toBe(2);
  });

  it('keywords and lists pass through', () => {
    expect(parseTrustProxy('loopback')).toBe('loopback');
    expect(parseTrustProxy('10.0.0.0/8, 127.0.0.1')).toBe(
      '10.0.0.0/8, 127.0.0.1',
    );
  });
});

describe('isUnsafeTrustProxy', () => {
  it.each([true, 1, 2])('%p is flagged', (v) => {
    expect(isUnsafeTrustProxy(v)).toBe(true);
  });

  it.each([false, 'loopback', 'uniquelocal', '10.0.0.0/8, 127.0.0.1'])(
    '%p is not flagged',
    (v) => {
      expect(isUnsafeTrustProxy(v)).toBe(false);
    },
  );

  it('parsing is unchanged: "1" and "true" are still accepted', () => {
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy('true')).toBe(true);
    expect(isUnsafeTrustProxy(parseTrustProxy('1'))).toBe(true);
    expect(isUnsafeTrustProxy(parseTrustProxy('true'))).toBe(true);
    expect(isUnsafeTrustProxy(parseTrustProxy('loopback'))).toBe(false);
    expect(isUnsafeTrustProxy(parseTrustProxy('10.0.0.5'))).toBe(false);
  });
});
