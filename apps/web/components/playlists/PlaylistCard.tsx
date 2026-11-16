import { ListMusic } from 'lucide-react';
import Link from 'next/link';
import type { PlaylistSummary } from '@/lib/social';

/** Cover made of the first track thumbnails. */
export function PlaylistCover({ covers }: { covers: string[] }) {
  if (covers.length === 0) {
    return (
      <span className="flex aspect-video w-full items-center justify-center rounded-lg bg-surface text-fg-subtle">
        <ListMusic className="h-6 w-6" />
      </span>
    );
  }
  const shown = covers.length >= 4 ? covers.slice(0, 4) : covers.slice(0, 1);
  return (
    <span
      className={
        shown.length === 4
          ? 'grid aspect-video w-full grid-cols-2 overflow-hidden rounded-lg bg-surface'
          : 'block aspect-video w-full overflow-hidden rounded-lg bg-surface'
      }
    >
      {shown.map((src, index) => (
        <img key={index} src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ))}
    </span>
  );
}

export function PlaylistCard({ playlist }: { playlist: PlaylistSummary }) {
  return (
    <li>
      <Link
        href={`/playlists/${playlist.id}`}
        className="block rounded-2xl border border-border bg-surface/40 p-3 transition-colors hover:border-border-strong hover:bg-surface/70"
      >
        <PlaylistCover covers={playlist.covers} />
        <span className="mt-3 block truncate font-medium">{playlist.name}</span>
        <span className="block text-sm text-fg-muted">
          {playlist.trackCount} song{playlist.trackCount === 1 ? '' : 's'}
        </span>
      </Link>
    </li>
  );
}

export function PlaylistGrid({ playlists }: { playlists: PlaylistSummary[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {playlists.map((playlist) => (
        <PlaylistCard key={playlist.id} playlist={playlist} />
      ))}
    </ul>
  );
}
