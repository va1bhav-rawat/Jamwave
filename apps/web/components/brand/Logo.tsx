import Link from 'next/link';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('h-8 w-8', className)} aria-hidden>
      <defs>
        <linearGradient id="jw-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a855f7" />
          <stop offset="0.55" stopColor="#ec4899" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#111114" />
      <g fill="url(#jw-g)">
        <rect x="12" y="26" width="7" height="12" rx="3.5" />
        <rect x="22" y="16" width="7" height="32" rx="3.5" />
        <rect x="32" y="22" width="7" height="20" rx="3.5" />
        <rect x="42" y="12" width="7" height="40" rx="3.5" />
      </g>
    </svg>
  );
}

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn('flex items-center gap-2.5 font-semibold tracking-tight', className)}
    >
      <LogoMark />
      <span className="text-lg">Jamwave</span>
    </Link>
  );
}
