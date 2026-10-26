import type { Provider, SearchResponse } from '@jamwave/shared';

/** A catalogue the app can search and resolve pasted links against. */
export interface MusicProvider {
  readonly id: Provider;
  /** False when no API credentials are configured (link pasting may still work). */
  readonly searchEnabled: boolean;
  search(query: string): Promise<SearchResponse>;
  canHandleUrl(url: string): boolean;
  resolveUrl(url: string): Promise<SearchResponse>;
}
