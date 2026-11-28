import type { Metadata } from 'next';
import Link from 'next/link';
import { Faq } from '@/components/marketing/Faq';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { JoinForm } from '@/components/marketing/JoinForm';
import { RecentJams } from '@/components/marketing/RecentJams';
import { StartJamDialog } from '@/components/marketing/StartJamDialog';
import { WhyNotJustLinks } from '@/components/marketing/WhyNotJustLinks';
import { Button } from '@/components/ui/button';
import { landingFaq } from '@/content/faq';
import { JsonLd, webApplicationJsonLd } from '@/lib/seo';
import { FACTS } from '@/lib/site-facts';

export const metadata: Metadata = {
  title: { absolute: 'Jamwave — Listen to Music Together Online, Free' },
  description:
    'Share one link and everyone hears the same song at the same second. Free, no ads, no app, no account to join. Up to 50 people, one shared queue.',
};

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-fg-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          No app. No account to join. Free.
        </span>
        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
          Listen together. <span className="gradient-text">For free.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-fg-muted sm:text-xl">
          Share one link or a 6-character code and everyone hears the same song at the same second,
          on any phone or laptop. Nothing to install, no account to join.
        </p>
        <div className="mt-10 flex w-full max-w-xl flex-col items-center gap-4 sm:flex-row">
          <StartJamDialog cta="hero">
            <Button size="lg" className="w-full sm:w-auto sm:px-8">
              Start a jam — free
            </Button>
          </StartJamDialog>
          <JoinForm className="sm:flex-1" />
        </div>
        <RecentJams className="mt-10" />
        <p className="mt-10 text-xs text-fg-subtle">
          {FACTS.source} Up to {FACTS.listeners} listeners. Sync {FACTS.sync}.
        </p>
        <p className="mt-2 text-xs text-fg-subtle">
          <Link href="#how-it-works" className="underline hover:text-fg">
            How it works
          </Link>
          {' · '}
          <Link href="#faq" className="underline hover:text-fg">
            Questions
          </Link>
        </p>
      </section>

      <HowItWorks />
      <WhyNotJustLinks />
      <Faq items={landingFaq} />

      <section className="mx-auto max-w-3xl px-4 pb-24 pt-8 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready when you are</h2>
        <p className="mt-3 text-fg-muted">A jam takes ten seconds to start and nothing to join.</p>
        <div className="mt-8 flex justify-center">
          <StartJamDialog cta="bottom">
            <Button size="lg" className="px-8">
              Start a jam — free
            </Button>
          </StartJamDialog>
        </div>
      </section>

      <JsonLd data={webApplicationJsonLd()} />
    </>
  );
}
