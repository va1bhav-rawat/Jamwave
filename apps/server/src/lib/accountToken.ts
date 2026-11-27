import { createHmac, timingSafeEqual } from 'node:crypto';
import { parseAccountClaims, splitAccountToken, type AccountClaims } from '@jamwave/shared';

/**
 * Check a token the web app signed for a signed-in account. Null for anything that is not a
 * valid, unexpired token under `secret`; callers then treat the person as a guest.
 */
export function verifyAccountToken(
  token: string,
  secret: string,
  now: number = Date.now(),
): AccountClaims | null {
  const parts = splitAccountToken(token);
  if (!parts) return null;
  const expected = createHmac('sha256', secret).update(parts.payload).digest();
  const given = Buffer.from(parts.signature, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return parseAccountClaims(parts.payload, now);
}
