'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { track } from '@/lib/analytics';
import { authClient, authErrorMessage } from '@/lib/auth-client';
import { GoogleButton, OrDivider } from './GoogleButton';

export function LoginForm({
  next,
  googleEnabled,
  initialError,
}: {
  next: string;
  googleEnabled: boolean;
  initialError?: string | null;
}) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const id = identifier.trim();
    if (!id || !password) return;
    setBusy(true);
    setError(null);
    const { error: failure } = id.includes('@')
      ? await authClient.signIn.email({ email: id, password })
      : await authClient.signIn.username({ username: id, password });
    if (failure) {
      setError(authErrorMessage(failure, 'Could not sign you in'));
      setBusy(false);
      return;
    }
    track('signed_in', { method: 'password' }, { instant: true });
    // A full navigation so server-rendered pages see the new session cookie.
    window.location.assign(next);
  };

  return (
    <div className="space-y-5">
      {googleEnabled ? (
        <>
          <GoogleButton next={next} />
          <OrDivider />
        </>
      ) : null}
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="login-identifier" className="text-sm text-fg-muted">
            Username or email
          </label>
          <Input
            id="login-identifier"
            name="username"
            autoFocus
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={busy}
            required
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm text-fg-muted">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs text-fg-muted underline hover:text-fg">
              Forgot password?
            </Link>
          </div>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            required
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={busy || !identifier.trim() || !password}
        >
          {busy ? <Spinner className="border-white/40 border-t-white" /> : null}
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="text-center text-sm text-fg-muted">
        New to Jamwave?{' '}
        <Link
          href={next === '/' ? '/signup' : `/signup?next=${encodeURIComponent(next)}`}
          className="text-fg underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
