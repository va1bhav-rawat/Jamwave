import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Panel({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface/40',
        className,
      )}
    >
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {actions}
      </header>
      <div className={cn('scroll-thin min-h-0 flex-1 overflow-y-auto', bodyClassName)}>
        {children}
      </div>
    </section>
  );
}
