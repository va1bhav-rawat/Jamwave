import type { SearchResult } from '@jamwave/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../lib/errors';
import { RoomManager, type ChangeReason } from '../rooms/RoomManager';

function item(id: string, durationMs = 3_000): SearchResult {
  return {
    provider: 'youtube',
    providerId: id,
    title: id,
    artist: '',
    thumbnailUrl: '',
    durationMs,
  };
}

function build() {
  const changes: ChangeReason[] = [];
  const closed: string[] = [];
  const messages: string[] = [];
  const manager = new RoomManager({
    now: () => Date.now(),
    emptyTtlMs: 10 * 60_000,
    reclaimGraceMs: 60_000,
    onRoomChanged: (_room, reason) => changes.push(reason),
    onRoomClosed: (room, reason) => closed.push(`${room.code}:${reason}`),
    onSystemMessage: (_room, message) => messages.push(message.text),
  });
  return { manager, changes, closed, messages };
}

describe('RoomManager', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 1_700_000_000_000 });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates rooms with unique codes and lets others join', () => {
    const { manager, messages } = build();
    const { room, participant } = manager.createRoom({ hostName: 'Ana', socketId: 's1' });
    expect(room.hostId).toBe(participant.id);
    expect(room.settings.name).toBe("Ana's jam");
    const joined = manager.join({ code: room.code, name: 'Ben', socketId: 's2' });
    expect(joined.reclaimed).toBe(false);
    expect(room.connectedCount).toBe(2);
    expect(messages).toContain('Ben joined the jam');
  });

  it('rejects unknown rooms', () => {
    const { manager } = build();
    expect(() => manager.join({ code: 'ZZZZZZ', name: 'X', socketId: 's' })).toThrowError(AppError);
  });

  it('keeps the seat (and host role) during the reconnect grace period', () => {
    const { manager, changes } = build();
    const { room, participant } = manager.createRoom({ hostName: 'Ana', socketId: 's1' });
    manager.join({ code: room.code, name: 'Ben', socketId: 's2' });
    manager.handleDisconnect(room.code, participant.id);
    expect(room.getParticipant(participant.id)?.connected).toBe(false);
    expect(changes.at(-1)).toBe('disconnect');
    vi.advanceTimersByTime(30_000);
    const back = manager.join({
      code: room.code,
      name: 'Ana',
      socketId: 's3',
      reclaim: { participantId: participant.id, secret: participant.secret },
    });
    expect(back.reclaimed).toBe(true);
    expect(room.hostId).toBe(participant.id);
    vi.advanceTimersByTime(60_000);
    expect(room.participants.has(participant.id)).toBe(true);
  });

  it('removes the participant and hands off host after the grace period', () => {
    const { manager, messages } = build();
    const { room, participant } = manager.createRoom({ hostName: 'Ana', socketId: 's1' });
    const ben = manager.join({ code: room.code, name: 'Ben', socketId: 's2' }).participant;
    manager.handleDisconnect(room.code, participant.id);
    vi.advanceTimersByTime(60_000);
    expect(room.participants.has(participant.id)).toBe(false);
    expect(room.hostId).toBe(ben.id);
    expect(messages).toContain('Ana left the jam');
    expect(messages).toContain('Ben is now the host');
  });

  it('falls back to a fresh join when the reclaim secret is wrong', () => {
    const { manager } = build();
    const { room, participant } = manager.createRoom({ hostName: 'Ana', socketId: 's1' });
    const result = manager.join({
      code: room.code,
      name: 'Imposter',
      socketId: 's9',
      reclaim: { participantId: participant.id, secret: 'nope' },
    });
    expect(result.reclaimed).toBe(false);
    expect(result.participant.id).not.toBe(participant.id);
  });

  it('advances to the next track when the current one ends', () => {
    const { manager, changes } = build();
    const { room, participant } = manager.createRoom({ hostName: 'Ana', socketId: 's1' });
    room.addTracks([item('a', 3_000), item('b', 3_000)], { id: participant.id, name: 'Ana' });
    manager.commit(room, 'queue');
    expect(room.playback.track?.providerId).toBe('a');
    vi.advanceTimersByTime(3_000 + 500);
    expect(room.playback.track?.providerId).toBe('b');
    expect(changes.at(-1)).toBe('track-ended');
    vi.advanceTimersByTime(3_000 + 500);
    expect(room.playback.status).toBe('idle');
  });

  it('schedules the track end once a player reports the duration', () => {
    const { manager, changes } = build();
    const { room, participant } = manager.createRoom({ hostName: 'Ana', socketId: 's1' });
    room.addTracks([item('a', 0), item('b', 0)], { id: participant.id, name: 'Ana' });
    manager.commit(room, 'queue');
    vi.advanceTimersByTime(60_000);
    expect(room.playback.track?.providerId).toBe('a'); // unknown length: nothing scheduled
    expect(room.setTrackDuration(room.playback.track!.id, 5_000)).toBe(true);
    manager.commit(room, 'playback');
    vi.advanceTimersByTime(5_000 - 60_000 + 60_000 + 500);
    expect(room.playback.track?.providerId).toBe('b');
    expect(changes).toContain('track-ended');
  });

  it('does not fire the end timer for a paused track', () => {
    const { manager } = build();
    const { room, participant } = manager.createRoom({ hostName: 'Ana', socketId: 's1' });
    room.addTracks([item('a', 3_000), item('b', 3_000)], { id: participant.id, name: 'Ana' });
    manager.commit(room, 'queue');
    room.pause();
    manager.commit(room, 'playback');
    vi.advanceTimersByTime(10_000);
    expect(room.playback.track?.providerId).toBe('a');
  });

  it('expires empty rooms after the TTL', () => {
    const { manager, closed } = build();
    const { room, participant } = manager.createRoom({ hostName: 'Ana', socketId: 's1' });
    manager.leave(room.code, participant.id);
    expect(room.isEmpty).toBe(true);
    vi.advanceTimersByTime(9 * 60_000);
    expect(manager.sweep()).toBe(0);
    vi.advanceTimersByTime(1 * 60_000);
    expect(manager.sweep()).toBe(1);
    expect(closed).toEqual([`${room.code}:expired`]);
    expect(manager.getRoom(room.code)).toBeUndefined();
  });

  it('counts rooms, joins, tracks and peaks', () => {
    const { manager } = build();
    const a = manager.createRoom({ hostName: 'Ana', socketId: 's1' });
    manager.join({ code: a.room.code, name: 'Ben', socketId: 's2' });
    const ben = a.room.snapshot().participants.find((p) => p.name === 'Ben')!;
    manager.handleDisconnect(a.room.code, ben.id);
    manager.join({
      code: a.room.code,
      name: 'Ben',
      socketId: 's3',
      reclaim: { participantId: ben.id, secret: a.room.getParticipant(ben.id)!.secret },
    });
    manager.createRoom({ hostName: 'Cy', socketId: 's4' });
    manager.recordTracksAdded(3);
    expect(manager.metrics).toEqual({
      roomsCreated: 2,
      joins: 1,
      tracksAdded: 3,
      peakRooms: 2,
      peakConnected: 3,
    });
  });

  it('refuses new rooms beyond the cap', () => {
    const manager = new RoomManager({
      maxRooms: 1,
      onRoomChanged: () => {},
      onRoomClosed: () => {},
      onSystemMessage: () => {},
    });
    manager.createRoom({ hostName: 'Ana', socketId: 's1' });
    expect(() => manager.createRoom({ hostName: 'Ben', socketId: 's2' })).toThrowError(
      expect.objectContaining({ code: 'SERVER_BUSY' }),
    );
  });

  it('reports stats', () => {
    const { manager } = build();
    const { room } = manager.createRoom({ hostName: 'Ana', socketId: 's1' });
    manager.join({ code: room.code, name: 'Ben', socketId: 's2' });
    expect(manager.stats()).toEqual({ rooms: 1, participants: 2, connected: 2 });
    manager.dispose();
  });
});
