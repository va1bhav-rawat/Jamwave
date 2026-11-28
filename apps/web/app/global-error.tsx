'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import './globals.css';

/**
 * Last-resort boundary: replaces the root layout when it throws, so it must render its own
 * html/body and cannot rely on the usual fonts, providers or components.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Jamwave fatal error', error);
  }, [error]);

  return (
    <html lang="en-IN">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="text-3xl font-semibold">Something skipped a beat</h1>
        <p className="max-w-md text-fg-muted">
          Jamwave hit an error it could not recover from. Reloading usually fixes it.
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-fg-subtle">ref {error.digest}</p>
        ) : null}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="gradient-bg rounded-full px-5 py-2.5 text-sm font-medium text-white"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium"
          >
            Back home
          </Link>
        </div>
      </body>
    </html>
  );
}
