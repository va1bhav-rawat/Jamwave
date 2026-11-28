import type { MetadataRoute } from 'next';
import { APP_URL } from '@/lib/env';

/** Jam rooms are private invitations; the rest is internal plumbing or signed-in pages. */
const DISALLOW = ['/jam/', '/api/', '/ingest/', '/settings', '/people'];

/**
 * Crawlers behind AI answers are allowed on purpose: a small free product wants to be cited, and
 * there is nothing here worth hiding from them.
 */
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: '/', disallow: DISALLOW })),
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
