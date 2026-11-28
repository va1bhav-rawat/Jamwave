import { aboutPage } from './about';
import { guides } from './guides';
import { helpPage } from './help';
import type { ContentPage } from './types';

export type { ContentPage } from './types';

/** Every evergreen page, in the order they are listed in footers and sitemaps. */
export const contentPages: ContentPage[] = [...guides, helpPage, aboutPage];

/** The pages that get a card in the landing page's "Made for…" section. */
export const useCasePages = contentPages.filter((page) => page.useCase);

export function getPage(slug: string): ContentPage | undefined {
  return contentPages.find((page) => page.slug === slug);
}
