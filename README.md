# Jamwave

**Listen together. For free.** Jamwave is a web app for synchronized music listening with friends and loved ones — the idea behind Spotify's "Jam", without the Premium requirement. One person starts a jam, shares a link or a 6-character code, and everyone hears the same song at the same second, adds to one shared queue, chats and reacts. No app, no account, no subscription.

Music plays through YouTube's official embedded player, so the catalogue is enormous and nobody needs to pay anything.

## Features (MVP)

- Create a jam in two taps; share a link, code or QR
- Join with a nickname only — no sign-up
- Search YouTube or paste a video / playlist link into a shared queue (reorder, play next, remove)
- Server-authoritative sync: every browser follows one master clock, drift corrected under ~300 ms
- Play / pause / seek / skip / add songs: the host decides who may, for everyone at once or person by person, and can remove people from the jam; majority vote-to-skip
- Playlists for accounts: save songs from a jam or by YouTube link, add a playlist to any jam's queue, or start a jam from one
- Public profiles (`/u/<username>`) with playlists and friends; find people and send friend requests on `/people`
- Participants list, host handoff on disconnect, seat reclaim on refresh
- Chat and floating emoji reactions
- Rooms live in memory and expire 10 minutes after the last listener leaves; the queue is remembered on each device so an ended jam can be rebuilt in one tap, and recent jams are offered on the landing page
- Server-owned track ends even for links pasted without an API key (players report the length once)
- Mobile-first dark UI; landing page with how-it-works, comparison and FAQ (with structured data), privacy and terms pages, rich link previews, web app manifest for "Add to Home Screen", sitemap and robots
- Abuse limits: per-IP caps on creating and joining jams, a hard cap on live rooms, per-participant chat and search limits
- Lifetime usage counters (rooms created, joins, tracks added, peak concurrency) on `/health`

## Stack

| Layer           | Choice                                                                                |
| --------------- | ------------------------------------------------------------------------------------- |
| Web             | Next.js 16 (App Router), React 19, Tailwind CSS 4, Radix primitives, Zustand, dnd-kit |
| Realtime server | Node 24, Socket.IO 4, zod, pino                                                       |
| Shared          | `@jamwave/shared`: types, event catalogue, zod schemas, sync math                     |
| Tooling         | pnpm workspaces, TypeScript 5.9, Vitest, ESLint, Prettier, tsup                       |

```
apps/web        Next.js app (landing + jam room UI)
apps/server     Socket.IO realtime server (rooms, clock, YouTube provider)
packages/shared Types, events, schemas and sync helpers used by both
docs/           Private planning notes (not published)
```

## Quick start

Requirements: Node 24+, pnpm 12+ (`corepack enable` gives you pnpm).

```bash
pnpm install
cp .env.example .env        # optional: add YOUTUBE_API_KEY for search
pnpm dev                    # web on http://localhost:3000, server on http://localhost:4000
```

Open http://localhost:3000, start a jam, then open the jam link in a second browser (or an incognito window) to see sync in action. Without a YouTube API key, searching is disabled but pasting YouTube links works.

### Scripts

| Command                                        | What it does                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `pnpm dev`                                     | Run web + server with hot reload                                                |
| `pnpm build`                                   | Production builds (Next.js standalone, server bundle in `apps/server/dist`)     |
| `pnpm test`                                    | Vitest: sync math, room state machine, YouTube provider, end-to-end socket flow |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | Type, lint and formatting checks                                                |

## Configuration

All variables live in one root `.env` (see `.env.example`).

| Variable                      | Used by | Default                    | Notes                                                                                                                 |
| ----------------------------- | ------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `PORT`                        | server  | `4000`                     |                                                                                                                       |
| `CORS_ORIGIN`                 | server  | `http://localhost:3000`    | Comma-separated browser origins                                                                                       |
| `YOUTUBE_API_KEY`             | server  | —                          | Enables search and playlist import. Without it, link pasting still works via oEmbed                                   |
| `ROOM_EMPTY_TTL_MINUTES`      | server  | `10`                       | How long an empty room survives                                                                                       |
| `RECLAIM_GRACE_SECONDS`       | server  | `60`                       | Reconnect window that keeps a seat (and the host role)                                                                |
| `SEARCH_RATE_PER_MINUTE`      | server  | `10`                       | Per-participant search limit                                                                                          |
| `SEARCH_DAILY_CAP`            | server  | `95`                       | Global `search.list` budget per day (YouTube's default quota allows 100)                                              |
| `ROOM_CREATE_RATE_PER_MINUTE` | server  | `5`                        | New jams per minute per client address                                                                                |
| `ROOM_JOIN_RATE_PER_MINUTE`   | server  | `30`                       | Fresh joins per minute per client address (reclaims after a refresh are free)                                         |
| `MAX_ROOMS`                   | server  | `5000`                     | Hard cap on live rooms; creation answers `SERVER_BUSY` beyond it                                                      |
| `TRUST_PROXY_HOPS`            | server  | `1`                        | Proxies in front of the server; the client IP is read that far from the end of `x-forwarded-for` (0 = socket address) |
| `MAX_CONNECTIONS_PER_IP`      | server  | `20`                       | Sockets allowed per client address                                                                                    |
| `LOG_LEVEL`                   | server  | `info`                     | pino level                                                                                                            |
| `NEXT_PUBLIC_SOCKET_URL`      | web     | `http://localhost:4000`    | Public URL of the realtime server                                                                                     |
| `NEXT_PUBLIC_APP_URL`         | web     | `http://localhost:3000`    | Public URL of the web app (share links, metadata)                                                                     |
| `SOCKET_INTERNAL_URL`         | web     | = `NEXT_PUBLIC_SOCKET_URL` | Server-side URL for link previews (e.g. a private network address)                                                    |

### Getting a YouTube API key

1. Create a project in the [Google Cloud console](https://console.cloud.google.com/) and enable **YouTube Data API v3**.
2. Create an **API key** and restrict it to the YouTube Data API.
3. Put it in `.env` as `YOUTUBE_API_KEY`.

The default quota allows ~100 searches per day; Jamwave caches searches for 24 h, never spends quota on pasted links, and falls back gracefully when the budget is used up. To raise the limit, submit the [quota extension / compliance audit form](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits) once the site is live (the Privacy and Terms pages exist for this reason).

## Deployment

The two apps deploy independently:

- **Web** → [Vercel](https://vercel.com) (root directory `apps/web`, framework Next.js, env `NEXT_PUBLIC_SOCKET_URL` + `NEXT_PUBLIC_APP_URL`).
- **Server** → any host that keeps a Node process alive with WebSockets: [Render](https://render.com) (what production uses), [Fly.io](https://fly.io) (`apps/server/fly.toml` included), Railway, or your own VPS. Set `CORS_ORIGIN` to the web app's origin and `TRUST_PROXY_HOPS=1` behind the host's proxy.

## Production

| Piece  | Where                                             | Notes                                                                                                                                                                                                        |
| ------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Web    | https://jamwave.vercel.app                        | Vercel, root directory `apps/web`. Needs `NEXT_PUBLIC_SOCKET_URL` and `NEXT_PUBLIC_APP_URL` set.                                                                                                             |
| Server | `https://<render-service>.onrender.com` (fill in) | Render free tier, kept awake by an uptime pinger. A cold start can take up to a minute; the web app shows a "server waking up" hint meanwhile. Needs `CORS_ORIGIN`, `TRUST_PROXY_HOPS=1`, `YOUTUBE_API_KEY`. |
| Health | `GET /health` on the server                       | `ok`, uptime, live rooms, lifetime counters, search budget used today.                                                                                                                                       |

Rooms live in the server's memory. A deploy closes every jam with reason `server_restart`; each browser keeps its queue locally and offers to rebuild the jam in one tap.

Or run both with Docker on one machine:

```bash
docker compose up --build
```

Sync works on a server-owned clock: the server stores when each track started, and every player follows that position, correcting only where the video is already buffered so slow connections do not stutter.

## License

[MIT](LICENSE).
