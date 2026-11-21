import { db } from '../db';
import { ready } from './common';

/**
 * Remove everything this app stores about an account. better-auth deletes its own records
 * (`user`, `session`, `account`); this covers the collections the app owns. Safe to run twice.
 *
 * Ids in our collections are strings (`session.user.id`), unlike better-auth's ObjectIds.
 */
export async function deleteUserData(userId: string): Promise<void> {
  await ready();
  await Promise.all([
    db.collection('playlist').deleteMany({ ownerId: userId }),
    db.collection('friendship').deleteMany({
      $or: [{ requesterId: userId }, { recipientId: userId }],
    }),
  ]);
}
