'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { authClient, authErrorMessage } from '@/lib/auth-client';

const MIN_LENGTH = 8;

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: failure } = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (failure) {
      setError(authErrorMessage(failure, 'Could not update the password. Please try again.'));
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="space-y-5">
        <p className="text-fg-muted">Your password has been updated.</p>
        <Button asChild size="lg" className="w-full">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="reset-password" className="text-sm text-fg-muted">
          New password
        </label>
        <Input
          id="reset-password"
          name="password"
          type="password"
          autoFocus
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
          required
        />
        <p className="text-xs text-fg-subtle">At least {MIN_LENGTH} characters.</p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="reset-confirm" className="text-sm text-fg-muted">
          Repeat the new password
        </label>
        <Input
          id="reset-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={busy}
          required
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={busy || !password || !confirm}>
        {busy ? <Spinner className="border-white/40 border-t-white" /> : null}
        {busy ? 'Saving…' : 'Set new password'}
      </Button>
    </form>
  );
}
