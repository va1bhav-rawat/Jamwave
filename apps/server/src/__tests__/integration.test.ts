import type {
  Ack,
  ChatMessage,
  ClientToServerEvents,
  JoinResult,
  RoomSnapshot,
  SearchResult,
  ServerToClientEvents,
  SkipVoteResult,
} from '@jamwave/shared';
import { createHmac } from 'node:crypto';
import { encodeAccountToken, type AccountClaims } from '@jamwave/shared';
import pino from 'pino';
import { io as connect, type Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp, type App } from '../app';
import { loadConfig } from '../config';
import type { MusicProvider } from '../providers/types';

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

function result(id: string): SearchResult {
  return {
    provider: 'youtube',
    providerId: id,
    title: `Track ${id}`,
    artist: 'Tester',
    thumbnailUrl: '',
    durationMs: 180_000,
  };
}

const fakeProvider: MusicProvider = {
  id: 'youtube',
  searchEnabled: true,
  async search(query) {
    return { results: [result(`search-${query}`)], cached: false };
  },
  canHandleUrl: (url) => url.includes('youtu'),
  async resolveUrl() {
    return { results: [result('resolved')], cached: false };
  },
};

let app: App;
let port: number;
const clients: Client[] = [];

const TOKEN_SECRET = 'integration-test-secret-0123456789';

/** What the web app's /api/jam-token would hand a signed-in browser. */
function accountToken(sub: string, username: string, secret = TOKEN_SECRET): string {
  const claims: AccountClaims = { sub, username, exp: Date.now() + 60_000 };
  const signature = createHmac('sha256', secret).update(JSON.stringify(claims)).digest('hex');
  return encodeAccountToken(claims, signature);
}

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

function once<E extends keyof ServerToClientEvents>(
  socket: Client,
  event: E,
  predicate?: (payload: Parameters<ServerToClientEvents[E]>[0]) => boolean,
): Promise<Parameters<ServerToClientEvents[E]>[0]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), 3_000);
    const handler = (payload: Parameters<ServerToClientEvents[E]>[0]) => {
      if (predicate && !predicate(payload)) return;
      clearTimeout(timer);
      (socket.off as unknown as (ev: string, fn: unknown) => void).call(socket, event, handler);
      resolve(payload);
    };
    (socket.on as unknown as (ev: string, fn: unknown) => void).call(socket, event, handler);
  });
}

beforeAll(async () => {
  app = createApp({
    config: loadConfig({
      NODE_ENV: 'test',
      CORS_ORIGIN: 'http://localhost:3000',
      JAM_TOKEN_SECRET: TOKEN_SECRET,
    }),
    logger: pino({ level: 'silent' }),
    provider: fakeProvider,
  });
  port = await app.listen(0);
});

afterEach(() => {
  for (const socket of clients.splice(0)) socket.disconnect();
});

afterAll(async () => {
  await app?.close();
});

describe('jamwave server end to end', () => {
  it('knows signed-in people by account, answers presence lookups and bans by account', async () => {
    const host = client();
    const created = await request<JoinResult>(host, 'room:create', {
      name: 'Ana',
      accountToken: accountToken('acct-ana', 'ana'),
    });
    const code = created.snapshot.code;
    // The username is public; a forged token is ignored and the person is a guest.
    expect(created.snapshot.participants[0]?.username).toBe('ana');
    const guest = client();
    const joined = await request<JoinResult>(guest, 'room:join', {
      code,
      name: 'Eve',
      accountToken: accountToken('acct-eve', 'eve', 'wrong-secret'),
    });
    expect(joined.snapshot.participants.find((p) => p.name === 'Eve')?.username).toBeUndefined();

    const presence = (url: string, init: RequestInit) => fetch(`http://127.0.0.1:${port}${url}`, init);
    const body = JSON.stringify({ ids: ['acct-ana', 'acct-nobody'] });
    const headers = { authorization: `Bearer ${TOKEN_SECRET}`, 'content-type': 'application/json' };
    expect((await presence('/api/presence', { method: 'POST', body })).status).toBe(401);
    const ok = await presence('/api/presence', { method: 'POST', body, headers });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({
      'acct-ana': { code, roomName: "Ana's jam", listeners: 2, nowPlaying: null },
    });
    const bad = await presence('/api/presence', {
      method: 'POST',
      body: JSON.stringify({ ids: 'nope' }),
      headers,
    });
    expect(bad.status).toBe(400);

    // A removed account stays out even from a different browser (no device id this time).
    const bob = client();
    const bobJoin = await request<JoinResult>(bob, 'room:join', {
      code,
      name: 'Bob',
      accountToken: accountToken('acct-bob', 'bob'),
    });
    const told = once(bob, 'room:closed');
    await request(host, 'participant:remove', { participantId: bobJoin.self.participantId });
    expect(await told).toEqual({ reason: 'removed' });
    await expect(
      request(bob, 'room:join', { code, name: 'Bobby', accountToken: accountToken('acct-bob', 'bob') }),
    ).rejects.toThrow(/BANNED/);
  });

  it('serves health and room previews over http', async () => {
    const health = (await (await fetch(`http://127.0.0.1:${port}/health`)).json()) as {
      ok: boolean;
    };
    expect(health.ok).toBe(true);
    const missing = await fetch(`http://127.0.0.1:${port}/api/rooms/ZZZZZZ/preview`);
    expect(missing.status).toBe(404);
  });

  it('runs a full jam: create, join, add, sync, control, vote, reclaim', async () => {
    const host = client();
    const guest = client();

    const created = await request<JoinResult>(host, 'room:create', {
      name: 'Host',
      roomName: 'Test jam',
    });
    const code = created.snapshot.code;
    expect(created.snapshot.hostId).toBe(created.self.participantId);

    const joinedState = once(host, 'room:state', (s) => s.participants.length === 2);
    const joinedChat = once(host, 'chat:message');
    const joined = await request<JoinResult>(guest, 'room:join', { code, name: 'Guest' });
    expect(joined.snapshot.participants).toHaveLength(2);
    expect((await joinedState).participants.map((p) => p.name)).toEqual(['Host', 'Guest']);
    expect((await joinedChat).text).toBe('Guest joined the jam');

    // Clock sync answers immediately.
    const pong = await new Promise<{ t0: number; t1: number }>((resolve) =>
      host.emit('time:ping', { t0: 123 }, resolve),
    );
    expect(pong.t0).toBe(123);
    expect(Math.abs(pong.t1 - Date.now())).toBeLessThan(1_000);

    // Search and queue: the first track starts playing for everyone.
    const search = await request<{ results: SearchResult[] }>(guest, 'search:query', {
      q: 'daft punk',
    });
    expect(search.results[0]?.providerId).toBe('search-daft punk');
    const resolved = await request<{ results: SearchResult[] }>(guest, 'search:resolve', {
      url: 'https://youtu.be/dQw4w9WgXcQ',
    });
    expect(resolved.results[0]?.providerId).toBe('resolved');

    const playing = once(host, 'room:state', (s) => s.playback.status === 'playing');
    await request(guest, 'queue:add', { items: [...search.results, ...resolved.results] });
    const snapshot: RoomSnapshot = await playing;
    expect(snapshot.playback.track?.providerId).toBe('search-daft punk');
    expect(snapshot.queue.map((t) => t.providerId)).toEqual(['resolved']);

    const preview = (await (
      await fetch(`http://127.0.0.1:${port}/api/rooms/${code}/preview`)
    ).json()) as {
      hostName: string;
      participantCount: number;
      nowPlaying: { title: string } | null;
    };
    expect(preview).toMatchObject({ hostName: 'Host', participantCount: 2 });
    expect(preview.nowPlaying?.title).toBe('Track search-daft punk');

    // Guests can control by default; the host can lock it down.
    await request(guest, 'playback:pause');
    await request(host, 'room:settings', { everyoneControls: false });
    await expect(request(guest, 'playback:play', {})).rejects.toThrow(/FORBIDDEN/);
    await request(host, 'playback:play', {});
    await request(host, 'playback:seek', { positionMs: 42_000 });
    const afterSeek = await request<JoinResult>(host, 'room:join', {
      code,
      name: 'Host',
      reclaim: created.self,
    });
    expect(afterSeek.snapshot.playback.positionMs).toBe(42_000);
    expect(afterSeek.snapshot.playback.status).toBe('playing');

    // Majority vote skips the track (2 of 2 needed).
    const firstVote = await request<SkipVoteResult>(guest, 'vote:skip');
    expect(firstVote).toMatchObject({ votes: 1, needed: 2, skipped: false });
    const skipped = once(host, 'room:state', (s) => s.playback.track?.providerId === 'resolved');
    const secondVote = await request<SkipVoteResult>(host, 'vote:skip');
    expect(secondVote.skipped).toBe(true);
    expect((await skipped).history[0]?.providerId).toBe('search-daft punk');

    // Chat and reactions fan out to everyone.
    const chatSeen = once(guest, 'chat:message', (m: ChatMessage) => m.kind === 'user');
    await request(host, 'chat:send', { text: 'hello!' });
    expect((await chatSeen).text).toBe('hello!');
    const reactionSeen = once(host, 'reaction');
    guest.emit('reaction:send', { emoji: '🔥' });
    expect((await reactionSeen).emoji).toBe('🔥');

    // A dropped guest shows as disconnected, then reclaims their seat on a new socket.
    const dropped = once(host, 'room:state', (s) => s.participants.some((p) => !p.connected));
    guest.disconnect();
    expect((await dropped).participants.find((p) => p.name === 'Guest')?.connected).toBe(false);
    const guest2 = client();
    const reclaimed = await request<JoinResult>(guest2, 'room:join', {
      code,
      name: 'Guest',
      reclaim: joined.self,
    });
    expect(reclaimed.self.participantId).toBe(joined.self.participantId);
    expect(reclaimed.snapshot.participants.filter((p) => p.connected)).toHaveLength(2);

    // Host leaves explicitly: the guest inherits the host role.
    const handoff = once(guest2, 'room:state', (s) => s.hostId === joined.self.participantId);
    await request(host, 'room:leave');
    expect((await handoff).participants).toHaveLength(1);
  });

  it('lets the host decide who controls the jam and remove people', async () => {
    const host = client();
    const created = await request<JoinResult>(host, 'room:create', { name: 'Host' });
    const code = created.snapshot.code;
    const guest = client();
    const joined = await request<JoinResult>(guest, 'room:join', {
      code,
      name: 'Guest',
      deviceId: 'guest-phone',
    });
    const guestId = joined.self.participantId;

    // A listener can still add songs, but not jump the queue or control playback.
    await request(host, 'room:settings', { everyoneControls: false });
    await expect(request(guest, 'queue:add', { items: [result('z')] })).resolves.toEqual({
      added: 1,
    });
    await expect(
      request(guest, 'queue:add', { items: [result('y')], playNext: true }),
    ).rejects.toThrow(/FORBIDDEN/);
    await expect(request(guest, 'playback:pause')).rejects.toThrow(/FORBIDDEN/);
    // Locked queue: adding needs control too.
    await request(host, 'room:settings', { anyoneCanAdd: false });
    await expect(request(guest, 'queue:add', { items: [result('a')] })).rejects.toThrow(
      /FORBIDDEN/,
    );

    // Only the host hands out control, and only the host removes people.
    await expect(
      request(guest, 'participant:control', { participantId: guestId, canControl: true }),
    ).rejects.toThrow(/FORBIDDEN/);
    await expect(
      request(guest, 'participant:remove', { participantId: created.self.participantId }),
    ).rejects.toThrow(/FORBIDDEN/);

    const allowed = once(guest, 'room:state', (s) =>
      s.participants.some((p) => p.id === guestId && p.canControl),
    );
    await request(host, 'participant:control', { participantId: guestId, canControl: true });
    await allowed;
    await expect(request(guest, 'queue:add', { items: [result('a')] })).resolves.toEqual({
      added: 1,
    });

    // Removed: the guest is told, disappears from the room and is no longer a member.
    await expect(
      request(host, 'participant:remove', { participantId: created.self.participantId }),
    ).rejects.toThrow(/FORBIDDEN/);
    const told = once(guest, 'room:closed');
    const gone = once(host, 'room:state', (s) => s.participants.length === 1);
    await request(host, 'participant:remove', { participantId: guestId });
    expect(await told).toEqual({ reason: 'removed' });
    expect((await gone).participants[0]?.name).toBe('Host');
    await expect(request(guest, 'chat:send', { text: 'hi' })).rejects.toThrow(/NOT_IN_ROOM/);
    // Their seat is gone, and the same browser (device id) stays out for the life of the room.
    await expect(
      request(guest, 'room:join', {
        code,
        name: 'Guest',
        reclaim: joined.self,
        deviceId: 'guest-phone',
      }),
    ).rejects.toThrow(/BANNED/);
    // Another browser is a fresh seat: the ban is a nuisance filter, not a security boundary.
    const back = await request<JoinResult>(guest, 'room:join', {
      code,
      name: 'Guest',
      deviceId: 'guest-laptop',
    });
    expect(back.self.participantId).not.toBe(guestId);
  });

  it('rejects invalid payloads and unknown rooms with stable codes', async () => {
    const socket = client();
    await expect(request(socket, 'room:join', { code: 'nope', name: 'x' })).rejects.toThrow(
      /INVALID_PAYLOAD/,
    );
    await expect(request(socket, 'room:join', { code: 'ZZZZZZ', name: 'x' })).rejects.toThrow(
      /ROOM_NOT_FOUND/,
    );
    await expect(request(socket, 'playback:pause')).rejects.toThrow(/NOT_IN_ROOM/);
  });
});
