'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { authClient, authErrorMessage } from '@/lib/auth-client';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;
    setBusy(true);
    setError(null);
    const { error: failure } = await authClient.requestPasswordReset({
      email: address,
      redirectTo: '/reset-password',
    });
    setBusy(false);
    if (failure) {
      setError(authErrorMessage(failure, 'Could not send the email. Please try again.'));
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="space-y-5">
        {/* The same answer whether or not the address has an account, so nobody can probe for one. */}
        <p className="text-fg-muted">
          If that email has a Jamwave account, we&apos;ve sent it a link. It works for one hour; check
          your spam folder if it doesn&apos;t show up.
        </p>
        <p className="text-center text-sm text-fg-muted">
          <Link href="/login" className="text-fg underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="forgot-email" className="text-sm text-fg-muted">
            Email
          </label>
          <Input
            id="forgot-email"
            name="email"
            type="email"
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            required
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={busy || !email.trim()}>
          {busy ? <Spinner className="border-white/40 border-t-white" /> : null}
          {busy ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <p className="text-center text-sm text-fg-muted">
        Remembered it?{' '}
        <Link href="/login" className="text-fg underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
