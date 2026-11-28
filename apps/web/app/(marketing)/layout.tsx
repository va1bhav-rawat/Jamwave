import { Footer } from '@/components/marketing/Footer';
import { Header } from '@/components/marketing/Header';
import { JsonLd, siteGraphJsonLd } from '@/lib/seo';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:text-fg"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <JsonLd data={siteGraphJsonLd()} />
    </>
  );
}
