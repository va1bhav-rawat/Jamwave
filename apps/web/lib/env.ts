/** Public URL of the realtime server (browser-facing). */
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

/** Public URL of this web app, used for share links and metadata. */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/** URL the Next.js server uses to reach the realtime server (may be an internal address). */
export const SERVER_INTERNAL_URL = process.env.SOCKET_INTERNAL_URL ?? SOCKET_URL;
