import type { SearchResult } from '@jamwave/shared';
import { describe, expect, it } from 'vitest';
import { assembleTracks, toSearchResult } from './videos';

describe('toSearchResult', () => {
  it('derives the thumbnail from the id and falls back to a generic title', () => {
    expect(toSearchResult('dQw4w9WgXcQ', null)).toEqual({
      provider: 'youtube',
      providerId: 'dQw4w9WgXcQ',
      title: 'YouTube video',
      artist: '',
      thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      durationMs: 0,
    });
  });

  it('uses the cached title, channel and duration when there is a row', () => {
    const track = toSearchResult('abc', { title: 'Song', artist: 'Band', durationMs: 1000 });
    expect(track).toMatchObject({ title: 'Song', artist: 'Band', durationMs: 1000 });
  });
});

describe('assembleTracks', () => {
  it('keeps playlist order and fills unresolved ids with placeholders', () => {
    const known: SearchResult = toSearchResult('b', { title: 'B', artist: '', durationMs: 0 });
    const tracks = assembleTracks(['a', 'b', 'c'], new Map([['b', known]]));
    expect(tracks.map((t) => t.providerId)).toEqual(['a', 'b', 'c']);
    expect(tracks.map((t) => t.title)).toEqual(['YouTube video', 'B', 'YouTube video']);
  });
});
