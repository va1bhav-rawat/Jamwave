import type {
  ChatMessage,
  JoinResult,
  Participant,
  Reaction,
  RoomClosedReason,
  RoomSnapshot,
} from '@jamwave/shared';
import { create } from 'zustand';
import { session, type Identity } from './session';

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
}

export interface RoomStore {
  status: RoomStatus;
  connected: boolean;
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

  setStatus: (status: RoomStatus) => void;
  setConnected: (connected: boolean) => void;
  setError: (error: ClientError) => void;
  setJoined: (result: JoinResult) => void;
  applySnapshot: (snapshot: RoomSnapshot) => void;
  pushChat: (message: ChatMessage) => void;
  setChatVisible: (visible: boolean) => void;
  pushReaction: (reaction: Reaction) => void;
  setSync: (patch: Partial<SyncInfo>) => void;
  setVolume: (volume: number) => void;
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
};

export const useRoomStore = create<RoomStore>()((set, get) => ({
  status: 'idle',
  connected: false,
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

  setStatus: (status) => set({ status }),
  setConnected: (connected) => set({ connected }),
  setError: (error) => set({ error, status: 'error' }),
  setJoined: (result) =>
    set({
      status: 'joined',
      error: null,
      endedReason: null,
      snapshot: result.snapshot,
      self: result.self,
      chat: result.chat,
      unread: 0,
      sync: { ...get().sync, needsGesture: false, localDurationMs: 0 },
    }),
  applySnapshot: (snapshot) => {
    const current = get().snapshot;
    if (current && current.code === snapshot.code && snapshot.version < current.version) return;
    const trackChanged = current?.playback.track?.id !== snapshot.playback.track?.id;
    set({
      snapshot,
      sync: trackChanged ? { ...get().sync, localDurationMs: 0 } : get().sync,
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
  setEnded: (reason) => set({ status: 'ended', endedReason: reason }),
  reset: () =>
    set({
      status: 'idle',
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
