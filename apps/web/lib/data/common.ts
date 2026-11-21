import { ObjectId } from 'mongodb';
import { connectDb, db } from '../db';
import { VIDEO_CACHE_DAYS } from '../social';

const globalForIndexes = globalThis as unknown as { __jamwaveSocialIndexes?: Promise<void> };

async function createIndexes(): Promise<void> {
  await Promise.all([
    db.collection('playlist').createIndex({ ownerId: 1, updatedAt: -1 }),
    // One document per pair of people, whichever of them asked first.
    db.collection('friendship').createIndex({ pair: 1 }, { unique: true }),
    db.collection('friendship').createIndex({ recipientId: 1, status: 1 }),
    db.collection('friendship').createIndex({ requesterId: 1, status: 1 }),
    // Cached video titles expire on their own: YouTube API data may be kept for 30 days at most.
    db
      .collection('video')
      .createIndex({ fetchedAt: 1 }, { expireAfterSeconds: VIDEO_CACHE_DAYS * 24 * 60 * 60 }),
  ]);
}

/**
 * One-off: playlists used to store every track's title, channel and thumbnail. They now keep only
 * the video id and when it was added, so old documents are trimmed the first time the app runs.
 * Cheap when there is nothing left to do (the filter matches no documents).
 */
async function trimLegacyPlaylistTracks(): Promise<void> {
  await db.collection('playlist').updateMany({ 'tracks.title': { $exists: true } }, [
    {
      $set: {
        tracks: {
          $map: {
            input: '$tracks',
            as: 't',
            in: { providerId: '$$t.providerId', addedAt: { $ifNull: ['$$t.addedAt', '$$NOW'] } },
          },
        },
      },
    },
  ]);
}

async function prepare(): Promise<void> {
  await createIndexes();
  await trimLegacyPlaylistTracks();
}

/** Connect and make sure this app's own indexes exist. Call before touching `db`. */
export async function ready(): Promise<void> {
  await connectDb();
  globalForIndexes.__jamwaveSocialIndexes ??= prepare().catch((error: unknown) => {
    globalForIndexes.__jamwaveSocialIndexes = undefined;
    throw error;
  });
  await globalForIndexes.__jamwaveSocialIndexes;
}

/** A MongoDB id from a string that came from a URL or a form, or null when it is not one. */
export function toObjectId(value: string): ObjectId | null {
  return /^[0-9a-f]{24}$/i.test(value) ? new ObjectId(value) : null;
}
