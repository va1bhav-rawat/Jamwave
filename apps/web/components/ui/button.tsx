'use client';

import { Slot } from 'radix-ui';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render the child element (e.g. a Link) with button styles. */
  asChild?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'gradient-bg text-white shadow-lg shadow-accent/20 hover:brightness-110 active:brightness-95',
  secondary: 'bg-surface text-fg border border-border hover:bg-surface-hover',
  outline: 'border border-border-strong text-fg hover:bg-surface',
  ghost: 'text-fg-muted hover:text-fg hover:bg-surface',
  danger: 'bg-danger/15 text-red-300 border border-danger/30 hover:bg-danger/25',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-9 w-9 p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', asChild = false, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
