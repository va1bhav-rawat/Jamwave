import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoRefresh } from '@/components/social/AutoRefresh';
import { FriendButton } from '@/components/social/FriendButton';
import { JammingNow, type Jamming } from '@/components/social/JammingNow';
import { PeopleSearch } from '@/components/social/PeopleSearch';
import { PersonRow } from '@/components/social/PersonRow';
import { getServerSession } from '@/lib/auth';
import { listFriends, listIncomingRequests, listOutgoingRequests } from '@/lib/data/friends';
import { getActivityHidden } from '@/lib/data/users';
import { fetchPresence } from '@/lib/presence';
import type { PublicUser, Relation } from '@/lib/social';

export const metadata: Metadata = {
  title: 'People',
  description: 'Find people on Jamwave, add friends and browse their playlists.',
  robots: { index: false },
};

function PeopleList({
  title,
  people,
  relation,
  empty,
}: {
  title: string;
  people: PublicUser[];
  relation: Relation;
  empty?: string;
}) {
  if (people.length === 0 && !empty) return null;
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">
        {title} <span className="text-fg-muted">· {people.length}</span>
      </h2>
      {people.length === 0 ? (
        <p className="mt-2 text-sm text-fg-muted">{empty}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-0.5">
          {people.map((person) => (
            <PersonRow key={person.id} user={person}>
              <FriendButton username={person.username} relation={relation} signedIn />
            </PersonRow>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Friends who are in a jam right now and have not hidden their activity. */
async function whoIsJamming(friends: PublicUser[]): Promise<Jamming[]> {
  if (friends.length === 0) return [];
  const hidden = await getActivityHidden(friends.map((friend) => friend.id));
  const visible = friends.filter((friend) => !hidden.has(friend.id));
  const presence = await fetchPresence(visible.map((friend) => friend.id));
  return visible.flatMap((friend) => {
    const where = presence[friend.id];
    return where ? [{ user: friend, presence: where }] : [];
  });
}

export default async function PeoplePage() {
  const session = await getServerSession();
  const me = session?.user.id;
  const [incoming, friends, outgoing] = me
    ? await Promise.all([listIncomingRequests(me), listFriends(me), listOutgoingRequests(me)])
    : [[], [], []];
  const jamming = me ? await whoIsJamming(friends) : [];

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">People</h1>
      <p className="mt-2 text-fg-muted">
        Find someone by username, add them as a friend and open their profile to see their
        playlists. When a friend is in a jam, you can join them from here.
      </p>
      <div className="mt-6">
        <PeopleSearch signedIn={!!session} />
      </div>
      {session ? (
        <>
          {friends.length > 0 ? <AutoRefresh /> : null}
          <JammingNow people={jamming} />
          <PeopleList title="Friend requests" people={incoming} relation="incoming" />
          <PeopleList
            title="Your friends"
            people={friends}
            relation="friends"
            empty="No friends yet. Search for a username above to add your first."
          />
          <PeopleList title="Requests you sent" people={outgoing} relation="outgoing" />
        </>
      ) : (
        <p className="mt-8 rounded-2xl border border-border bg-surface/40 p-4 text-sm text-fg-muted">
          <Link href="/login?next=/people" className="font-medium text-fg underline">
            Sign in
          </Link>{' '}
          to add friends, see your requests and join friends who are jamming.
        </p>
      )}
    </>
  );
}
