/**
 * Browser side of account tokens: fetched from our own /api/jam-token and cached until shortly
 * before they expire. Signed out (or the feature is off) they are simply undefined.
 */

interface Issued {
  token: string;
  exp: number;
}

const REFRESH_MARGIN_MS = 60_000;

let cached: Issued | null = null;
let inflight: Promise<string | undefined> | null = null;

export async function getAccountToken(): Promise<string | undefined> {
  if (cached && cached.exp - REFRESH_MARGIN_MS > Date.now()) return cached.token;
  inflight ??= fetch('/api/jam-token', { cache: 'no-store', credentials: 'same-origin' })
    .then(async (response) => {
      const data = response.ok
        ? ((await response.json()) as { token: string | null; exp: number })
        : null;
      cached = data?.token ? { token: data.token, exp: data.exp } : null;
      return cached?.token;
    })
    .catch(() => undefined)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** After sign-out: the next jam must not carry the old account. */
export function forgetAccountToken(): void {
  cached = null;
}
