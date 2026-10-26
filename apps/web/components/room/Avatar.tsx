import { cn, initials } from '@/lib/utils';

export function Avatar({
  name,
  color,
  size = 'md',
  dim = false,
  className,
}: {
  name: string;
  color: string;
  size?: 'xs' | 'sm' | 'md';
  dim?: boolean;
  className?: string;
}) {
  const sizes = { xs: 'h-5 w-5 text-[9px]', sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs' };
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        sizes[size],
        dim && 'opacity-40 grayscale',
        className,
      )}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initials(name) || '?'}
    </span>
  );
}
