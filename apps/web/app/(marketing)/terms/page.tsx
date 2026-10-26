import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The simple rules for using Jamwave.',
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-fg-subtle">Last updated: 26 October 2026</p>

      <div className="mt-10 space-y-8 text-fg-muted">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">1. The service</h2>
          <p>
            Jamwave lets a group of people listen to music together in sync through a shared queue.
            Playback uses the YouTube embedded player. The service is provided free of charge, as
            is, and may change or pause at any time.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">2. YouTube terms</h2>
          <p>
            By using Jamwave you agree to be bound by the{' '}
            <a
              className="text-fg underline"
              href="https://www.youtube.com/t/terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              YouTube Terms of Service
            </a>
            . Content played in a jam belongs to its respective owners and is streamed directly from
            YouTube; Jamwave does not host, download or modify any media.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">3. Acceptable use</h2>
          <p>
            Be kind. Do not use Jamwave to harass people, to share illegal content, or to attack the
            service. Hosts may remove participants and we may close jams that break these rules.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">4. No warranty</h2>
          <p>
            Jamwave is provided without warranties of any kind. We are not liable for lost jams,
            interrupted playback, or any damages arising from use of the service, to the fullest
            extent permitted by law.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">5. Changes</h2>
          <p>
            We may update these terms. Continued use after an update means you accept the new terms.
          </p>
        </section>
      </div>
    </article>
  );
}
