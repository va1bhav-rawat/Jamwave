export const faq: { q: string; a: string }[] = [
  {
    q: 'Is Jamwave really free?',
    a: 'Yes. There is no premium tier and no ads. Music plays through the official YouTube embedded player, so there is nothing for us to charge for.',
  },
  {
    q: 'Do my friends need an account or an app?',
    a: 'No. They open your link in any browser, type a nickname and they are listening. Phones, laptops and tablets all work.',
  },
  {
    q: 'How many people can join a jam?',
    a: 'Up to 50 listeners per jam, with one shared queue of up to 200 songs.',
  },
  {
    q: 'How tight is the sync?',
    a: 'Every browser follows one server clock, and drift is usually under a third of a second. On a struggling connection Jamwave prefers smooth playback over perfect sync, and tightens up again as soon as the connection recovers.',
  },
  {
    q: 'Does it keep playing when I switch apps on my phone?',
    a: 'Phone browsers pause YouTube when the tab is hidden. Tap the fullscreen button inside the video, then go Home: the video keeps playing in a small floating window while you use other apps.',
  },
  {
    q: 'Why is there a video and not just audio?',
    a: "YouTube's terms require its player to stay visible while music plays. You can shrink the video to save data; the music is what matters.",
  },
  {
    q: 'What happens when everyone leaves?',
    a: 'A jam closes ten minutes after the last person leaves. Your queue is remembered on your device, so you can rebuild the jam in one tap and share a fresh link.',
  },
  {
    q: 'Why does search sometimes say the daily budget is used up?',
    a: 'YouTube gives new apps a small daily search allowance while they grow, and we are new. Pasting a YouTube video or playlist link always works and never counts against it.',
  },
  {
    q: 'Can I play from Spotify or Apple Music?',
    a: 'Not yet. Their APIs are not open to free public apps, which is the whole reason Jamwave exists. If that changes, so will we.',
  },
];

export function Faq() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
        Questions, answered
      </h2>
      <dl className="mt-10 divide-y divide-border rounded-2xl border border-border bg-surface/40">
        {faq.map((item) => (
          <details key={item.q} className="group px-5 py-4 open:bg-surface/60">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium">
              <dt>{item.q}</dt>
              <span
                aria-hidden
                className="shrink-0 text-fg-subtle transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <dd className="mt-3 text-sm leading-relaxed text-fg-muted">{item.a}</dd>
          </details>
        ))}
      </dl>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
