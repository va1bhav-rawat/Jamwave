import { youtubeThumbnail } from '@jamwave/shared';
import type { Document, WithId } from 'mongodb';
import { db } from '../db';
import {
  PLAYLIST_LIMITS,
  type Playlist,
  type PlaylistItem,
  type PlaylistSummary,
} from '../social';
import { ready, toObjectId } from './common';
import { getUsersByIds } from './users';
import { assembleTracks, resolveVideos } from './videos';

/** Thrown for problems the person can understand and fix; the message is shown as is. */
export class DataError extends Error {}

/**
 * A playlist stores only video ids. Titles and channel names are looked up (and cached for a
 * limited time) when the playlist is shown; thumbnails are derived from the id.
 */
interface PlaylistDoc {
  ownerId: string;
  name: string;
  description: string;
  tracks: PlaylistItem[];
  createdAt: Date;
  updatedAt: Date;
}

const playlists = () => db.collection<PlaylistDoc>('playlist');

/** Items for the given ids, first occurrence wins, all stamped with the same time. */
function toItems(videoIds: string[], addedAt: Date): PlaylistItem[] {
  const seen = new Set<string>();
  const items: PlaylistItem[] = [];
  for (const providerId of videoIds) {
    if (seen.has(providerId)) continue;
    seen.add(providerId);
    items.push({ providerId, addedAt });
  }
  return items;
}

function toSummary(doc: WithId<Document>): PlaylistSummary {
  const tracks = (doc.tracks ?? []) as PlaylistItem[];
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description ?? '',
    trackCount: tracks.length,
    covers: tracks.slice(0, 4).map((t) => youtubeThumbnail(t.providerId)),
    updatedAt: new Date(doc.updatedAt).getTime(),
  };
}

/** All playlists of one account, most recently changed first. Every playlist is public. */
export async function listPlaylists(ownerId: string): Promise<PlaylistSummary[]> {
  await ready();
  const docs = await playlists()
    .find({ ownerId })
    .sort({ updatedAt: -1 })
    .limit(PLAYLIST_LIMITS.PER_USER)
    .toArray();
  return docs.map(toSummary);
}

/** The playlist with its tracks filled in from the video cache (and YouTube for what is missing). */
export async function getPlaylist(id: string): Promise<Playlist | null> {
  await ready();
  const _id = toObjectId(id);
  if (!_id) return null;
  const doc = await playlists().findOne({ _id });
  if (!doc) return null;
  const owner = (await getUsersByIds([doc.ownerId])).get(doc.ownerId);
  if (!owner) return null;
  const videoIds = doc.tracks.map((t) => t.providerId);
  const resolved = await resolveVideos(videoIds);
  return { ...toSummary(doc), owner, tracks: assembleTracks(videoIds, resolved) };
}

/** Just the ids, for copying a playlist without looking every title up. */
export async function getPlaylistVideoIds(
  id: string,
): Promise<{ name: string; description: string; videoIds: string[] } | null> {
  await ready();
  const _id = toObjectId(id);
  if (!_id) return null;
  const doc = await playlists().findOne({ _id });
  if (!doc) return null;
  return {
    name: doc.name,
    description: doc.description ?? '',
    videoIds: doc.tracks.map((t) => t.providerId),
  };
}

export async function createPlaylist(
  ownerId: string,
  name: string,
  description = '',
  videoIds: string[] = [],
): Promise<string> {
  await ready();
  if ((await playlists().countDocuments({ ownerId })) >= PLAYLIST_LIMITS.PER_USER) {
    throw new DataError(`You can have up to ${PLAYLIST_LIMITS.PER_USER} playlists`);
  }
  const now = new Date();
  const { insertedId } = await playlists().insertOne({
    ownerId,
    name,
    description,
    tracks: toItems(videoIds, now).slice(0, PLAYLIST_LIMITS.TRACKS),
    createdAt: now,
    updatedAt: now,
  });
  return insertedId.toString();
}

/** Owner-only edits match on `ownerId` too, so nobody can change someone else's playlist. */
function owned(id: string, ownerId: string) {
  const _id = toObjectId(id);
  if (!_id) throw new DataError('Playlist not found');
  return { _id, ownerId };
}

export async function updatePlaylist(
  id: string,
  ownerId: string,
  patch: { name?: string; description?: string },
): Promise<void> {
  await ready();
  const result = await playlists().updateOne(owned(id, ownerId), {
    $set: { ...patch, updatedAt: new Date() },
  });
  if (result.matchedCount === 0) throw new DataError('Playlist not found');
}

export async function deletePlaylist(id: string, ownerId: string): Promise<void> {
  await ready();
  const result = await playlists().deleteOne(owned(id, ownerId));
  if (result.deletedCount === 0) throw new DataError('Playlist not found');
}

/**
 * Append videos, skipping ones the playlist already has. Returns how many were added.
 */
export async function addTracks(id: string, ownerId: string, videoIds: string[]): Promise<number> {
  await ready();
  const filter = owned(id, ownerId);
  const doc = await playlists().findOne(filter);
  if (!doc) throw new DataError('Playlist not found');
  const have = new Set(doc.tracks.map((t) => t.providerId));
  const fresh = toItems(videoIds, new Date()).filter((item) => !have.has(item.providerId));
  const room = PLAYLIST_LIMITS.TRACKS - doc.tracks.length;
  if (fresh.length > 0 && room <= 0) {
    throw new DataError(`A playlist holds up to ${PLAYLIST_LIMITS.TRACKS} songs`);
  }
  const toAdd = fresh.slice(0, Math.max(0, room));
  if (toAdd.length === 0) return 0;
  await playlists().updateOne(filter, {
    $push: { tracks: { $each: toAdd } },
    $set: { updatedAt: new Date() },
  });
  return toAdd.length;
}

export async function removeTrack(id: string, ownerId: string, providerId: string): Promise<void> {
  await ready();
  const result = await playlists().updateOne(owned(id, ownerId), {
    $pull: { tracks: { providerId } },
    $set: { updatedAt: new Date() },
  });
  if (result.matchedCount === 0) throw new DataError('Playlist not found');
}
