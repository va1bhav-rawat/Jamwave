import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../lib/errors';
import { YouTubeProvider, parseIsoDuration, parseYouTubeUrl } from '../providers/youtube';

const VIDEO_A = 'dQw4w9WgXcQ';
const VIDEO_B = 'kJQP7kiw5Fk';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function videoItem(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    snippet: {
      title: `Title ${id}`,
      channelTitle: 'Some Artist - Topic',
      liveBroadcastContent: 'none',
      thumbnails: { medium: { url: `https://img/${id}.jpg` } },
    },
    contentDetails: { duration: 'PT3M33S' },
    status: { embeddable: true },
    ...overrides,
  };
}

function mockFetch() {
  return vi.fn(async (input: Parameters<typeof fetch>[0]): Promise<Response> => {
    const url = String(input);
    if (url.includes('/youtube/v3/search?')) {
      return jsonResponse({ items: [{ id: { videoId: VIDEO_A } }, { id: { videoId: VIDEO_B } }] });
    }
    if (url.includes('/youtube/v3/videos?')) {
      const ids = new URL(url).searchParams.get('id')?.split(',') ?? [];
      return jsonResponse({
        items: ids.map((id) =>
          id === VIDEO_B ? videoItem(id, { status: { embeddable: false } }) : videoItem(id),
        ),
      });
    }
    if (url.includes('/youtube/v3/playlistItems?')) {
      return jsonResponse({
        items: [{ contentDetails: { videoId: VIDEO_A } }, { contentDetails: { videoId: VIDEO_B } }],
      });
    }
    if (url.startsWith('https://www.youtube.com/oembed')) {
      return jsonResponse({
        title: 'OEmbed title',
        author_name: 'OEmbed Artist',
        thumbnail_url: 'https://img/oembed.jpg',
      });
    }
    return jsonResponse({ error: { errors: [{ reason: 'notFound' }] } }, 404);
  });
}

describe('parseIsoDuration', () => {
  it('parses common durations', () => {
    expect(parseIsoDuration('PT3M33S')).toBe(213_000);
    expect(parseIsoDuration('PT1H2M3S')).toBe(3_723_000);
    expect(parseIsoDuration('PT45S')).toBe(45_000);
    expect(parseIsoDuration('P1DT1S')).toBe(86_401_000);
    expect(parseIsoDuration('PT0S')).toBe(0);
  });

  it('returns 0 for unknown input', () => {
    expect(parseIsoDuration(undefined)).toBe(0);
    expect(parseIsoDuration('garbage')).toBe(0);
  });
});

describe('parseYouTubeUrl', () => {
  it('handles the common url shapes', () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/watch?v=${VIDEO_A}`)).toEqual({
      videoId: VIDEO_A,
    });
    expect(parseYouTubeUrl(`https://youtu.be/${VIDEO_A}?si=abc`)).toEqual({ videoId: VIDEO_A });
    expect(parseYouTubeUrl(`youtube.com/shorts/${VIDEO_A}`)).toEqual({ videoId: VIDEO_A });
    expect(
      parseYouTubeUrl(`https://music.youtube.com/watch?v=${VIDEO_A}&list=PL123456789`),
    ).toEqual({ videoId: VIDEO_A, playlistId: 'PL123456789' });
    expect(parseYouTubeUrl('https://www.youtube.com/playlist?list=PLabcdefghij')).toEqual({
      playlistId: 'PLabcdefghij',
    });
    expect(parseYouTubeUrl(VIDEO_A)).toEqual({ videoId: VIDEO_A });
  });

  it('rejects non-youtube input', () => {
    expect(parseYouTubeUrl('https://example.com/watch?v=abc')).toBeNull();
    expect(parseYouTubeUrl('hello world')).toBeNull();
    expect(parseYouTubeUrl('')).toBeNull();
  });
});

describe('YouTubeProvider', () => {
  it('searches, hydrates, filters unplayable videos and caches', async () => {
    const fetchFn = mockFetch();
    const provider = new YouTubeProvider({ apiKey: 'k', fetchFn, dailySearchCap: 10 });
    const first = await provider.search('Never Gonna  Give You Up');
    expect(first.cached).toBe(false);
    expect(first.results).toHaveLength(1);
    expect(first.results[0]).toMatchObject({
      provider: 'youtube',
      providerId: VIDEO_A,
      artist: 'Some Artist',
      durationMs: 213_000,
      thumbnailUrl: `https://img/${VIDEO_A}.jpg`,
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);

    const second = await provider.search('never gonna give you up');
    expect(second.cached).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(provider.usage.searchesToday).toBe(1);
  });

  it('refuses to search without an api key but still resolves links via oEmbed', async () => {
    const fetchFn = mockFetch();
    const provider = new YouTubeProvider({ fetchFn });
    expect(provider.searchEnabled).toBe(false);
    await expect(provider.search('anything')).rejects.toMatchObject({ code: 'SEARCH_UNAVAILABLE' });
    const resolved = await provider.resolveUrl(`https://youtu.be/${VIDEO_A}`);
    expect(resolved.results[0]).toMatchObject({
      providerId: VIDEO_A,
      title: 'OEmbed title',
      artist: 'OEmbed Artist',
      durationMs: 0,
    });
  });

  it('expands playlists when a key is available', async () => {
    const provider = new YouTubeProvider({ apiKey: 'k', fetchFn: mockFetch() });
    const resolved = await provider.resolveUrl(
      'https://www.youtube.com/playlist?list=PLabcdefghij',
    );
    expect(resolved.results.map((r) => r.providerId)).toEqual([VIDEO_A]);
  });

  it('stops spending quota once the daily cap is reached', async () => {
    const provider = new YouTubeProvider({ apiKey: 'k', fetchFn: mockFetch(), dailySearchCap: 1 });
    await provider.search('one');
    await expect(provider.search('two')).rejects.toMatchObject({
      code: 'SEARCH_BUDGET_EXHAUSTED',
    });
  });

  it('maps quota errors from the api', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ error: { code: 403, errors: [{ reason: 'quotaExceeded' }] } }, 403),
    );
    const provider = new YouTubeProvider({ apiKey: 'k', fetchFn });
    await expect(provider.search('x')).rejects.toBeInstanceOf(AppError);
    await expect(provider.search('x')).rejects.toMatchObject({ code: 'SEARCH_BUDGET_EXHAUSTED' });
  });

  it('rejects unsupported urls', async () => {
    const provider = new YouTubeProvider({ apiKey: 'k', fetchFn: mockFetch() });
    expect(provider.canHandleUrl('https://spotify.com/track/1')).toBe(false);
    await expect(provider.resolveUrl('https://spotify.com/track/1')).rejects.toMatchObject({
      code: 'UNSUPPORTED_URL',
    });
  });
});
