import { LIMITS, type SearchResponse, type SearchResult } from '@jamwave/shared';
import { AppError } from '../lib/errors';
import type { Logger } from '../lib/logger';
import { LruCache } from '../lib/lru';
import type { MusicProvider } from './types';

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const OEMBED_URL = 'https://www.youtube.com/oembed';
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export interface YouTubeProviderOptions {
  apiKey?: string;
  fetchFn?: typeof fetch;
  now?: () => number;
  /** Max `search.list` calls per (Pacific) day; YouTube's default allocation is 100. */
  dailySearchCap?: number;
  cacheTtlMs?: number;
  cacheSize?: number;
  maxResults?: number;
  logger?: Logger;
}

export interface ParsedYouTubeUrl {
  videoId?: string;
  playlistId?: string;
}

interface YtError {
  error?: { code?: number; errors?: { reason?: string }[] };
}

interface YtSearchResponse extends YtError {
  items?: { id?: { videoId?: string } }[];
}

type Thumbnails = Record<string, { url?: string } | undefined> | undefined;

interface YtVideo {
  id: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    liveBroadcastContent?: string;
    thumbnails?: Thumbnails;
  };
  contentDetails?: { duration?: string };
  status?: { embeddable?: boolean };
}

interface YtVideosResponse extends YtError {
  items?: YtVideo[];
}

interface YtPlaylistItemsResponse extends YtError {
  items?: { contentDetails?: { videoId?: string } }[];
}

interface OEmbedResponse {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
}

/** ISO-8601 duration ("PT3M25S") to milliseconds. Unknown / malformed → 0. */
export function parseIsoDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!match) return 0;
  const [, d, h, m, s] = match;
  const seconds =
    Number(d ?? 0) * 86_400 + Number(h ?? 0) * 3_600 + Number(m ?? 0) * 60 + Number(s ?? 0);
  return seconds * 1_000;
}

/** Extract a video id and/or playlist id from the many YouTube URL shapes. */
export function parseYouTubeUrl(input: string): ParsedYouTubeUrl | null {
  const raw = input.trim();
  if (!raw) return null;
  if (VIDEO_ID_RE.test(raw)) return { videoId: raw };
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  const result: ParsedYouTubeUrl = {};
  const list = url.searchParams.get('list');
  if (list && /^[A-Za-z0-9_-]{10,}$/.test(list)) result.playlistId = list;

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    if (id && VIDEO_ID_RE.test(id)) result.videoId = id;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const segments = url.pathname.split('/').filter(Boolean);
    const v = url.searchParams.get('v');
    const first = segments[0];
    const second = segments[1];
    if (v && VIDEO_ID_RE.test(v)) {
      result.videoId = v;
    } else if (first && second && ['shorts', 'embed', 'live', 'v'].includes(first)) {
      if (VIDEO_ID_RE.test(second)) result.videoId = second;
    }
  } else {
    return null;
  }
  if (!result.videoId && !result.playlistId) return null;
  return result;
}

function pacificDayKey(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

function cleanArtist(channelTitle: string | undefined): string {
  return (channelTitle ?? '').replace(/\s*-\s*Topic$/i, '').trim();
}

function pickThumbnail(thumbs: Thumbnails): string {
  for (const key of ['medium', 'high', 'standard', 'default', 'maxres']) {
    const url = thumbs?.[key]?.url;
    if (url) return url;
  }
  return '';
}

export class YouTubeProvider implements MusicProvider {
  readonly id = 'youtube' as const;
  private readonly apiKey: string | undefined;
  private readonly fetchFn: typeof fetch;
  private readonly now: () => number;
  private readonly dailySearchCap: number;
  private readonly maxResults: number;
  private readonly logger: Logger | undefined;
  private readonly searchCache: LruCache<string, SearchResult[]>;
  private readonly videoCache: LruCache<string, SearchResult>;
  private readonly playlistCache: LruCache<string, SearchResult[]>;
  private dayKey = '';
  private searchesToday = 0;

  constructor(opts: YouTubeProviderOptions = {}) {
    this.apiKey = opts.apiKey;
    this.fetchFn = opts.fetchFn ?? ((input, init) => fetch(input, init));
    this.now = opts.now ?? Date.now;
    this.dailySearchCap = opts.dailySearchCap ?? 95;
    this.maxResults = opts.maxResults ?? LIMITS.SEARCH_RESULTS;
    this.logger = opts.logger;
    const ttl = opts.cacheTtlMs ?? 24 * 60 * 60_000;
    const size = opts.cacheSize ?? 2_000;
    this.searchCache = new LruCache(size, ttl, this.now);
    this.videoCache = new LruCache(size * 5, ttl, this.now);
    this.playlistCache = new LruCache(200, 60 * 60_000, this.now);
  }

  get searchEnabled(): boolean {
    return Boolean(this.apiKey);
  }

  /** Searches spent today against the daily cap (for /health and tests). */
  get usage(): { searchesToday: number; cap: number } {
    this.rollDay();
    return { searchesToday: this.searchesToday, cap: this.dailySearchCap };
  }

  async search(query: string): Promise<SearchResponse> {
    const key = query.toLowerCase().replace(/\s+/g, ' ').trim();
    const cached = this.searchCache.get(key);
    if (cached) return { results: cached, cached: true };
    if (!this.apiKey) {
      throw new AppError(
        'SEARCH_UNAVAILABLE',
        'Search is not set up on this server yet. Paste a YouTube link instead.',
      );
    }
    this.spendSearch();
    const ids = await this.searchIds(key);
    const results = await this.fetchVideos(ids);
    this.searchCache.set(key, results);
    return { results, cached: false };
  }

  canHandleUrl(url: string): boolean {
    return parseYouTubeUrl(url) !== null;
  }

  async resolveUrl(url: string): Promise<SearchResponse> {
    const parsed = parseYouTubeUrl(url);
    if (!parsed) {
      throw new AppError('UNSUPPORTED_URL', 'That does not look like a YouTube link');
    }
    if (parsed.playlistId && this.apiKey) {
      const cachedList = this.playlistCache.get(parsed.playlistId);
      if (cachedList) return { results: cachedList, cached: true };
      const ids = await this.playlistVideoIds(parsed.playlistId);
      if (ids.length > 0) {
        const results = await this.fetchVideos(ids);
        this.playlistCache.set(parsed.playlistId, results);
        return { results, cached: false };
      }
      // Fall through to the single video (e.g. a radio "mix" that cannot be listed).
    }
    if (parsed.videoId) {
      const cachedVideo = this.videoCache.get(parsed.videoId);
      if (cachedVideo) return { results: [cachedVideo], cached: true };
      const results = this.apiKey
        ? await this.fetchVideos([parsed.videoId])
        : [await this.oembed(parsed.videoId)];
      if (results.length === 0) {
        throw new AppError('NOT_FOUND', 'That video is unavailable or cannot be embedded');
      }
      return { results, cached: false };
    }
    throw new AppError(
      'SEARCH_UNAVAILABLE',
      'Playlist import needs a YouTube API key on the server. Paste individual video links instead.',
    );
  }

  // ---------------------------------------------------------------- internals

  private rollDay(): void {
    const key = pacificDayKey(this.now());
    if (key !== this.dayKey) {
      this.dayKey = key;
      this.searchesToday = 0;
    }
  }

  private spendSearch(): void {
    this.rollDay();
    if (this.searchesToday >= this.dailySearchCap) {
      throw new AppError(
        'SEARCH_BUDGET_EXHAUSTED',
        "Today's free search budget is used up. Paste a YouTube link instead — that always works.",
      );
    }
    this.searchesToday++;
  }

  private async apiGet<T extends YtError>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${API_BASE}/${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set('key', this.apiKey ?? '');
    let response: Response;
    try {
      response = await this.fetchFn(url, { headers: { accept: 'application/json' } });
    } catch (error) {
      this.logger?.warn({ err: error, path }, 'youtube request failed');
      throw new AppError('SEARCH_UNAVAILABLE', 'Could not reach YouTube. Try again in a moment.');
    }
    const body = (await response.json().catch(() => ({}))) as T;
    if (!response.ok) {
      const reason = body.error?.errors?.[0]?.reason ?? '';
      this.logger?.warn({ status: response.status, reason, path }, 'youtube api error');
      if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
        throw new AppError(
          'SEARCH_BUDGET_EXHAUSTED',
          "YouTube's daily quota is used up. Paste a YouTube link instead — that always works.",
        );
      }
      throw new AppError('SEARCH_UNAVAILABLE', 'YouTube returned an error. Try again in a moment.');
    }
    return body;
  }

  private async searchIds(query: string): Promise<string[]> {
    const body = await this.apiGet<YtSearchResponse>('search', {
      part: 'snippet',
      type: 'video',
      videoEmbeddable: 'true',
      videoSyndicated: 'true',
      maxResults: String(this.maxResults),
      q: query,
    });
    const ids: string[] = [];
    for (const item of body.items ?? []) {
      const id = item.id?.videoId;
      if (id && VIDEO_ID_RE.test(id)) ids.push(id);
    }
    return ids;
  }

  private async playlistVideoIds(playlistId: string): Promise<string[]> {
    const body = await this.apiGet<YtPlaylistItemsResponse>('playlistItems', {
      part: 'contentDetails',
      maxResults: String(LIMITS.PLAYLIST_IMPORT_MAX),
      playlistId,
    });
    const ids: string[] = [];
    for (const item of body.items ?? []) {
      const id = item.contentDetails?.videoId;
      if (id && VIDEO_ID_RE.test(id)) ids.push(id);
    }
    return ids;
  }

  /** Hydrate ids into results (order preserved, unplayable videos dropped). */
  private async fetchVideos(ids: string[]): Promise<SearchResult[]> {
    const unique = [...new Set(ids)];
    const missing = unique.filter((id) => !this.videoCache.has(id));
    for (let i = 0; i < missing.length; i += 50) {
      const chunk = missing.slice(i, i + 50);
      const body = await this.apiGet<YtVideosResponse>('videos', {
        part: 'snippet,contentDetails,status',
        id: chunk.join(','),
        maxResults: '50',
      });
      for (const video of body.items ?? []) {
        const result = this.toResult(video);
        if (result) this.videoCache.set(video.id, result);
      }
    }
    const results: SearchResult[] = [];
    for (const id of unique) {
      const hit = this.videoCache.get(id);
      if (hit) results.push(hit);
    }
    return results;
  }

  private toResult(video: YtVideo): SearchResult | null {
    if (!video.id || !VIDEO_ID_RE.test(video.id)) return null;
    if (video.status?.embeddable === false) return null;
    const live = video.snippet?.liveBroadcastContent;
    if (live && live !== 'none') return null;
    return {
      provider: 'youtube',
      providerId: video.id,
      title: video.snippet?.title ?? 'Untitled',
      artist: cleanArtist(video.snippet?.channelTitle),
      thumbnailUrl: pickThumbnail(video.snippet?.thumbnails),
      durationMs: parseIsoDuration(video.contentDetails?.duration),
    };
  }

  /** Keyless metadata lookup; duration is unknown (0) so clients report track end. */
  private async oembed(videoId: string): Promise<SearchResult> {
    const url = new URL(OEMBED_URL);
    url.searchParams.set('url', `https://www.youtube.com/watch?v=${videoId}`);
    url.searchParams.set('format', 'json');
    let response: Response;
    try {
      response = await this.fetchFn(url, { headers: { accept: 'application/json' } });
    } catch {
      throw new AppError('SEARCH_UNAVAILABLE', 'Could not reach YouTube. Try again in a moment.');
    }
    if (!response.ok) {
      throw new AppError('NOT_FOUND', 'That video is unavailable or cannot be embedded');
    }
    const body = (await response.json().catch(() => ({}))) as OEmbedResponse;
    const result: SearchResult = {
      provider: 'youtube',
      providerId: videoId,
      title: body.title ?? 'Untitled',
      artist: cleanArtist(body.author_name),
      thumbnailUrl: body.thumbnail_url ?? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      durationMs: 0,
    };
    this.videoCache.set(videoId, result);
    return result;
  }
}
