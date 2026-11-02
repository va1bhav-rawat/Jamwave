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

export interface CorrectionInput {
  nowMs: number;
  /** Player position minus room position; negative means the player is behind. */
  driftMs: number;
  currentMs: number;
  expectedMs: number;
  /** End of the player's buffered range (ms into the track), or null when unknown. */
  bufferedEndMs: number | null;
}

export type Correction =
  | { action: 'none' }
  | { action: 'wait'; reason: 'cooldown' | 'unbuffered' }
  | {
      action: 'seek';
      targetMs: number;
      reason: 'buffered' | 'behind-max' | 'far' | 'unknown-buffer';
    };

/**
 * Decides when a drifting player should be seeked.
 *
 * Seeking into video that has not been downloaded forces a rebuffer, which puts the player
 * behind again, so on a struggling connection a fixed threshold turns into a stutter loop.
 * This policy seeks forward only into buffered video, tolerates more drift after each
 * "strike" (a stall or a rebuffering seek), spaces seeks out with a growing cooldown, and
 * tightens back after a quiet minute. On a healthy connection it behaves like the plain
 * 300 ms threshold.
 */
export class SyncCorrector {
  private strikeCount = 0;
  private lastStrikeAt = 0;
  private nextSeekAt = 0;
  private lookahead: number = TIMING.SEEK_LOOKAHEAD_MS;

  /** Recent trouble level, 0..SYNC_MAX_STRIKES. */
  get strikes(): number {
    return this.strikeCount;
  }

  /**
   * How far past the room position a seek aims, so the player lands on target after the
   * time the seek itself takes. Learned from measured seek costs on this device.
   */
  get lookaheadMs(): number {
    return this.lookahead;
  }

  /**
   * Record how long a seek took until playback resumed. Updates the lookahead, and an
   * expensive seek (a visible pause) counts as a strike so corrections become rarer.
   */
  recordSeekCost(costMs: number, nowMs: number): void {
    const cost = Math.max(0, Math.min(costMs, TIMING.SYNC_MAX_LOOKAHEAD_MS));
    this.lookahead = Math.max(TIMING.SEEK_LOOKAHEAD_MS, Math.round((this.lookahead + cost) / 2));
    if (costMs > TIMING.SYNC_SEEK_COST_STRIKE_MS) this.strike(nowMs);
  }

  /** Drift tolerated before any correction is considered. */
  get thresholdMs(): number {
    return Math.min(
      TIMING.HARD_SEEK_THRESHOLD_MS * 2 ** this.strikeCount,
      TIMING.SYNC_MAX_THRESHOLD_MS,
    );
  }

  /** Record a stall or a rebuffering seek: widen the tolerance and start a cooldown. */
  strike(nowMs: number): void {
    this.strikeCount = Math.min(this.strikeCount + 1, TIMING.SYNC_MAX_STRIKES);
    this.lastStrikeAt = nowMs;
    const cooldown = Math.min(
      TIMING.SYNC_COOLDOWN_MS * 2 ** (this.strikeCount - 1),
      TIMING.SYNC_MAX_COOLDOWN_MS,
    );
    this.nextSeekAt = nowMs + cooldown;
  }

  reset(): void {
    this.strikeCount = 0;
    this.lastStrikeAt = 0;
    this.nextSeekAt = 0;
  }

  decide(input: CorrectionInput): Correction {
    const { nowMs, driftMs, currentMs, expectedMs, bufferedEndMs } = input;
    this.decay(nowMs);
    const magnitude = Math.abs(driftMs);
    if (magnitude <= this.thresholdMs) return { action: 'none' };
    const targetMs = expectedMs + this.lookahead;
    if (magnitude >= TIMING.SYNC_MAX_DRIFT_MS) {
      this.strike(nowMs);
      return { action: 'seek', targetMs, reason: 'far' };
    }
    if (nowMs < this.nextSeekAt) return { action: 'wait', reason: 'cooldown' };
    if (targetMs <= currentMs) {
      // Backward: recently played video is normally still in the buffer.
      if (currentMs - targetMs <= TIMING.SYNC_BACK_BUFFER_MS) {
        this.nextSeekAt = nowMs + TIMING.SYNC_BUFFERED_COOLDOWN_MS;
        return { action: 'seek', targetMs, reason: 'buffered' };
      }
      this.strike(nowMs);
      return { action: 'seek', targetMs, reason: 'far' };
    }
    if (bufferedEndMs === null) {
      this.strike(nowMs);
      return { action: 'seek', targetMs, reason: 'unknown-buffer' };
    }
    if (targetMs + TIMING.SYNC_BUFFER_MARGIN_MS <= bufferedEndMs) {
      this.nextSeekAt = nowMs + TIMING.SYNC_BUFFERED_COOLDOWN_MS;
      return { action: 'seek', targetMs, reason: 'buffered' };
    }
    if (magnitude >= TIMING.SYNC_UNBUFFERED_SEEK_MS) {
      this.strike(nowMs);
      return { action: 'seek', targetMs, reason: 'behind-max' };
    }
    // Keep playing a little behind; the buffer grows meanwhile and the seek becomes free.
    return { action: 'wait', reason: 'unbuffered' };
  }

  private decay(nowMs: number): void {
    if (this.strikeCount > 0 && nowMs - this.lastStrikeAt >= TIMING.SYNC_DECAY_MS) {
      this.strikeCount -= 1;
      this.lastStrikeAt = nowMs;
    }
  }
}
