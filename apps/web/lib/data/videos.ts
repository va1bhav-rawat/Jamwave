import { youtubeThumbnail, type SearchResult } from '@jamwave/shared';
import type { AnyBulkWriteOperation } from 'mongodb';
import { db } from '../db';
import { VIDEO_CACHE_DAYS } from '../social';
import { lookUpYouTubeVideo } from '../youtube';
import { ready } from './common';

/**
 * Cached public details of a video, keyed by video id. Rows are written only from our own oEmbed
 * lookups (never from what a browser sent us, so nobody can plant a title that others then see)
 * and MongoDB deletes them `VIDEO_CACHE_DAYS` after `fetchedAt` through a TTL index.
 */
export interface VideoDoc {
  _id: string;
  title: string;
  artist: string;
  durationMs: number;
  fetchedAt: Date;
}

export const VIDEO_CACHE_TTL_SECONDS = VIDEO_CACHE_DAYS * 24 * 60 * 60;

/** Lookups a single page view may trigger; the rest show as "YouTube video" until the next view. */
const MAX_LOOKUPS_PER_REQUEST = 64;
const LOOKUP_CONCURRENCY = 8;

const videos = () => db.collection<VideoDoc>('video');

/** A track for the UI from a video id and what the cache knows about it (maybe nothing). */
export function toSearchResult(
  videoId: string,
  doc: Pick<VideoDoc, 'title' | 'artist' | 'durationMs'> | null,
): SearchResult {
  return {
    provider: 'youtube',
    providerId: videoId,
    title: doc?.title || 'YouTube video',
    artist: doc?.artist ?? '',
    thumbnailUrl: youtubeThumbnail(videoId),
    durationMs: doc?.durationMs ?? 0,
  };
}

/** Tracks in playlist order; ids the cache could not resolve become placeholders. */
export function assembleTracks(
  videoIds: string[],
  resolved: Map<string, SearchResult>,
): SearchResult[] {
  return videoIds.map((id) => resolved.get(id) ?? toSearchResult(id, null));
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

export async function getCachedVideos(videoIds: string[]): Promise<Map<string, VideoDoc>> {
  await ready();
  const found = new Map<string, VideoDoc>();
  if (videoIds.length === 0) return found;
  const docs = await videos()
    .find({ _id: { $in: videoIds } })
    .toArray();
  for (const doc of docs) found.set(doc._id, doc);
  return found;
}

/**
 * Titles for the given videos: from the cache where possible, otherwise looked up at YouTube
 * (at most `maxLookups` per call) and cached. Ids that could not be resolved are left out.
 */
export async function resolveVideos(
  videoIds: string[],
  { maxLookups = MAX_LOOKUPS_PER_REQUEST } = {},
): Promise<Map<string, SearchResult>> {
  const unique = [...new Set(videoIds)];
  const cached = await getCachedVideos(unique);
  const resolved = new Map<string, SearchResult>();
  for (const [id, doc] of cached) resolved.set(id, toSearchResult(id, doc));

  const misses = unique.filter((id) => !cached.has(id)).slice(0, maxLookups);
  if (misses.length === 0) return resolved;

  const fetchedAt = new Date();
  const looked = await mapPool(misses, LOOKUP_CONCURRENCY, (id) =>
    lookUpYouTubeVideo(id).catch(() => null),
  );
  const writes: AnyBulkWriteOperation<VideoDoc>[] = [];
  looked.forEach((track, index) => {
    if (!track) return;
    const id = misses[index]!;
    resolved.set(id, track);
    writes.push({
      updateOne: {
        filter: { _id: id },
        update: {
          $set: {
            title: track.title,
            artist: track.artist,
            durationMs: track.durationMs,
            fetchedAt,
          },
        },
        upsert: true,
      },
    });
  });
  if (writes.length > 0) await videos().bulkWrite(writes, { ordered: false });
  return resolved;
}

/** Fill the cache for ids we just stored, so the first view of the playlist is fast. */
export async function warmVideos(videoIds: string[]): Promise<void> {
  try {
    await resolveVideos(videoIds, { maxLookups: videoIds.length });
  } catch (error) {
    console.error('Could not warm the video cache', error);
  }
}
