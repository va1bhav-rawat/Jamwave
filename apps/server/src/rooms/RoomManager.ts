import {
  TIMING,
  generateRoomCode,
  type ChatMessage,
  type ReclaimPayload,
  type RoomClosedReason,
} from '@jamwave/shared';
import { AppError } from '../lib/errors';
import type { Logger } from '../lib/logger';
import { Room, type Now, type ParticipantRecord } from './Room';

export type ChangeReason =
  | 'join'
  | 'reclaim'
  | 'disconnect'
  | 'leave'
  | 'settings'
  | 'host'
  | 'queue'
  | 'playback'
  | 'vote'
  | 'track-ended';

/** Lifetime counters since the process started: the cheapest possible product analytics. */
export interface Metrics {
  roomsCreated: number;
  /** First-time joins (reclaims after a refresh are not counted). */
  joins: number;
  tracksAdded: number;
  peakRooms: number;
  peakConnected: number;
}

export interface RoomManagerOptions {
  now?: Now;
  emptyTtlMs?: number;
  reclaimGraceMs?: number;
  /** Hard cap on live rooms; creation fails with SERVER_BUSY beyond it. */
  maxRooms?: number;
  /** Called after every committed change; the caller broadcasts the snapshot. */
  onRoomChanged: (room: Room, reason: ChangeReason) => void;
  onRoomClosed: (room: Room, reason: RoomClosedReason) => void;
  onSystemMessage: (room: Room, message: ChatMessage) => void;
  logger?: Logger;
}

export interface JoinInput {
  code: string;
  name: string;
  socketId: string;
  reclaim?: ReclaimPayload;
}

export interface JoinOutput {
  room: Room;
  participant: ParticipantRecord;
  reclaimed: boolean;
}

/**
 * Owns every live room plus the timers that make rooms self-driving:
 * track-end advancement, reconnect grace periods and empty-room expiry.
 */
export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  private readonly endTimers = new Map<string, NodeJS.Timeout>();
  private readonly graceTimers = new Map<string, NodeJS.Timeout>();
  private sweepTimer: NodeJS.Timeout | null = null;
  private readonly now: Now;
  private readonly emptyTtlMs: number;
  private readonly reclaimGraceMs: number;
  private readonly maxRooms: number;
  readonly metrics: Metrics = {
    roomsCreated: 0,
    joins: 0,
    tracksAdded: 0,
    peakRooms: 0,
    peakConnected: 0,
  };

  constructor(private readonly opts: RoomManagerOptions) {
    this.now = opts.now ?? Date.now;
    this.emptyTtlMs = opts.emptyTtlMs ?? TIMING.ROOM_EMPTY_TTL_MS;
    this.reclaimGraceMs = opts.reclaimGraceMs ?? TIMING.RECLAIM_GRACE_MS;
    this.maxRooms = opts.maxRooms ?? 5_000;
  }

  // ---------------------------------------------------------------- lifecycle

  createRoom(input: { hostName: string; roomName?: string; socketId: string }): {
    room: Room;
    participant: ParticipantRecord;
  } {
    if (this.rooms.size >= this.maxRooms) {
      throw new AppError('SERVER_BUSY', 'Jamwave is at capacity right now. Try again in a minute.');
    }
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();
    const room = new Room(code, { name: input.roomName || `${input.hostName}'s jam` }, this.now);
    const participant = room.addParticipant(input.hostName, input.socketId);
    this.rooms.set(code, room);
    this.metrics.roomsCreated++;
    this.metrics.peakRooms = Math.max(this.metrics.peakRooms, this.rooms.size);
    this.recordConnected();
    this.opts.logger?.info({ code, host: participant.name }, 'room created');
    return { room, participant };
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  requireRoom(code: string): Room {
    const room = this.rooms.get(code);
    if (!room) throw new AppError('ROOM_NOT_FOUND', 'That jam has ended or never existed');
    return room;
  }

  join(input: JoinInput): JoinOutput {
    const room = this.requireRoom(input.code);
    if (input.reclaim) {
      const participant = room.reclaim(
        input.reclaim.participantId,
        input.reclaim.secret,
        input.socketId,
        input.name,
      );
      if (participant) {
        this.clearGrace(room.code, participant.id);
        this.recordConnected();
        this.commit(room, 'reclaim');
        return { room, participant, reclaimed: true };
      }
    }
    const participant = room.addParticipant(input.name, input.socketId);
    this.metrics.joins++;
    this.recordConnected();
    this.system(room, `${participant.name} joined the jam`);
    this.commit(room, 'join');
    return { room, participant, reclaimed: false };
  }

  /** Socket dropped: keep the seat for a grace period so a refresh keeps identity and host role. */
  handleDisconnect(code: string, participantId: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    if (!room.markDisconnected(participantId)) return;
    this.clearGrace(code, participantId);
    const timer = setTimeout(() => {
      this.graceTimers.delete(this.graceKey(code, participantId));
      const current = this.rooms.get(code);
      if (!current) return;
      const participant = current.getParticipant(participantId);
      if (!participant || participant.connected) return;
      this.finalizeLeave(current, participantId);
    }, this.reclaimGraceMs);
    this.graceTimers.set(this.graceKey(code, participantId), timer);
    this.commit(room, 'disconnect');
  }

  /** Explicit leave: remove immediately. */
  leave(code: string, participantId: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    this.clearGrace(code, participantId);
    this.finalizeLeave(room, participantId);
  }

  private finalizeLeave(room: Room, participantId: string): void {
    const { removed, newHostId } = room.removeParticipant(participantId);
    if (!removed) return;
    this.system(room, `${removed.name} left the jam`);
    if (newHostId) {
      const host = room.getParticipant(newHostId);
      if (host) this.system(room, `${host.name} is now the host`);
    }
    this.commit(room, 'leave');
  }

  /** Host removed someone. Returns their record so the caller can tell their socket. */
  kick(room: Room, participantId: string): ParticipantRecord | null {
    this.clearGrace(room.code, participantId);
    const { removed } = room.removeParticipant(participantId);
    if (!removed) return null;
    this.system(room, `${removed.name} was removed by the host`);
    this.commit(room, 'leave');
    return removed;
  }

  setParticipantControl(room: Room, participantId: string, canControl: boolean): void {
    const participant = room.setParticipantControl(participantId, canControl);
    this.system(
      room,
      canControl
        ? `${participant.name} can now control the music`
        : `${participant.name} is now a listener`,
    );
    this.commit(room, 'settings');
  }

  transferHost(room: Room, toParticipantId: string): void {
    room.transferHost(toParticipantId);
    const host = room.getParticipant(toParticipantId);
    if (host) this.system(room, `${host.name} is now the host`);
    this.commit(room, 'host');
  }

  /** Single commit point: reschedules the track-end timer and notifies listeners. */
  commit(room: Room, reason: ChangeReason): void {
    this.reschedule(room);
    this.opts.onRoomChanged(room, reason);
  }

  system(room: Room, text: string): void {
    const message = room.addSystemMessage(text);
    this.opts.onSystemMessage(room, message);
  }

  // ---------------------------------------------------------------- timers

  private reschedule(room: Room): void {
    const existing = this.endTimers.get(room.code);
    if (existing) {
      clearTimeout(existing);
      this.endTimers.delete(room.code);
    }
    const endsAt = room.endsAt();
    const trackId = room.playback.track?.id;
    if (endsAt === null || !trackId) return;
    const delay = Math.max(0, endsAt - this.now() + TIMING.TRACK_END_SLACK_MS);
    const timer = setTimeout(() => {
      this.endTimers.delete(room.code);
      const current = this.rooms.get(room.code);
      if (!current) return;
      if (current.onTrackEnded(trackId)) this.commit(current, 'track-ended');
    }, delay);
    this.endTimers.set(room.code, timer);
  }

  private graceKey(code: string, participantId: string): string {
    return `${code}:${participantId}`;
  }

  private clearGrace(code: string, participantId: string): void {
    const key = this.graceKey(code, participantId);
    const timer = this.graceTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.graceTimers.delete(key);
    }
  }

  startSweeper(intervalMs = 30_000): void {
    if (this.sweepTimer) return;
    this.sweepTimer = setInterval(() => this.sweep(), intervalMs);
    this.sweepTimer.unref?.();
  }

  /** Close rooms that have been empty longer than the TTL. Returns how many closed. */
  sweep(): number {
    const t = this.now();
    let closed = 0;
    for (const room of [...this.rooms.values()]) {
      if (room.isEmpty && room.emptySince !== null && t - room.emptySince >= this.emptyTtlMs) {
        this.closeRoom(room, 'expired');
        closed++;
      }
    }
    return closed;
  }

  /** Close every live room (server shutdown). Returns how many were closed. */
  closeAll(reason: RoomClosedReason): number {
    const rooms = [...this.rooms.values()];
    for (const room of rooms) this.closeRoom(room, reason);
    return rooms.length;
  }

  closeRoom(room: Room, reason: RoomClosedReason): void {
    const endTimer = this.endTimers.get(room.code);
    if (endTimer) clearTimeout(endTimer);
    this.endTimers.delete(room.code);
    for (const participant of room.participants.keys()) this.clearGrace(room.code, participant);
    this.rooms.delete(room.code);
    this.opts.logger?.info({ code: room.code, reason }, 'room closed');
    this.opts.onRoomClosed(room, reason);
  }

  stats(): { rooms: number; participants: number; connected: number } {
    let participants = 0;
    let connected = 0;
    for (const room of this.rooms.values()) {
      participants += room.participants.size;
      connected += room.connectedCount;
    }
    return { rooms: this.rooms.size, participants, connected };
  }

  /** Count tracks queued (called by the queue handler). */
  recordTracksAdded(count: number): void {
    this.metrics.tracksAdded += count;
  }

  private recordConnected(): void {
    this.metrics.peakConnected = Math.max(this.metrics.peakConnected, this.stats().connected);
  }

  dispose(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    this.sweepTimer = null;
    for (const timer of this.endTimers.values()) clearTimeout(timer);
    for (const timer of this.graceTimers.values()) clearTimeout(timer);
    this.endTimers.clear();
    this.graceTimers.clear();
  }
}
