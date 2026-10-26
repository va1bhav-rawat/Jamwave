export interface AcquireResult {
  ok: boolean;
  /** Milliseconds until the next slot frees up (0 when ok). */
  retryAfterMs: number;
}

/** Sliding-window limiter: at most `limit` hits per `windowMs` for each key. */
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  tryAcquire(key: string): AcquireResult {
    const t = this.now();
    const cutoff = t - this.windowMs;
    const list = (this.hits.get(key) ?? []).filter((ts) => ts > cutoff);
    if (list.length >= this.limit) {
      const oldest = list[0] ?? t;
      this.hits.set(key, list);
      return { ok: false, retryAfterMs: Math.max(0, oldest + this.windowMs - t) };
    }
    list.push(t);
    this.hits.set(key, list);
    return { ok: true, retryAfterMs: 0 };
  }

  /** Drop keys with no hits inside the window. Call occasionally to bound memory. */
  prune(): void {
    const cutoff = this.now() - this.windowMs;
    for (const [key, list] of this.hits) {
      const alive = list.filter((ts) => ts > cutoff);
      if (alive.length === 0) this.hits.delete(key);
      else this.hits.set(key, alive);
    }
  }

  get size(): number {
    return this.hits.size;
  }
}
