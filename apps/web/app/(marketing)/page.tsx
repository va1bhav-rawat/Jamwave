import {
  Heart,
  Link2,
  ListMusic,
  MessageCircle,
  Radio,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import { JoinForm } from '@/components/marketing/JoinForm';
import { StartJamDialog } from '@/components/marketing/StartJamDialog';
import { Button } from '@/components/ui/button';

const steps = [
  {
    icon: Zap,
    title: 'Start a jam',
    body: 'Pick a nickname and you get a link, a 6-character code and a QR code. No account needed.',
  },
  {
    icon: Link2,
    title: 'Share the link',
    body: 'Friends open it on any phone, tablet or laptop, type a nickname, and they are in. Nothing to install.',
  },
  {
    icon: Radio,
    title: 'Listen in sync',
    body: 'Everyone adds songs to one shared queue and hears the same moment of the same track, wherever they are.',
  },
];

const features = [
  {
    icon: Radio,
    title: 'Perfectly in sync',
    body: 'A server-side clock keeps every listener within a fraction of a second, even when someone joins late.',
  },
  {
    icon: ListMusic,
    title: 'One shared queue',
    body: 'Anyone can add songs from YouTube by searching or pasting a link. Reorder, play next, remove.',
  },
  {
    icon: MessageCircle,
    title: 'Chat and reactions',
    body: 'Talk about the song while it plays and fire off emoji reactions that everyone sees.',
  },
  {
    icon: Users,
    title: 'Vote to skip',
    body: 'Not feeling the track? A majority vote skips it. The host can also lock controls to themselves.',
  },
  {
    icon: ShieldCheck,
    title: 'Nothing to sign up for',
    body: 'No accounts, no email, no tracking profile. Jams live in memory and disappear when everyone leaves.',
  },
  {
    icon: Heart,
    title: 'Free. Actually free.',
    body: 'No premium tier, no trial, no listener limits hidden behind a paywall. Built for friends and loved ones.',
  },
];

const faqs = [
  {
    q: 'Is Jamwave really free?',
    a: 'Yes. Jamwave does not have a paid tier. You can start as many jams as you like and invite as many friends as you like (up to 50 per jam).',
  },
  {
    q: 'Do I need Spotify Premium or any subscription?',
    a: 'No. Spotify Jam requires every listener to have Premium. Jamwave plays music from YouTube through the official embedded player, so nobody needs a subscription of any kind.',
  },
  {
    q: 'Where does the music come from?',
    a: "Tracks are played with YouTube's official embedded player. That means almost any song, live set or remix you can find on YouTube can be queued. The video stays visible in the jam, as YouTube's terms require.",
  },
  {
    q: 'Does it work on phones?',
    a: 'Yes, in the browser, with no app to install. One tip: keep the tab open while listening. Mobile browsers pause video when the screen locks or you switch apps.',
  },
  {
    q: 'How does everyone stay in sync?',
    a: 'The Jamwave server owns the master clock and the queue. Every browser measures its offset to that clock and nudges its own player whenever it drifts more than about a third of a second.',
  },
  {
    q: 'What happens to my data?',
    a: 'There are no accounts. Your nickname is stored in your own browser. Rooms, queues and chat live only in server memory and are deleted ten minutes after the last person leaves.',
  },
];

export default function LandingPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-fg-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            No subscription. No app. No account.
          </span>
          <h1 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-7xl">
            Listen together. <span className="gradient-text">For free.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-fg-muted sm:text-xl">
            Jamwave is the free way to share a music moment with friends and loved ones — same song,
            same second, on any device. Think Spotify Jam, without the Premium requirement.
          </p>
          <div className="mt-10 flex w-full max-w-xl flex-col items-center gap-4 sm:flex-row">
            <StartJamDialog>
              <Button size="lg" className="w-full sm:w-auto sm:px-8">
                Start a jam
              </Button>
            </StartJamDialog>
            <JoinForm className="sm:flex-1" />
          </div>
          <div className="mt-14 grid w-full max-w-3xl grid-cols-3 gap-4 text-center text-sm text-fg-muted">
            <div className="rounded-xl border border-border bg-surface/40 px-3 py-4">
              <div className="text-2xl font-semibold text-fg">&lt; 0.3s</div>
              target sync drift
            </div>
            <div className="rounded-xl border border-border bg-surface/40 px-3 py-4">
              <div className="text-2xl font-semibold text-fg">50</div>
              listeners per jam
            </div>
            <div className="rounded-xl border border-border bg-surface/40 px-3 py-4">
              <div className="text-2xl font-semibold text-fg">$0</div>
              forever
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          Three steps to a shared moment
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-2xl border border-border bg-surface/40 p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="gradient-bg flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <step.icon className="h-5 w-5 text-fg-muted" />
              </div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-fg-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything a jam needs
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-fg-muted">
          Built for long-distance friends, study sessions, game nights, family across cities and
          parties where everyone wants a say in the playlist.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-border bg-surface/40 p-6">
              <feature.icon className="mb-4 h-6 w-6 text-accent" />
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-fg-muted">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">Questions</h2>
        <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-surface/40">
          {faqs.map((faq) => (
            <details key={faq.q} className="group p-5">
              <summary className="cursor-pointer list-none text-base font-medium marker:content-none">
                <span className="flex items-center justify-between gap-4">
                  {faq.q}
                  <span className="text-fg-subtle transition-transform group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-fg-muted">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="glow relative overflow-hidden rounded-3xl border border-border bg-surface/60 px-6 py-14 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Someone you miss is one link away.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-fg-muted">
            Start a jam, send the link, press play. It takes less time than reading this sentence.
          </p>
          <div className="mt-8">
            <StartJamDialog>
              <Button size="lg" className="px-8">
                Start a jam — it&apos;s free
              </Button>
            </StartJamDialog>
          </div>
        </div>
      </section>
    </>
  );
}
