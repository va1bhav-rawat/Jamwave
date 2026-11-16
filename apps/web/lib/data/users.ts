import type { Document, WithId } from 'mongodb';
import { db } from '../db';
import type { PublicUser } from '../social';
import { normalizeUsername } from '../username';
import { ready, toObjectId } from './common';

function toPublicUser(doc: WithId<Document>): PublicUser {
  return {
    id: doc._id.toString(),
    username: typeof doc.username === 'string' ? doc.username : '',
    image: typeof doc.image === 'string' ? doc.image : null,
  };
}

export async function getUserByUsername(username: string): Promise<PublicUser | null> {
  await ready();
  const doc = await db.collection('user').findOne({ username: normalizeUsername(username) });
  return doc ? toPublicUser(doc) : null;
}

/** Accounts for the given ids, in no particular order. Unknown ids are skipped. */
export async function getUsersByIds(ids: string[]): Promise<Map<string, PublicUser>> {
  await ready();
  const objectIds = ids.map(toObjectId).filter((id) => id !== null);
  const users = new Map<string, PublicUser>();
  if (objectIds.length === 0) return users;
  const docs = await db
    .collection('user')
    .find({ _id: { $in: objectIds } })
    .toArray();
  for (const doc of docs) users.set(doc._id.toString(), toPublicUser(doc));
  return users;
}

/** Accounts whose username starts with `query` (usernames are stored in lower case). */
export async function searchUsers(query: string, limit = 20): Promise<PublicUser[]> {
  await ready();
  const prefix = normalizeUsername(query).replace(/[^a-z0-9_]/g, '');
  if (!prefix) return [];
  // An anchored, escaped-by-construction prefix: it can use the username index.
  const docs = await db
    .collection('user')
    .find({ username: { $regex: `^${prefix}` } })
    .sort({ username: 1 })
    .limit(limit)
    .toArray();
  return docs.map(toPublicUser);
}
