/**
 * Browser persistence helpers. localStorage keeps cross-tab preferences (nickname, volume, video size);
 * sessionStorage keeps the per-tab seat identity so a refresh reclaims the same participant.
 * Everything is wrapped in try/catch: storage can be blocked or throw in private windows.
 */
const NICKNAME_KEY = 'jamwave:nickname';
const VOLUME_KEY = 'jamwave:volume';
const VIDEO_SIZE_KEY = 'jamwave:videoSize';
const identityKey = (code: string) => `jamwave:identity:${code}`;

export interface Identity {
  participantId: string;
  secret: string;
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
