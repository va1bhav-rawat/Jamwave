import type { FaqItem } from './faq';

/** One section of a content page. Paragraphs are plain prose; bullets are optional. */
export interface PageSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface PageStep {
  name: string;
  text: string;
}

/**
 * An evergreen marketing page. Copy lives here, layout in `app/(marketing)/[slug]/page.tsx`.
 * Every page answers one query cluster: the `answer` is the 40–60-word direct answer shown under
 * the H1 (what search and answer engines quote); `steps` become visible numbered steps plus HowTo
 * data; `faqs` become visible questions plus FAQPage data.
 */
export interface ContentPage {
  slug: string;
  /** ≤ 60 characters; used as the absolute <title>. */
  title: string;
  /** ≤ 155 characters. */
  description: string;
  h1: string;
  /** Short name for breadcrumbs, related-links and footer. */
  crumb: string;
  answer: string;
  kind: 'guide' | 'about' | 'help';
  steps?: { heading: string; items: PageStep[] };
  sections: PageSection[];
  faqs: FaqItem[];
  /** Help page only: the FAQs grouped under headings (then `faqs` is their flat union). */
  faqGroups?: { title: string; items: FaqItem[] }[];
  related: string[];
  cta: { line: string; sub: string };
  /** ISO date, bumped when the copy changes; shown on the page and used in the sitemap. */
  lastModified: string;
  /** When set, the page gets a card in the landing page's "Made for…" section. */
  useCase?: { title: string; line: string };
  showKeyFacts?: boolean;
}
