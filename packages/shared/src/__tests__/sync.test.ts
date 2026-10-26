import { describe, expect, it } from 'vitest';
import { ClockSync, driftAction, getPlaybackPosition, getTrackEndsAt } from '../sync';
import type { PlaybackState, Track } from '../types';

const track: Track = {
  id: 't1',
  provider: 'youtube',
  providerId: 'abc',
  title: 'Song',
  artist: 'Artist',
  thumbnailUrl: '',
  durationMs: 200_000,
  addedBy: { id: 'p1', name: 'A' },
  addedAt: 0,
};

describe('getPlaybackPosition', () => {
  it('returns 0 with no track', () => {
    const p: PlaybackState = { status: 'idle', track: null, positionMs: 0, updatedAt: 0 };
    expect(getPlaybackPosition(p, 10_000)).toBe(0);
  });

  it('advances while playing', () => {
    const p: PlaybackState = { status: 'playing', track, positionMs: 5_000, updatedAt: 1_000 };
    expect(getPlaybackPosition(p, 4_000)).toBe(8_000);
  });

  it('is frozen while paused', () => {
    const p: PlaybackState = { status: 'paused', track, positionMs: 5_000, updatedAt: 1_000 };
    expect(getPlaybackPosition(p, 99_000)).toBe(5_000);
  });

  it('clamps to the duration', () => {
    const p: PlaybackState = { status: 'playing', track, positionMs: 0, updatedAt: 0 };
    expect(getPlaybackPosition(p, 999_999)).toBe(200_000);
  });

  it('never goes negative when the server clock looks behind', () => {
    const p: PlaybackState = { status: 'playing', track, positionMs: 0, updatedAt: 5_000 };
    expect(getPlaybackPosition(p, 1_000)).toBe(0);
  });
});

describe('getTrackEndsAt', () => {
  it('computes the end time while playing', () => {
    const p: PlaybackState = { status: 'playing', track, positionMs: 50_000, updatedAt: 10_000 };
    expect(getTrackEndsAt(p)).toBe(160_000);
  });

  it('is null when paused or duration unknown', () => {
    expect(getTrackEndsAt({ status: 'paused', track, positionMs: 0, updatedAt: 0 })).toBeNull();
    const unknown = { ...track, durationMs: 0 };
    expect(
      getTrackEndsAt({ status: 'playing', track: unknown, positionMs: 0, updatedAt: 0 }),
    ).toBeNull();
  });
});

describe('ClockSync', () => {
  it('estimates the offset from a symmetric round trip', () => {
    const clock = new ClockSync();
    // client at 1000 sends, server (1500 ahead) replies at 2550, client receives at 1100
    clock.addSample(1_000, 2_550, 1_100);
    expect(clock.offset).toBe(1_500);
    expect(clock.rtt).toBe(100);
    expect(clock.now(5_000)).toBe(6_500);
  });

  it('ignores a slow outlier sample', () => {
    const clock = new ClockSync(8);
    for (let i = 0; i < 5; i++) clock.addSample(1_000, 2_050, 1_100); // offset 1000, rtt 100
    clock.addSample(1_000, 4_000, 3_000); // rtt 2000, offset 2000
    expect(clock.offset).toBe(1_000);
  });

  it('keeps only the most recent samples', () => {
    const clock = new ClockSync(3);
    clock.addSample(0, 10, 20);
    clock.addSample(0, 10, 20);
    clock.addSample(0, 10, 20);
    clock.addSample(0, 500, 20);
    expect(clock.sampleCount).toBe(3);
  });

  it('reports not ready before any sample', () => {
    const clock = new ClockSync();
    expect(clock.ready).toBe(false);
    expect(clock.offset).toBe(0);
  });
});

describe('driftAction', () => {
  it('seeks only above the threshold', () => {
    expect(driftAction(100)).toBe('none');
    expect(driftAction(-299)).toBe('none');
    expect(driftAction(301)).toBe('seek');
    expect(driftAction(-1_000)).toBe('seek');
  });
});
