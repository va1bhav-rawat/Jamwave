import { KEY_FACTS } from '@/lib/site-facts';
import { cn } from '@/lib/utils';

/** The numbers, in a form people and answer engines can quote. */
export function KeyFacts({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="key-facts"
      className={cn('rounded-2xl border border-border bg-surface/40 p-5 sm:p-6', className)}
    >
      <h2 id="key-facts" className="text-lg font-semibold">
        Key facts
      </h2>
      <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        {KEY_FACTS.map((fact) => (
          <div key={fact.label} className="grid grid-cols-[9rem_1fr] gap-3">
            <dt className="text-fg-muted">{fact.label}</dt>
            <dd className="text-fg">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
