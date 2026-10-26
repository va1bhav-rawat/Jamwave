import { TIMING } from './constants';
import type { PlaybackState } from './types';

/**
 * Live playback position (ms) at a given server time.
 * Pure so both server and client compute the same number.
 */
export function getPlaybackPosition(playback: PlaybackState, serverNow: number): number {
  if (!playback.track) return 0;
  let position = playback.positionMs;
  if (playback.status === 'playing') {
    position += Math.max(0, serverNow - playback.updatedAt);
  }
  if (playback.track.durationMs > 0) {
    position = Math.min(position, playback.track.durationMs);
  }
  return Math.max(0, position);
}

/** Server time at which the current track ends, or null if unknown / not playing. */
export function getTrackEndsAt(playback: PlaybackState): number | null {
  if (playback.status !== 'playing' || !playback.track || playback.track.durationMs <= 0) {
    return null;
  }
  return playback.updatedAt + (playback.track.durationMs - playback.positionMs);
}

export interface ClockSample {
  /** serverTime - localTime */
  offset: number;
  rtt: number;
}

/**
 * NTP-style clock offset estimator.
 * t0 = client send, t1 = server receive/reply, t2 = client receive (all ms).
 * Keeps the most recent samples and reports the median offset of the
 * lowest-latency half, which is robust to the occasional slow round-trip.
 */
export class ClockSync {
  private samples: ClockSample[] = [];

  constructor(private readonly maxSamples: number = TIMING.CLOCK_SAMPLES) {}

  addSample(t0: number, t1: number, t2: number): ClockSample {
    const rtt = Math.max(0, t2 - t0);
    const offset = t1 - (t0 + t2) / 2;
    const sample = { offset, rtt };
    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) this.samples.shift();
    return sample;
  }

  get ready(): boolean {
    return this.samples.length > 0;
  }

  get sampleCount(): number {
    return this.samples.length;
  }

  /** Estimated serverTime - localTime in ms (0 until the first sample). */
  get offset(): number {
    if (this.samples.length === 0) return 0;
    const byRtt = [...this.samples].sort((a, b) => a.rtt - b.rtt);
    const keep = byRtt.slice(0, Math.max(1, Math.ceil(byRtt.length / 2)));
    const offsets = keep.map((s) => s.offset).sort((a, b) => a - b);
    const mid = Math.floor(offsets.length / 2);
    if (offsets.length % 2 === 1) return offsets[mid]!;
    return (offsets[mid - 1]! + offsets[mid]!) / 2;
  }

  /** Best observed round-trip time in ms. */
  get rtt(): number {
    if (this.samples.length === 0) return 0;
    return Math.min(...this.samples.map((s) => s.rtt));
  }

  /** Current estimated server time. */
  now(localNow: number = Date.now()): number {
    return localNow + this.offset;
  }

  reset(): void {
    this.samples = [];
  }
}

export type DriftAction = 'none' | 'seek';

/** Decide what the player should do about an observed drift (actual - expected, ms). */
export function driftAction(
  driftMs: number,
  threshold: number = TIMING.HARD_SEEK_THRESHOLD_MS,
): DriftAction {
  return Math.abs(driftMs) > threshold ? 'seek' : 'none';
}
