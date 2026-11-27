'use server';

import { searchResultSchema, type SearchResult } from '@jamwave/shared';
import { after } from 'next/server';
import { z } from 'zod';
import { getServerSession } from './auth';
import * as friends from './data/friends';
import * as playlists from './data/playlists';
import { DataError } from './data/playlists';
import { getUserByUsername, searchUsers, setShowActivity } from './data/users';
import { getRelations } from './data/friends';
import { resolveVideos, warmVideos } from './data/videos';
import {
  PEOPLE_SEARCH_MIN,
  PLAYLIST_LIMITS,
  type ActionResult,
  type PlaylistSummary,
  type PublicUser,
  type Relation,
} from './social';
import { parseYouTubeVideoId } from './youtube';

/**
 * Server actions for playlists and friends. Each one checks the session itself (an action is a
 * public endpoint), validates its input and answers with an ActionResult instead of throwing,
 * because thrown messages are hidden from the browser in production.
 */

const nameSchema = z.string().trim().min(1, 'Give it a name').max(PLAYLIST_LIMITS.NAME_MAX);
const descriptionSchema = z.string().trim().max(PLAYLIST_LIMITS.DESCRIPTION_MAX);
const idSchema = z.string().regex(/^[0-9a-f]{24}$/i, 'Playlist not found');
const tracksSchema = z.array(searchResultSchema).min(1).max(PLAYLIST_LIMITS.ADD_BATCH);
const usernameSchema = z.string().trim().min(1).max(40);

/**
 * Only the video ids of what the browser sent are stored. Titles come from our own lookups, which
 * run after the response so saving stays quick and nobody can plant a title in the shared cache.
 */
function videoIdsOf(tracks: SearchResult[]): string[] {
  const ids = tracks.map((track) => track.providerId);
  if (ids.length > 0) after(() => warmVideos(ids));
  return ids;
}

class NotSignedIn extends Error {}

async function requireUserId(): Promise<string> {
  const session = await getServerSession();
  if (!session) throw new NotSignedIn();
  return session.user.id;
}

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof NotSignedIn) return { ok: false, error: 'Sign in to do that' };
    if (error instanceof DataError) return { ok: false, error: error.message };
    if (error instanceof z.ZodError) {
      return { ok: false, error: error.issues[0]?.message ?? 'That does not look right' };
    }
    console.error('Action failed', error);
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}

// ---------------------------------------------------------------- playlists

export async function createPlaylistAction(input: {
  name: string;
  description?: string;
  tracks?: SearchResult[];
}): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const userId = await requireUserId();
    const name = nameSchema.parse(input.name);
    const description = descriptionSchema.parse(input.description ?? '');
    const tracks = input.tracks?.length ? tracksSchema.parse(input.tracks) : [];
    return { id: await playlists.createPlaylist(userId, name, description, videoIdsOf(tracks)) };
  });
}

export async function updatePlaylistAction(
  id: string,
  patch: { name?: string; description?: string },
): Promise<ActionResult> {
  return run(async () => {
    const userId = await requireUserId();
    const clean: { name?: string; description?: string } = {};
    if (patch.name !== undefined) clean.name = nameSchema.parse(patch.name);
    if (patch.description !== undefined) {
      clean.description = descriptionSchema.parse(patch.description);
    }
    await playlists.updatePlaylist(idSchema.parse(id), userId, clean);
    return null;
  });
}

export async function deletePlaylistAction(id: string): Promise<ActionResult> {
  return run(async () => {
    const userId = await requireUserId();
    await playlists.deletePlaylist(idSchema.parse(id), userId);
    return null;
  });
}

export async function addTracksToPlaylistAction(
  id: string,
  tracks: SearchResult[],
): Promise<ActionResult<{ added: number }>> {
  return run(async () => {
    const userId = await requireUserId();
    const added = await playlists.addTracks(
      idSchema.parse(id),
      userId,
      videoIdsOf(tracksSchema.parse(tracks)),
    );
    return { added };
  });
}

/** Add one song to a playlist from a pasted YouTube link. */
export async function addLinkToPlaylistAction(
  id: string,
  link: string,
): Promise<ActionResult<{ added: number; title: string }>> {
  return run(async () => {
    const userId = await requireUserId();
    const videoId = parseYouTubeVideoId(z.string().max(500).parse(link));
    if (!videoId) throw new DataError('Paste a link to a YouTube video');
    // Looking it up both checks the video exists and fills the title cache.
    const track = (await resolveVideos([videoId])).get(videoId);
    if (!track) throw new DataError('That video could not be found, or it cannot be embedded');
    const added = await playlists.addTracks(idSchema.parse(id), userId, [videoId]);
    return { added, title: track.title };
  });
}

export async function removeTrackFromPlaylistAction(
  id: string,
  providerId: string,
): Promise<ActionResult> {
  return run(async () => {
    const userId = await requireUserId();
    await playlists.removeTrack(
      idSchema.parse(id),
      userId,
      z.string().min(1).max(64).parse(providerId),
    );
    return null;
  });
}

/** Copy anyone's (public) playlist into the signed-in account. */
export async function copyPlaylistAction(id: string): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const userId = await requireUserId();
    const source = await playlists.getPlaylistVideoIds(idSchema.parse(id));
    if (!source) throw new DataError('Playlist not found');
    const copyId = await playlists.createPlaylist(
      userId,
      source.name,
      source.description,
      source.videoIds,
    );
    return { id: copyId };
  });
}

/** The signed-in person's playlists, for pickers inside a jam. */
export async function myPlaylistsAction(): Promise<ActionResult<PlaylistSummary[]>> {
  return run(async () => playlists.listPlaylists(await requireUserId()));
}

/** The songs of one playlist (any playlist: they are all public). */
export async function playlistTracksAction(id: string): Promise<ActionResult<SearchResult[]>> {
  return run(async () => {
    const playlist = await playlists.getPlaylist(idSchema.parse(id));
    if (!playlist) throw new DataError('Playlist not found');
    return playlist.tracks;
  });
}

// ---------------------------------------------------------------- friends

async function requireOther(username: string): Promise<{ meId: string; other: PublicUser }> {
  const meId = await requireUserId();
  const other = await getUserByUsername(usernameSchema.parse(username));
  if (!other) throw new DataError('That account does not exist');
  return { meId, other };
}

export async function requestFriendAction(username: string): Promise<ActionResult<Relation>> {
  return run(async () => {
    const { meId, other } = await requireOther(username);
    return friends.requestFriend(meId, other.id);
  });
}

export async function acceptFriendAction(username: string): Promise<ActionResult<Relation>> {
  return run(async () => {
    const { meId, other } = await requireOther(username);
    await friends.acceptFriend(meId, other.id);
    return 'friends' as const;
  });
}

/** Unfriend, decline or cancel, depending on the current relation. */
export async function removeFriendAction(username: string): Promise<ActionResult<Relation>> {
  return run(async () => {
    const { meId, other } = await requireOther(username);
    await friends.removeFriend(meId, other.id);
    return 'none' as const;
  });
}

export interface PersonResult extends PublicUser {
  relation: Relation;
}

/** Find accounts by the start of their username. Works signed out (relation is then 'none'). */
export async function searchPeopleAction(query: string): Promise<ActionResult<PersonResult[]>> {
  return run(async () => {
    const q = z.string().trim().max(40).parse(query);
    if (q.length < PEOPLE_SEARCH_MIN) return [];
    const session = await getServerSession();
    const meId = session?.user.id ?? null;
    const users = await searchUsers(q);
    const relations = await getRelations(
      meId,
      users.map((user) => user.id),
    );
    return users.map((user) => ({
      ...user,
      relation: user.id === meId ? 'self' : (relations.get(user.id) ?? 'none'),
    }));
  });
}

// ---------------------------------------------------------------- activity

/** Let friends see (or stop seeing) which jam the signed-in person is in. */
export async function setShowActivityAction(show: boolean): Promise<ActionResult> {
  return run(async () => {
    await setShowActivity(await requireUserId(), z.boolean().parse(show));
    return null;
  });
}
