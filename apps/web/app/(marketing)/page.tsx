import { Comparison } from '@/components/marketing/Comparison';
import { Faq } from '@/components/marketing/Faq';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { JoinForm } from '@/components/marketing/JoinForm';
import { RecentJams } from '@/components/marketing/RecentJams';
import { StartJamDialog } from '@/components/marketing/StartJamDialog';
import { Button } from '@/components/ui/button';
import { APP_URL } from '@/lib/env';

const appJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Jamwave',
  url: APP_URL,
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any (web browser)',
  description:
    'Free synced music listening with friends: one link, a shared YouTube queue, chat and reactions. No app, no account, no subscription.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-fg-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          No subscription. No app. No account.
        </span>
        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
          Listen together. <span className="gradient-text">For free.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-fg-muted sm:text-xl">
          Share one link and hear the same song at the same second with friends and loved ones.
          Anyone can add to the queue; everyone stays in sync.
        </p>
        <div className="mt-10 flex w-full max-w-xl flex-col items-center gap-4 sm:flex-row">
          <StartJamDialog>
            <Button size="lg" className="w-full sm:w-auto sm:px-8">
              Start a jam
            </Button>
          </StartJamDialog>
          <JoinForm className="sm:flex-1" />
        </div>
        <RecentJams className="mt-10" />
        <p className="mt-10 text-xs text-fg-subtle">
          Music plays through YouTube&apos;s official player · up to 50 listeners · sync within a
          third of a second
        </p>
      </section>

      <HowItWorks />
      <Comparison />
      <Faq />

      <section className="mx-auto max-w-3xl px-4 pb-24 pt-8 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready when you are</h2>
        <p className="mt-3 text-fg-muted">A jam takes ten seconds to start and nothing to join.</p>
        <div className="mt-8 flex justify-center">
          <StartJamDialog>
            <Button size="lg" className="px-8">
              Start a jam
            </Button>
          </StartJamDialog>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />
    </>
  );
}
