import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { StartJamDialog } from './StartJamDialog';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/70 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm text-fg-muted md:flex">
          <Link href="/#how-it-works" className="hover:text-fg">
            How it works
          </Link>
          <Link href="/#features" className="hover:text-fg">
            Features
          </Link>
          <Link href="/#faq" className="hover:text-fg">
            FAQ
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/join">Join a jam</Link>
          </Button>
          <StartJamDialog>
            <Button size="sm">Start a jam</Button>
          </StartJamDialog>
        </div>
      </div>
    </header>
  );
}
