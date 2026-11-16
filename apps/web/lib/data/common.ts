import { ObjectId } from 'mongodb';
import { connectDb, db } from '../db';

const globalForIndexes = globalThis as unknown as { __jamwaveSocialIndexes?: Promise<void> };

async function createIndexes(): Promise<void> {
  await Promise.all([
    db.collection('playlist').createIndex({ ownerId: 1, updatedAt: -1 }),
    // One document per pair of people, whichever of them asked first.
    db.collection('friendship').createIndex({ pair: 1 }, { unique: true }),
    db.collection('friendship').createIndex({ recipientId: 1, status: 1 }),
    db.collection('friendship').createIndex({ requesterId: 1, status: 1 }),
  ]);
}

/** Connect and make sure this app's own indexes exist. Call before touching `db`. */
export async function ready(): Promise<void> {
  await connectDb();
  globalForIndexes.__jamwaveSocialIndexes ??= createIndexes().catch((error: unknown) => {
    globalForIndexes.__jamwaveSocialIndexes = undefined;
    throw error;
  });
  await globalForIndexes.__jamwaveSocialIndexes;
}

/** A MongoDB id from a string that came from a URL or a form, or null when it is not one. */
export function toObjectId(value: string): ObjectId | null {
  return /^[0-9a-f]{24}$/i.test(value) ? new ObjectId(value) : null;
}
