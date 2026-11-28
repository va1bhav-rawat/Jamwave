import Link from 'next/link';
import { LogoMark } from '@/components/brand/Logo';
import { CONTACT_EMAIL } from '@/lib/env';
import { FACTS } from '@/lib/site-facts';

const groups: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: 'Jamwave',
    links: [
      { label: 'Start a jam', href: '/' },
      { label: 'Join with a code', href: '/join' },
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Questions', href: '/#faq' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'YouTube Terms', href: 'https://www.youtube.com/t/terms', external: true },
      { label: 'Google Privacy Policy', href: 'https://policies.google.com/privacy', external: true },
    ],
  },
  {
    title: 'Contact',
    links: [
      { label: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}`, external: true },
      { label: 'GitHub', href: FACTS.github, external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 text-sm text-fg-muted sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-fg">
            <LogoMark className="h-6 w-6" />
            <span className="font-semibold">Jamwave</span>
          </div>
          <p className="max-w-xs">{FACTS.oneLiner}</p>
          <p className="text-xs text-fg-subtle">
            {FACTS.madeIn} {FACTS.source}
          </p>
        </div>
        {groups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              {group.title}
            </h2>
            <ul className="mt-3 space-y-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                      rel="noopener noreferrer"
                      className="hover:text-fg"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="hover:text-fg">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}
