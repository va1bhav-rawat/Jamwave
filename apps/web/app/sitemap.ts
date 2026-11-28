import type { MetadataRoute } from 'next';
import { contentPages } from '@/content/pages';
import { APP_URL } from '@/lib/env';

/**
 * Hand-set dates: bump a page's date when its copy changes. A build-time "now" would tell
 * search engines everything changed on every deploy, which they soon learn to ignore.
 */
const STATIC_PAGES: { path: string; lastModified: string; priority: number }[] = [
  { path: '/', lastModified: '2026-11-28', priority: 1 },
  { path: '/join', lastModified: '2026-11-03', priority: 0.5 },
  { path: '/privacy', lastModified: '2026-11-28', priority: 0.2 },
  { path: '/terms', lastModified: '2026-10-26', priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const content = contentPages.map((page) => ({
    path: `/${page.slug}`,
    lastModified: page.lastModified,
    priority: page.kind === 'guide' ? 0.8 : 0.4,
  }));
  return [...STATIC_PAGES, ...content].map((page) => ({
    url: page.path === '/' ? `${APP_URL}/` : `${APP_URL}${page.path}`,
    lastModified: new Date(page.lastModified),
    priority: page.priority,
  }));
}
