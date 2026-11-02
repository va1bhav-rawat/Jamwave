import type { MetadataRoute } from 'next';
import { APP_URL } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Jam rooms are private invitations; the dev spike pages are not for anyone.
      { userAgent: '*', allow: '/', disallow: ['/jam/', '/dev/'] },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
