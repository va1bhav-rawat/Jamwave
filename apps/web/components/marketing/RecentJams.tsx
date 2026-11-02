'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRecentJams } from '@/lib/useBrowser';
import { cn, timeAgo } from '@/lib/utils';

/** "Jump back in": jams this device was in during the last day. Renders nothing otherwise. */
export function RecentJams({ className }: { className?: string }) {
  const jams = useRecentJams();
  if (jams.length === 0) return null;
  return (
    <section className={cn('w-full max-w-xl animate-fade-in text-left', className)}>
      <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-fg-subtle">
        Jump back in
      </h2>
      <ul className="mt-2 flex flex-col gap-2">
        {jams.map((jam) => (
          <li key={jam.code}>
            <Link
              href={`/jam/${jam.code}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface/50 px-4 py-3 transition-colors hover:bg-surface"
            >
              <span className="font-mono text-sm tracking-[0.2em]">{jam.code}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-fg-muted">{jam.name}</span>
              <span className="shrink-0 text-xs text-fg-subtle">{timeAgo(jam.at)}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-fg-subtle" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
