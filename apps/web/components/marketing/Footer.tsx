import Link from 'next/link';
import { LogoMark } from '@/components/brand/Logo';

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-fg-muted sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <LogoMark className="h-6 w-6" />
          <span>Jamwave — free, synced listening with the people you love.</span>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/privacy" className="hover:text-fg">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-fg">
            Terms
          </Link>
          <a
            href="https://www.youtube.com/t/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-fg"
          >
            YouTube Terms
          </a>
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-fg"
          >
            Google Privacy Policy
          </a>
        </nav>
        <p className="text-xs text-fg-subtle">Music playback powered by YouTube.</p>
      </div>
    </footer>
  );
}
