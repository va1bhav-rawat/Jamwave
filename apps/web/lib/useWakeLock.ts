'use client';

import { useEffect } from 'react';

/**
 * Keeps the screen on while `active`, so a phone does not auto-lock (and pause the music)
 * in the middle of a jam. The browser drops the lock whenever the page is hidden, so it is
 * requested again each time the page becomes visible. No-op where the API is missing.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      if (document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) void lock.release();
        else sentinel = lock;
      } catch {
        // Denied (battery saver, unsupported context): the jam still works without it.
      }
    };

    void request();
    document.addEventListener('visibilitychange', request);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', request);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}
