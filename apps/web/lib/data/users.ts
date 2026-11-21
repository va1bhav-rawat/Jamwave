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

/**
 * Whether friends may see which jam this account is in. Stored as `showActivity` on the user
 * document; an absent field means visible (the default).
 */
export async function getShowActivity(userId: string): Promise<boolean> {
  await ready();
  const _id = toObjectId(userId);
  if (!_id) return true;
  const doc = await db.collection('user').findOne({ _id }, { projection: { showActivity: 1 } });
  return doc?.showActivity !== false;
}

export async function setShowActivity(userId: string, show: boolean): Promise<void> {
  await ready();
  const _id = toObjectId(userId);
  if (!_id) return;
  await db.collection('user').updateOne({ _id }, { $set: { showActivity: show } });
}

/** The subset of `ids` that chose to hide their activity. */
export async function getActivityHidden(ids: string[]): Promise<Set<string>> {
  await ready();
  const objectIds = ids.map(toObjectId).filter((id) => id !== null);
  if (objectIds.length === 0) return new Set();
  const docs = await db
    .collection('user')
    .find({ _id: { $in: objectIds }, showActivity: false }, { projection: { _id: 1 } })
    .toArray();
  return new Set(docs.map((doc) => doc._id.toString()));
}
