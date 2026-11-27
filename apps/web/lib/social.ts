import type { SearchResult } from '@jamwave/shared';

/** Types and limits for accounts' public data: profiles, playlists and friends. */

export const PLAYLIST_LIMITS = {
  NAME_MAX: 60,
  DESCRIPTION_MAX: 200,
  PER_USER: 100,
  TRACKS: 500,
  /** Tracks accepted in one "add" request. */
  ADD_BATCH: 200,
} as const;

/**
 * How long a video's title may stay cached. YouTube API data must not be kept longer than 30 days;
 * video ids themselves may be kept indefinitely, so playlists store only those.
 */
export const VIDEO_CACHE_DAYS = 30;

export const PEOPLE_SEARCH_MIN = 2;

/** One song in a stored playlist: the video id and when it was added. Nothing else is kept. */
export interface PlaylistItem {
  providerId: string;
  addedAt: Date;
}

/** What anyone may see about an account. Never includes the email address. */
export interface PublicUser {
  id: string;
  username: string;
  image: string | null;
}

export interface PlaylistSummary {
  id: string;
  name: string;
  description: string;
  trackCount: number;
  /** Thumbnails of the first few tracks, for the cover. */
  covers: string[];
  updatedAt: number;
}

export interface Playlist extends PlaylistSummary {
  owner: PublicUser;
  tracks: SearchResult[];
}

/** How the signed-in person relates to another account. */
export type Relation = 'self' | 'none' | 'outgoing' | 'incoming' | 'friends';

/** Result of a server action: a value, or a message fit for showing to the person. */
export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };
