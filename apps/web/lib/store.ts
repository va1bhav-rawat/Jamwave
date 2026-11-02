import {
  TIMING,
  type ChatMessage,
  type JoinResult,
  type Participant,
  type Reaction,
  type RoomClosedReason,
  type RoomSnapshot,
} from '@jamwave/shared';
import { create } from 'zustand';
import { session, type Identity } from './session';
import { trackToSearchResult } from './utils';

export type RoomStatus = 'idle' | 'connecting' | 'joining' | 'joined' | 'ended' | 'error';

/** Error shown to the user; `code` may be a server ErrorCode or a client-side one (OFFLINE, TIMEOUT…). */
export interface ClientError {
  code: string;
  message: string;
}

export interface SyncInfo {
  offset: number;
  rtt: number;
  drift: number;
  playerState: string;
  needsGesture: boolean;
  /** Duration reported by the player when the catalogue did not know it. */
  localDurationMs: number;
  /** How far ahead of the playhead the player has buffered (ms). */
  bufferAheadMs: number;
  /** Drift currently tolerated by the adaptive corrector (ms). */
  thresholdMs: number;
  /** Recent connection trouble level (0 = healthy). */
  strikes: number;
  /** Last correction decision, for the dev HUD. */
  reason: string;
  /** How long the last seek took until playback resumed (ms). */
  seekCostMs: number;
}

/** Player size preference: 'small' caps the video box so YouTube picks a lower resolution. */
export type VideoSize = 'auto' | 'small';

export interface RoomStore {
  status: RoomStatus;
  connected: boolean;
  /** Failed connection attempts in the current connect; >0 usually means a sleeping free-tier server. */
  connectAttempts: number;
  error: ClientError | null;
  endedReason: RoomClosedReason | null;
  snapshot: RoomSnapshot | null;
  self: Identity | null;
  chat: ChatMessage[];
  reactions: Reaction[];
  unread: number;
  chatVisible: boolean;
  sync: SyncInfo;
  volume: number;
  videoSize: VideoSize;

  setStatus: (status: RoomStatus) => void;
  setConnected: (connected: boolean) => void;
  setConnectAttempts: (attempts: number) => void;
  setError: (error: ClientError) => void;
  setJoined: (result: JoinResult) => void;
  applySnapshot: (snapshot: RoomSnapshot) => void;
  pushChat: (message: ChatMessage) => void;
  setChatVisible: (visible: boolean) => void;
  pushReaction: (reaction: Reaction) => void;
  setSync: (patch: Partial<SyncInfo>) => void;
  setVolume: (volume: number) => void;
  setVideoSize: (size: VideoSize) => void;
  setEnded: (reason: RoomClosedReason) => void;
  reset: () => void;
}

const initialSync: SyncInfo = {
  offset: 0,
  rtt: 0,
  drift: 0,
  playerState: 'none',
  needsGesture: false,
  localDurationMs: 0,
  bufferAheadMs: 0,
  thresholdMs: TIMING.HARD_SEEK_THRESHOLD_MS,
  strikes: 0,
  reason: 'none',
  seekCostMs: 0,
};

/** Sync fields that start over with every track. */
const freshTrackSync = {
  localDurationMs: 0,
  bufferAheadMs: 0,
  thresholdMs: TIMING.HARD_SEEK_THRESHOLD_MS,
  strikes: 0,
  reason: 'none',
} satisfies Partial<SyncInfo>;

/** Last persisted "what was playing" signature, so storage is only written when it changes. */
let persistedSignature = '';

/** Remember the jam and its queue on this device (recent jams list, one-tap rebuild). */
function persist(snapshot: RoomSnapshot): void {
  const tracks = [snapshot.playback.track, ...snapshot.queue].filter(
    (t): t is NonNullable<typeof t> => t !== null,
  );
  const signature = `${snapshot.code}|${snapshot.settings.name}|${tracks.map((t) => t.id).join(',')}`;
  if (signature === persistedSignature) return;
  persistedSignature = signature;
  session.rememberJam(snapshot.code, snapshot.settings.name);
  session.saveLastQueue({
    code: snapshot.code,
    name: snapshot.settings.name,
    tracks: tracks.map(trackToSearchResult),
  });
}

export const useRoomStore = create<RoomStore>()((set, get) => ({
  status: 'idle',
  connected: false,
  connectAttempts: 0,
  error: null,
  endedReason: null,
  snapshot: null,
  self: null,
  chat: [],
  reactions: [],
  unread: 0,
  chatVisible: false,
  sync: initialSync,
  volume: 80,
  videoSize: 'auto',

  setStatus: (status) => set({ status }),
  setConnected: (connected) => set({ connected }),
  setConnectAttempts: (connectAttempts) => set({ connectAttempts }),
  setError: (error) => set({ error, status: 'error' }),
  setJoined: (result) => {
    persist(result.snapshot);
    set({
      status: 'joined',
      error: null,
      endedReason: null,
      snapshot: result.snapshot,
      self: result.self,
      chat: result.chat,
      unread: 0,
      sync: { ...get().sync, ...freshTrackSync, needsGesture: false },
    });
  },
  applySnapshot: (snapshot) => {
    const current = get().snapshot;
    if (current && current.code === snapshot.code && snapshot.version < current.version) return;
    const trackChanged = current?.playback.track?.id !== snapshot.playback.track?.id;
    persist(snapshot);
    set({
      snapshot,
      sync: trackChanged ? { ...get().sync, ...freshTrackSync } : get().sync,
    });
  },
  pushChat: (message) =>
    set((state) => ({
      chat: [...state.chat.slice(-199), message],
      unread: state.chatVisible || message.kind === 'system' ? state.unread : state.unread + 1,
    })),
  setChatVisible: (visible) => set({ chatVisible: visible, unread: visible ? 0 : get().unread }),
  pushReaction: (reaction) => {
    set((state) => ({ reactions: [...state.reactions.slice(-40), reaction] }));
    setTimeout(() => {
      set((state) => ({ reactions: state.reactions.filter((r) => r.id !== reaction.id) }));
    }, 2600);
  },
  setSync: (patch) => set((state) => ({ sync: { ...state.sync, ...patch } })),
  setVolume: (volume) => {
    const clamped = Math.min(100, Math.max(0, Math.round(volume)));
    session.setVolume(clamped);
    set({ volume: clamped });
  },
  setVideoSize: (size) => {
    session.setVideoSize(size);
    set({ videoSize: size });
  },
  setEnded: (reason) => {
    const code = get().snapshot?.code;
    if (code) session.forgetJam(code);
    set({ status: 'ended', endedReason: reason });
  },
  reset: () =>
    set({
      status: 'idle',
      connectAttempts: 0,
      error: null,
      endedReason: null,
      snapshot: null,
      self: null,
      chat: [],
      reactions: [],
      unread: 0,
      sync: initialSync,
    }),
}));

// ---------------------------------------------------------------- selectors

export function selectMe(state: RoomStore): Participant | null {
  const id = state.self?.participantId;
  if (!id || !state.snapshot) return null;
  return state.snapshot.participants.find((p) => p.id === id) ?? null;
}

export function selectIsHost(state: RoomStore): boolean {
  return selectMe(state)?.isHost ?? false;
}

export function selectCanControl(state: RoomStore): boolean {
  const me = selectMe(state);
  if (!me || !state.snapshot) return false;
  return me.isHost || state.snapshot.settings.everyoneControls;
}
