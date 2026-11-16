import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PlaylistGrid } from '@/components/playlists/PlaylistCard';
import { FriendButton } from '@/components/social/FriendButton';
import { PersonRow } from '@/components/social/PersonRow';
import { UserAvatar } from '@/components/social/UserAvatar';
import { Button } from '@/components/ui/button';
import { getServerSession } from '@/lib/auth';
import { getRelation, listFriends } from '@/lib/data/friends';
import { listPlaylists } from '@/lib/data/playlists';
import { getUserByUsername } from '@/lib/data/users';

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await getUserByUsername(decodeURIComponent((await params).username));
  if (!user) return { title: 'Profile not found' };
  return {
    title: `@${user.username}`,
    description: `@${user.username}'s playlists and friends on Jamwave.`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const user = await getUserByUsername(decodeURIComponent((await params).username));
  if (!user) notFound();
  const session = await getServerSession();
  const meId = session?.user.id ?? null;
  const [relation, playlists, friends] = await Promise.all([
    getRelation(meId, user.id),
    listPlaylists(user.id),
    listFriends(user.id),
  ]);
  const isMe = relation === 'self';

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar username={user.username} image={user.image} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-3xl font-bold tracking-tight">@{user.username}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {playlists.length} playlist{playlists.length === 1 ? '' : 's'} · {friends.length} friend
            {friends.length === 1 ? '' : 's'}
          </p>
        </div>
        {isMe ? (
          <Button asChild variant="secondary" size="sm">
            <Link href="/playlists">Manage playlists</Link>
          </Button>
        ) : (
          <FriendButton
            username={user.username}
            relation={relation}
            signedIn={!!session}
            size="md"
          />
        )}
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Playlists</h2>
        <div className="mt-3">
          {playlists.length === 0 ? (
            <p className="text-sm text-fg-muted">
              {isMe ? 'You have no playlists yet.' : `@${user.username} has no playlists yet.`}
            </p>
          ) : (
            <PlaylistGrid playlists={playlists} />
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Friends</h2>
        {friends.length === 0 ? (
          <p className="mt-3 text-sm text-fg-muted">
            {isMe ? (
              <>
                No friends yet.{' '}
                <Link href="/people" className="text-fg underline">
                  Find people
                </Link>
                .
              </>
            ) : (
              `@${user.username} has no friends on Jamwave yet.`
            )}
          </p>
        ) : (
          <ul className="mt-2 grid gap-0.5 sm:grid-cols-2">
            {friends.map((friend) => (
              <PersonRow key={friend.id} user={friend} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
