'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { authClient, authErrorMessage } from '@/lib/auth-client';
import { normalizeUsername } from '@/lib/username';
import { useUsernameAvailability } from '@/lib/useUsernameAvailability';
import { UsernameField } from './UsernameField';

/**
 * Optional username choice after sign-up. `current` is the username the account already has
 * (derived from its email); skipping keeps it.
 */
export function OnboardingForm({ next, current }: { next: string; current: string }) {
  const [username, setUsername] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unchanged = normalizeUsername(username) === current;
  const checked = useUsernameAvailability(unchanged ? '' : username);
  // The account's own username would otherwise be reported as taken.
  const status = unchanged && current ? 'available' : checked;
  const blocked = status === 'idle' || status === 'invalid' || status === 'taken';

  const done = () => {
    // A full navigation so server-rendered pages see the updated account.
    window.location.assign(next);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || blocked) return;
    if (unchanged) return done();
    setBusy(true);
    setError(null);
    const { error: failure } = await authClient.updateUser({
      username: normalizeUsername(username),
    });
    if (failure) {
      setError(authErrorMessage(failure, 'Could not save your username'));
      setBusy(false);
      return;
    }
    done();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <UsernameField
        id="onboarding-username"
        value={username}
        status={status}
        onChange={setUsername}
        autoFocus
        disabled={busy}
        availableHint={unchanged ? `@${current} is yours` : undefined}
      />
      {error ? (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={busy || blocked}>
        {busy ? <Spinner className="border-white/40 border-t-white" /> : null}
        {busy ? 'Saving…' : 'Save username'}
      </Button>
      <Button variant="ghost" size="md" className="w-full" onClick={done} disabled={busy}>
        Skip for now
      </Button>
    </form>
  );
}
