import { createHmac } from 'node:crypto';
import { ACCOUNT_TOKEN_TTL_MS, encodeAccountToken, type AccountClaims } from '@jamwave/shared';

/** The secret shared with the realtime server; unset means jams know nobody by account. */
export const JAM_TOKEN_SECRET = process.env.JAM_TOKEN_SECRET?.trim() || undefined;

/** Vouch for a signed-in account to the realtime server. Verified there with the same secret. */
export function signAccountToken(
  account: { sub: string; username: string },
  secret: string,
  now: number = Date.now(),
): string {
  const claims: AccountClaims = { sub: account.sub, username: account.username, exp: now + ACCOUNT_TOKEN_TTL_MS };
  const signature = createHmac('sha256', secret).update(JSON.stringify(claims)).digest('hex');
  return encodeAccountToken(claims, signature);
}
