import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useCasePages } from '@/content/pages';

/** "Made for…" cards: the landing page's door into the content pages. */
export function UseCases() {
  return (
    <section id="made-for" className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
      <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
        Made for the people you&apos;d listen with
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-fg-muted">
        Pick your situation; each guide takes two minutes and ends with a jam.
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {useCasePages.map((page) => (
          <li key={page.slug}>
            <Link
              href={`/${page.slug}`}
              className="group flex h-full flex-col rounded-2xl border border-border bg-surface/40 p-6 transition-colors hover:bg-surface/60"
            >
              <h3 className="text-lg font-semibold">{page.useCase!.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-fg-muted">
                {page.useCase!.line}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-fg">
                Read the guide
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
