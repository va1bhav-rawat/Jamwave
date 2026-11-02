import { describe, expect, it } from 'vitest';
import {
  ClockSync,
  SyncCorrector,
  driftAction,
  getPlaybackPosition,
  getTrackEndsAt,
} from '../sync';
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

describe('SyncCorrector', () => {
  const expected = 60_000;
  const input = (
    driftMs: number,
    bufferedEndMs: number | null,
    nowMs = 0,
  ): Parameters<SyncCorrector['decide']>[0] => ({
    nowMs,
    driftMs,
    currentMs: expected + driftMs,
    expectedMs: expected,
    bufferedEndMs,
  });

  it('leaves drift within the threshold alone', () => {
    const c = new SyncCorrector();
    expect(c.decide(input(-250, 70_000))).toEqual({ action: 'none' });
    expect(c.decide(input(250, 70_000))).toEqual({ action: 'none' });
  });

  it('seeks forward when the target is buffered, without a strike', () => {
    const c = new SyncCorrector();
    expect(c.decide(input(-500, 70_000))).toEqual({
      action: 'seek',
      targetMs: 60_150,
      reason: 'buffered',
    });
    expect(c.strikes).toBe(0);
    expect(c.thresholdMs).toBe(300);
  });

  it('waits instead of seeking into unbuffered video', () => {
    const c = new SyncCorrector();
    expect(c.decide(input(-500, 60_200))).toEqual({ action: 'wait', reason: 'unbuffered' });
    expect(c.strikes).toBe(0);
  });

  it('accepts one rebuffer when far behind and unbuffered', () => {
    const c = new SyncCorrector();
    expect(c.decide(input(-4_000, 56_500))).toMatchObject({ action: 'seek', reason: 'behind-max' });
    expect(c.strikes).toBe(1);
    expect(c.thresholdMs).toBe(600);
  });

  it('seeks back within the back-buffer', () => {
    const c = new SyncCorrector();
    expect(c.decide(input(600, 70_000))).toEqual({
      action: 'seek',
      targetMs: 60_150,
      reason: 'buffered',
    });
    expect(c.strikes).toBe(0);
  });

  it('seeks optimistically when the buffer is unknown, with a strike', () => {
    const c = new SyncCorrector();
    expect(c.decide(input(-500, null))).toMatchObject({ action: 'seek', reason: 'unknown-buffer' });
    expect(c.strikes).toBe(1);
  });

  it('waits during the cooldown unless the drift is extreme', () => {
    const c = new SyncCorrector();
    c.strike(0);
    expect(c.decide(input(-800, 70_000, 1_000))).toEqual({ action: 'wait', reason: 'cooldown' });
    expect(c.decide(input(-6_000, 70_000, 1_000))).toMatchObject({ action: 'seek', reason: 'far' });
    expect(c.strikes).toBe(2);
  });

  it('widens the threshold and cooldown per strike, up to the caps', () => {
    const c = new SyncCorrector();
    c.strike(0);
    expect(c.thresholdMs).toBe(600);
    expect(c.decide(input(-700, 70_000, 4_999))).toEqual({ action: 'wait', reason: 'cooldown' });
    expect(c.decide(input(-700, 70_000, 5_000))).toMatchObject({ action: 'seek' });
    c.strike(5_000);
    expect(c.thresholdMs).toBe(1_200);
    expect(c.decide(input(-1_300, 70_000, 14_999))).toEqual({ action: 'wait', reason: 'cooldown' });
    c.strike(15_000);
    expect(c.thresholdMs).toBe(2_400);
    expect(c.decide(input(-2_500, 70_000, 34_999))).toEqual({ action: 'wait', reason: 'cooldown' });
    c.strike(35_000);
    expect(c.strikes).toBe(3);
    expect(c.thresholdMs).toBe(2_400);
  });

  it('drops one strike after a quiet minute', () => {
    const c = new SyncCorrector();
    c.strike(0);
    c.strike(0);
    expect(c.decide(input(-100, 70_000, 61_000))).toEqual({ action: 'none' });
    expect(c.strikes).toBe(1);
    expect(c.thresholdMs).toBe(600);
  });

  it('learns the seek cost and aims further ahead', () => {
    const c = new SyncCorrector();
    expect(c.lookaheadMs).toBe(150);
    c.recordSeekCost(100, 0);
    expect(c.lookaheadMs).toBe(150);
    expect(c.strikes).toBe(0);
    c.recordSeekCost(650, 0);
    expect(c.lookaheadMs).toBe(400);
    expect(c.strikes).toBe(1);
    expect(c.decide(input(-800, 70_000, 5_000))).toEqual({
      action: 'seek',
      targetMs: 60_400,
      reason: 'buffered',
    });
  });

  it('keeps the learned seek cost across tracks', () => {
    const c = new SyncCorrector();
    c.recordSeekCost(650, 0);
    c.reset();
    expect(c.strikes).toBe(0);
    expect(c.lookaheadMs).toBe(400);
  });

  it('resets for a new track', () => {
    const c = new SyncCorrector();
    c.strike(0);
    c.strike(0);
    c.reset();
    expect(c.strikes).toBe(0);
    expect(c.thresholdMs).toBe(300);
    expect(c.decide(input(-500, 70_000, 1))).toMatchObject({ action: 'seek', reason: 'buffered' });
  });
});
