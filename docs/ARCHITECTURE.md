# Jamwave — Architecture

## Overview

```
 Browser A ──┐                          ┌── YouTube IFrame Player (one per browser)
 Browser B ──┼── Socket.IO (wss) ──►   apps/server (Node 24, Socket.IO 4)
 Browser C ──┘        ▲                  ├─ RoomManager: in-memory rooms, timers, master clock
                      │                  ├─ handlers: room / queue / playback / chat / time / search
   apps/web (Next 16) │                  └─ providers/youtube: Data API + oEmbed, LRU cache, quota budget
                      └── packages/shared: event catalogue, zod schemas, types, sync math
```

- **apps/web** renders the landing site (server components) and the jam room (client components). It talks to the server only over Socket.IO, except for one server-side `GET /api/rooms/:code/preview` call used for link previews.
- **apps/server** owns every room. It is the single source of truth for the queue, playback state and the clock. Rooms are plain objects in memory; the process is stateless across restarts (rooms are ephemeral by design).
- **packages/shared** is imported by both so event names, payload schemas and the position math can never drift apart.

## Sync protocol

### State model

```ts
playback = { status: 'idle' | 'playing' | 'paused', track, positionMs, updatedAt };
```

`positionMs` is the position at server time `updatedAt`. The live position is a pure function in `packages/shared/src/sync.ts`:

```
position(now) = status === 'playing' ? positionMs + (now - updatedAt) : positionMs
```

Every control action (play, pause, seek, skip, track end) rewrites `positionMs`/`updatedAt` and bumps `version`. The server then broadcasts the full `RoomSnapshot` (rooms are small; full snapshots are simpler and self-healing than diffs).

### Clock sync

Clients cannot trust their own clocks, so each browser estimates `offset = serverTime − localTime` with an NTP-style exchange on `time:ping`:

```
t0 client send → t1 server reply → t2 client receive
offset = t1 − (t0 + t2) / 2
```

`ClockSync` keeps the last 8 samples and reports the median offset of the lowest-RTT half. A burst of 5 pings runs on every (re)connect, then one every 30 s. `serverNow()` is then `Date.now() + offset`.

### Player following

`useSyncedPlayer` (web) mirrors the room into the YouTube player:

1. Track changed → `loadVideoById({ videoId, startSeconds: expected })` (or `cueVideoById` when paused).
2. Status / position changed → `playVideo()` / `pauseVideo()` / `seekTo(expected)`.
3. Every second: `drift = player.getCurrentTime() − expected`, decided by `SyncCorrector` (shared, unit-tested). Within the current tolerance (300 ms when healthy) nothing happens. A forward seek is issued only into video the player has already buffered (`getVideoLoadedFraction`); otherwise the player keeps playing a little behind until the buffer catches up and the seek becomes free. Each stall or rebuffering seek is a "strike": the tolerance doubles (up to 2.4 s) and seeks are spaced out (5 → 20 s); a quiet minute removes a strike. Beyond 3 s behind a rebuffering seek is accepted, beyond 5 s a seek always happens. This replaces a fixed 300 ms threshold that, on slow connections, seeked into undownloaded video after every stall and produced a seek → rebuffer → seek loop (and kept resetting YouTube's quality choice).
4. A fresh load is left alone while its buffer is growing. If nothing arrives, a bare `playVideo()` is tried (no seek: a seek restarts the fetch), then the UI shows a "Tap to listen along" button (browser blocked autoplay); the tap calls `seekTo + playVideo()` from a user gesture.
5. `ENDED` → `track:ended`; player error → `track:error`. The server only trusts these from the host (or anyone when the host is away) and also runs its own timer at `updatedAt + duration − positionMs`.
6. Links pasted without an API key arrive with `durationMs: 0`, so the server cannot schedule the end itself. The first time the trusted player reaches `PLAYING` it sends `track:duration`; the server stores it on the current track (once, plausible values only) and broadcasts, which arms the end timer and gives everyone a real progress bar. Without this, a host whose phone locked would leave the room stuck on the last second of such a track.

### Reconnect and identity

Each participant gets an id + secret on join. The browser keeps them in `sessionStorage` (per tab). On refresh or reconnect, `room:join` is sent with `reclaim: { participantId, secret }`; the server re-attaches the seat, keeps the host role and cancels the 60 s grace timer. A newer socket reclaiming a seat detaches the older one.

## Event catalogue

Payload schemas live in `packages/shared/src/schemas.ts`; typed signatures in `events.ts`.

| Client → server                                                             | Ack                          | Who                               |
| --------------------------------------------------------------------------- | ---------------------------- | --------------------------------- |
| `room:create` `{ name, roomName? }`                                         | `JoinResult`                 | anyone                            |
| `room:join` `{ code, name, reclaim? }`                                      | `JoinResult`                 | anyone                            |
| `room:leave`                                                                | `null`                       | member                            |
| `room:settings` `{ name?, everyoneControls?, voteSkipEnabled? }`            | `null`                       | host                              |
| `host:transfer` `{ participantId }`                                         | `null`                       | host                              |
| `queue:add` `{ items[], playNext? }`                                        | `{ added }`                  | member (`playNext` needs control) |
| `queue:remove` `{ trackId }`                                                | `null`                       | adder or control                  |
| `queue:reorder` `{ trackId, toIndex }`                                      | `null`                       | control                           |
| `playback:play` `{ trackId? }` / `pause` / `seek` `{ positionMs }` / `skip` | `null`                       | control                           |
| `vote:skip`                                                                 | `{ votes, needed, skipped }` | member                            |
| `track:ended` / `track:error` `{ trackId }`                                 | —                            | host (or anyone if host away)     |
| `track:duration` `{ trackId, durationMs }`                                  | —                            | host (or anyone if host away)     |
| `chat:send` `{ text }`                                                      | `null`                       | member                            |
| `reaction:send` `{ emoji }`                                                 | —                            | member                            |
| `time:ping` `{ t0 }`                                                        | `{ t0, t1 }`                 | anyone                            |
| `search:query` `{ q }` / `search:resolve` `{ url }`                         | `{ results, cached }`        | member                            |

| Server → client | Payload                                              |
| --------------- | ---------------------------------------------------- |
| `room:state`    | full `RoomSnapshot`                                  |
| `chat:message`  | `ChatMessage` (user or system)                       |
| `reaction`      | `Reaction`                                           |
| `room:closed`   | `{ reason: 'expired' \| 'host_closed' }`             |
| `server:error`  | `{ code, message }` (only for events without an ack) |

"Control" = host, or anyone when `settings.everyoneControls` is true (the default).

## Abuse limits

`room:create` and fresh `room:join` seats are limited per client address (`x-forwarded-for` first, then the socket address) with sliding windows; reclaims after a refresh are exempt. `RoomManager` refuses new rooms beyond `MAX_ROOMS` with `SERVER_BUSY`. Chat/reactions and searches have per-participant limiters; `queue:add` is bounded by the batch and queue limits.

## Usage counters

`RoomManager.metrics` counts rooms created, first-time joins, tracks added and the peak number of rooms / connected listeners since the process started. `/health` exposes them: enough to answer "is anyone using this?" before a real analytics stack exists.

## Device memory

The browser keeps (localStorage) the last five jams it joined and the last queue it saw (`[current track, ...queue]` as `SearchResult`s). The landing page offers "Jump back in"; the ended / not-found screens offer "Rebuild this jam", which creates a fresh room and re-queues the saved tracks in batches. Nothing of this touches the server or YouTube quota.

## Room lifecycle

```
create ──► active ──(last socket drops)──► empty ──(10 min)──► closed (room:closed → expired)
             ▲  │                            │
             │  └─(socket drops)─► grace 60 s ┘ (reclaim cancels; expiry removes + host handoff)
             └──(join / reclaim)
```

Host handoff picks the earliest-joined connected participant (or the earliest disconnected one if nobody is connected).

## Picture-in-picture on phones

Mobile browsers pause the YouTube embed when the tab is hidden, and YouTube's policies forbid a hidden
("background") player. Picture-in-picture keeps the player visible in a floating window while the user
is in another app, so it is the one route that works within the rules.

How it has to work, and why:

- **The fullscreen request must come from inside the embed.** Chromium's "effectively fullscreen"
  detector (`media_custom_controls_fullscreen_detector.cc`), which drives Android's automatic PiP on
  Home, only looks at the fullscreen element of the video's _own_ document. Jamwave calling
  `requestFullscreen()` on its container does nothing for the cross-origin YouTube iframe.
- **iPhone has no element fullscreen at all**; only the native video player can go fullscreen, and
  only its owner document can trigger it. From native fullscreen, swiping Home enters PiP when the
  system setting "Start PiP Automatically" is on.
- Therefore touch devices get YouTube's own controls (`controls=1`, `fs=1`); desktop keeps
  `controls=0`. The YouTube iframe already carries `allowfullscreen` and `allow="picture-in-picture"`.

Living with YouTube's controls in a synced room (`apps/web/lib/useSyncedPlayer.ts`):

- Play/pause clicks are forwarded to the room through `onUserToggle` (echo-suppressed with
  `COMMAND_ECHO_MS`, held for `USER_HOLD_MS` until the server confirms).
- Scrubs are detected in the drift loop as a position jump > `TIMING.SEEK_JUMP_MS` that was not caused
  by a Jamwave command and still holds (within `SEEK_CONFIRM_MS`) on the next check. Controllers'
  scrubs become `playback:seek`; others snap back with a toast. Any new room snapshot clears the
  pending state, so a server-side seek never looks like a user seek.
- While hidden (PiP), timers are throttled; the stalled-restart logic is skipped and drift is
  corrected on the next tick or immediately when the page becomes visible again.

Device results (fill in from `apps/web/app/dev/pip` spike):

| Platform / browser         | PiP on Home | Keeps playing | API commands while hidden | Notes |
| -------------------------- | ----------- | ------------- | ------------------------- | ----- |
| Android / Chrome           | pending     | pending       | pending                   |       |
| Android / Samsung Internet | pending     | pending       | pending                   |       |
| iPhone / Safari            | pending     | pending       | pending                   |       |
| iPhone / Chrome (WebKit)   | pending     | pending       | pending                   |       |

## YouTube quota strategy

- `search.list` costs 100 units; the default quota allows 100 searches/day. The provider keeps a global per-day counter (`SEARCH_DAILY_CAP`, Pacific-time reset like Google's) and a 24 h LRU cache keyed by normalized query.
- Pasted links never touch `search.list`: `videos.list` (1 unit) with a key, or keyless oEmbed without one (duration unknown → the player reports it).
- Playlist links expand through `playlistItems.list` (1 unit per 50 items), capped at 50.
- Per-participant limiter: 10 searches/minute.

## Scaling notes (post-MVP)

One Node process comfortably serves hundreds of rooms. To run several instances: add the Socket.IO Redis adapter and move room state to Redis (or pin rooms to instances by code hash). The `RoomManager` is the only stateful component, so this is a contained change.
