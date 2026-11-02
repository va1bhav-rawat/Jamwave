import type { MetadataRoute } from 'next';

/** Web app manifest: lets phones "Add to Home Screen" with a proper icon and a standalone window. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Jamwave — Listen together, for free',
    short_name: 'Jamwave',
    description:
      'Free synced music listening with friends. Share one link, hear the same song at the same second.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#09090b',
    theme_color: '#09090b',
    categories: ['music', 'entertainment', 'social'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
