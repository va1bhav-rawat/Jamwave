'use client';

// Temporary real-device spike for picture-in-picture (see docs/ARCHITECTURE.md).
// Delete this route once the results are recorded.

import { useEffect, useRef, useState } from 'react';
import { loadYouTubeApi } from '@/lib/useSyncedPlayer';

const STATE_NAMES: Record<number, string> = {
  [-1]: 'unstarted',
  0: 'ended',
  1: 'playing',
  2: 'paused',
  3: 'buffering',
  5: 'cued',
};

export default function PipSpikePage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [tick, setTick] = useState(0);
  const [visibility, setVisibility] = useState('');
  const [fullscreen, setFullscreen] = useState('');
  const [playerState, setPlayerState] = useState('none');

  const push = (line: string) =>
    setLog((lines) => [`${new Date().toLocaleTimeString()}  ${line}`, ...lines].slice(0, 60));

  useEffect(() => {
    const readout = () => {
      setVisibility(document.visibilityState);
      setFullscreen(document.fullscreenElement?.tagName.toLowerCase() ?? 'none');
    };
    readout();
    const onVisibility = () => {
      readout();
      push(`visibility -> ${document.visibilityState}`);
    };
    const onFullscreen = () => {
      readout();
      push(`fullscreenElement -> ${document.fullscreenElement?.tagName.toLowerCase() ?? 'none'}`);
    };
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreen);
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFullscreen);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let destroyed = false;
    const mount = document.createElement('div');
    host.appendChild(mount);
    void loadYouTubeApi().then((yt) => {
      if (destroyed) return;
      playerRef.current = new yt.Player(mount, {
        width: '100%',
        height: '100%',
        videoId: 'dQw4w9WgXcQ',
        playerVars: {
          controls: 1,
          fs: 1,
          playsinline: 1,
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => push('player ready'),
          onStateChange: (event) => {
            const name = STATE_NAMES[event.data as number] ?? String(event.data);
            setPlayerState(name);
            push(`state -> ${name} @ ${event.target.getCurrentTime().toFixed(1)}s`);
          },
        },
      });
    });
    return () => {
      destroyed = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore
      }
      playerRef.current = null;
      mount.remove();
    };
  }, []);

  // Fire an API command after a delay so it lands while the tab is hidden / in PiP.
  const later = (label: string, run: (player: YT.Player) => void) => {
    push(`${label} scheduled in 10 s — go fullscreen and press Home now`);
    setTimeout(() => {
      const player = playerRef.current;
      if (!player) return;
      try {
        run(player);
        push(`${label} sent (visibility=${document.visibilityState})`);
      } catch (error) {
        push(`${label} failed: ${String(error)}`);
      }
    }, 10_000);
  };

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-4 text-sm">
      <h1 className="text-lg font-semibold">PiP spike</h1>
      <ol className="list-decimal space-y-1 pl-5 text-fg-muted">
        <li>Press play, then tap YouTube&apos;s fullscreen button inside the video.</li>
        <li>Press Home (Android) or swipe up to Home (iPhone).</li>
        <li>
          Then try the two &quot;Fullscreen via Jamwave&quot; buttons instead of YouTube&apos;s icon
          and press Home again: does a floating window still appear?
        </li>
        <li>Come back and read the log below.</li>
      </ol>
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
        <div
          ref={hostRef}
          className="h-full w-full [&>div]:h-full [&>div]:w-full [&>iframe]:h-full [&>iframe]:w-full"
        />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
        <dt>tick</dt>
        <dd>{tick}</dd>
        <dt>visibility</dt>
        <dd>{visibility}</dd>
        <dt>fullscreenElement</dt>
        <dd>{fullscreen}</dd>
        <dt>player state</dt>
        <dd>{playerState}</dd>
      </dl>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-accent px-3 py-1.5"
          onClick={() => {
            const host = hostRef.current;
            if (!host?.requestFullscreen)
              return push('requestFullscreen not available on this browser');
            host.requestFullscreen().then(
              () => push('container fullscreen OK — now press Home'),
              (error: unknown) => push(`container fullscreen failed: ${String(error)}`),
            );
          }}
        >
          Fullscreen via Jamwave (container)
        </button>
        <button
          type="button"
          className="rounded-full border border-accent px-3 py-1.5"
          onClick={() => {
            const iframe = hostRef.current?.querySelector('iframe');
            if (!iframe?.requestFullscreen)
              return push('iframe fullscreen not available on this browser');
            iframe.requestFullscreen().then(
              () => push('iframe fullscreen OK — now press Home'),
              (error: unknown) => push(`iframe fullscreen failed: ${String(error)}`),
            );
          }}
        >
          Fullscreen via Jamwave (iframe)
        </button>
        <button
          type="button"
          className="rounded-full border border-border px-3 py-1.5"
          onClick={() => later('pauseVideo', (p) => p.pauseVideo())}
        >
          Pause in 10 s
        </button>
        <button
          type="button"
          className="rounded-full border border-border px-3 py-1.5"
          onClick={() => later('seekTo +30s', (p) => p.seekTo(p.getCurrentTime() + 30, true))}
        >
          Seek +30 s in 10 s
        </button>
        <button
          type="button"
          className="rounded-full border border-border px-3 py-1.5"
          onClick={() => later('loadVideoById', (p) => p.loadVideoById('9bZkp7q19f0'))}
        >
          Load other video in 10 s
        </button>
      </div>
      <pre className="max-h-80 overflow-auto rounded-xl border border-border bg-surface/40 p-3 text-[11px] leading-relaxed">
        {log.join('\n') || 'log is empty'}
      </pre>
    </main>
  );
}
