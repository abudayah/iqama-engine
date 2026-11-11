import { parseTrustProxy } from './trust-proxy';

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
