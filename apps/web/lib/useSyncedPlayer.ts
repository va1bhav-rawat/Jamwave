'use client';

import { SyncCorrector, TIMING, getPlaybackPosition, type PlaybackState } from '@jamwave/shared';
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

/** Fraction of the video the player reports as buffered (0 when it cannot tell). */
function loadedFraction(player: YT.Player): number {
  const fraction = player.getVideoLoadedFraction();
  return fraction >= 0 ? fraction : 0;
}

/** End of the buffered range (ms into the track), or null when the player cannot tell. */
function bufferedEnd(player: YT.Player, currentMs: number): number | null {
  const duration = player.getDuration();
  if (!(duration > 0)) return null;
  const end = loadedFraction(player) * duration * 1000;
  return end >= currentMs ? end : null;
}

/** State changes this soon after one of our own player commands are not treated as user clicks. */
const COMMAND_ECHO_MS = 1_500;
/** After a click inside the video, give the server this long to confirm before re-syncing. */
const USER_HOLD_MS = 4_000;

export interface SyncedPlayerOptions {
  volume: number;
  onEnded: (trackId: string) => void;
  onError: (trackId: string, code: number) => void;
  /** The player learned the length of a track the room did not know (pasted without an API key). */
  onDuration?: (trackId: string, durationMs: number) => void;
  /**
   * The viewer clicked play/pause inside the YouTube player itself.
   * Return true if the action is being sent to the room; false to snap back to the room state.
   */
  onUserToggle: (action: 'play' | 'pause') => boolean;
  /**
   * The viewer scrubbed YouTube's own seek bar (only possible with `nativeControls`).
   * Return true if the seek is being sent to the room; false to snap back to the room position.
   */
  onUserSeek?: (positionMs: number) => boolean;
  /** The page came back to the foreground and the player had been paused by the browser. */
  onCatchUp?: () => void;
  /**
   * Show YouTube's own controls. Phones need them for YouTube's fullscreen button, which is the
   * only way into picture-in-picture for an embedded player. Read once when the player is created.
   */
  nativeControls?: boolean;
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
  /** Drift at the previous check, to spot position jumps made in the player's own UI. */
  const lastDrift = useRef<number | null>(null);
  /** A jump seen once; it counts as a user seek only if it is still there on the next check. */
  const pendingSeek = useRef<number | null>(null);
  /** Adaptive seek policy: buffered-only forward seeks, back-off after stalls. */
  const corrector = useRef(new SyncCorrector());
  /** Until this time a load is in progress; its buffering is not counted as a stall. */
  const loadingUntil = useRef(0);
  /** Highest buffered fraction seen since the load, to tell "still loading" from "stuck". */
  const lastLoadedFraction = useRef(0);
  /** Previous player state, to recognise a BUFFERING → PLAYING stall recovery. */
  const lastState = useRef(-1);
  /** When we issued a seek that has not resumed playback yet (to measure what seeks cost here). */
  const seekIssuedAt = useRef<number | null>(null);
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

  /** Seek while playing, remembering when, so the resume time can be measured. */
  const issueSeek = useCallback(
    (player: YT.Player, targetMs: number) => {
      markCommand();
      seekIssuedAt.current = Date.now();
      player.seekTo(targetMs / 1000, true);
    },
    [markCommand],
  );

  /** A video was just (re)loaded or (re)started: give it time before judging it stuck. */
  const beginLoad = useCallback(() => {
    loadingUntil.current = Date.now() + TIMING.LOAD_GRACE_MS;
    lastLoadedFraction.current = 0;
    stalledTicks.current = 0;
  }, []);

  const handleUserSeek = useCallback(
    (player: YT.Player, positionMs: number) => {
      if (optionsRef.current.onUserSeek?.(positionMs)) {
        holdUntil.current = Date.now() + USER_HOLD_MS;
        return;
      }
      // Not allowed to seek the jam: put this player back at the room position.
      const current = playbackRef.current;
      if (!current) return;
      markCommand();
      if (current.status === 'playing') {
        issueSeek(player, expectedMs() + corrector.current.lookaheadMs);
      } else if (player.getPlayerState() === YT.PlayerState.PAUSED) {
        player.seekTo(current.positionMs / 1000, true);
      }
    },
    [expectedMs, markCommand, issueSeek],
  );

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
          controls: optionsRef.current.nativeControls ? 1 : 0,
          fs: optionsRef.current.nativeControls ? 1 : 0,
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
                const durationMs = Math.round(duration * 1000);
                setSync({ localDurationMs: durationMs });
                // Tell the room, so the server can end the track even if this tab goes away.
                optionsRef.current.onDuration?.(current.track.id, durationMs);
              }
            }
            if (state === yt.PlayerState.PAUSED && current?.status === 'paused') {
              // A big jump made by the viewer is left for the drift loop to judge as a seek.
              const jumped =
                isUserAction &&
                Math.abs(event.target.getCurrentTime() * 1000 - current.positionMs) >
                  TIMING.SEEK_JUMP_MS;
              if (!jumped && alignPaused(event.target, current.positionMs)) markCommand();
            }
            let resolvedSeek = false;
            if (state === yt.PlayerState.PLAYING && seekIssuedAt.current !== null) {
              // Our seek has resumed playback: learn what a seek costs on this device.
              const cost = Date.now() - seekIssuedAt.current;
              seekIssuedAt.current = null;
              resolvedSeek = true;
              corrector.current.recordSeekCost(cost, Date.now());
              setSync({
                seekCostMs: Math.round(cost),
                strikes: corrector.current.strikes,
                thresholdMs: corrector.current.thresholdMs,
                reason: cost > TIMING.SYNC_SEEK_COST_STRIKE_MS ? 'slow seek' : 'seek done',
              });
            } else if (state !== yt.PlayerState.BUFFERING && state !== yt.PlayerState.PLAYING) {
              seekIssuedAt.current = null;
            }
            if (
              !resolvedSeek &&
              state === yt.PlayerState.PLAYING &&
              lastState.current === yt.PlayerState.BUFFERING &&
              Date.now() - lastCommandAt.current > COMMAND_ECHO_MS &&
              Date.now() >= loadingUntil.current
            ) {
              // The network starved the player: tolerate more drift for a while.
              corrector.current.strike(Date.now());
              setSync({
                strikes: corrector.current.strikes,
                thresholdMs: corrector.current.thresholdMs,
                reason: 'stall',
              });
            }
            lastState.current = state;
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
    // A new room state arrived: it wins over any pending click or seek inside the video.
    holdUntil.current = 0;
    lastDrift.current = null;
    pendingSeek.current = null;
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
      hasPlayed.current = false;
      corrector.current.reset();
      beginLoad();
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
        beginLoad();
      } else if (Math.abs(drift) > TIMING.HARD_SEEK_THRESHOLD_MS) {
        markCommand();
        issueSeek(player, expectedMs() + corrector.current.lookaheadMs);
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
  }, [
    ready,
    trackId,
    videoId,
    status,
    updatedAt,
    positionMs,
    expectedMs,
    setSync,
    markCommand,
    beginLoad,
    issueSeek,
  ]);

  // One sync check: correct drift, restart a stalled player, and spot seeks made in YouTube's UI.
  const checkDrift = useCallback(() => {
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
    // Position changes this soon after our own command, or while hidden, are never user seeks.
    const quiet =
      document.visibilityState === 'visible' &&
      Date.now() - lastCommandAt.current > COMMAND_ECHO_MS;
    if (current.status === 'playing') {
      if (state === YT.PlayerState.PLAYING) {
        const currentMs = player.getCurrentTime() * 1000;
        const drift = currentMs - expectedMs();
        setSync({ drift: Math.round(drift) });
        stalledTicks.current = 0;
        const previous = lastDrift.current;
        lastDrift.current = drift;
        if (pendingSeek.current !== null) {
          const pending = pendingSeek.current;
          pendingSeek.current = null;
          if (Math.abs(drift - pending) <= TIMING.SEEK_CONFIRM_MS) {
            handleUserSeek(player, player.getCurrentTime() * 1000);
            return;
          }
          // The jump did not hold (a glitch): fall through to the normal correction.
        } else if (quiet && previous !== null && Math.abs(drift - previous) > TIMING.SEEK_JUMP_MS) {
          // Wait one more check before treating the jump as a seek.
          pendingSeek.current = drift;
          return;
        }
        const buffered = bufferedEnd(player, currentMs);
        const decision = corrector.current.decide({
          nowMs: Date.now(),
          driftMs: drift,
          currentMs,
          expectedMs: expectedMs(),
          bufferedEndMs: buffered,
        });
        setSync({
          bufferAheadMs: buffered === null ? 0 : Math.round(buffered - currentMs),
          thresholdMs: corrector.current.thresholdMs,
          strikes: corrector.current.strikes,
          reason: decision.action === 'none' ? 'none' : `${decision.action} ${decision.reason}`,
        });
        if (decision.action === 'seek') issueSeek(player, decision.targetMs);
      } else if (state !== YT.PlayerState.BUFFERING) {
        // Mobile browsers pause hidden pages and refuse to restart them; catch up on return instead.
        if (document.visibilityState !== 'visible') return;
        // While the buffer is still growing the player is loading, not stuck: leave it alone.
        const fraction = loadedFraction(player);
        if (fraction > lastLoadedFraction.current + 0.0005) {
          lastLoadedFraction.current = fraction;
          stalledTicks.current = 0;
          return;
        }
        stalledTicks.current += 1;
        if (stalledTicks.current === 2) {
          // A bare play() restarts a blocked or stuck start without discarding what has loaded.
          markCommand();
          player.playVideo();
        } else if (stalledTicks.current === 4 && hasPlayed.current) {
          // It played before and is stuck now: reposition and retry once.
          markCommand();
          corrector.current.strike(Date.now());
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
      } else if (state === YT.PlayerState.PAUSED) {
        const offset = player.getCurrentTime() * 1000 - current.positionMs;
        if (quiet && Math.abs(offset) > TIMING.SEEK_JUMP_MS) {
          const pending = pendingSeek.current;
          pendingSeek.current = null;
          if (pending !== null && Math.abs(offset - pending) <= TIMING.SEEK_CONFIRM_MS) {
            handleUserSeek(player, player.getCurrentTime() * 1000);
          } else {
            pendingSeek.current = offset;
          }
        } else {
          pendingSeek.current = null;
          if (alignPaused(player, current.positionMs)) markCommand();
        }
      }
    }
  }, [expectedMs, setSync, markCommand, handleUserSeek, issueSeek]);

  // Drift loop.
  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(checkDrift, TIMING.DRIFT_CHECK_MS);
    return () => clearInterval(interval);
  }, [ready, checkDrift]);

  // Back from another app or a locked screen: jump straight to the live position.
  useEffect(() => {
    if (!ready) return;
    const catchUp = () => {
      if (document.visibilityState !== 'visible') return;
      const player = playerRef.current;
      const current = playbackRef.current;
      if (!player || !current?.track || loadedTrackRef.current !== current.track.id) return;
      if (current.status !== 'playing') return;
      try {
        const state = player.getPlayerState();
        // Fresh baseline: nothing that happened while hidden should look like a user seek.
        lastDrift.current = null;
        pendingSeek.current = null;
        if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING) {
          // Still playing (e.g. picture-in-picture): correct drift now, not at the next tick.
          checkDrift();
          return;
        }
        holdUntil.current = 0;
        stalledTicks.current = 0;
        markCommand();
        issueSeek(player, expectedMs() + corrector.current.lookaheadMs);
        player.playVideo();
        beginLoad();
        // If the browser still blocks playback, the drift loop shows "Tap to listen along".
        if (hasPlayed.current) optionsRef.current.onCatchUp?.();
      } catch {
        // ignore
      }
    };
    document.addEventListener('visibilitychange', catchUp);
    window.addEventListener('pageshow', catchUp);
    return () => {
      document.removeEventListener('visibilitychange', catchUp);
      window.removeEventListener('pageshow', catchUp);
    };
  }, [ready, expectedMs, markCommand, checkDrift, beginLoad, issueSeek]);

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
      beginLoad();
      setSync({ needsGesture: false });
    } catch {
      // ignore
    }
  }, [expectedMs, setSync, markCommand, beginLoad]);

  return { ready, resume };
}
