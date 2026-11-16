import { db } from '../db';
import type { PublicUser, Relation } from '../social';
import { ready } from './common';
import { DataError } from './playlists';
import { getUsersByIds } from './users';

interface FriendshipDoc {
  /** Both account ids, sorted and joined: the same for A→B and B→A. */
  pair: string;
  requesterId: string;
  recipientId: string;
  status: 'pending' | 'accepted';
  createdAt: Date;
}

const friendships = () => db.collection<FriendshipDoc>('friendship');

const MAX_FRIENDS = 500;
const MAX_PENDING_SENT = 100;

function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export async function getRelation(meId: string | null, otherId: string): Promise<Relation> {
  if (!meId) return 'none';
  if (meId === otherId) return 'self';
  await ready();
  const doc = await friendships().findOne({ pair: pairKey(meId, otherId) });
  if (!doc) return 'none';
  if (doc.status === 'accepted') return 'friends';
  return doc.requesterId === meId ? 'outgoing' : 'incoming';
}

/**
 * Ask someone to be friends. If they already asked you, this accepts their request instead.
 * Returns the resulting relation.
 */
export async function requestFriend(meId: string, otherId: string): Promise<Relation> {
  if (meId === otherId) throw new DataError('That is you');
  await ready();
  const pair = pairKey(meId, otherId);
  const existing = await friendships().findOne({ pair });
  if (existing) {
    if (existing.status === 'accepted') return 'friends';
    if (existing.requesterId === meId) return 'outgoing';
    await friendships().updateOne({ pair }, { $set: { status: 'accepted' } });
    return 'friends';
  }
  const sent = await friendships().countDocuments({ requesterId: meId, status: 'pending' });
  if (sent >= MAX_PENDING_SENT) {
    throw new DataError('You have a lot of requests waiting. Try again once some are answered.');
  }
  try {
    await friendships().insertOne({
      pair,
      requesterId: meId,
      recipientId: otherId,
      status: 'pending',
      createdAt: new Date(),
    });
  } catch (error) {
    // The other person asked at the same moment: the unique index kept one request.
    if ((error as { code?: number }).code === 11000) return getRelation(meId, otherId);
    throw error;
  }
  return 'outgoing';
}

/** Accept a request that `otherId` sent to `meId`. */
export async function acceptFriend(meId: string, otherId: string): Promise<void> {
  await ready();
  const result = await friendships().updateOne(
    { pair: pairKey(meId, otherId), recipientId: meId, status: 'pending' },
    { $set: { status: 'accepted' } },
  );
  if (result.matchedCount === 0) throw new DataError('That request is no longer there');
}

/** Unfriend, decline an incoming request or cancel an outgoing one. */
export async function removeFriend(meId: string, otherId: string): Promise<void> {
  await ready();
  await friendships().deleteOne({ pair: pairKey(meId, otherId) });
}

async function usersInOrder(ids: string[]): Promise<PublicUser[]> {
  const users = await getUsersByIds(ids);
  return ids.map((id) => users.get(id)).filter((user) => user !== undefined);
}

/** Accepted friends of one account. Friend lists are public. */
export async function listFriends(userId: string): Promise<PublicUser[]> {
  await ready();
  const docs = await friendships()
    .find({ status: 'accepted', $or: [{ requesterId: userId }, { recipientId: userId }] })
    .limit(MAX_FRIENDS)
    .toArray();
  const friends = await usersInOrder(
    docs.map((doc) => (doc.requesterId === userId ? doc.recipientId : doc.requesterId)),
  );
  return friends.sort((a, b) => a.username.localeCompare(b.username));
}

/** People waiting for `userId` to answer, newest first. */
export async function listIncomingRequests(userId: string): Promise<PublicUser[]> {
  await ready();
  const docs = await friendships()
    .find({ recipientId: userId, status: 'pending' })
    .sort({ createdAt: -1 })
    .limit(MAX_PENDING_SENT)
    .toArray();
  return usersInOrder(docs.map((doc) => doc.requesterId));
}

/** People `userId` asked who have not answered yet. */
export async function listOutgoingRequests(userId: string): Promise<PublicUser[]> {
  await ready();
  const docs = await friendships()
    .find({ requesterId: userId, status: 'pending' })
    .sort({ createdAt: -1 })
    .limit(MAX_PENDING_SENT)
    .toArray();
  return usersInOrder(docs.map((doc) => doc.recipientId));
}

/** The relation of `meId` to each of `others`, for lists of people. */
export async function getRelations(
  meId: string | null,
  others: string[],
): Promise<Map<string, Relation>> {
  const relations = new Map<string, Relation>();
  if (!meId || others.length === 0) return relations;
  await ready();
  const docs = await friendships()
    .find({ pair: { $in: others.map((other) => pairKey(meId, other)) } })
    .toArray();
  for (const other of others) relations.set(other, other === meId ? 'self' : 'none');
  for (const doc of docs) {
    const other = doc.requesterId === meId ? doc.recipientId : doc.requesterId;
    relations.set(
      other,
      doc.status === 'accepted' ? 'friends' : doc.requesterId === meId ? 'outgoing' : 'incoming',
    );
  }
  return relations;
}
