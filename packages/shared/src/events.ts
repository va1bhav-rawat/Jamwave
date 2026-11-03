import type {
  ChatSendPayload,
  CreateRoomPayload,
  HostTransferPayload,
  JoinRoomPayload,
  PlaybackPlayPayload,
  PlaybackSeekPayload,
  QueueAddPayload,
  QueueRemovePayload,
  QueueReorderPayload,
  ReactionSendPayload,
  RoomSettingsPayload,
  SearchQueryPayload,
  SearchResolvePayload,
  TimePingPayload,
  TrackDurationPayload,
  TrackEndedPayload,
  TrackErrorPayload,
} from './schemas';
import type { ChatMessage, Reaction, RoomSnapshot, SearchResult } from './types';

export type ErrorCode =
  | 'INVALID_PAYLOAD'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ALREADY_IN_ROOM'
  | 'NOT_IN_ROOM'
  | 'FORBIDDEN'
  | 'QUEUE_FULL'
  | 'TRACK_NOT_FOUND'
  | 'PARTICIPANT_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'SEARCH_UNAVAILABLE'
  | 'SEARCH_BUDGET_EXHAUSTED'
  | 'UNSUPPORTED_URL'
  | 'NOT_FOUND'
  | 'SERVER_BUSY'
  | 'INTERNAL';

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
}

export type Ack<T> = { ok: true; data: T } | { ok: false; error: ErrorPayload };
export type AckFn<T> = (result: Ack<T>) => void;

export interface JoinResult {
  snapshot: RoomSnapshot;
  self: { participantId: string; secret: string };
  chat: ChatMessage[];
}

export interface SkipVoteResult {
  votes: number;
  needed: number;
  skipped: boolean;
}

export interface SearchResponse {
  results: SearchResult[];
  /** True when served from cache (no quota spent). */
  cached: boolean;
}

export interface TimePong {
  t0: number;
  t1: number;
}

/** Events the browser sends to the realtime server. */
export interface ClientToServerEvents {
  'room:create': (payload: CreateRoomPayload, ack: AckFn<JoinResult>) => void;
  'room:join': (payload: JoinRoomPayload, ack: AckFn<JoinResult>) => void;
  'room:leave': (ack?: AckFn<null>) => void;
  'room:settings': (payload: RoomSettingsPayload, ack?: AckFn<null>) => void;
  'host:transfer': (payload: HostTransferPayload, ack?: AckFn<null>) => void;

  'queue:add': (payload: QueueAddPayload, ack?: AckFn<{ added: number }>) => void;
  'queue:remove': (payload: QueueRemovePayload, ack?: AckFn<null>) => void;
  'queue:reorder': (payload: QueueReorderPayload, ack?: AckFn<null>) => void;

  'playback:play': (payload: PlaybackPlayPayload, ack?: AckFn<null>) => void;
  'playback:pause': (ack?: AckFn<null>) => void;
  'playback:seek': (payload: PlaybackSeekPayload, ack?: AckFn<null>) => void;
  'playback:skip': (ack?: AckFn<null>) => void;
  'vote:skip': (ack?: AckFn<SkipVoteResult>) => void;
  'track:ended': (payload: TrackEndedPayload) => void;
  'track:error': (payload: TrackErrorPayload) => void;
  /** The player learned the length of a track the catalogue did not know (keyless oEmbed). */
  'track:duration': (payload: TrackDurationPayload) => void;

  'chat:send': (payload: ChatSendPayload, ack?: AckFn<null>) => void;
  'reaction:send': (payload: ReactionSendPayload) => void;

  'time:ping': (payload: TimePingPayload, ack: (pong: TimePong) => void) => void;

  'search:query': (payload: SearchQueryPayload, ack: AckFn<SearchResponse>) => void;
  'search:resolve': (payload: SearchResolvePayload, ack: AckFn<SearchResponse>) => void;
}

export type RoomClosedReason = 'expired' | 'host_closed' | 'server_restart';

/** Events the realtime server pushes to browsers. */
export interface ServerToClientEvents {
  'room:state': (snapshot: RoomSnapshot) => void;
  'chat:message': (message: ChatMessage) => void;
  reaction: (reaction: Reaction) => void;
  'room:closed': (payload: { reason: RoomClosedReason }) => void;
  'server:error': (error: ErrorPayload) => void;
}

/** Nothing is exchanged between server nodes in the single-instance MVP. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InterServerEvents {}

/** Per-connection data kept by the server. */
export interface SocketData {
  participantId?: string;
  roomCode?: string;
}
