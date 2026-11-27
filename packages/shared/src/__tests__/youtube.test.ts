import { describe, expect, it } from 'vitest';
import { youtubeThumbnail } from '../youtube';

describe('youtubeThumbnail', () => {
  it('builds the medium-quality still URL from the video id', () => {
    expect(youtubeThumbnail('dQw4w9WgXcQ')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg');
  });
});
