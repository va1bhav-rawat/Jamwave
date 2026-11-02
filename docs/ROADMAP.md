# Jamwave — Roadmap

## Phase 1 — MVP (this repo)

- [x] Monorepo, shared event catalogue and sync math with tests
- [x] Realtime server: rooms, master clock, reconnect grace, host handoff, expiry, YouTube provider with quota budget
- [x] Web: landing, privacy, terms, join page, room UI (stage, controls, queue, search, people, chat, reactions, share, settings)
- [x] Production builds, Docker Compose, Fly.io config, CI workflow
- [x] Landing page that sells: how it works, comparison with Spotify Jam, FAQ with structured data, sitemap, robots
- [x] Retention without a database: recent jams on the landing page, one-tap rebuild of an ended jam's queue
- [x] Server-owned track ends for keyless (oEmbed) links via `track:duration`
- [x] Abuse limits (per-IP create/join, room cap) and lifetime usage counters on `/health`
- [x] Web app manifest + icons for "Add to Home Screen"
- [ ] Deploy web (Vercel) + server (Fly.io/Railway), register `jamwave.app`
- [ ] Create YouTube API key, submit quota extension / compliance audit
- [ ] Real-device pass: iOS Safari, Android Chrome, desktop browsers
- [ ] Picture-in-picture on phones: YouTube controls on touch devices, PiP hint, seek forwarding (device results in ARCHITECTURE.md)

## Phase 2 — Keep & return

- Optional Google sign-in (Auth.js) with guests still welcome
- Postgres (Drizzle + Neon): saved jams, queue history, "resume last jam"
- Product analytics (PostHog or Plausible): rooms/day, listeners/room, session length, D7 return
- In-app install prompt (manifest and icons are done)
- Nicer host tools: kick participant, lock queue, clear queue

## Phase 3 — More music

- Audius provider (free API, full-length indie tracks, audio-only)
- Local file jams for private rooms (host streams via WebRTC)
- Lyrics panel, "DJ mode" (round-robin turns like turntable.fm)

## Phase 4 — Scale & community

- Socket.IO Redis adapter, multi-instance rooms
- Public room directory and themed rooms
- Embeddable mini-player widget for communities and streams
- Sponsorship / "buy us a coffee" page — the product stays free

## Open decisions

- Open-source license for the repository (MIT is the natural choice for a free product with a community angle)
- Whether to expose a REST API for integrations (Discord bot, etc.)
