'use client';

import { useSyncExternalStore } from 'react';
import { APP_URL } from './env';
import { session } from './session';

const noopSubscribe = () => () => {};

function subscribeStorage(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

/** The nickname remembered in this browser ('' on the server and before hydration). */
export function useStoredNickname(): string {
  return useSyncExternalStore(
    subscribeStorage,
    () => session.getNickname() ?? '',
    () => '',
  );
}

/** Hydration-safe matchMedia. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** The page origin in the browser, the configured app URL during SSR. */
export function useOrigin(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => APP_URL,
  );
}

/** Whether the development HUD should show (dev builds, or ?hud=1). */
export function useHudVisible(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => process.env.NODE_ENV === 'development' || window.location.search.includes('hud=1'),
    () => false,
  );
}
