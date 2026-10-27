'use client';

import { TIMING, driftAction, getPlaybackPosition, type PlaybackState } from '@jamwave/shared';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { serverNow } from './clock';
import { useRoomStore } from './store';

type YTNamespace = typeof YT;

interface YTWindow {
  YT?: YTNamespace;
  onYouTubeIframeAPIReady?: () => void;
}

let apiPromise: Promise<YTNamespace> | null = null;

/** Load the IFrame Player API once per page. */
export function loadYouTubeApi(): Promise<YTNamespace> {
  const w = window as unknown as YTWindow;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (!apiPromise) {
    apiPromise = new Promise<YTNamespace>((resolve) => {
      const previous = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        previous?.();
        if (w.YT) resolve(w.YT);
      };
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
    });
  }
  return apiPromise;
}

const STATE_NAMES: Record<number, string> = {
  [-1]: 'unstarted',
  0: 'ended',
  1: 'playing',
  2: 'paused',
  3: 'buffering',
  5: 'cued',
};

/**
 * Move a paused player to the room's paused position.
 * Only call this while the player reports PAUSED: YouTube's seekTo keeps a paused
 * player paused, but starts playback from any other state (playing, cued, ended).
 */
function alignPaused(player: YT.Player, positionMs: number): boolean {
  if (Math.abs(player.getCurrentTime() * 1000 - positionMs) > TIMING.HARD_SEEK_THRESHOLD_MS) {
    player.seekTo(positionMs / 1000, true);
    return true;
  }
  return false;
}

/** State changes this soon after one of our own player commands are not treated as user clicks. */
const COMMAND_ECHO_MS = 1_500;
/** After a click inside the video, give the server this long to confirm before re-syncing. */
const USER_HOLD_MS = 4_000;

export interface SyncedPlayerOptions {
  volume: number;
  onEnded: (trackId: string) => void;
  onError: (trackId: string, code: number) => void;
  /**
   * The viewer clicked play/pause inside the YouTube player itself.
   * Return true if the action is being sent to the room; false to snap back to the room state.
   */
  onUserToggle: (action: 'play' | 'pause') => boolean;
}

export interface SyncedPlayer {
  ready: boolean;
  /** Call from a user gesture to start playback when the browser blocked autoplay. */
  resume: () => void;
}

/**
 * Drives one YouTube player so that it always mirrors the room's playback state:
 * loads/cues the right video, follows play/pause/seek, and corrects drift every second.
 * Clicks on YouTube's own play/pause are forwarded to the room through `onUserToggle`.
 */
export function useSyncedPlayer(
  hostRef: RefObject<HTMLDivElement | null>,
  playback: PlaybackState | null,
  options: SyncedPlayerOptions,
): SyncedPlayer {
  const playerRef = useRef<YT.Player | null>(null);
  const [ready, setReady] = useState(false);
  const loadedTrackRef = useRef<string | null>(null);
  const playbackRef = useRef(playback);
  const optionsRef = useRef(options);
  const stalledTicks = useRef(0);
  /** When we last commanded the player (to tell our own state changes from user clicks). */
  const lastCommandAt = useRef(0);
  /** Until this time the drift loop leaves the player alone (a user click is being confirmed). */
  const holdUntil = useRef(0);
  /** Whether the loaded track has actually played here (autoplay-blocked players never have). */
  const hasPlayed = useRef(false);
  const setSync = useRoomStore((s) => s.setSync);

  // Keep the latest props reachable from timers and player callbacks.
  useEffect(() => {
    playbackRef.current = playback;
    optionsRef.current = options;
  });

  const expectedMs = useCallback(() => {
    const current = playbackRef.current;
    return current ? getPlaybackPosition(current, serverNow()) : 0;
  }, []);

  const markCommand = useCallback(() => {
    lastCommandAt.current = Date.now();
  }, []);

  // Create the player once.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let destroyed = false;
    const mount = document.createElement('div');
    host.appendChild(mount);

    const handleUserToggle = (player: YT.Player, action: 'play' | 'pause') => {
      if (optionsRef.current.onUserToggle(action)) {
        holdUntil.current = Date.now() + USER_HOLD_MS;
        return;
      }
      // Not allowed to control the jam: put this player back in line with the room.
      markCommand();
      if (action === 'pause') {
        player.seekTo(expectedMs() / 1000, true);
        player.playVideo();
      } else {
        player.pauseVideo();
      }
    };

    void loadYouTubeApi().then((yt) => {
      if (destroyed) return;
      playerRef.current = new yt.Player(mount, {
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (destroyed) return;
            setReady(true);
          },
          onStateChange: (event) => {
            const state = event.data as number;
            setSync({ playerState: STATE_NAMES[state] ?? String(state) });
            const current = playbackRef.current;
            const isUserAction =
              !!current?.track &&
              loadedTrackRef.current === current.track.id &&
              document.visibilityState === 'visible' &&
              Date.now() - lastCommandAt.current > COMMAND_ECHO_MS;
            if (
              isUserAction &&
              state === yt.PlayerState.PAUSED &&
              current?.status === 'playing' &&
              hasPlayed.current
            ) {
              handleUserToggle(event.target, 'pause');
            } else if (
              isUserAction &&
              state === yt.PlayerState.PLAYING &&
              current?.status === 'paused'
            ) {
              handleUserToggle(event.target, 'play');
            }
            if (state === yt.PlayerState.PLAYING) {
              hasPlayed.current = true;
              stalledTicks.current = 0;
              setSync({ needsGesture: false });
              const duration = event.target.getDuration();
              if (current?.track && current.track.durationMs <= 0 && duration > 0) {
                setSync({ localDurationMs: Math.round(duration * 1000) });
              }
            }
            if (state === yt.PlayerState.PAUSED && current?.status === 'paused') {
              if (alignPaused(event.target, current.positionMs)) markCommand();
            }
            if (state === yt.PlayerState.ENDED && current?.track) {
              optionsRef.current.onEnded(current.track.id);
            }
          },
          onError: (event) => {
            const current = playbackRef.current;
            if (current?.track) optionsRef.current.onError(current.track.id, event.data as number);
          },
        },
      });
    });

    return () => {
      destroyed = true;
      setReady(false);
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore
      }
      playerRef.current = null;
      loadedTrackRef.current = null;
      mount.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow room playback: load / play / pause / seek.
  const trackId = playback?.track?.id ?? null;
  const videoId = playback?.track?.providerId ?? null;
  const status = playback?.status ?? 'idle';
  const updatedAt = playback?.updatedAt ?? 0;
  const positionMs = playback?.positionMs ?? 0;

  useEffect(() => {
    const player = playerRef.current;
    if (!ready || !player) return;
    // A new room state arrived: it wins over any pending click inside the video.
    holdUntil.current = 0;
    if (!trackId || !videoId) {
      if (loadedTrackRef.current !== null) {
        try {
          markCommand();
          player.stopVideo();
        } catch {
          // ignore
        }
      }
      loadedTrackRef.current = null;
      setSync({ needsGesture: false });
      return;
    }
    const startSeconds = expectedMs() / 1000;
    if (loadedTrackRef.current !== trackId) {
      loadedTrackRef.current = trackId;
      stalledTicks.current = 0;
      hasPlayed.current = false;
      markCommand();
      if (status === 'playing') player.loadVideoById({ videoId, startSeconds });
      else player.cueVideoById({ videoId, startSeconds });
      return;
    }
    const state = player.getPlayerState();
    if (status === 'playing') {
      const drift = player.getCurrentTime() * 1000 - expectedMs();
      if (state !== YT.PlayerState.PLAYING && state !== YT.PlayerState.BUFFERING) {
        markCommand();
        player.seekTo(startSeconds, true);
        player.playVideo();
      } else if (Math.abs(drift) > TIMING.HARD_SEEK_THRESHOLD_MS) {
        markCommand();
        player.seekTo((expectedMs() + TIMING.SEEK_LOOKAHEAD_MS) / 1000, true);
      }
    } else if (status === 'paused') {
      if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING) {
        // The position is aligned once the player reports PAUSED (see onStateChange).
        markCommand();
        player.pauseVideo();
      } else if (state === YT.PlayerState.PAUSED) {
        if (alignPaused(player, positionMs)) markCommand();
      } else {
        // Cued / unstarted / ended: a seek would start playback, so re-cue at the position.
        markCommand();
        player.cueVideoById({ videoId, startSeconds: positionMs / 1000 });
      }
    }
  }, [ready, trackId, videoId, status, updatedAt, positionMs, expectedMs, setSync, markCommand]);

  // Drift loop.
  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(() => {
      const player = playerRef.current;
      const current = playbackRef.current;
      if (!player || !current?.track || loadedTrackRef.current !== current.track.id) return;
      if (Date.now() < holdUntil.current) return;
      let state: number;
      try {
        state = player.getPlayerState();
      } catch {
        return;
      }
      if (current.status === 'playing') {
        if (state === YT.PlayerState.PLAYING) {
          const drift = player.getCurrentTime() * 1000 - expectedMs();
          setSync({ drift: Math.round(drift) });
          if (driftAction(drift) === 'seek') {
            markCommand();
            player.seekTo((expectedMs() + TIMING.SEEK_LOOKAHEAD_MS) / 1000, true);
          }
          stalledTicks.current = 0;
        } else if (state !== YT.PlayerState.BUFFERING) {
          stalledTicks.current += 1;
          if (stalledTicks.current === 2) {
            markCommand();
            player.seekTo(expectedMs() / 1000, true);
            player.playVideo();
          } else if (stalledTicks.current >= 4) {
            setSync({ needsGesture: true });
          }
        }
      } else if (current.status === 'paused') {
        if (state === YT.PlayerState.PLAYING) {
          markCommand();
          player.pauseVideo();
        } else if (state === YT.PlayerState.PAUSED && alignPaused(player, current.positionMs)) {
          markCommand();
        }
      }
    }, TIMING.DRIFT_CHECK_MS);
    return () => clearInterval(interval);
  }, [ready, expectedMs, setSync, markCommand]);

  // Volume.
  useEffect(() => {
    const player = playerRef.current;
    if (!ready || !player) return;
    try {
      if (options.volume <= 0) player.mute();
      else {
        player.unMute();
        player.setVolume(options.volume);
      }
    } catch {
      // ignore
    }
  }, [ready, options.volume]);

  const resume = useCallback(() => {
    const player = playerRef.current;
    const current = playbackRef.current;
    if (!player || !current?.track) return;
    try {
      markCommand();
      player.unMute();
      player.seekTo(expectedMs() / 1000, true);
      player.playVideo();
      stalledTicks.current = 0;
      setSync({ needsGesture: false });
    } catch {
      // ignore
    }
  }, [expectedMs, setSync, markCommand]);

  return { ready, resume };
}
