'use client';

import { getPlaybackPosition } from '@jamwave/shared';
import {
  Expand,
  Pause,
  Play,
  Shrink,
  SkipForward,
  ThumbsDown,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { serverNow } from '@/lib/clock';
import { errorMessage, jam } from '@/lib/jamClient';
import { selectCanControl, selectMe, useRoomStore } from '@/lib/store';
import { useTicker } from '@/lib/useTicker';
import { cn, formatDuration, formatPosition } from '@/lib/utils';

export function PlaybackControls() {
  const snapshot = useRoomStore((s) => s.snapshot);
  const canControl = useRoomStore(selectCanControl);
  const me = useRoomStore(selectMe);
  const localDurationMs = useRoomStore((s) => s.sync.localDurationMs);
  const volume = useRoomStore((s) => s.volume);
  const setVolume = useRoomStore((s) => s.setVolume);
  const videoSize = useRoomStore((s) => s.videoSize);
  const setVideoSize = useRoomStore((s) => s.setVideoSize);
  const [scrub, setScrub] = useState<number | null>(null);
  const [lastVolume, setLastVolume] = useState(80);

  const playback = snapshot?.playback ?? null;
  const track = playback?.track ?? null;
  const playing = playback?.status === 'playing';
  useTicker(playing && scrub === null);

  const durationMs = track ? track.durationMs || localDurationMs : 0;
  const livePosition = playback && track ? getPlaybackPosition(playback, serverNow()) : 0;
  const position = scrub ?? livePosition;
  const percent = durationMs > 0 ? Math.min(100, (position / durationMs) * 100) : 0;
  const canSeek = canControl && durationMs > 0 && !!track;

  const connected = snapshot?.participants.filter((p) => p.connected) ?? [];
  const votes = snapshot
    ? snapshot.skipVotes.filter((id) => connected.some((p) => p.id === id)).length
    : 0;
  const needed = Math.floor(connected.length / 2) + 1;
  const iVoted = !!me && !!snapshot?.skipVotes.includes(me.id);
  // Anyone who can skip outright has no use for a vote button; it is for listeners.
  const voteEnabled = !canControl && !!snapshot?.settings.voteSkipEnabled && !!track;

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const commitSeek = () => {
    if (scrub === null) return;
    const target = scrub;
    void run(() => jam.seek(target)).finally(() => setScrub(null));
  };

  const voteSkip = () =>
    run(async () => {
      const result = await jam.voteSkip();
      if (!result.skipped) toast(`Vote counted · ${result.votes}/${result.needed} to skip`);
    });

  const toggleMute = () => {
    if (volume > 0) {
      setLastVolume(volume);
      setVolume(0);
    } else {
      setVolume(lastVolume || 80);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/40 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-fg-muted">
          {formatPosition(position)}
        </span>
        <input
          type="range"
          className="slider flex-1"
          aria-label="Seek"
          min={0}
          max={Math.max(1, durationMs)}
          step={500}
          value={Math.min(position, Math.max(1, durationMs))}
          disabled={!canSeek}
          style={{ ['--value' as string]: `${percent}%` }}
          onChange={(e) => setScrub(Number(e.target.value))}
          onPointerUp={commitSeek}
          onKeyUp={(e) => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key))
              commitSeek();
          }}
          onTouchEnd={commitSeek}
        />
        <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-fg-muted">
          {formatDuration(durationMs)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canControl ? (
          <>
            <Button
              size="icon"
              className="h-11 w-11"
              aria-label={playing ? 'Pause for everyone' : 'Play for everyone'}
              disabled={!track && (snapshot?.queue.length ?? 0) === 0}
              onClick={() => run(() => (playing ? jam.pause() : jam.play()))}
            >
              {playing ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current" />
              )}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Skip"
              disabled={!track}
              onClick={() => run(() => jam.skip())}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <span className="rounded-full border border-border px-3 py-1.5 text-xs text-fg-muted">
            {playing ? 'Playing' : track ? 'Paused' : 'Idle'} · host controls playback
          </span>
        )}

        {voteEnabled ? (
          <Button
            variant={iVoted ? 'outline' : 'ghost'}
            size="sm"
            onClick={voteSkip}
            disabled={iVoted}
            title="Vote to skip this track"
          >
            <ThumbsDown className="h-4 w-4" />
            {iVoted ? 'Voted' : 'Vote skip'}
            {votes > 0 ? (
              <span className="rounded-full bg-border-strong px-1.5 text-[11px] tabular-nums">
                {votes}/{needed}
              </span>
            ) : null}
          </Button>
        ) : null}

        <div className={cn('ml-auto flex items-center gap-2')}>
          <Button
            variant="ghost"
            size="icon"
            aria-label={videoSize === 'small' ? 'Full-size video' : 'Smaller video (saves data)'}
            title={
              videoSize === 'small'
                ? 'Full-size video'
                : "Smaller video (saves data). For a set quality, use the gear in the video's own controls."
            }
            onClick={() => setVideoSize(videoSize === 'small' ? 'auto' : 'small')}
          >
            {videoSize === 'small' ? (
              <Expand className="h-4 w-4" />
            ) : (
              <Shrink className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={volume > 0 ? 'Mute' : 'Unmute'}
            onClick={toggleMute}
          >
            {volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <input
            type="range"
            className="slider w-24 sm:w-32"
            aria-label="Volume"
            min={0}
            max={100}
            value={volume}
            style={{ ['--value' as string]: `${volume}%` }}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </div>
      </div>
    </section>
  );
}
