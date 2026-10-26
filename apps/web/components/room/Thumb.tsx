import { Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Thumb({ src, className }: { src?: string; className?: string }) {
  return (
    <span
      className={cn(
        'relative flex h-11 w-[4.9rem] shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface text-fg-subtle',
        className,
      )}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <Music2 className="h-4 w-4" />
      )}
    </span>
  );
}
