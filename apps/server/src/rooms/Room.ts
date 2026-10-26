import {
  LIMITS,
  PARTICIPANT_COLORS,
  getPlaybackPosition,
  getTrackEndsAt,
  type ChatMessage,
  type Participant,
  type PlaybackState,
  type RoomPreview,
  type RoomSettings,
  type RoomSnapshot,
  type SearchResult,
  type SkipVoteResult,
  type Track,
  type TrackAddedBy,
} from '@jamwave/shared';
import { AppError } from '../lib/errors';
import { newId, newSecret } from '../lib/ids';

export type Now = () => number;

export interface ParticipantRecord extends Participant {
  secret: string;
  socketId: string | null;
  disconnectedAt: number | null;
}

export interface RemoveResult {
  removed: ParticipantRecord | null;
  /** Set when the removed participant was the host and someone else took over. */
  newHostId: string | null;
}

/**
 * Pure, in-memory state of one jam room. No I/O: callers broadcast after mutating.
 * Every mutation bumps `version` so clients can discard stale snapshots.
 */
export class Room {
  readonly createdAt: number;
  hostId = '';
  settings: RoomSettings;
  readonly participants = new Map<string, ParticipantRecord>();
  queue: Track[] = [];
  history: Track[] = [];
  playback: PlaybackState;
  readonly skipVotes = new Set<string>();
  readonly chat: ChatMessage[] = [];
  version = 0;
  /** Server time since which nobody has been connected; null while someone is. */
  emptySince: number | null;

  constructor(
    readonly code: string,
    settings: Partial<RoomSettings>,
    private readonly now: Now,
  ) {
    this.createdAt = now();
    this.emptySince = this.createdAt;
    this.settings = {
      name: settings.name?.trim() || 'Jam session',
      everyoneControls: settings.everyoneControls ?? true,
      voteSkipEnabled: settings.voteSkipEnabled ?? true,
    };
    this.playback = { status: 'idle', track: null, positionMs: 0, updatedAt: this.createdAt };
  }

  // ---------------------------------------------------------------- participants

  get connectedCount(): number {
    let n = 0;
    for (const p of this.participants.values()) if (p.connected) n++;
    return n;
  }

  get isEmpty(): boolean {
    return this.connectedCount === 0;
  }

  getParticipant(id: string): ParticipantRecord | undefined {
    return this.participants.get(id);
  }

  isHost(participantId: string): boolean {
    return participantId === this.hostId;
  }

  canControl(participantId: string): boolean {
    return this.isHost(participantId) || this.settings.everyoneControls;
  }

  private pickColor(): string {
    const usage = new Map<string, number>();
    for (const p of this.participants.values()) {
      usage.set(p.color, (usage.get(p.color) ?? 0) + 1);
    }
    let best: string = PARTICIPANT_COLORS[0];
    let bestCount = Number.POSITIVE_INFINITY;
    for (const color of PARTICIPANT_COLORS) {
      const count = usage.get(color) ?? 0;
      if (count < bestCount) {
        best = color;
        bestCount = count;
      }
    }
    return best;
  }

  addParticipant(name: string, socketId: string): ParticipantRecord {
    if (this.participants.size >= LIMITS.MAX_PARTICIPANTS) {
      throw new AppError('ROOM_FULL', `This jam is full (${LIMITS.MAX_PARTICIPANTS} people max)`);
    }
    const participant: ParticipantRecord = {
      id: newId(),
      name,
      color: this.pickColor(),
      isHost: false,
      connected: true,
      joinedAt: this.now(),
      secret: newSecret(),
      socketId,
      disconnectedAt: null,
    };
    this.participants.set(participant.id, participant);
    if (!this.hostId || !this.participants.has(this.hostId)) {
      this.setHost(participant.id);
    }
    this.emptySince = null;
    this.bump();
    return participant;
  }

  /** Re-attach a disconnected (or refreshed) participant. Returns null on a bad secret. */
  reclaim(
    participantId: string,
    secret: string,
    socketId: string,
    name?: string,
  ): ParticipantRecord | null {
    const participant = this.participants.get(participantId);
    if (!participant || participant.secret !== secret) return null;
    participant.connected = true;
    participant.socketId = socketId;
    participant.disconnectedAt = null;
    if (name) participant.name = name;
    this.emptySince = null;
    this.bump();
    return participant;
  }

  markDisconnected(participantId: string): boolean {
    const participant = this.participants.get(participantId);
    if (!participant || !participant.connected) return false;
    participant.connected = false;
    participant.socketId = null;
    participant.disconnectedAt = this.now();
    if (this.isEmpty) this.emptySince = this.now();
    this.bump();
    return true;
  }

  removeParticipant(participantId: string): RemoveResult {
    const participant = this.participants.get(participantId);
    if (!participant) return { removed: null, newHostId: null };
    this.participants.delete(participantId);
    this.skipVotes.delete(participantId);
    let newHostId: string | null = null;
    if (this.hostId === participantId) {
      newHostId = this.chooseNextHost();
    }
    if (this.isEmpty && this.emptySince === null) this.emptySince = this.now();
    this.bump();
    return { removed: participant, newHostId };
  }

  private chooseNextHost(): string | null {
    const candidates = [...this.participants.values()].sort((a, b) => {
      if (a.connected !== b.connected) return a.connected ? -1 : 1;
      return a.joinedAt - b.joinedAt;
    });
    const next = candidates[0];
    if (!next) {
      this.hostId = '';
      return null;
    }
    this.setHost(next.id);
    return next.id;
  }

  private setHost(participantId: string): void {
    for (const p of this.participants.values()) p.isHost = p.id === participantId;
    this.hostId = participantId;
  }

  transferHost(toParticipantId: string): void {
    if (!this.participants.has(toParticipantId)) {
      throw new AppError('PARTICIPANT_NOT_FOUND', 'That person is no longer in the jam');
    }
    this.setHost(toParticipantId);
    this.bump();
  }

  updateSettings(patch: Partial<RoomSettings>): void {
    if (patch.name !== undefined && patch.name.trim()) this.settings.name = patch.name.trim();
    if (patch.everyoneControls !== undefined)
      this.settings.everyoneControls = patch.everyoneControls;
    if (patch.voteSkipEnabled !== undefined) this.settings.voteSkipEnabled = patch.voteSkipEnabled;
    this.bump();
  }

  // ---------------------------------------------------------------- queue

  addTracks(
    items: SearchResult[],
    addedBy: TrackAddedBy,
    playNext = false,
  ): { added: Track[]; autoStarted: boolean } {
    const free = LIMITS.MAX_QUEUE - this.queue.length;
    if (free <= 0) {
      throw new AppError('QUEUE_FULL', `The queue is full (${LIMITS.MAX_QUEUE} tracks max)`);
    }
    const t = this.now();
    const added: Track[] = items.slice(0, free).map((item) => ({
      ...item,
      id: newId(),
      addedBy: { ...addedBy },
      addedAt: t,
    }));
    if (playNext) this.queue.unshift(...added);
    else this.queue.push(...added);
    let autoStarted = false;
    if (this.playback.status === 'idle') autoStarted = this.advance();
    this.bump();
    return { added, autoStarted };
  }

  findQueued(trackId: string): Track | undefined {
    return this.queue.find((t) => t.id === trackId);
  }

  removeTrack(trackId: string): Track {
    const index = this.queue.findIndex((t) => t.id === trackId);
    if (index < 0) throw new AppError('TRACK_NOT_FOUND', 'That track is no longer in the queue');
    const removed = this.queue[index]!;
    this.queue.splice(index, 1);
    this.bump();
    return removed;
  }

  reorderTrack(trackId: string, toIndex: number): void {
    const index = this.queue.findIndex((t) => t.id === trackId);
    if (index < 0) throw new AppError('TRACK_NOT_FOUND', 'That track is no longer in the queue');
    const track = this.queue[index]!;
    this.queue.splice(index, 1);
    const target = Math.max(0, Math.min(toIndex, this.queue.length));
    this.queue.splice(target, 0, track);
    this.bump();
  }

  // ---------------------------------------------------------------- playback

  /** Live playback position in ms at the current server time. */
  get position(): number {
    return getPlaybackPosition(this.playback, this.now());
  }

  /** Resume, start the next track, or jump to a specific queued track. */
  play(trackId?: string): void {
    const t = this.now();
    if (trackId) {
      const index = this.queue.findIndex((x) => x.id === trackId);
      if (index < 0) throw new AppError('TRACK_NOT_FOUND', 'That track is no longer in the queue');
      const track = this.queue[index]!;
      this.queue.splice(index, 1);
      this.pushHistory(this.playback.track);
      this.startTrack(track, t);
      return;
    }
    if (this.playback.status === 'paused' && this.playback.track) {
      this.playback = { ...this.playback, status: 'playing', updatedAt: t };
      this.bump();
      return;
    }
    if (this.playback.status === 'idle') {
      this.advance();
    }
  }

  pause(): void {
    if (this.playback.status !== 'playing' || !this.playback.track) return;
    const positionMs = this.position;
    this.playback = {
      status: 'paused',
      track: this.playback.track,
      positionMs,
      updatedAt: this.now(),
    };
    this.bump();
  }

  seek(positionMs: number): void {
    const track = this.playback.track;
    if (!track) return;
    let position = Math.max(0, Math.floor(positionMs));
    if (track.durationMs > 0) position = Math.min(position, track.durationMs);
    this.playback = { ...this.playback, positionMs: position, updatedAt: this.now() };
    this.bump();
  }

  /** Skip the current track. Returns true if another track started. */
  skip(): boolean {
    return this.advance();
  }

  /** Move the current track to history and start the next queued one (or go idle). */
  advance(): boolean {
    this.pushHistory(this.playback.track);
    this.skipVotes.clear();
    const next = this.queue.shift();
    if (next) {
      this.startTrack(next, this.now());
      return true;
    }
    this.playback = { status: 'idle', track: null, positionMs: 0, updatedAt: this.now() };
    this.bump();
    return false;
  }

  /** Handle a client report that `trackId` finished. Ignored when stale. */
  onTrackEnded(trackId: string): boolean {
    if (this.playback.track?.id !== trackId) return false;
    this.advance();
    return true;
  }

  endsAt(): number | null {
    return getTrackEndsAt(this.playback);
  }

  voteSkip(participantId: string): SkipVoteResult {
    if (!this.playback.track) return { votes: 0, needed: 0, skipped: false };
    this.skipVotes.add(participantId);
    const needed = Math.floor(this.connectedCount / 2) + 1;
    let votes = 0;
    for (const id of this.skipVotes) if (this.participants.get(id)?.connected) votes++;
    if (votes >= needed) {
      this.advance();
      return { votes, needed, skipped: true };
    }
    this.bump();
    return { votes, needed, skipped: false };
  }

  private startTrack(track: Track, at: number): void {
    this.playback = { status: 'playing', track, positionMs: 0, updatedAt: at };
    this.skipVotes.clear();
    this.bump();
  }

  private pushHistory(track: Track | null): void {
    if (!track) return;
    this.history.unshift(track);
    if (this.history.length > LIMITS.HISTORY_MAX) this.history.length = LIMITS.HISTORY_MAX;
  }

  // ---------------------------------------------------------------- chat

  addChat(input: Omit<ChatMessage, 'id' | 'sentAt'>): ChatMessage {
    const message: ChatMessage = { ...input, id: newId(), sentAt: this.now() };
    this.chat.push(message);
    if (this.chat.length > LIMITS.CHAT_HISTORY) {
      this.chat.splice(0, this.chat.length - LIMITS.CHAT_HISTORY);
    }
    return message;
  }

  addSystemMessage(text: string): ChatMessage {
    return this.addChat({
      kind: 'system',
      participantId: null,
      name: 'Jamwave',
      color: '#a1a1aa',
      text,
    });
  }

  // ---------------------------------------------------------------- snapshots

  bump(): void {
    this.version++;
  }

  snapshot(): RoomSnapshot {
    const participants: Participant[] = [...this.participants.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map(({ id, name, color, isHost, connected, joinedAt }) => ({
        id,
        name,
        color,
        isHost,
        connected,
        joinedAt,
      }));
    return {
      code: this.code,
      hostId: this.hostId,
      settings: { ...this.settings },
      participants,
      queue: [...this.queue],
      history: [...this.history],
      playback: { ...this.playback },
      skipVotes: [...this.skipVotes],
      version: this.version,
      serverTime: this.now(),
      createdAt: this.createdAt,
    };
  }

  preview(): RoomPreview {
    const host = this.participants.get(this.hostId);
    const track = this.playback.track;
    return {
      code: this.code,
      name: this.settings.name,
      hostName: host?.name ?? 'Someone',
      participantCount: this.connectedCount,
      nowPlaying: track
        ? { title: track.title, artist: track.artist, thumbnailUrl: track.thumbnailUrl }
        : null,
    };
  }
}
