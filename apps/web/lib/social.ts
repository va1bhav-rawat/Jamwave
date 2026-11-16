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

export const PEOPLE_SEARCH_MIN = 2;

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
