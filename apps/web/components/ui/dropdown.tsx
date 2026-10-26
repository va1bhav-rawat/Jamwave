'use client';

import { DropdownMenu as DropdownPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const Dropdown = DropdownPrimitive.Root;
export const DropdownTrigger = DropdownPrimitive.Trigger;

export function DropdownContent({
  className,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={6}
        align="end"
        className={cn(
          'z-50 min-w-44 rounded-xl border border-border bg-bg-elevated p-1 shadow-xl animate-fade-in',
          className,
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

export function DropdownItem({
  className,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Item>) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg outline-none',
        'data-[highlighted]:bg-surface data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
