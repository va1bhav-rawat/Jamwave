'use client';

import { useRoomStore } from '@/lib/store';
import { useDocumentVisibility, useFullscreenActive, useHudVisible } from '@/lib/useBrowser';

/** Tiny sync readout for development (always in dev; add ?hud=1 in production). */
export function DevHud() {
  const visible = useHudVisible();
  const sync = useRoomStore((s) => s.sync);
  const version = useRoomStore((s) => s.snapshot?.version ?? 0);
  const connected = useRoomStore((s) => s.connected);
  const visibility = useDocumentVisibility();
  const fullscreen = useFullscreenActive();

  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed bottom-20 left-2 z-40 rounded-md bg-black/70 px-2 py-1 font-mono text-[10px] text-fg-muted lg:bottom-2">
      {connected ? 'live' : 'offline'} · v{version} · offset {Math.round(sync.offset)}ms · rtt{' '}
      {Math.round(sync.rtt)}ms · drift {sync.drift}ms · player {sync.playerState} · {visibility}
      {fullscreen ? ' · fullscreen' : ''} · buffer +{(sync.bufferAheadMs / 1000).toFixed(1)}s · thr{' '}
      {sync.thresholdMs}ms · strikes {sync.strikes} · {sync.reason}
    </div>
  );
}
