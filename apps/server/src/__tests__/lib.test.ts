import { describe, expect, it } from 'vitest';
import { LruCache } from '../lib/lru';
import { SlidingWindowLimiter } from '../lib/rateLimit';

describe('LruCache', () => {
  it('evicts the least recently used entry and expires by ttl', () => {
    const clock = { t: 0 };
    const cache = new LruCache<string, number>(2, 100, () => clock.t);
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.get('a')).toBe(1); // a is now most recent
    cache.set('c', 3); // evicts b
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    clock.t = 150;
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(1);
  });
});

describe('SlidingWindowLimiter', () => {
  it('limits hits per window and recovers', () => {
    const clock = { t: 1_000 };
    const limiter = new SlidingWindowLimiter(2, 1_000, () => clock.t);
    expect(limiter.tryAcquire('k').ok).toBe(true);
    expect(limiter.tryAcquire('k').ok).toBe(true);
    const blocked = limiter.tryAcquire('k');
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBe(1_000);
    clock.t += 1_001;
    expect(limiter.tryAcquire('k').ok).toBe(true);
    limiter.prune();
    expect(limiter.size).toBe(1);
  });
});
