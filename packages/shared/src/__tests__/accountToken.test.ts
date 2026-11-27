import { describe, expect, it } from 'vitest';
import { encodeAccountToken, parseAccountClaims, splitAccountToken } from '../accountToken';

const SIG = 'ab'.repeat(32);
const NOW = 1_700_000_000_000;

describe('account token format', () => {
  it('round-trips claims through encode / split / parse', () => {
    const claims = { sub: '6b015e61735f2a629c9ed339', username: 'vaibhav', exp: NOW + 1000 };
    const token = encodeAccountToken(claims, SIG);
    const parts = splitAccountToken(token);
    expect(parts).toEqual({ payload: JSON.stringify(claims), signature: SIG });
    expect(parseAccountClaims(parts!.payload, NOW)).toEqual(claims);
  });

  it('rejects tokens without a hex signature, or that are too long', () => {
    expect(splitAccountToken('nodot')).toBeNull();
    expect(splitAccountToken('{"a":1}.')).toBeNull();
    expect(splitAccountToken('{"a":1}.notHex')).toBeNull();
    expect(splitAccountToken(`${'x'.repeat(600)}.${SIG}`)).toBeNull();
  });

  it('rejects expired, malformed and oversized claims', () => {
    expect(parseAccountClaims(JSON.stringify({ sub: 'a', username: 'b', exp: NOW }), NOW)).toBeNull();
    expect(parseAccountClaims('not json', NOW)).toBeNull();
    expect(parseAccountClaims(JSON.stringify({ sub: '', username: 'b', exp: NOW + 1 }), NOW)).toBeNull();
    expect(
      parseAccountClaims(JSON.stringify({ sub: 'a'.repeat(65), username: 'b', exp: NOW + 1 }), NOW),
    ).toBeNull();
    expect(parseAccountClaims(JSON.stringify({ sub: 'a', username: 7, exp: NOW + 1 }), NOW)).toBeNull();
  });
});
