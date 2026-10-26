import { cn } from '@/lib/utils';

export function Equalizer({ active, className }: { active: boolean; className?: string }) {
  return (
    <span className={cn('flex h-4 items-end gap-0.5', className)} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            'w-1 origin-bottom rounded-full gradient-bg',
            active ? 'animate-eq' : 'scale-y-[0.35]',
          )}
          style={{ height: '100%', animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
