'use client';

import type { SearchResult } from '@jamwave/shared';
import { Copy, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { StartJamDialog } from '@/components/marketing/StartJamDialog';
import { Thumb } from '@/components/room/Thumb';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  addLinkToPlaylistAction,
  copyPlaylistAction,
  deletePlaylistAction,
  removeTrackFromPlaylistAction,
  updatePlaylistAction,
} from '@/lib/actions';
import { PLAYLIST_LIMITS } from '@/lib/social';
import { formatDuration } from '@/lib/utils';

/** "Start a jam" for everyone, "Save a copy" for signed-in visitors who do not own it. */
export function PlaylistActions({
  id,
  name,
  tracks,
  canCopy,
}: {
  id: string;
  name: string;
  tracks: SearchResult[];
  canCopy: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const copy = async () => {
    setBusy(true);
    const result = await copyPlaylistAction(id);
    if (!result.ok) {
      toast.error(result.error);
      setBusy(false);
      return;
    }
    toast.success('Saved to your playlists');
    router.push(`/playlists/${result.data.id}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tracks.length > 0 ? (
        <StartJamDialog seed={tracks} seedName={name} seedKind="playlist">
          <Button>
            <Play className="h-4 w-4" /> Start a jam with this
          </Button>
        </StartJamDialog>
      ) : null}
      {canCopy && tracks.length > 0 ? (
        <Button variant="secondary" onClick={copy} disabled={busy}>
          <Copy className="h-4 w-4" /> Save a copy
        </Button>
      ) : null}
    </div>
  );
}

/** Owner tools: add a song by link, rename, delete. */
export function PlaylistOwnerTools({
  id,
  name,
  description,
}: {
  id: string;
  name: string;
  description: string;
}) {
  const router = useRouter();
  const [link, setLink] = useState('');
  const [adding, setAdding] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftDescription, setDraftDescription] = useState(description);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const addLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!link.trim() || adding) return;
    setAdding(true);
    const result = await addLinkToPlaylistAction(id, link);
    setAdding(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setLink('');
    if (result.data.added === 0) toast.info('That song is already in this playlist');
    else toast.success(`Added: ${result.data.title}`);
    router.refresh();
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = await updatePlaylistAction(id, {
      name: draftName,
      description: draftDescription,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setEditOpen(false);
    router.refresh();
  };

  const remove = async () => {
    setSaving(true);
    const result = await deletePlaylistAction(id);
    if (!result.ok) {
      toast.error(result.error);
      setSaving(false);
      return;
    }
    toast.success('Playlist deleted');
    router.push('/playlists');
  };

  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-3">
      <form onSubmit={addLink} className="flex gap-2">
        <Input
          aria-label="YouTube link"
          placeholder="Paste a YouTube link to add a song…"
          maxLength={500}
          value={link}
          onChange={(e) => setLink(e.target.value)}
          disabled={adding}
        />
        <Button type="submit" className="h-11 px-5" disabled={adding || !link.trim()}>
          {adding ? (
            <Spinner className="border-white/40 border-t-white" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add
        </Button>
      </form>
      <p className="mt-2 px-1 text-xs text-fg-subtle">
        You can also save songs from the search results and the queue while you are in a jam.
      </p>
      <div className="mt-3 flex gap-2">
        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            if (open) {
              setDraftName(name);
              setDraftDescription(description);
            }
            setEditOpen(open);
          }}
        >
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Pencil className="h-4 w-4" /> Edit details
            </Button>
          </DialogTrigger>
          <DialogContent title="Edit playlist">
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="playlist-name" className="text-sm text-fg-muted">
                  Name
                </label>
                <Input
                  id="playlist-name"
                  maxLength={PLAYLIST_LIMITS.NAME_MAX}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="playlist-description" className="text-sm text-fg-muted">
                  Description <span className="text-fg-subtle">(optional)</span>
                </label>
                <Input
                  id="playlist-description"
                  maxLength={PLAYLIST_LIMITS.DESCRIPTION_MAX}
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving || !draftName.trim()}>
                Save
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-red-300 hover:text-red-200">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </DialogTrigger>
          <DialogContent
            title="Delete this playlist?"
            description={`“${name}” and its song list will be gone for good.`}
          >
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setDeleteOpen(false)}
                disabled={saving}
              >
                Keep it
              </Button>
              <Button variant="danger" className="flex-1" onClick={remove} disabled={saving}>
                Delete playlist
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export function PlaylistTracks({
  id,
  tracks,
  editable,
}: {
  id: string;
  tracks: SearchResult[];
  editable: boolean;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);

  const remove = async (track: SearchResult) => {
    setRemoving(track.providerId);
    const result = await removeTrackFromPlaylistAction(id, track.providerId);
    setRemoving(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  };

  if (tracks.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-fg-muted">
        {editable
          ? 'No songs yet. Paste a YouTube link above, or save songs while you are in a jam.'
          : 'This playlist has no songs yet.'}
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-0.5 rounded-2xl border border-border bg-surface/40 p-2">
      {tracks.map((track, index) => (
        <li
          key={track.providerId}
          className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface"
        >
          <span className="w-6 shrink-0 text-right text-xs tabular-nums text-fg-subtle">
            {index + 1}
          </span>
          <Thumb src={track.thumbnailUrl} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{track.title}</div>
            <div className="truncate text-xs text-fg-muted">
              {track.artist || 'YouTube'}
              {track.durationMs > 0 ? ` · ${formatDuration(track.durationMs)}` : ''}
            </div>
          </div>
          {editable ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${track.title}`}
              disabled={removing === track.providerId}
              onClick={() => remove(track)}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
