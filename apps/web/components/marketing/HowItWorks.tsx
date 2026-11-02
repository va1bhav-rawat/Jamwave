import { Link2, Radio, UserRound } from 'lucide-react';

const steps = [
  {
    icon: UserRound,
    title: 'Start a jam',
    text: 'Type a nickname. No sign-up, no app. You get a link, a 6-character code and a QR to share.',
  },
  {
    icon: Link2,
    title: 'Share the link',
    text: 'Friends open it on any phone or laptop, type a nickname, and they are in. Up to 50 people.',
  },
  {
    icon: Radio,
    title: 'Hear the same second',
    text: 'Search YouTube or paste a link. Every player follows one clock, so everyone hears the same beat at the same moment.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
      <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
        Three taps to a shared playlist
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-fg-muted">
        No accounts to create, nothing to install, nothing to pay.
      </p>
      <ol className="mt-10 grid gap-4 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="rounded-2xl border border-border bg-surface/40 p-6 transition-colors hover:bg-surface/60"
          >
            <div className="flex items-center gap-3">
              <span className="gradient-bg flex h-9 w-9 items-center justify-center rounded-full text-white">
                <step.icon className="h-4 w-4" />
              </span>
              <span className="font-mono text-xs text-fg-subtle">0{index + 1}</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
