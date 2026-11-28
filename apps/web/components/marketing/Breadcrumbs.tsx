import Link from 'next/link';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';

/** "Jamwave › Page" trail with matching BreadcrumbList data. The last item is the current page. */
export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-fg-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((item, index) => {
            const last = index === items.length - 1;
            return (
              <li key={item.path} className="flex items-center gap-1.5">
                {index > 0 ? <span aria-hidden>›</span> : null}
                {last ? (
                  <span aria-current="page" className="text-fg">
                    {item.name}
                  </span>
                ) : (
                  <Link href={item.path} className="hover:text-fg">
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(items)} />
    </>
  );
}
