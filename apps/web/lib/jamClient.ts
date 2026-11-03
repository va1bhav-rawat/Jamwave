import {
  LIMITS,
  normalizeRoomCode,
  type Ack,
  type ClientToServerEvents,
  type JoinResult,
  type ReactionEmoji,
  type RoomSettingsPayload,
  type SearchResponse,
  type SearchResult,
  type ServerToClientEvents,
  type SkipVoteResult,
} from '@jamwave/shared';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { SOCKET_URL } from './env';
import { session } from './session';
import { useRoomStore } from './store';

export class JamError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'JamError';
  }
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/** Lazily create the single socket for this tab and wire store updates. */
export function getSocket(): AppSocket {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    reconnectionDelayMax: 5_000,
    timeout: 10_000,
  });
  bind(socket);
  return socket;
}

function bind(s: AppSocket): void {
  const store = useRoomStore;
  s.on('connect', () => {
    store.getState().setConnected(true);
    const { self, snapshot, status } = store.getState();
    if (self && snapshot && status === 'joined') void rejoin(snapshot.code);
  });
  s.on('disconnect', () => store.getState().setConnected(false));
  s.on('room:state', (snapshot) => store.getState().applySnapshot(snapshot));
  s.on('chat:message', (message) => store.getState().pushChat(message));
  s.on('reaction', (reaction) => store.getState().pushReaction(reaction));
  s.on('room:closed', ({ reason }) => {
    const code = store.getState().snapshot?.code;
    if (code) session.clearIdentity(code);
    store.getState().setEnded(reason);
  });
  s.on('server:error', (error) => toast.error(error.message));
}

async function rejoin(code: string): Promise<void> {
  const name = session.getNickname() ?? 'Guest';
  try {
    await joinRoom(code, name, { silent: true });
    toast.success('Back in sync');
  } catch (error) {
    // Keep the server's code: after a restart it is ROOM_NOT_FOUND, which is what turns the
    // join screen into "this jam has ended, rebuild it".
    useRoomStore.getState().setError({
      code: errorCode(error, 'REJOIN_FAILED'),
      message: errorMessage(error, 'Could not rejoin the jam'),
    });
  }
}

/**
 * Free-tier hosts put an idle server to sleep; the first visitor pays a cold start that can run
 * close to a minute. Each failed attempt is ~10 s, so this is roughly how long we keep trying.
 */
const MAX_CONNECT_ATTEMPTS = 6;

/** Resolve once the socket is connected; reject after a few failed attempts. */
export function ensureConnected(): Promise<void> {
  const s = getSocket();
  if (s.connected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let attempts = 0;
    useRoomStore.getState().setConnectAttempts(0);
    const cleanup = () => {
      s.off('connect', onConnect);
      s.off('connect_error', onError);
    };
    const onConnect = () => {
      cleanup();
      useRoomStore.getState().setConnectAttempts(0);
      resolve();
    };
    const onError = (error: Error) => {
      if (error.message === 'TOO_MANY_CONNECTIONS') {
        cleanup();
        reject(
          new JamError(
            'TOO_MANY_CONNECTIONS',
            'Too many Jamwave tabs are open on your network. Close a few and try again.',
          ),
        );
        return;
      }
      attempts += 1;
      useRoomStore.getState().setConnectAttempts(attempts);
      if (attempts >= MAX_CONNECT_ATTEMPTS) {
        cleanup();
        reject(
          new JamError('OFFLINE', "Can't reach the jam server right now. Try again in a moment."),
        );
      }
    };
    s.on('connect', onConnect);
    s.on('connect_error', onError);
    s.connect();
  });
}

type EventName = keyof ClientToServerEvents;
type RawEmit = (event: string, ...args: unknown[]) => void;

/** Emit an event that answers with an Ack, as a promise (10 s timeout). */
export function request<T>(event: EventName, ...args: unknown[]): Promise<T> {
  const s = getSocket();
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new JamError('TIMEOUT', 'The jam server took too long to respond')),
      10_000,
    );
    (s.emit as unknown as RawEmit).call(s, event, ...args, (ack: Ack<T>) => {
      clearTimeout(timer);
      if (ack.ok) resolve(ack.data);
      else reject(new JamError(ack.error.code, ack.error.message));
    });
  });
}

/** Emit a fire-and-forget event. */
function fire(event: EventName, ...args: unknown[]): void {
  const s = getSocket();
  if (!s.connected) return;
  (s.emit as unknown as RawEmit).call(s, event, ...args);
}

function adopt(code: string, result: JoinResult): void {
  session.setIdentity(code, result.self);
  useRoomStore.getState().setJoined(result);
}

export async function createRoom(name: string, roomName?: string): Promise<string> {
  const store = useRoomStore.getState();
  session.setNickname(name);
  store.setStatus('connecting');
  await ensureConnected();
  store.setStatus('joining');
  const result = await request<JoinResult>('room:create', {
    name,
    roomName: roomName?.trim() || undefined,
  });
  adopt(result.snapshot.code, result);
  return result.snapshot.code;
}

export async function joinRoom(
  rawCode: string,
  name: string,
  opts: { silent?: boolean } = {},
): Promise<void> {
  const code = normalizeRoomCode(rawCode);
  const store = useRoomStore.getState();
  session.setNickname(name);
  if (!opts.silent) store.setStatus('connecting');
  await ensureConnected();
  if (!opts.silent) store.setStatus('joining');
  const reclaim = session.getIdentity(code) ?? undefined;
  const result = await request<JoinResult>('room:join', { code, name, reclaim });
  adopt(code, result);
}

/** Queue many tracks (e.g. a saved queue) in server-sized batches. Returns how many were added. */
export async function seedQueue(items: SearchResult[]): Promise<number> {
  let added = 0;
  for (let i = 0; i < items.length; i += LIMITS.QUEUE_ADD_BATCH_MAX) {
    const chunk = items.slice(i, i + LIMITS.QUEUE_ADD_BATCH_MAX);
    added += (await jam.addTracks(chunk)).added;
  }
  return added;
}

export function leaveRoom(): void {
  const store = useRoomStore.getState();
  const code = store.snapshot?.code;
  fire('room:leave');
  if (code) session.clearIdentity(code);
  store.reset();
}

/** Typed facade for everything a participant can do inside a room. */
export const jam = {
  play: (trackId?: string) => request<null>('playback:play', trackId ? { trackId } : {}),
  pause: () => request<null>('playback:pause'),
  seek: (positionMs: number) =>
    request<null>('playback:seek', { positionMs: Math.round(positionMs) }),
  skip: () => request<null>('playback:skip'),
  voteSkip: () => request<SkipVoteResult>('vote:skip'),
  addTracks: (items: SearchResult[], playNext = false) =>
    request<{ added: number }>('queue:add', { items, playNext }),
  removeTrack: (trackId: string) => request<null>('queue:remove', { trackId }),
  reorderTrack: (trackId: string, toIndex: number) =>
    request<null>('queue:reorder', { trackId, toIndex }),
  sendChat: (text: string) => request<null>('chat:send', { text }),
  react: (emoji: ReactionEmoji) => fire('reaction:send', { emoji }),
  updateSettings: (patch: RoomSettingsPayload) => request<null>('room:settings', patch),
  transferHost: (participantId: string) => request<null>('host:transfer', { participantId }),
  search: (q: string) => request<SearchResponse>('search:query', { q }),
  resolve: (url: string) => request<SearchResponse>('search:resolve', { url }),
  reportEnded: (trackId: string) => fire('track:ended', { trackId }),
  reportError: (trackId: string, code?: number) => fire('track:error', { trackId, code }),
  reportDuration: (trackId: string, durationMs: number) =>
    fire('track:duration', { trackId, durationMs: Math.round(durationMs) }),
};

/** The stable code of a JamError (server or client), or `fallback` for anything else. */
export function errorCode(error: unknown, fallback: string): string {
  return error instanceof JamError ? error.code : fallback;
}

export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
