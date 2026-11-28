import Link from 'next/link';
import { UserMenu } from '@/components/auth/UserMenu';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { StartJamDialog } from './StartJamDialog';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/70 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav aria-label="Primary" className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link href="/help">Help</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/join">
              <span className="sm:hidden">Join</span>
              <span className="hidden sm:inline">Join a jam</span>
            </Link>
          </Button>
          <StartJamDialog cta="header">
            <Button size="sm">Start a jam</Button>
          </StartJamDialog>
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}
