import Link from 'next/link';
import type { FaqItem } from '@/content/faq';
import { faqJsonLd, JsonLd } from '@/lib/seo';

/** A list of questions with matching FAQPage data. Only what is shown here is marked up. */
export function Faq({
  items,
  title = 'Questions, answered',
  id = 'faq',
  more,
}: {
  items: FaqItem[];
  title?: string;
  id?: string;
  /** Optional link under the list, e.g. to the full help page. */
  more?: { href: string; label: string };
}) {
  return (
    <section id={id} className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-surface/40">
        {items.map((item) => (
          <details key={item.q} className="group px-5 py-4 open:bg-surface/60">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
              <h3 className="text-base font-medium">{item.q}</h3>
              <span
                aria-hidden
                className="shrink-0 text-fg-subtle transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted">{item.a}</p>
          </details>
        ))}
      </div>
      {more ? (
        <p className="mt-6 text-center text-sm text-fg-muted">
          <Link href={more.href} className="text-fg underline">
            {more.label}
          </Link>
        </p>
      ) : null}
      <JsonLd data={faqJsonLd(items)} />
    </section>
  );
}
