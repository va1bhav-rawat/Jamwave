'use client';

import { Play, Search } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';
import { errorMessage, jam } from '@/lib/jamClient';
import { selectCanControl, useRoomStore } from '@/lib/store';
import { useSyncedPlayer } from '@/lib/useSyncedPlayer';
import { cn } from '@/lib/utils';
import { Avatar } from './Avatar';
import { Equalizer } from './Equalizer';

export function Stage() {
  const playback = useRoomStore((s) => s.snapshot?.playback ?? null);
  const needsGesture = useRoomStore((s) => s.sync.needsGesture);
  const volume = useRoomStore((s) => s.volume);
  const addedBy = useRoomStore((s) => {
    const id = s.snapshot?.playback.track?.addedBy.id;
    return s.snapshot?.participants.find((p) => p.id === id) ?? null;
  });
  const hostRef = useRef<HTMLDivElement>(null);
  const { resume } = useSyncedPlayer(hostRef, playback, {
    volume,
    onEnded: jam.reportEnded,
    onError: jam.reportError,
    // A click on YouTube's own play/pause acts like our button: it pauses/plays for everyone.
    onUserToggle: (action) => {
      if (!selectCanControl(useRoomStore.getState())) {
        toast(
          action === 'pause'
            ? 'Only the host can pause this jam'
            : 'Only the host can resume this jam',
        );
        return false;
      }
      (action === 'pause' ? jam.pause() : jam.play()).catch((error) =>
        toast.error(errorMessage(error)),
      );
      return true;
    },
  });
  const track = playback?.track ?? null;
  const playing = playback?.status === 'playing';

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-black">
      {needsGesture && track ? (
        <button
          type="button"
          onClick={resume}
          className="gradient-bg flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white"
        >
          <Play className="h-4 w-4 fill-current" /> Tap to listen along
        </button>
      ) : null}

      {/* The YouTube player. Kept visible and ≥200px tall while a track is loaded (YouTube API terms). */}
      <div className={cn('relative w-full bg-black', track ? 'aspect-video min-h-[200px]' : 'h-0')}>
        <div
          ref={hostRef}
          className="absolute inset-0 [&>div]:h-full [&>div]:w-full [&>iframe]:h-full [&>iframe]:w-full"
        />
      </div>

      {!track ? (
        <div className="flex aspect-video min-h-[200px] flex-col items-center justify-center gap-3 bg-gradient-to-br from-accent/15 via-bg to-accent-2/10 px-6 text-center">
          <span className="gradient-bg flex h-14 w-14 items-center justify-center rounded-full text-white">
            <Search className="h-6 w-6" />
          </span>
          <h2 className="text-lg font-semibold">Nothing playing yet</h2>
          <p className="max-w-sm text-sm text-fg-muted">
            Search for a song below or paste a YouTube link. The first track starts the moment it is
            added — for everyone.
          </p>
        </div>
      ) : null}

      <div className="flex items-center gap-3 border-t border-border bg-surface/60 px-4 py-3">
        <Equalizer active={playing} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold sm:text-base">
            {track ? track.title : 'Up next: your pick'}
          </div>
          <div className="flex items-center gap-1.5 truncate text-xs text-fg-muted sm:text-sm">
            {track ? (
              <>
                <span className="truncate">{track.artist || 'YouTube'}</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1 truncate">
                  added by
                  <Avatar name={track.addedBy.name} color={addedBy?.color ?? '#71717a'} size="xs" />
                  {track.addedBy.name}
                </span>
                {playback?.status === 'paused' ? (
                  <span className="ml-1 rounded-full bg-border-strong px-2 py-0.5 text-[10px] uppercase tracking-wide">
                    paused
                  </span>
                ) : null}
              </>
            ) : (
              'Everyone in the jam can add songs'
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
