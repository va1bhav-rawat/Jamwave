import { youtubeThumbnail, type SearchResult } from '@jamwave/shared';

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** The video id in a YouTube link (watch, youtu.be, shorts, embed, music) or a bare id. */
export function parseYouTubeVideoId(input: string): string | null {
  const value = input.trim();
  if (VIDEO_ID.test(value)) return value;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.split('/')[1] ?? null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const [, first, second] = url.pathname.split('/');
    if (first === 'watch') id = url.searchParams.get('v');
    else if (first === 'shorts' || first === 'embed' || first === 'live') id = second ?? null;
  }
  return id && VIDEO_ID.test(id) ? id : null;
}

/**
 * Look a video up through YouTube's public oEmbed endpoint (no API key, no quota).
 * The length is not available this way; players report it when the track first plays.
 */
export async function lookUpYouTubeVideo(videoId: string): Promise<SearchResult | null> {
  if (!VIDEO_ID.test(videoId)) return null;
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`,
    { signal: AbortSignal.timeout(8_000) },
  );
  // 401/403: embedding disabled or private; 404: no such video.
  if (!response.ok) return null;
  const data = (await response.json()) as { title?: unknown; author_name?: unknown };
  return {
    provider: 'youtube',
    providerId: videoId,
    title: typeof data.title === 'string' ? data.title.slice(0, 300) : 'YouTube video',
    artist: typeof data.author_name === 'string' ? data.author_name.slice(0, 200) : '',
    thumbnailUrl: youtubeThumbnail(videoId),
    durationMs: 0,
  };
}
