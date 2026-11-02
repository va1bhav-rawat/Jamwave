'use client';

import { useSyncExternalStore } from 'react';
import { APP_URL } from './env';
import { session, type RecentJam, type SavedQueue } from './session';

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

const NO_JAMS: RecentJam[] = [];
const getRecentJams = () => {
  const jams = session.getRecentJams();
  return jams.length === 0 ? NO_JAMS : jams;
};

/** Jams this device joined in the last day (empty on the server and before hydration). */
export function useRecentJams(): RecentJam[] {
  return useSyncExternalStore(subscribeStorage, getRecentJams, () => NO_JAMS);
}

/** The last queue this device listened to, for rebuilding an ended jam. */
export function useLastQueue(): SavedQueue | null {
  return useSyncExternalStore(subscribeStorage, session.getLastQueue, () => null);
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

const subscribeVisibility = (callback: () => void) => {
  document.addEventListener('visibilitychange', callback);
  return () => document.removeEventListener('visibilitychange', callback);
};

/** document.visibilityState, kept current ('visible' on the server). */
export function useDocumentVisibility(): DocumentVisibilityState {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState,
    () => 'visible',
  );
}

const subscribeFullscreen = (callback: () => void) => {
  document.addEventListener('fullscreenchange', callback);
  return () => document.removeEventListener('fullscreenchange', callback);
};

/** Whether something on the page (for example the YouTube iframe) is in fullscreen. */
export function useFullscreenActive(): boolean {
  return useSyncExternalStore(
    subscribeFullscreen,
    () => document.fullscreenElement !== null,
    () => false,
  );
}

/** iPhone or iPad: WebKit only, no element fullscreen, the native video player does picture-in-picture. */
export function useIsIOS(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () =>
      /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    () => false,
  );
}
