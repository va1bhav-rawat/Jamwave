import type { MetadataRoute } from 'next';
import { APP_URL } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Jam rooms are private invitations.
      { userAgent: '*', allow: '/', disallow: ['/jam/'] },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
