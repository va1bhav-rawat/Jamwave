import type { Metadata } from 'next';

/** Public contact for privacy questions and deletion requests (required by YouTube API policies). */
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'vaibhavr325@gmail.com';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What Jamwave stores, what it does not, and how YouTube playback is handled.',
};

export default function PrivacyPage() {
  return (
    <article className="prose-invert mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-fg-subtle">Last updated: 2 November 2026</p>

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
          Jamwave uses local storage for your nickname, volume and video size, for the codes of jams
          you recently joined (so you can jump back in) and for the last queue you listened to (so
          you can rebuild a jam that ended), and session storage so that refreshing the page keeps
          your seat in a jam. All of it stays in your browser. We do not use advertising or
          cross-site tracking cookies.
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
          . Jamwave does not use YouTube sign-in and never accesses anyone&apos;s YouTube account or
          personal YouTube data.
        </p>
        <p>
          What we do use from YouTube API Services is public video information: titles, channel
          names, thumbnails and durations. Search queries are sent to YouTube to find videos.
          Results are shown to you and, when you add a song, to the other people in your jam. Our
          server keeps search results in memory for at most 24 hours to avoid repeating the same
          request, and the last queue you listened to is kept in your browser for at most 30 days.
          We do not share this information with anyone else.
        </p>
      </section>

      <section className="mt-10 space-y-4 text-fg-muted">
        <h2 className="text-xl font-semibold text-fg">Deleting your data</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Jam content is deleted automatically ten minutes after the last person leaves a jam.
          </li>
          <li>
            Search results cached on our server are deleted automatically after at most 24 hours.
          </li>
          <li>
            Everything stored in your browser (nickname, preferences, recent jams, last queue) can
            be removed at any time by clearing this site&apos;s data in your browser settings. A
            saved queue is removed automatically after 30 days.
          </li>
          <li>
            You can also ask us to delete anything related to you by writing to the contact address
            below; we will reply within 7 days.
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-4 text-fg-muted">
        <h2 className="text-xl font-semibold text-fg">Children</h2>
        <p>
          Jamwave is not directed at children under 13 and we do not knowingly collect their data.
        </p>
      </section>

      <section className="mt-10 space-y-4 text-fg-muted">
        <h2 className="text-xl font-semibold text-fg">Contact</h2>
        <p>
          Questions or deletion requests:{' '}
          <a className="text-fg underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>
    </article>
  );
}
