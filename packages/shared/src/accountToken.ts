/**
 * The web app vouches for a signed-in account to the realtime server with a short-lived token:
 * `<json claims>.<hex HMAC-SHA256 of the json>`, signed with a secret both deployments share.
 * The hashing itself lives in each app (node:crypto); this module only defines the format, so it
 * can be bundled for the browser without pulling in crypto.
 */

export interface AccountClaims {
  /** Account id. */
  sub: string;
  username: string;
  /** Expiry, ms since epoch. Tokens are only needed at join time, so they can be short. */
  exp: number;
}

export const ACCOUNT_TOKEN_TTL_MS = 60 * 60_000;
export const ACCOUNT_TOKEN_MAX_LENGTH = 512;

export function encodeAccountToken(claims: AccountClaims, signatureHex: string): string {
  return `${JSON.stringify(claims)}.${signatureHex}`;
}

/** The two halves of a token, split at the last dot (the JSON may contain dots; hex cannot). */
export function splitAccountToken(token: string): { payload: string; signature: string } | null {
  if (token.length > ACCOUNT_TOKEN_MAX_LENGTH) return null;
  const at = token.lastIndexOf('.');
  if (at <= 0 || at === token.length - 1) return null;
  const signature = token.slice(at + 1);
  if (!/^[0-9a-f]{64}$/.test(signature)) return null;
  return { payload: token.slice(0, at), signature };
}

/** Claims from a payload whose signature has already been checked; null when malformed or expired. */
export function parseAccountClaims(payload: string, now: number): AccountClaims | null {
  let data: unknown;
  try {
    data = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const { sub, username, exp } = data as Record<string, unknown>;
  if (typeof sub !== 'string' || sub.length === 0 || sub.length > 64) return null;
  if (typeof username !== 'string' || username.length === 0 || username.length > 40) return null;
  if (typeof exp !== 'number' || !Number.isFinite(exp) || exp <= now) return null;
  return { sub, username, exp };
}
