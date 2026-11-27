'use client';

import { LIMITS, type SearchResult } from '@jamwave/shared';
import { BookmarkPlus, ListMusic, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  addTracksToPlaylistAction,
  createPlaylistAction,
  myPlaylistsAction,
  playlistTracksAction,
} from '@/lib/actions';
import { track } from '@/lib/analytics';
import { authClient } from '@/lib/auth-client';
import { errorMessage, seedQueue } from '@/lib/jamClient';
import { PLAYLIST_LIMITS, type PlaylistSummary } from '@/lib/social';
import { useRoomStore } from '@/lib/store';

type Loaded = { state: 'loading' } | { state: 'error'; message: string } | PlaylistSummary[];

/** Loads the signed-in person's playlists each time a dialog opens. */
function useMyPlaylists() {
  const [playlists, setPlaylists] = useState<Loaded>({ state: 'loading' });
  const load = () => {
    setPlaylists({ state: 'loading' });
    myPlaylistsAction()
      .then((result) =>
        setPlaylists(result.ok ? result.data : { state: 'error', message: result.error }),
      )
      .catch(() => setPlaylists({ state: 'error', message: 'Could not load your playlists' }));
  };
  return { playlists, load };
}

function SignInPrompt({ what }: { what: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted">
        {what} A free account keeps your playlists; your seat in this jam is kept while you sign in
        in another tab.
      </p>
      <Button asChild className="w-full">
        <Link href="/login" target="_blank">
          Sign in
        </Link>
      </Button>
    </div>
  );
}

function ListState({ playlists }: { playlists: Loaded }) {
  if (Array.isArray(playlists)) return null;
  if (playlists.state === 'loading') {
    return (
      <p className="flex items-center gap-2 py-4 text-sm text-fg-muted">
        <Spinner /> Loading your playlists…
      </p>
    );
  }
  return <p className="py-4 text-sm text-red-300">{playlists.message}</p>;
}

/** Dialog inside a jam: put one of your playlists into the shared queue. */
export function PlaylistPicker({ children }: { children: ReactNode }) {
  const { data: account, isPending } = authClient.useSession();
  const { playlists, load } = useMyPlaylists();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const addToQueue = async (playlist: PlaylistSummary) => {
    setBusyId(playlist.id);
    try {
      const result = await playlistTracksAction(playlist.id);
      if (!result.ok) throw new Error(result.error);
      const snapshot = useRoomStore.getState().snapshot;
      const free = LIMITS.MAX_QUEUE - (snapshot?.queue.length ?? 0);
      if (free <= 0) throw new Error(`The queue is full (${LIMITS.MAX_QUEUE} songs max)`);
      const added = await seedQueue(result.data.slice(0, free));
      track('track_added', { via: 'playlist', count: added, play_next: false });
      const skipped = result.data.length - added;
      toast.success(
        `Added ${added} song${added === 1 ? '' : 's'} from ${playlist.name}` +
          (skipped > 0 ? ` (${skipped} did not fit in the queue)` : ''),
      );
      setOpen(false);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not add the playlist'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next && account) load();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent title="Your playlists" description="Add a whole playlist to this jam's queue.">
        {isPending ? null : !account ? (
          <SignInPrompt what="Sign in to use your playlists here." />
        ) : (
          <>
            <ListState playlists={playlists} />
            {Array.isArray(playlists) && playlists.length === 0 ? (
              <p className="py-4 text-sm text-fg-muted">
                You have no playlists yet. Save songs from the search results or the queue, or{' '}
                <Link href="/playlists" target="_blank" className="text-fg underline">
                  create one
                </Link>
                .
              </p>
            ) : null}
            {Array.isArray(playlists) && playlists.length > 0 ? (
              <ul className="scroll-thin -mx-2 flex max-h-80 flex-col gap-0.5 overflow-y-auto">
                {playlists.map((playlist) => (
                  <li
                    key={playlist.id}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface"
                  >
                    <ListMusic className="h-4 w-4 shrink-0 text-fg-subtle" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{playlist.name}</div>
                      <div className="text-xs text-fg-muted">
                        {playlist.trackCount} song{playlist.trackCount === 1 ? '' : 's'}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={busyId !== null || playlist.trackCount === 0}
                      onClick={() => addToQueue(playlist)}
                    >
                      {busyId === playlist.id ? (
                        <Spinner className="border-white/40 border-t-white" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Add
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Dialog: save the given songs into one of your playlists, or a new one. */
export function SaveToPlaylistDialog({
  tracks,
  suggestedName = '',
  children,
}: {
  /** Read when the dialog opens, so it can reflect a live queue. */
  tracks: () => SearchResult[];
  suggestedName?: string;
  children: ReactNode;
}) {
  const { data: account, isPending } = authClient.useSession();
  const { playlists, load } = useMyPlaylists();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SearchResult[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const finish = (added: number, playlistName: string) => {
    toast.success(
      added === 0
        ? `Already in ${playlistName}`
        : `Saved ${added} song${added === 1 ? '' : 's'} to ${playlistName}`,
    );
    setOpen(false);
  };

  const saveTo = async (playlist: PlaylistSummary) => {
    setBusy(true);
    const result = await addTracksToPlaylistAction(playlist.id, items);
    setBusy(false);
    if (!result.ok) toast.error(result.error);
    else {
      track('playlist_saved', { tracks: result.data.added });
      finish(result.data.added, playlist.name);
    }
  };

  const createNew = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    const result = await createPlaylistAction({ name, tracks: items });
    setBusy(false);
    if (!result.ok) toast.error(result.error);
    else {
      track('playlist_created', { from: 'jam', tracks: items.length });
      finish(items.length, name.trim());
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setItems(tracks().slice(0, PLAYLIST_LIMITS.ADD_BATCH));
          setName(suggestedName.slice(0, PLAYLIST_LIMITS.NAME_MAX));
          if (account) load();
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        title="Save to a playlist"
        description={
          items.length === 1
            ? items[0]!.title
            : `${items.length} song${items.length === 1 ? '' : 's'}`
        }
      >
        {isPending ? null : !account ? (
          <SignInPrompt what="Sign in to save songs to a playlist." />
        ) : items.length === 0 ? (
          <p className="text-sm text-fg-muted">There are no songs to save yet.</p>
        ) : (
          <>
            <form onSubmit={createNew} className="flex gap-2">
              <Input
                aria-label="New playlist name"
                placeholder="New playlist name"
                maxLength={PLAYLIST_LIMITS.NAME_MAX}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
              />
              <Button
                type="submit"
                variant="secondary"
                className="h-11"
                disabled={busy || !name.trim()}
              >
                <BookmarkPlus className="h-4 w-4" /> Create
              </Button>
            </form>
            <ListState playlists={playlists} />
            {Array.isArray(playlists) && playlists.length > 0 ? (
              <>
                <p className="mb-1 mt-4 text-xs font-medium uppercase tracking-wider text-fg-subtle">
                  Or add to
                </p>
                <ul className="scroll-thin -mx-2 flex max-h-64 flex-col gap-0.5 overflow-y-auto">
                  {playlists.map((playlist) => (
                    <li key={playlist.id}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => saveTo(playlist)}
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface disabled:opacity-50"
                      >
                        <ListMusic className="h-4 w-4 shrink-0 text-fg-subtle" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {playlist.name}
                        </span>
                        <span className="text-xs text-fg-muted">{playlist.trackCount}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
