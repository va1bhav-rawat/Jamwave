import posthog from 'posthog-js';

/**
 * Product analytics (PostHog). Everything here is a no-op until NEXT_PUBLIC_POSTHOG_KEY is set;
 * `instrumentation-client.ts` does the initialisation.
 *
 * Properties are small categorical values only: never song titles or video ids (YouTube data is
 * not shared with anyone), never chat, nicknames or email addresses.
 */
export const analyticsEnabled = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

export type AnalyticsEvent =
  | ['jam_created', { from: 'fresh' | 'rebuild' | 'playlist'; seeded_tracks: number; page: string }]
  /** A primary button was pressed; `page` is the path it lived on, `cta` which one. */
  | ['cta_clicked', { page: string; cta: string }]
  | ['jam_joined', { via: 'link' | 'friend' }]
  | [
      'search',
      { kind: 'query' | 'link'; source: 'typed' | 'quick_pick'; results: number; cached: boolean },
    ]
  | ['track_added', { via: 'search' | 'link' | 'add_all' | 'playlist'; count: number; play_next: boolean }]
  | ['invite_shared', { method: 'copy' | 'share' }]
  | ['signed_up', { method: 'password' }]
  | ['signed_in', { method: 'password' }]
  | ['playlist_created', { from: 'page' | 'jam'; tracks: number }]
  | ['playlist_saved', { tracks: number }]
  | ['friend_requested', Record<string, never>]
  | ['friend_accepted', Record<string, never>];

type EventName = AnalyticsEvent[0];
type PropsOf<N extends EventName> = Extract<AnalyticsEvent, [N, unknown]>[1];

/** The path of the page the person is on, for attributing conversions to content pages. */
export function currentPage(): string {
  return typeof window === 'undefined' ? '' : window.location.pathname;
}

/** Count something. `instant` sends right away, for events just before a full page navigation. */
export function track<N extends EventName>(
  name: N,
  props: PropsOf<N>,
  { instant = false }: { instant?: boolean } = {},
): void {
  if (!analyticsEnabled) return;
  try {
    posthog.capture(name, props, instant ? { send_instantly: true } : undefined);
  } catch {
    // Analytics must never break the app.
  }
}

/** Tie this browser's events to an account id (never the email) while signed in. */
export function identify(userId: string): void {
  if (!analyticsEnabled) return;
  try {
    posthog.identify(userId);
  } catch {
    // ignore
  }
}

/** After sign-out or account deletion: a fresh anonymous id. */
export function resetIdentity(): void {
  if (!analyticsEnabled) return;
  try {
    posthog.reset();
  } catch {
    // ignore
  }
}
