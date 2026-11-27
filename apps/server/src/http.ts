import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { normalizeRoomCode } from '@jamwave/shared';
import type { MusicProvider } from './providers/types';
import type { YouTubeProvider } from './providers/youtube';
import type { RoomManager } from './rooms/RoomManager';

export interface HttpDeps {
  manager: RoomManager;
  provider: MusicProvider | YouTubeProvider;
  corsOrigins: string[];
  /** Bearer secret the web app presents to `/api/presence`; undefined disables the route. */
  jamTokenSecret: string | undefined;
  startedAt: number;
}

const PREVIEW_RE = /^\/api\/rooms\/([A-Za-z0-9-]{6,8})\/preview\/?$/;
const PRESENCE_MAX_IDS = 200;
const BODY_LIMIT_BYTES = 16 * 1024;

/** Applied to every plain HTTP response (Socket.IO's own transport responses are not routed here). */
const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY',
} as const;

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    size += buffer.length;
    if (size > BODY_LIMIT_BYTES) throw new Error('body too large');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

function bearerMatches(req: IncomingMessage, secret: string): boolean {
  const header = req.headers.authorization ?? '';
  const given = Buffer.from(header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '');
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * `POST /api/presence { ids: accountId[] }` → which jam each account is in right now. Only the
 * web app calls it (server to server), proving itself with the shared secret.
 */
async function handlePresence(req: IncomingMessage, res: ServerResponse, deps: HttpDeps) {
  if (!deps.jamTokenSecret) {
    json(res, 503, { error: 'presence is not configured' });
    return;
  }
  if (!bearerMatches(req, deps.jamTokenSecret)) {
    json(res, 401, { error: 'unauthorized' });
    return;
  }
  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    json(res, 400, { error: 'expected a small JSON body' });
    return;
  }
  const ids = (body as { ids?: unknown } | null)?.ids;
  const valid =
    Array.isArray(ids) &&
    ids.length <= PRESENCE_MAX_IDS &&
    ids.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 64);
  if (!valid) {
    json(res, 400, { error: `ids must be up to ${PRESENCE_MAX_IDS} strings` });
    return;
  }
  json(res, 200, deps.manager.presenceFor(ids as string[]));
}

/**
 * Plain HTTP routes next to Socket.IO: a health check for the host platform, a public room
 * preview used by the web app to render link previews, and the web app's presence lookup.
 */
export function createRequestHandler(deps: HttpDeps) {
  return (req: IncomingMessage, res: ServerResponse): void => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const origin = req.headers.origin;
    if (origin && deps.corsOrigins.includes(origin)) {
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('vary', 'origin');
    }
    if (req.method === 'OPTIONS') {
      res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
      res.writeHead(204, SECURITY_HEADERS);
      res.end();
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/presence') {
      void handlePresence(req, res, deps);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      json(res, 405, { error: 'method not allowed' });
      return;
    }

    if (url.pathname === '/health' || url.pathname === '/healthz') {
      const usage = 'usage' in deps.provider ? deps.provider.usage : undefined;
      json(res, 200, {
        ok: true,
        uptimeMs: Date.now() - deps.startedAt,
        ...deps.manager.stats(),
        metrics: deps.manager.metrics,
        search: { enabled: deps.provider.searchEnabled, ...usage },
      });
      return;
    }

    const preview = PREVIEW_RE.exec(url.pathname);
    if (preview) {
      const room = deps.manager.getRoom(normalizeRoomCode(preview[1] ?? ''));
      if (!room) {
        json(res, 404, { error: 'room not found' });
        return;
      }
      json(res, 200, room.preview());
      return;
    }

    if (url.pathname === '/') {
      json(res, 200, { name: 'jamwave-server', ok: true });
      return;
    }
    json(res, 404, { error: 'not found' });
  };
}
