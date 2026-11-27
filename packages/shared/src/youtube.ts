/**
 * YouTube serves a medium-quality still for every video at a URL built from its id alone, so a
 * thumbnail never has to be stored: knowing the video id is enough.
 */
export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}
