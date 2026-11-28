import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/marketing/Breadcrumbs';
import { Faq } from '@/components/marketing/Faq';
import { KeyFacts } from '@/components/marketing/KeyFacts';
import { StartJamDialog } from '@/components/marketing/StartJamDialog';
import { Button } from '@/components/ui/button';
import { contentPages, getPage } from '@/content/pages';
import { aboutPageJsonLd, howToJsonLd, JsonLd, pageUrl } from '@/lib/seo';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return contentPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getPage((await params).slug);
  if (!page) return {};
  const url = pageUrl(`/${page.slug}`);
  return {
    title: { absolute: page.title },
    description: page.description,
    openGraph: {
      type: 'article',
      url,
      title: page.title,
      description: page.description,
      modifiedTime: page.lastModified,
    },
    twitter: { card: 'summary_large_image', title: page.title, description: page.description },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function Cta({ line, sub, cta }: { line: string; sub: string; cta: string }) {
  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6 text-center sm:p-8">
      <p className="text-xl font-semibold">{line}</p>
      <p className="mt-1 text-sm text-fg-muted">{sub}</p>
      <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <StartJamDialog cta={cta}>
          <Button size="lg" className="px-8">
            Start a jam — free
          </Button>
        </StartJamDialog>
        <Button asChild variant="secondary" size="lg">
          <Link href="/join">Join with a code</Link>
        </Button>
      </div>
    </div>
  );
}

export default async function ContentPageRoute({ params }: Props) {
  const page = getPage((await params).slug);
  if (!page) notFound();
  const related = page.related.map(getPage).filter((p) => p !== undefined);

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Breadcrumbs
        items={[
          { name: 'Jamwave', path: '/' },
          { name: page.crumb, path: `/${page.slug}` },
        ]}
      />
      <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">{page.h1}</h1>
      {/* The direct answer: what a featured snippet or an AI answer quotes. */}
      <p className="mt-6 text-lg leading-relaxed text-fg sm:text-xl">{page.answer}</p>
      <p className="mt-3 text-xs text-fg-subtle">Last updated {formatDate(page.lastModified)}</p>

      <div className="mt-8">
        <Cta line={page.cta.line} sub={page.cta.sub} cta={`${page.slug}-top`} />
      </div>

      {page.showKeyFacts ? <KeyFacts className="mt-10" /> : null}

      {page.steps ? (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">{page.steps.heading}</h2>
          <ol className="mt-6 space-y-4">
            {page.steps.items.map((step, index) => (
              <li
                key={step.name}
                className="flex gap-4 rounded-2xl border border-border bg-surface/40 p-5"
              >
                <span className="gradient-bg flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{step.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-fg-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <JsonLd
            data={howToJsonLd({
              name: page.steps.heading,
              description: page.answer,
              steps: page.steps.items,
            })}
          />
        </section>
      ) : null}

      {page.sections.map((section) => (
        <section key={section.heading} className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-4 leading-relaxed text-fg-muted">
              {paragraph}
            </p>
          ))}
          {section.bullets ? (
            <ul className="mt-4 list-disc space-y-2 pl-6 text-fg-muted">
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      {page.faqGroups ? (
        page.faqGroups.map((group) => (
          <section key={group.title} className="mt-12" id={group.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}>
            <h2 className="text-2xl font-semibold tracking-tight">{group.title}</h2>
            <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-surface/40">
              {group.items.map((item) => (
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
          </section>
        ))
      ) : null}
      {page.faqGroups ? (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: page.faqs.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
          }}
        />
      ) : page.faqs.length > 0 ? (
        <div className="-mx-4 sm:-mx-6">
          <Faq items={page.faqs} title="Questions about this" id="faq" more={{ href: '/help', label: 'More questions → Help & FAQ' }} />
        </div>
      ) : null}

      {related.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">Related</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/${r.slug}`}
                  className="block rounded-2xl border border-border bg-surface/40 p-4 text-sm font-medium hover:bg-surface/60"
                >
                  {r.crumb}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-12">
        <Cta line={page.cta.line} sub={page.cta.sub} cta={`${page.slug}-bottom`} />
      </div>

      {page.kind === 'about' ? <JsonLd data={aboutPageJsonLd(`/${page.slug}`)} /> : null}
    </article>
  );
}
