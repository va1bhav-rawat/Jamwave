import { JoinForm } from '@/components/marketing/JoinForm';
import { StartJamDialog } from '@/components/marketing/StartJamDialog';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
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
      </p>
      <div className="mt-10 flex w-full max-w-xl flex-col items-center gap-4 sm:flex-row">
        <StartJamDialog>
          <Button size="lg" className="w-full sm:w-auto sm:px-8">
            Start a jam
          </Button>
        </StartJamDialog>
        <JoinForm className="sm:flex-1" />
      </div>
    </section>
  );
}
