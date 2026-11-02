import type {
  Ack,
  ClientToServerEvents,
  JoinResult,
  RoomSnapshot,
  SearchResult,
  ServerToClientEvents,
} from '@jamwave/shared';
import pino from 'pino';
import { io as connect, type Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp, type App } from '../app';
import { loadConfig } from '../config';
import type { MusicProvider } from '../providers/types';

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

const unknownLength: SearchResult = {
  provider: 'youtube',
  providerId: 'oembed000ab',
  title: 'Pasted without a key',
  artist: 'Tester',
  thumbnailUrl: '',
  durationMs: 0,
};

const provider: MusicProvider = {
  id: 'youtube',
  searchEnabled: false,
  async search() {
    return { results: [], cached: false };
  },
  canHandleUrl: () => false,
  async resolveUrl() {
    return { results: [unknownLength], cached: false };
  },
};

let app: App;
let port: number;
const clients: Client[] = [];

function client(): Client {
  const socket: Client = connect(`http://127.0.0.1:${port}`, {
    transports: ['websocket'],
    forceNew: true,
  });
  clients.push(socket);
  return socket;
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

function nextState(socket: Client, predicate: (s: RoomSnapshot) => boolean): Promise<RoomSnapshot> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout waiting for room:state')), 3_000);
    const handler = (snapshot: RoomSnapshot) => {
      if (!predicate(snapshot)) return;
      clearTimeout(timer);
      socket.off('room:state', handler);
      resolve(snapshot);
    };
    socket.on('room:state', handler);
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeAll(async () => {
  app = createApp({
    config: loadConfig({
      NODE_ENV: 'test',
      CORS_ORIGIN: 'http://localhost:3000',
      ROOM_CREATE_RATE_PER_MINUTE: '3',
      ROOM_JOIN_RATE_PER_MINUTE: '4',
    }),
    logger: pino({ level: 'silent' }),
    provider,
  });
  port = await app.listen(0);
});

afterEach(() => {
  for (const socket of clients.splice(0)) socket.disconnect();
});

afterAll(async () => {
  await app?.close();
});

describe('abuse limits and server-owned track ends', () => {
  it('lets the host teach the server an unknown track length, but not a guest', async () => {
    const host = client();
    const guest = client();
    const created = await request<JoinResult>(host, 'room:create', { name: 'Host' });
    const code = created.snapshot.code;
    const joined = await request<JoinResult>(guest, 'room:join', { code, name: 'Guest' });
    expect(joined.snapshot.participants).toHaveLength(2);

    const started = nextState(guest, (s) => s.playback.track !== null);
    await request(guest, 'queue:add', { items: [unknownLength] });
    const playing = await started;
    const trackId = playing.playback.track!.id;
    expect(playing.playback.track?.durationMs).toBe(0);

    // A guest's report is ignored while the host is connected.
    guest.emit('track:duration', { trackId, durationMs: 90_000 });
    await sleep(150);
    expect(app.manager.getRoom(code)?.playback.track?.durationMs).toBe(0);

    // The host's report updates everyone and arms the server-side end timer.
    const learned = nextState(guest, (s) => (s.playback.track?.durationMs ?? 0) > 0);
    host.emit('track:duration', { trackId, durationMs: 90_000 });
    expect((await learned).playback.track?.durationMs).toBe(90_000);
    expect(app.manager.getRoom(code)?.endsAt()).not.toBeNull();
  });

  it('rate-limits room creation and fresh joins per address', async () => {
    const socket = client();
    // The previous test used one creation from this address; two more fit, the next does not.
    await request(socket, 'room:create', { name: 'A' });
    const { snapshot } = await request<JoinResult>(socket, 'room:create', { name: 'B' });
    await expect(request(socket, 'room:create', { name: 'C' })).rejects.toThrow(/RATE_LIMITED/);

    // Joins: one spent above; three more fresh seats, then the limiter bites.
    const guests = [client(), client(), client(), client()];
    const results = await Promise.allSettled(
      guests.map((g, i) => request(g, 'room:join', { code: snapshot.code, name: `G${i}` })),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason.message).toMatch(/RATE_LIMITED/);
  });

  it('exposes lifetime counters on /health', async () => {
    const health = (await (await fetch(`http://127.0.0.1:${port}/health`)).json()) as {
      metrics: { roomsCreated: number; joins: number; tracksAdded: number; peakConnected: number };
    };
    expect(health.metrics.roomsCreated).toBeGreaterThanOrEqual(3);
    expect(health.metrics.joins).toBeGreaterThanOrEqual(4);
    expect(health.metrics.tracksAdded).toBe(1);
    expect(health.metrics.peakConnected).toBeGreaterThanOrEqual(2);
  });
});
