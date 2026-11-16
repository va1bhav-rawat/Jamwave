'use client';

import { Input } from '@/components/ui/input';
import { USERNAME_MAX, usernameProblem } from '@/lib/username';
import type { UsernameStatus } from '@/lib/useUsernameAvailability';
import { cn } from '@/lib/utils';

/** Username input with a live availability line underneath. */
export function UsernameField({
  id,
  value,
  status,
  onChange,
  autoFocus = false,
  disabled = false,
  availableHint,
}: {
  id: string;
  value: string;
  status: UsernameStatus;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  /** Replaces the "is available" line (e.g. when the value is the account's current name). */
  availableHint?: string;
}) {
  const hint =
    status === 'invalid'
      ? usernameProblem(value)
      : status === 'checking'
        ? 'Checking…'
        : status === 'available'
          ? (availableHint ?? `@${value} is available`)
          : status === 'taken'
            ? `@${value} is already taken`
            : status === 'error'
              ? 'Could not check right now. You can still try.'
              : 'Letters, numbers and underscores. This is how friends will find you.';

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm text-fg-muted">
        Username
      </label>
      <Input
        id={id}
        name="username"
        autoFocus={autoFocus}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={USERNAME_MAX}
        placeholder="e.g. sam_92"
        value={value}
        onChange={(e) => onChange(e.target.value.toLowerCase().replace(/\s/g, ''))}
        disabled={disabled}
        aria-describedby={`${id}-hint`}
        aria-invalid={status === 'invalid' || status === 'taken'}
        required
      />
      <p
        id={`${id}-hint`}
        aria-live="polite"
        className={cn(
          'text-xs',
          status === 'available'
            ? 'text-success'
            : status === 'invalid' || status === 'taken'
              ? 'text-red-300'
              : 'text-fg-subtle',
        )}
      >
        {hint}
      </p>
    </div>
  );
}
