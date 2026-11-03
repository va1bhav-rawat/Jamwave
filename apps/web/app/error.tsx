'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';

/** Route-level error boundary: a broken room should never be a blank screen. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Jamwave page error', error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <h1 className="text-3xl font-semibold">Something skipped a beat</h1>
      <p className="max-w-md text-fg-muted">
        That was our fault, not yours. Your jam is still running on the server, so trying again
        usually picks it straight back up.
      </p>
      {error.digest ? <p className="font-mono text-xs text-fg-subtle">ref {error.digest}</p> : null}
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="secondary">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </main>
  );
}
