import posthog from 'posthog-js';

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const ingestHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

/**
 * Product analytics, only when a project key is configured. Cookieless (a random id in
 * localStorage), no autocapture, no session recording, no surveys; page views are counted on
 * App Router navigations; requests go through our own /ingest proxy (see next.config.ts).
 */
if (key) {
  try {
    posthog.init(key, {
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
