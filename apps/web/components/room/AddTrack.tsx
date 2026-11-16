'use client';

import { LIMITS, type SearchResult } from '@jamwave/shared';
import { BookmarkPlus, Check, ListMusic, ListPlus, Plus, Search, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PlaylistPicker, SaveToPlaylistDialog } from '@/components/playlists/RoomPlaylists';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage, jam } from '@/lib/jamClient';
import { selectCanControl, useRoomStore } from '@/lib/store';
import { formatDuration, looksLikeUrl } from '@/lib/utils';
import { Thumb } from './Thumb';

/**
 * One-tap starters for an empty jam. Searches are cached server-wide for a day, so after the
 * first person taps a pick it costs no YouTube quota for anyone else.
 */
const QUICK_PICKS = [
  'lofi hip hop beats to study',
  'Bollywood hits',
  'top hits 2026',
  '2000s throwback',
  'acoustic chill',
  'workout mix',
];

export function AddTrack() {
  const canControl = useRoomStore(selectCanControl);
  const roomIsSilent = useRoomStore(
    (s) => !s.snapshot?.playback.track && (s.snapshot?.queue.length ?? 0) === 0,
  );
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(() => new Set());

  const find = async (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    if (!looksLikeUrl(q) && q.length < LIMITS.SEARCH_MIN) {
      setNotice(`Type at least ${LIMITS.SEARCH_MIN} characters, or paste a YouTube link.`);
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const response = looksLikeUrl(q) ? await jam.resolve(q) : await jam.search(q);
      setResults(response.results);
      setAdded(new Set());
      if (response.results.length === 0) {
        setNotice('No playable results. Try different words or paste a YouTube link.');
      }
    } catch (error) {
      setResults([]);
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    void find(query);
  };

  const pick = (q: string) => {
    setQuery(q);
    void find(q);
  };

  const add = async (item: SearchResult, playNext = false) => {
    try {
      await jam.addTracks([item], playNext);
      setAdded((prev) => new Set(prev).add(item.providerId));
      toast.success(playNext ? `Playing next: ${item.title}` : `Added: ${item.title}`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const addAll = async () => {
    try {
      const { added: count } = await jam.addTracks(results.slice(0, LIMITS.QUEUE_ADD_BATCH_MAX));
      setAdded(new Set(results.map((r) => r.providerId)));
      toast.success(`Added ${count} tracks`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-surface/40 p-3">
      <form onSubmit={submit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            aria-label="Search YouTube or paste a link"
            placeholder="Search YouTube or paste a link…"
            className="pl-10"
            value={query}
            maxLength={500}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
          />
        </div>
        <Button type="submit" className="h-11 px-5" disabled={busy || !query.trim()}>
          {busy ? <Spinner className="border-white/40 border-t-white" /> : 'Find'}
        </Button>
      </form>
      <div className="mt-2 flex">
        <PlaylistPicker>
          <Button variant="ghost" size="sm" disabled={!canControl}>
            <ListMusic className="h-4 w-4" /> My playlists
          </Button>
        </PlaylistPicker>
      </div>
      {notice ? <p className="mt-2 px-1 text-sm text-fg-muted">{notice}</p> : null}
      {!canControl ? (
        <p className="mt-2 px-1 text-sm text-fg-muted">
          You are listening. The host decides who can add songs and control the music.
        </p>
      ) : null}

      {roomIsSilent && results.length === 0 && !busy ? (
        <div className="mt-3 px-1">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-fg-subtle">
            <Sparkles className="h-3.5 w-3.5" /> Quick start
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_PICKS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => pick(q)}
                className="rounded-full border border-border bg-bg-elevated px-3 py-1.5 text-sm text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="mt-3 animate-fade-in">
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
              {results.length} result{results.length === 1 ? '' : 's'}
            </span>
            <div className="flex gap-1">
              {results.length > 1 ? (
                <Button variant="ghost" size="sm" onClick={addAll} disabled={!canControl}>
                  <ListPlus className="h-4 w-4" /> Add all
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Clear results"
                onClick={() => setResults([])}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <ul className="scroll-thin flex max-h-80 flex-col gap-0.5 overflow-y-auto">
            {results.map((item) => {
              const done = added.has(item.providerId);
              return (
                <li
                  key={item.providerId}
                  className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface"
                >
                  <Thumb src={item.thumbnailUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{item.title}</div>
                    <div className="truncate text-xs text-fg-muted">
                      {item.artist || 'YouTube'} · {formatDuration(item.durationMs)}
                    </div>
                  </div>
                  {canControl ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hidden sm:inline-flex"
                      onClick={() => add(item, true)}
                    >
                      Next
                    </Button>
                  ) : null}
                  <SaveToPlaylistDialog tracks={() => [item]}>
                    <Button variant="ghost" size="icon" aria-label="Save to a playlist">
                      <BookmarkPlus className="h-4 w-4" />
                    </Button>
                  </SaveToPlaylistDialog>
                  <Button
                    variant={done ? 'secondary' : 'primary'}
                    size="icon"
                    aria-label={done ? 'Added' : 'Add to queue'}
                    onClick={() => add(item)}
                    disabled={!canControl}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
