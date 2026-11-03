import { describe, expect, it } from 'vitest';
import { resolveClientIp } from '../handlers/context';
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

  it('forgets a key on demand', () => {
    const limiter = new SlidingWindowLimiter(1, 1_000, () => 5);
    expect(limiter.tryAcquire('k').ok).toBe(true);
    expect(limiter.tryAcquire('k').ok).toBe(false);
    limiter.forget('k');
    expect(limiter.tryAcquire('k').ok).toBe(true);
  });
});

describe('resolveClientIp', () => {
  it('reads the proxy-written entry from the end, never the client-written start', () => {
    expect(resolveClientIp('spoofed, 203.0.113.9', '10.0.0.1', 1)).toBe('203.0.113.9');
    expect(resolveClientIp('spoofed, 203.0.113.9, 198.51.100.1', '10.0.0.1', 2)).toBe(
      '203.0.113.9',
    );
    expect(resolveClientIp(['spoofed, 203.0.113.9', '198.51.100.1'], '10.0.0.1', 1)).toBe(
      '198.51.100.1',
    );
    expect(resolveClientIp(' 203.0.113.9 ', '10.0.0.1', 1)).toBe('203.0.113.9');
  });

  it('falls back to the socket address when the header cannot be trusted', () => {
    expect(resolveClientIp('spoofed, 203.0.113.9', '10.0.0.1', 0)).toBe('10.0.0.1');
    expect(resolveClientIp(undefined, '10.0.0.1', 1)).toBe('10.0.0.1');
    expect(resolveClientIp('203.0.113.9', '10.0.0.1', 2)).toBe('10.0.0.1');
    expect(resolveClientIp(undefined, undefined, 1)).toBe('unknown');
  });
});
