'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { track } from '@/lib/analytics';
import { authClient, authErrorMessage } from '@/lib/auth-client';
import { defaultUsernameBase } from '@/lib/username';
import { GoogleButton, OrDivider } from './GoogleButton';

const PASSWORD_MIN = 8;

export function SignupForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !busy && !!email.trim() && password.length >= PASSWORD_MIN;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const address = email.trim();
    // The server gives the account a unique username from the email; the next step offers to
    // change it.
    const { error: failure } = await authClient.signUp.email({
      email: address,
      password,
      name: defaultUsernameBase(address),
    });
    if (failure) {
      setError(authErrorMessage(failure, 'Could not create your account'));
      setBusy(false);
      return;
    }
    track('signed_up', { method: 'password' });
    router.push(`/onboarding?next=${encodeURIComponent(next)}`);
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
          <label htmlFor="signup-email" className="text-sm text-fg-muted">
            Email
          </label>
          <Input
            id="signup-email"
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
        <div className="space-y-1.5">
          <label htmlFor="signup-password" className="text-sm text-fg-muted">
            Password
          </label>
          <Input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            aria-describedby="signup-password-hint"
            required
          />
          <p id="signup-password-hint" className="text-xs text-fg-subtle">
            At least {PASSWORD_MIN} characters.
          </p>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
          {busy ? <Spinner className="border-white/40 border-t-white" /> : null}
          {busy ? 'Creating your account…' : 'Create account'}
        </Button>
      </form>
      <p className="text-center text-sm text-fg-muted">
        Already have an account?{' '}
        <Link
          href={next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`}
          className="text-fg underline"
        >
          Sign in
        </Link>
      </p>
      <p className="text-center text-xs text-fg-subtle">
        By creating an account you agree to the{' '}
        <Link href="/terms" className="underline">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
