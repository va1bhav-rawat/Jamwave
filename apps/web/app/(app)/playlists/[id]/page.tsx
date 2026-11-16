import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  PlaylistActions,
  PlaylistOwnerTools,
  PlaylistTracks,
} from '@/components/playlists/PlaylistView';
import { UserAvatar } from '@/components/social/UserAvatar';
import { getServerSession } from '@/lib/auth';
import { getPlaylist } from '@/lib/data/playlists';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const playlist = await getPlaylist((await params).id);
  if (!playlist) return { title: 'Playlist not found' };
  return {
    title: `${playlist.name} by @${playlist.owner.username}`,
    description:
      playlist.description ||
      `A playlist of ${playlist.trackCount} songs by @${playlist.owner.username} on Jamwave.`,
  };
}

export default async function PlaylistPage({ params }: Props) {
  const [playlist, session] = await Promise.all([
    getPlaylist((await params).id),
    getServerSession(),
  ]);
  if (!playlist) notFound();
  const isOwner = session?.user.id === playlist.owner.id;

  return (
    <>
      <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Playlist</p>
      <h1 className="mt-1 break-words text-3xl font-bold tracking-tight">{playlist.name}</h1>
      {playlist.description ? (
        <p className="mt-2 break-words text-fg-muted">{playlist.description}</p>
      ) : null}
      <div className="mt-3 flex items-center gap-2 text-sm text-fg-muted">
        <Link
          href={`/u/${playlist.owner.username}`}
          className="flex items-center gap-2 font-medium text-fg hover:underline"
        >
          <UserAvatar
            username={playlist.owner.username}
            image={playlist.owner.image}
            className="h-6 w-6 text-xs"
          />
          @{playlist.owner.username}
        </Link>
        <span>
          · {playlist.trackCount} song{playlist.trackCount === 1 ? '' : 's'}
        </span>
      </div>
      <div className="mt-5">
        <PlaylistActions
          id={playlist.id}
          name={playlist.name}
          tracks={playlist.tracks}
          canCopy={!!session && !isOwner}
        />
      </div>
      {isOwner ? (
        <div className="mt-6">
          <PlaylistOwnerTools
            id={playlist.id}
            name={playlist.name}
            description={playlist.description}
          />
        </div>
      ) : null}
      <div className="mt-6">
        <PlaylistTracks id={playlist.id} tracks={playlist.tracks} editable={isOwner} />
      </div>
    </>
  );
}
