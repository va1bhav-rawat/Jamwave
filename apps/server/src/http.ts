import type { IncomingMessage, ServerResponse } from 'node:http';
import { normalizeRoomCode } from '@jamwave/shared';
import type { MusicProvider } from './providers/types';
import type { YouTubeProvider } from './providers/youtube';
import type { RoomManager } from './rooms/RoomManager';

export interface HttpDeps {
  manager: RoomManager;
  provider: MusicProvider | YouTubeProvider;
  corsOrigins: string[];
  startedAt: number;
}

const PREVIEW_RE = /^\/api\/rooms\/([A-Za-z0-9-]{6,8})\/preview\/?$/;

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

/**
 * Plain HTTP routes next to Socket.IO: a health check for the host platform and
 * a public room preview used by the web app to render link previews.
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
      res.setHeader('access-control-allow-methods', 'GET, OPTIONS');
      res.writeHead(204);
      res.end();
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
