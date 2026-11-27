import { existsSync } from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

// The monorepo keeps one root .env; Next.js only reads env files next to the app.
// Variables already set (Vercel, Docker, apps/web/.env.local) are not overridden.
const rootEnv = path.resolve(process.cwd(), '../../.env');
if (existsSync(rootEnv)) {
  try {
    process.loadEnvFile(rootEnv);
  } catch {
    // A malformed env file is ignored; explicit env vars still apply.
  }
}

// PostHog requests go through our own origin so ad blockers do not drop them.
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';
const posthogAssets = posthogHost.replace('.i.posthog.com', '-assets.i.posthog.com');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle for the Docker image (ignored by Vercel).
  output: 'standalone',
  transpilePackages: ['@jamwave/shared'],
  // PostHog's API paths end with a slash; without this Next would redirect them.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: `${posthogAssets}/static/:path*` },
      { source: '/ingest/:path*', destination: `${posthogHost}/:path*` },
    ];
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: '*.ggpht.com' },
      // Google account avatars
      { protocol: 'https', hostname: '*.googleusercontent.com' },
    ],
  },
};

export default nextConfig;
