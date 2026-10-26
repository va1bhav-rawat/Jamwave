import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What Jamwave stores, what it does not, and how YouTube playback is handled.',
};

export default function PrivacyPage() {
  return (
    <article className="prose-invert mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-fg-subtle">Last updated: 26 October 2026</p>

      <section className="mt-10 space-y-4 text-fg-muted">
        <h2 className="text-xl font-semibold text-fg">The short version</h2>
        <p>
          Jamwave has no accounts and no advertising. We keep as little as we can, for as short a
          time as we can, and we never sell data.
        </p>
      </section>

      <section className="mt-10 space-y-4 text-fg-muted">
        <h2 className="text-xl font-semibold text-fg">What we process</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-fg">Nickname.</strong> The name you type is shown to other
            people in the same jam. It is stored in your own browser so you do not have to retype
            it.
          </li>
          <li>
            <strong className="text-fg">Jam content.</strong> The queue, playback state, chat
            messages and reactions of a jam are held in the memory of our realtime server only while
            the jam is active. A jam is deleted ten minutes after the last participant leaves. We do
            not write jam content to a database.
          </li>
          <li>
            <strong className="text-fg">Technical data.</strong> Like any web service, our servers
            see your IP address and browser details while you are connected, and may keep
            short-lived logs for abuse prevention and debugging.
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-4 text-fg-muted">
        <h2 className="text-xl font-semibold text-fg">Browser storage</h2>
        <p>
          Jamwave uses local storage for your nickname and volume, and session storage so that
          refreshing the page keeps your seat in a jam. We do not use advertising or cross-site
          tracking cookies.
        </p>
      </section>

      <section className="mt-10 space-y-4 text-fg-muted">
        <h2 className="text-xl font-semibold text-fg">YouTube</h2>
        <p>
          Music is played through the YouTube embedded player and search uses YouTube API Services.
          By using Jamwave you agree to be bound by the{' '}
          <a
            className="text-fg underline"
            href="https://www.youtube.com/t/terms"
            target="_blank"
            rel="noopener noreferrer"
          >
            YouTube Terms of Service
          </a>
          . The embedded player is provided by Google and is subject to the{' '}
          <a
            className="text-fg underline"
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Privacy Policy
          </a>
          . Jamwave does not store any YouTube user data; search queries are sent to YouTube only to
          find videos and may be cached briefly on our server to reduce repeated requests.
        </p>
      </section>

      <section className="mt-10 space-y-4 text-fg-muted">
        <h2 className="text-xl font-semibold text-fg">Children</h2>
        <p>
          Jamwave is not directed at children under 13 and we do not knowingly collect their data.
        </p>
      </section>

      <section className="mt-10 space-y-4 text-fg-muted">
        <h2 className="text-xl font-semibold text-fg">Contact</h2>
        <p>Questions about privacy? Reach us through the contact details on the Jamwave website.</p>
      </section>
    </article>
  );
}
