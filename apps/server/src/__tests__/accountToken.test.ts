import { createHmac } from 'node:crypto';
import { encodeAccountToken, type AccountClaims } from '@jamwave/shared';
import { describe, expect, it } from 'vitest';
import { verifyAccountToken } from '../lib/accountToken';

const SECRET = 'test-secret-that-is-long-enough';
const NOW = 1_700_000_000_000;

function sign(claims: AccountClaims, secret = SECRET): string {
  const payload = JSON.stringify(claims);
  return encodeAccountToken(claims, createHmac('sha256', secret).update(payload).digest('hex'));
}

describe('verifyAccountToken', () => {
  const claims: AccountClaims = { sub: 'user-1', username: 'ana', exp: NOW + 60_000 };

  it('accepts a token signed with the shared secret', () => {
    expect(verifyAccountToken(sign(claims), SECRET, NOW)).toEqual(claims);
  });

  it('rejects a tampered payload, a wrong secret and an expired token', () => {
    const good = sign(claims);
    const tampered = good.replace('"ana"', '"eve"');
    expect(verifyAccountToken(tampered, SECRET, NOW)).toBeNull();
    expect(verifyAccountToken(sign(claims, 'other-secret'), SECRET, NOW)).toBeNull();
    expect(verifyAccountToken(good, SECRET, NOW + 60_001)).toBeNull();
    expect(verifyAccountToken('garbage', SECRET, NOW)).toBeNull();
  });
});
