import type {
  Ack,
  ClientToServerEvents,
  JoinResult,
  RoomClosedReason,
  ServerToClientEvents,
} from '@jamwave/shared';
import pino from 'pino';
import { io as connect, type Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp, type App } from '../app';
import { loadConfig } from '../config';
import type { MusicProvider } from '../providers/types';

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

const provider: MusicProvider = {
  id: 'youtube',
  searchEnabled: false,
  async search() {
    return { results: [], cached: false };
  },
  canHandleUrl: () => false,
  async resolveUrl() {
    return { results: [], cached: false };
  },
};

function makeApp(env: Record<string, string>): App {
  return createApp({
    config: loadConfig({ NODE_ENV: 'test', CORS_ORIGIN: 'http://localhost:3000', ...env }),
    logger: pino({ level: 'silent' }),
    provider,
  });
}

const clients: Client[] = [];

function client(port: number, forwardedFor?: string): Client {
  const socket: Client = connect(`http://127.0.0.1:${port}`, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    ...(forwardedFor ? { extraHeaders: { 'x-forwarded-for': forwardedFor } } : {}),
  });
  clients.push(socket);
  return socket;
}

function connected(socket: Client): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', (error) => reject(error));
  });
}

function request<T>(
  socket: Client,
  event: keyof ClientToServerEvents,
  ...args: unknown[]
): Promise<T> {
  return new Promise((resolve, reject) => {
    (socket.emit as unknown as (ev: string, ...a: unknown[]) => void).call(
      socket,
      event,
      ...args,
      (ack: Ack<T>) =>
        ack.ok ? resolve(ack.data) : reject(new Error(`${ack.error.code}: ${ack.error.message}`)),
    );
  });
}

function ping(socket: Client, timeoutMs = 300): Promise<boolean> {
  return new Promise((resolve) => {
    socket.timeout(timeoutMs).emit('time:ping', { t0: Date.now() }, (err) => resolve(!err));
  });
}

afterEach(() => {
  for (const socket of clients.splice(0)) socket.disconnect();
});

describe('trusted proxy and flood limits', () => {
  let app: App;
  let port: number;

  beforeAll(async () => {
    app = makeApp({ ROOM_CREATE_RATE_PER_MINUTE: '2', TRUST_PROXY_HOPS: '1' });
    port = await app.listen(0);
  });
  afterAll(async () => {
    await app.close();
  });

  it('ignores client-written x-forwarded-for entries when keying the create limiter', async () => {
    const a = client(port, 'spoof-a, 203.0.113.9');
    const b = client(port, 'spoof-b, 203.0.113.9');
    const other = client(port, 'spoof-c, 203.0.113.10');
    await request(a, 'room:create', { name: 'A' });
    await request(b, 'room:create', { name: 'B' });
    // Same proxy-written address: the bucket is shared no matter what the client prepends.
    await expect(request(a, 'room:create', { name: 'A2' })).rejects.toThrow(/RATE_LIMITED/);
    // A different real address is unaffected.
    await request(other, 'room:create', { name: 'C' });
  });

  it('answers a flooding socket with RATE_LIMITED before any handler runs', async () => {
    const socket = client(port, 'x, 203.0.113.20');
    await connected(socket);
    const results = await Promise.allSettled(
      Array.from({ length: 61 }, () => request(socket, 'room:leave')),
    );
    expect(results.slice(0, 60).every((r) => r.status === 'fulfilled')).toBe(true);
    const last = results[60] as PromiseRejectedResult;
    expect(last.status).toBe('rejected');
    expect(last.reason.message).toMatch(/RATE_LIMITED/);
  });

  it('drops surplus clock pings silently while other events keep working', async () => {
    const socket = client(port, 'x, 203.0.113.21');
    await connected(socket);
    const answered = await Promise.all(Array.from({ length: 25 }, () => ping(socket)));
    expect(answered.filter(Boolean)).toHaveLength(20);
    // The ping budget is separate from the general one: a normal event still gets through.
    await expect(request(socket, 'room:leave')).resolves.toBeNull();
  });

  it('sends security headers on plain http responses', async () => {
    const health = await fetch(`http://127.0.0.1:${port}/health`);
    expect(health.headers.get('x-content-type-options')).toBe('nosniff');
    expect(health.headers.get('referrer-policy')).toBe('no-referrer');
    expect(health.headers.get('x-frame-options')).toBe('DENY');
    const missing = await fetch(`http://127.0.0.1:${port}/api/rooms/ZZZZZZ/preview`);
    expect(missing.status).toBe(404);
    expect(missing.headers.get('x-content-type-options')).toBe('nosniff');
    const preflight = await fetch(`http://127.0.0.1:${port}/health`, { method: 'OPTIONS' });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('x-frame-options')).toBe('DENY');
  });
});

describe('connections per address', () => {
  let app: App;
  let port: number;

  beforeAll(async () => {
    app = makeApp({ MAX_CONNECTIONS_PER_IP: '3', TRUST_PROXY_HOPS: '0' });
    port = await app.listen(0);
  });
  afterAll(async () => {
    await app.close();
  });

  it('refuses the handshake beyond the cap and frees the slot on disconnect', async () => {
    const first = [client(port), client(port), client(port)];
    await Promise.all(first.map(connected));
    await expect(connected(client(port))).rejects.toThrow('TOO_MANY_CONNECTIONS');
    first[0]!.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expect(connected(client(port))).resolves.toBeUndefined();
  });
});

describe('graceful restart', () => {
  it('tells every jam it is closing for a restart before the sockets drop', async () => {
    const app = makeApp({});
    const port = await app.listen(0);
    const host = client(port);
    const guest = client(port);
    const { snapshot } = await request<JoinResult>(host, 'room:create', { name: 'Host' });
    await request(guest, 'room:join', { code: snapshot.code, name: 'Guest' });

    const closedReason = (socket: Client) =>
      new Promise<RoomClosedReason>((resolve, reject) => {
        socket.once('room:closed', ({ reason }) => resolve(reason));
        socket.once('disconnect', () => reject(new Error('disconnected before room:closed')));
      });
    const reasons = Promise.all([closedReason(host), closedReason(guest)]);
    await app.close();
    expect(await reasons).toEqual(['server_restart', 'server_restart']);
    expect(app.manager.stats().rooms).toBe(0);
  });
});
