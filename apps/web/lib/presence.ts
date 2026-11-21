import type { PresenceInfo } from '@jamwave/shared';
import { JAM_TOKEN_SECRET } from './accountToken.server';
import { SERVER_INTERNAL_URL } from './env';

/**
 * Server-side: which jam each of these accounts is in right now, from the realtime server.
 * Empty when the shared secret is unset, the server is down or slow, or nobody is jamming.
 */
export async function fetchPresence(accountIds: string[]): Promise<Record<string, PresenceInfo>> {
  if (!JAM_TOKEN_SECRET || accountIds.length === 0) return {};
  try {
    const response = await fetch(`${SERVER_INTERNAL_URL}/api/presence`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${JAM_TOKEN_SECRET}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ids: accountIds.slice(0, 200) }),
      cache: 'no-store',
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) return {};
    return (await response.json()) as Record<string, PresenceInfo>;
  } catch {
    return {};
  }
}
