'use client';

import { isValidRoomCode, normalizeRoomCode } from '@jamwave/shared';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function JoinForm({
  className,
  autoFocus = false,
}: {
  className?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const normalized = normalizeRoomCode(code);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidRoomCode(normalized)) {
      setError('Codes are 6 letters or digits, like ABC234');
      return;
    }
    router.push(`/jam/${normalized}`);
  };

  return (
    <form onSubmit={submit} className={cn('w-full', className)}>
      <div className="flex gap-2">
        <Input
          aria-label="Jam code"
          autoFocus={autoFocus}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          maxLength={8}
          placeholder="Enter a jam code"
          className="font-mono uppercase tracking-[0.2em]"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
        />
        <Button type="submit" variant="secondary" size="md" className="h-11 px-4" aria-label="Join">
          Join <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </form>
  );
}
