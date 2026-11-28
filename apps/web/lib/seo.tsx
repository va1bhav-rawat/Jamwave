import { APP_URL, CONTACT_EMAIL } from './env';
import { FACTS, KEY_FACTS } from './site-facts';

/**
 * Structured data helpers. Only ever describe what is visible on the page: search engines treat
 * invisible markup as spam, and answer engines quote what they can see.
 */

export function pageUrl(path: string): string {
  return path === '/' ? `${APP_URL}/` : `${APP_URL}${path}`;
}

export function JsonLd({ data }: { data: object }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

const ORG_ID = `${APP_URL}/#organization`;
const WEBSITE_ID = `${APP_URL}/#website`;

/** Organization + WebSite, rendered once in the marketing layout; pages reference them by id. */
export function siteGraphJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORG_ID,
        name: 'Jamwave',
        url: `${APP_URL}/`,
        logo: `${APP_URL}/icon-512.png`,
        description: FACTS.oneLiner,
        email: CONTACT_EMAIL,
        foundingLocation: { '@type': 'Country', name: 'India' },
        sameAs: [FACTS.github],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: CONTACT_EMAIL,
          availableLanguage: ['en'],
        },
      },
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        name: 'Jamwave',
        url: `${APP_URL}/`,
        inLanguage: 'en-IN',
        publisher: { '@id': ORG_ID },
      },
    ],
  };
}

export function webApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${APP_URL}/#app`,
    name: 'Jamwave',
    url: `${APP_URL}/`,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any (web browser)',
    description: FACTS.oneLiner,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    featureList: KEY_FACTS.map((fact) => `${fact.label}: ${fact.value}`),
    publisher: { '@id': ORG_ID },
  };
}

export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

export function howToJsonLd(input: {
  name: string;
  description: string;
  steps: { name: string; text: string }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: input.name,
    description: input.description,
    totalTime: 'PT1M',
    step: input.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: pageUrl(item.path),
    })),
  };
}

export function aboutPageJsonLd(path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    url: pageUrl(path),
    name: 'About Jamwave',
    mainEntity: { '@id': ORG_ID },
  };
}
