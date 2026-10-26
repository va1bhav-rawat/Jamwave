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
3. Every second: `drift = player.getCurrentTime() − expected`. If `|drift| > 300 ms`, `seekTo(expected + 150 ms)`; otherwise leave it alone (small seeks sound worse than small drift).
4. If the room says playing but the player is stuck in cued/unstarted (browser blocked autoplay), the UI shows a "Tap to listen along" button; the tap calls `playVideo()` from a user gesture.
5. `ENDED` → `track:ended`; player error → `track:error`. The server only trusts these from the host (or anyone when the host is away) and also runs its own timer at `updatedAt + duration − positionMs`.

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

## Room lifecycle

```
create ──► active ──(last socket drops)──► empty ──(10 min)──► closed (room:closed → expired)
             ▲  │                            │
             │  └─(socket drops)─► grace 60 s ┘ (reclaim cancels; expiry removes + host handoff)
             └──(join / reclaim)
```

Host handoff picks the earliest-joined connected participant (or the earliest disconnected one if nobody is connected).

## YouTube quota strategy

- `search.list` costs 100 units; the default quota allows 100 searches/day. The provider keeps a global per-day counter (`SEARCH_DAILY_CAP`, Pacific-time reset like Google's) and a 24 h LRU cache keyed by normalized query.
- Pasted links never touch `search.list`: `videos.list` (1 unit) with a key, or keyless oEmbed without one (duration unknown → the player reports it).
- Playlist links expand through `playlistItems.list` (1 unit per 50 items), capped at 50.
- Per-participant limiter: 10 searches/minute.

## Scaling notes (post-MVP)

One Node process comfortably serves hundreds of rooms. To run several instances: add the Socket.IO Redis adapter and move room state to Redis (or pin rooms to instances by code hash). The `RoomManager` is the only stateful component, so this is a contained change.
