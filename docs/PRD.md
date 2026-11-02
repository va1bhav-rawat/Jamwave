# Jamwave — Product Requirements (MVP)

_Last updated: 2026-10-26_

## Problem

Listening to music together while apart is a small but real joy: couples in different cities, friends studying late, families, gaming groups. Spotify solved it with "Jam", but every participant needs Spotify Premium. Everyone else is stuck sharing links and counting down "3, 2, 1, play".

## Goal

A free, browser-based jam session: one link, everyone hears the same song at the same moment, everyone can add to the queue, with chat and reactions. Zero sign-up friction.

## Non-goals (MVP)

- Accounts, saved playlists, listening history
- Spotify / Apple Music integration (Spotify's API is closed to free public apps as of 2026)
- Native mobile apps; background audio with the screen off (picture-in-picture while using other apps is supported where the browser offers it)
- Voice chat, video chat
- Public discovery of rooms

## Personas

| Persona               | Need                                               | Key moment                                         |
| --------------------- | -------------------------------------------------- | -------------------------------------------------- |
| Long-distance partner | Feel close through shared music                    | Opens link on phone, hears the same song instantly |
| Study / work group    | Shared focus playlist, no one DJing                | Anyone adds tracks, vote-skip the bad ones         |
| Party host            | Guests add songs without touching the host's phone | QR on the fridge, host keeps control               |
| Discord / gaming crew | Background music for a session                     | Paste a playlist link, done                        |

## User stories

1. As a host, I can start a jam with just a nickname and get a link, a code and a QR to share.
2. As a guest, I can open the link, type a nickname and be listening within seconds.
3. As anyone in the jam, I can search YouTube or paste a link to add songs; I can remove songs I added.
4. As anyone with control, I can play, pause, seek, skip and reorder the queue, and everyone follows.
5. As a listener, I can vote to skip; a majority skips.
6. As a host, I can decide whether everyone or only I can control playback, and I can hand the host role to someone else.
7. As anyone, I can chat and send emoji reactions.
8. If my connection drops or I refresh, I come back to the same seat and the same moment of the song.
9. If the host disappears, someone else becomes host automatically.

## Functional requirements

- Rooms: 6-character codes without ambiguous characters; max 50 participants; queue of up to 200 tracks; chat history of 100 messages.
- Sync: target drift < 300 ms; late joiners start at the current position; pause/seek/skip propagate to everyone within one round trip.
- Catalogue: YouTube Data API v3 search (10 results, embeddable + syndicated only), video and playlist link resolution, keyless oEmbed fallback.
- Lifecycle: 60 s reconnect grace; 10 min empty-room TTL; server-side track-end scheduling with host confirmation.
- Compliance: embedded player visible and ≥ 200×200 while playing; YouTube ToS + Google privacy links; Privacy and Terms pages.

## Non-functional requirements

- Works in current Chrome, Safari (incl. iOS), Firefox, Edge; responsive down to 360 px.
- Single-instance server handles hundreds of concurrent rooms (state is tiny; broadcast is full snapshots).
- No persistent storage required for MVP.
- Free-tier friendly hosting (Vercel + Fly.io/Railway).

## Success metrics (Phase 2 instrumentation)

- Rooms created per day; % rooms with ≥ 2 listeners; % with ≥ 3
- Median listeners per room, median session length
- Tracks added per room; vote-skip rate
- D1 / D7 return rate of hosts
- Share-link click-through → join conversion

## Risks

| Risk                                    | Mitigation                                                                                                                                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| YouTube search quota (100/day default)  | 24 h cache, paste-link path is free, daily cap with friendly fallback, apply for extension early                                                                                                    |
| Mobile autoplay restrictions            | Explicit "Tap to listen" gesture; detect stalled player and prompt                                                                                                                                  |
| Region-blocked / removed videos         | Player error → auto-skip with a system message                                                                                                                                                      |
| Abuse (spam, floods)                    | Per-participant rate limits, payload validation, room size limits                                                                                                                                   |
| Host leaves mid-jam                     | Grace period + automatic host handoff                                                                                                                                                               |
| Slow connections (seek → rebuffer loop) | Buffer-aware, backing-off sync (`SyncCorrector`): stutter-free beats sub-second sync; offset may reach ~2.4 s while a connection struggles and tightens within a minute; "smaller video" preference |
