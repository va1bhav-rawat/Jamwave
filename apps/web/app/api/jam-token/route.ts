import { ACCOUNT_TOKEN_TTL_MS } from '@jamwave/shared';
import { JAM_TOKEN_SECRET, signAccountToken } from '@/lib/accountToken.server';
import { getServerSession } from '@/lib/auth';

const HEADERS = { 'cache-control': 'no-store' };

/**
 * A short-lived token the browser hands to the realtime server when creating or joining a jam, so
 * the jam knows which account it is. Signed out, or without the shared secret: `{ token: null }`
 * and the person jams as a guest.
 */
export async function GET() {
  const session = await getServerSession();
  const username = session?.user.username;
  if (!JAM_TOKEN_SECRET || !session || !username) {
    return Response.json({ token: null, exp: 0 }, { headers: HEADERS });
  }
  const now = Date.now();
  return Response.json(
    {
      token: signAccountToken({ sub: session.user.id, username }, JAM_TOKEN_SECRET, now),
      exp: now + ACCOUNT_TOKEN_TTL_MS,
    },
    { headers: HEADERS },
  );
}
