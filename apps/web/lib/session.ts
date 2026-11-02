import type { SearchResult } from '@jamwave/shared';

/**
 * Browser persistence helpers. localStorage keeps cross-tab preferences (nickname, volume, video
 * size), the jams this device recently joined and the last queue it listened to; sessionStorage
 * keeps the per-tab seat identity so a refresh reclaims the same participant.
 * Everything is wrapped in try/catch: storage can be blocked or throw in private windows.
 */
const NICKNAME_KEY = 'jamwave:nickname';
const VOLUME_KEY = 'jamwave:volume';
const VIDEO_SIZE_KEY = 'jamwave:videoSize';
const RECENT_JAMS_KEY = 'jamwave:recentJams';
const LAST_QUEUE_KEY = 'jamwave:lastQueue';
const identityKey = (code: string) => `jamwave:identity:${code}`;

/** How many recent jams to offer on the landing page, and for how long. */
export const RECENT_JAMS_MAX = 5;
export const RECENT_JAMS_TTL_MS = 24 * 60 * 60_000;

export interface Identity {
  participantId: string;
  secret: string;
}

export interface RecentJam {
  code: string;
  name: string;
  /** Last time this device was in the jam (ms since epoch). */
  at: number;
}

/** The last queue seen on this device, so an expired jam can be rebuilt in one tap. */
export interface SavedQueue {
  code: string;
  name: string;
  tracks: SearchResult[];
  savedAt: number;
}

/**
 * Parse a JSON value from storage. Results are memoised by raw string so React's
 * useSyncExternalStore sees a stable reference while nothing changed.
 */
function jsonReader<T>(storage: () => Storage, key: string, validate: (raw: unknown) => T | null) {
  let lastRaw: string | null | undefined;
  let lastValue: T | null = null;
  return (): T | null => {
    const raw = read(storage, key);
    if (raw === lastRaw) return lastValue;
    lastRaw = raw;
    try {
      lastValue = raw ? validate(JSON.parse(raw)) : null;
    } catch {
      lastValue = null;
    }
    return lastValue;
  };
}

function isRecentJam(value: unknown): value is RecentJam {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.code === 'string' && typeof v.name === 'string' && typeof v.at === 'number';
}

function isSearchResult(value: unknown): value is SearchResult {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.provider === 'youtube' &&
    typeof v.providerId === 'string' &&
    typeof v.title === 'string' &&
    typeof v.artist === 'string' &&
    typeof v.thumbnailUrl === 'string' &&
    typeof v.durationMs === 'number'
  );
}

function read(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function write(storage: () => Storage, key: string, value: string | null): void {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    // ignore
  }
}

const local = () => window.localStorage;
const perTab = () => window.sessionStorage;

const readRecentJams = jsonReader<RecentJam[]>(local, RECENT_JAMS_KEY, (raw) =>
  Array.isArray(raw) ? raw.filter(isRecentJam) : null,
);

const readLastQueue = jsonReader<SavedQueue>(local, LAST_QUEUE_KEY, (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  if (typeof v.code !== 'string' || typeof v.name !== 'string' || typeof v.savedAt !== 'number') {
    return null;
  }
  if (!Array.isArray(v.tracks)) return null;
  return {
    code: v.code,
    name: v.name,
    savedAt: v.savedAt,
    tracks: v.tracks.filter(isSearchResult),
  };
});

let prunedSource: RecentJam[] | null = null;
let pruned: RecentJam[] = [];

export const session = {
  getNickname(): string | null {
    const value = read(local, NICKNAME_KEY);
    return value && value.trim() ? value : null;
  },
  setNickname(name: string): void {
    write(local, NICKNAME_KEY, name.trim());
  },
  getVolume(): number {
    const value = Number(read(local, VOLUME_KEY));
    return Number.isFinite(value) && read(local, VOLUME_KEY) !== null
      ? Math.min(100, Math.max(0, value))
      : 80;
  },
  setVolume(volume: number): void {
    write(local, VOLUME_KEY, String(Math.round(volume)));
  },
  getVideoSize(): 'auto' | 'small' {
    return read(local, VIDEO_SIZE_KEY) === 'small' ? 'small' : 'auto';
  },
  setVideoSize(size: 'auto' | 'small'): void {
    write(local, VIDEO_SIZE_KEY, size);
  },
  /** Jams this device was in during the last day, most recent first (reference-stable). */
  getRecentJams(now: number = Date.now()): RecentJam[] {
    const all = readRecentJams() ?? [];
    if (all !== prunedSource) {
      prunedSource = all;
      const fresh = all.filter((jam) => now - jam.at < RECENT_JAMS_TTL_MS);
      pruned = fresh.length === all.length ? all : fresh;
    }
    return pruned;
  },
  rememberJam(code: string, name: string): void {
    const rest = this.getRecentJams().filter((jam) => jam.code !== code);
    const next = [{ code, name, at: Date.now() }, ...rest].slice(0, RECENT_JAMS_MAX);
    write(local, RECENT_JAMS_KEY, JSON.stringify(next));
  },
  forgetJam(code: string): void {
    const rest = this.getRecentJams().filter((jam) => jam.code !== code);
    write(local, RECENT_JAMS_KEY, rest.length > 0 ? JSON.stringify(rest) : null);
  },
  getLastQueue(): SavedQueue | null {
    return readLastQueue();
  },
  saveLastQueue(saved: Omit<SavedQueue, 'savedAt'>): void {
    write(local, LAST_QUEUE_KEY, JSON.stringify({ ...saved, savedAt: Date.now() }));
  },
  getIdentity(code: string): Identity | null {
    const raw = read(perTab, identityKey(code));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<Identity>;
      if (typeof parsed.participantId === 'string' && typeof parsed.secret === 'string') {
        return { participantId: parsed.participantId, secret: parsed.secret };
      }
    } catch {
      // fallthrough
    }
    return null;
  },
  setIdentity(code: string, identity: Identity): void {
    write(perTab, identityKey(code), JSON.stringify(identity));
  },
  clearIdentity(code: string): void {
    write(perTab, identityKey(code), null);
  },
};
