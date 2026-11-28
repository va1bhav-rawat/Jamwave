const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const ingestHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

/**
 * Product analytics, only when a project key is configured. Cookieless (a random id in
 * localStorage), no autocapture, no session recording, no surveys; page views are counted on
 * App Router navigations; requests go through our own /ingest proxy (see next.config.ts).
 *
 * The library is loaded and started once the page is idle, so it never competes with the first
 * paint. The initial page view is still captured: PostHog records it at init time.
 */
async function start() {
  try {
    const { default: posthog } = await import('posthog-js');
    posthog.init(key!, {
      api_host: '/ingest',
      ui_host: ingestHost.replace('.i.posthog.com', '.posthog.com'),
      defaults: '2025-05-24',
      capture_pageview: 'history_change',
      capture_pageleave: true,
      autocapture: false,
      capture_dead_clicks: false,
      disable_session_recording: true,
      disable_surveys: true,
      persistence: 'localStorage',
      person_profiles: 'identified_only',
    });
  } catch (error) {
    console.warn('Analytics did not start', error);
  }
}

if (key) {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => void start(), { timeout: 2_000 });
  } else {
    setTimeout(() => void start(), 1_500);
  }
}
