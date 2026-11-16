import { LIMITS, type SearchResult } from '@jamwave/shared';
import { describe, expect, it } from 'vitest';
import { AppError } from '../lib/errors';
import { Room } from '../rooms/Room';

function makeRoom() {
  const clock = { t: 1_000_000 };
  const room = new Room('ABC234', { name: 'Test jam' }, () => clock.t);
  return { room, clock };
}

function item(id: string, durationMs = 180_000): SearchResult {
  return {
    provider: 'youtube',
    providerId: id,
    title: `Song ${id}`,
    artist: 'Artist',
    thumbnailUrl: '',
    durationMs,
  };
}

const by = { id: 'p', name: 'P' };

describe('Room participants', () => {
  it('makes the first participant host and assigns distinct colors', () => {
    const { room } = makeRoom();
    const a = room.addParticipant('Ana', 's1');
    const b = room.addParticipant('Ben', 's2');
    expect(room.hostId).toBe(a.id);
    expect(a.isHost).toBe(true);
    expect(b.isHost).toBe(false);
    expect(a.color).not.toBe(b.color);
    expect(room.connectedCount).toBe(2);
    expect(room.emptySince).toBeNull();
  });

  it('hands the host role to the earliest connected participant', () => {
    const { room, clock } = makeRoom();
    const a = room.addParticipant('Ana', 's1');
    clock.t += 10;
    const b = room.addParticipant('Ben', 's2');
    clock.t += 10;
    const c = room.addParticipant('Cy', 's3');
    room.markDisconnected(b.id);
    const result = room.removeParticipant(a.id);
    expect(result.newHostId).toBe(c.id);
    expect(room.getParticipant(c.id)?.isHost).toBe(true);
    expect(room.getParticipant(b.id)?.isHost).toBe(false);
  });

  it('falls back to a disconnected participant when nobody is connected', () => {
    const { room } = makeRoom();
    const a = room.addParticipant('Ana', 's1');
    const b = room.addParticipant('Ben', 's2');
    room.markDisconnected(b.id);
    const result = room.removeParticipant(a.id);
    expect(result.newHostId).toBe(b.id);
    expect(room.isEmpty).toBe(true);
    expect(room.emptySince).not.toBeNull();
  });

  it('reclaims a seat only with the right secret', () => {
    const { room } = makeRoom();
    const a = room.addParticipant('Ana', 's1');
    room.markDisconnected(a.id);
    expect(room.reclaim(a.id, 'wrong', 's2')).toBeNull();
    const back = room.reclaim(a.id, a.secret, 's2', 'Ana 2');
    expect(back?.connected).toBe(true);
    expect(back?.socketId).toBe('s2');
    expect(back?.name).toBe('Ana 2');
    expect(back?.isHost).toBe(true);
  });

  it('respects the everyoneControls setting', () => {
    const { room } = makeRoom();
    const host = room.addParticipant('Host', 's1');
    const guest = room.addParticipant('Guest', 's2');
    expect(room.canControl(guest.id)).toBe(true);
    room.updateSettings({ everyoneControls: false });
    expect(room.canControl(guest.id)).toBe(false);
    expect(room.canControl(host.id)).toBe(true);
  });

  it('lets the host allow or restrict individual people', () => {
    const { room } = makeRoom();
    const host = room.addParticipant('Host', 's1');
    const guest = room.addParticipant('Guest', 's2');
    room.updateSettings({ everyoneControls: false });
    // People who join a restricted jam start as listeners.
    const late = room.addParticipant('Late', 's3');
    expect(room.canControl(late.id)).toBe(false);

    room.setParticipantControl(guest.id, true);
    expect(room.canControl(guest.id)).toBe(true);
    expect(room.canControl(late.id)).toBe(false);
    const view = room.snapshot().participants;
    expect(view.find((p) => p.id === guest.id)?.canControl).toBe(true);
    expect(view.find((p) => p.id === late.id)?.canControl).toBe(false);
    expect(view.find((p) => p.id === host.id)?.canControl).toBe(true);

    room.setParticipantControl(guest.id, false);
    expect(room.canControl(guest.id)).toBe(false);
    // The switch sets everyone at once, and the host can never be restricted.
    room.updateSettings({ everyoneControls: true });
    expect(room.canControl(late.id)).toBe(true);
    expect(() => room.setParticipantControl(host.id, false)).toThrowError(AppError);
    expect(() => room.setParticipantControl('nobody', true)).toThrowError(AppError);
  });

  it('rejects joins once full', () => {
    const { room } = makeRoom();
    for (let i = 0; i < LIMITS.MAX_PARTICIPANTS; i++) room.addParticipant(`P${i}`, `s${i}`);
    expect(() => room.addParticipant('Late', 'sx')).toThrowError(AppError);
  });

  it('transfers host explicitly', () => {
    const { room } = makeRoom();
    room.addParticipant('Ana', 's1');
    const b = room.addParticipant('Ben', 's2');
    room.transferHost(b.id);
    expect(room.hostId).toBe(b.id);
    expect(() => room.transferHost('nobody')).toThrowError(AppError);
  });
});

describe('Room queue and playback', () => {
  it('auto-starts the first track added to an idle room', () => {
    const { room } = makeRoom();
    const { added, autoStarted } = room.addTracks([item('a'), item('b')], by);
    expect(autoStarted).toBe(true);
    expect(room.playback.status).toBe('playing');
    expect(room.playback.track?.id).toBe(added[0]!.id);
    expect(room.queue.map((t) => t.providerId)).toEqual(['b']);
  });

  it('pauses at the live position and resumes from it', () => {
    const { room, clock } = makeRoom();
    room.addTracks([item('a')], by);
    clock.t += 30_000;
    room.pause();
    expect(room.playback.status).toBe('paused');
    expect(room.playback.positionMs).toBe(30_000);
    clock.t += 60_000;
    expect(room.position).toBe(30_000);
    room.play();
    clock.t += 5_000;
    expect(room.position).toBe(35_000);
  });

  it('clamps seeks to the duration', () => {
    const { room } = makeRoom();
    room.addTracks([item('a', 100_000)], by);
    room.seek(250_000);
    expect(room.playback.positionMs).toBe(100_000);
    room.seek(-5);
    expect(room.playback.positionMs).toBe(0);
  });

  it('skips into history and goes idle at the end of the queue', () => {
    const { room } = makeRoom();
    room.addTracks([item('a'), item('b')], by);
    expect(room.skip()).toBe(true);
    expect(room.playback.track?.providerId).toBe('b');
    expect(room.history.map((t) => t.providerId)).toEqual(['a']);
    expect(room.skip()).toBe(false);
    expect(room.playback.status).toBe('idle');
    expect(room.playback.track).toBeNull();
  });

  it('ignores stale track-ended reports', () => {
    const { room } = makeRoom();
    const { added } = room.addTracks([item('a'), item('b')], by);
    expect(room.onTrackEnded('not-current')).toBe(false);
    expect(room.onTrackEnded(added[0]!.id)).toBe(true);
    expect(room.playback.track?.id).toBe(added[1]!.id);
  });

  it('learns an unknown duration from a player, once, for the current track only', () => {
    const { room } = makeRoom();
    const { added } = room.addTracks([item('a', 0), item('b', 0)], by);
    expect(room.playback.track?.durationMs).toBe(0);
    expect(room.setTrackDuration(added[1]!.id, 200_000)).toBe(false); // not current
    expect(room.setTrackDuration(added[0]!.id, 0)).toBe(false); // implausible
    const version = room.version;
    expect(room.setTrackDuration(added[0]!.id, 200_400.6)).toBe(true);
    expect(room.playback.track?.durationMs).toBe(200_401);
    expect(room.version).toBe(version + 1);
    // Known durations are authoritative: a second report changes nothing.
    expect(room.setTrackDuration(added[0]!.id, 10_000)).toBe(false);
    expect(room.playback.track?.durationMs).toBe(200_401);
    expect(room.snapshot().playback.track?.durationMs).toBe(200_401);
  });

  it('jumps to a specific queued track', () => {
    const { room } = makeRoom();
    const { added } = room.addTracks([item('a'), item('b'), item('c')], by);
    room.play(added[2]!.id);
    expect(room.playback.track?.providerId).toBe('c');
    expect(room.queue.map((t) => t.providerId)).toEqual(['b']);
    expect(room.history[0]?.providerId).toBe('a');
  });

  it('reorders and removes queued tracks', () => {
    const { room } = makeRoom();
    const { added } = room.addTracks([item('a'), item('b'), item('c'), item('d')], by);
    room.reorderTrack(added[3]!.id, 0);
    expect(room.queue.map((t) => t.providerId)).toEqual(['d', 'b', 'c']);
    room.removeTrack(added[1]!.id);
    expect(room.queue.map((t) => t.providerId)).toEqual(['d', 'c']);
    expect(() => room.removeTrack('zzz')).toThrowError(AppError);
  });

  it('supports play-next insertion', () => {
    const { room } = makeRoom();
    room.addTracks([item('a'), item('b')], by);
    room.addTracks([item('z')], by, true);
    expect(room.queue.map((t) => t.providerId)).toEqual(['z', 'b']);
  });

  it('refuses to exceed the queue limit', () => {
    const { room } = makeRoom();
    room.addTracks([item('now-playing')], by); // starts playing, queue stays empty
    const many = Array.from({ length: LIMITS.MAX_QUEUE + 5 }, (_, i) => item(`v${i}`));
    const { added } = room.addTracks(many, by); // only what fits is added
    expect(added).toHaveLength(LIMITS.MAX_QUEUE);
    expect(room.queue).toHaveLength(LIMITS.MAX_QUEUE);
    expect(() => room.addTracks([item('x')], by)).toThrowError(AppError);
  });

  it('skips by majority vote of connected participants only', () => {
    const { room } = makeRoom();
    const a = room.addParticipant('A', 's1');
    const b = room.addParticipant('B', 's2');
    const c = room.addParticipant('C', 's3');
    const d = room.addParticipant('D', 's4');
    room.markDisconnected(d.id);
    room.addTracks([item('a'), item('b')], by);
    expect(room.voteSkip(d.id).skipped).toBe(false); // disconnected votes don't count
    expect(room.voteSkip(a.id)).toEqual({ votes: 1, needed: 2, skipped: false });
    expect(room.voteSkip(a.id).votes).toBe(1); // idempotent
    const final = room.voteSkip(b.id);
    expect(final.skipped).toBe(true);
    expect(room.playback.track?.providerId).toBe('b');
    expect(room.skipVotes.size).toBe(0);
    expect(c.id).toBeTruthy();
  });

  it('reports when the current track ends', () => {
    const { room, clock } = makeRoom();
    room.addTracks([item('a', 120_000)], by);
    clock.t += 20_000;
    expect(room.endsAt()).toBe(1_000_000 + 120_000);
    room.pause();
    expect(room.endsAt()).toBeNull();
  });
});

describe('Room chat', () => {
  it('keeps only the most recent messages', () => {
    const { room } = makeRoom();
    for (let i = 0; i < LIMITS.CHAT_HISTORY + 5; i++) room.addSystemMessage(`m${i}`);
    expect(room.chat).toHaveLength(LIMITS.CHAT_HISTORY);
    expect(room.chat[0]?.text).toBe('m5');
  });

  it('produces a public preview', () => {
    const { room } = makeRoom();
    room.addParticipant('Ana', 's1');
    room.addTracks([item('a')], by);
    const preview = room.preview();
    expect(preview).toMatchObject({
      code: 'ABC234',
      name: 'Test jam',
      hostName: 'Ana',
      participantCount: 1,
    });
    expect(preview.nowPlaying?.title).toBe('Song a');
  });
});
