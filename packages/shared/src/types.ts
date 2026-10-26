export type Provider = 'youtube';

/** A playable item as returned by search / URL resolution (not yet in a queue). */
export interface SearchResult {
  provider: Provider;
  providerId: string;
  title: string;
  /** Channel / artist name. */
  artist: string;
  thumbnailUrl: string;
  /** 0 means unknown (e.g. resolved without an API key). */
  durationMs: number;
}

export interface TrackAddedBy {
  id: string;
  name: string;
}

/** A SearchResult that has been placed in a room's queue. */
export interface Track extends SearchResult {
  /** Unique per queue entry (the same video can be queued twice). */
  id: string;
  addedBy: TrackAddedBy;
  addedAt: number;
}

export interface Participant {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  connected: boolean;
  joinedAt: number;
}

export type PlaybackStatus = 'idle' | 'playing' | 'paused';

/**
 * Server-authoritative playback state.
 * `positionMs` is the track position at server time `updatedAt`.
 * While playing, the live position is `positionMs + (serverNow - updatedAt)`.
 */
export interface PlaybackState {
  status: PlaybackStatus;
  track: Track | null;
  positionMs: number;
  updatedAt: number;
}

export interface RoomSettings {
  name: string;
  /** When false only the host can play / pause / seek / skip / reorder. */
  everyoneControls: boolean;
  voteSkipEnabled: boolean;
}

export interface RoomSnapshot {
  code: string;
  hostId: string;
  settings: RoomSettings;
  participants: Participant[];
  queue: Track[];
  history: Track[];
  playback: PlaybackState;
  /** Participant ids that voted to skip the current track. */
  skipVotes: string[];
  version: number;
  /** Server clock at snapshot time; lets clients sanity-check their offset. */
  serverTime: number;
  createdAt: number;
}

export type ChatMessageKind = 'user' | 'system';

export interface ChatMessage {
  id: string;
  kind: ChatMessageKind;
  participantId: string | null;
  name: string;
  color: string;
  text: string;
  sentAt: number;
}

export interface Reaction {
  id: string;
  participantId: string;
  emoji: string;
  sentAt: number;
}

/** Public, unauthenticated room preview used for link previews / OG images. */
export interface RoomPreview {
  code: string;
  name: string;
  hostName: string;
  participantCount: number;
  nowPlaying: { title: string; artist: string; thumbnailUrl: string } | null;
}
