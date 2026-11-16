import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CreatePlaylistForm } from '@/components/playlists/CreatePlaylistForm';
import { PlaylistGrid } from '@/components/playlists/PlaylistCard';
import { getServerSession } from '@/lib/auth';
import { listPlaylists } from '@/lib/data/playlists';

export const metadata: Metadata = { title: 'Your playlists', robots: { index: false } };

export default async function MyPlaylistsPage() {
  const session = await getServerSession();
  if (!session) redirect('/login?next=/playlists');
  const playlists = await listPlaylists(session.user.id);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Your playlists</h1>
      <p className="mt-2 text-fg-muted">
        Playlists are public: anyone can open them from{' '}
        <Link href={`/u/${session.user.username}`} className="text-fg underline">
          your profile
        </Link>
        . Use them in any jam from the “My playlists” button.
      </p>
      <div className="mt-6">
        <CreatePlaylistForm />
      </div>
      <div className="mt-8">
        {playlists.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-fg-muted">
            No playlists yet. Name one above to get started.
          </p>
        ) : (
          <PlaylistGrid playlists={playlists} />
        )}
      </div>
    </>
  );
}
