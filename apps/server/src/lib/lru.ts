interface Entry<V> {
  value: V;
  expiresAt: number;
}

/** Small LRU cache with per-entry TTL. Insertion order of the Map is the recency order. */
export class LruCache<K, V> {
  private readonly map = new Map<K, Entry<V>>();

  constructor(
    private readonly max: number,
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.map.delete(key);
      return undefined;
    }
    // Refresh recency.
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    this.map.delete(key);
    this.map.set(key, { value, expiresAt: this.now() + this.ttlMs });
    if (this.map.size > this.max) {
      const oldest = this.map.keys().next();
      if (!oldest.done) this.map.delete(oldest.value);
    }
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}
