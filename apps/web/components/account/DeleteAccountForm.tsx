'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { resetIdentity } from '@/lib/analytics';
import { authClient, authErrorMessage } from '@/lib/auth-client';

/**
 * Deleting an account is confirmed with the password when there is one. Google-only accounts have
 * no password, so better-auth requires a fresh session instead (signed in within the last day).
 */
export function DeleteAccountForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async (event: React.FormEvent) => {
    event.preventDefault();
    if (hasPassword && !password) return;
    setBusy(true);
    setError(null);
    const { error: failure } = await authClient.deleteUser(hasPassword ? { password } : {});
    setBusy(false);
    if (failure) {
      setError(authErrorMessage(failure, 'Could not delete the account. Please try again.'));
      return;
    }
    resetIdentity();
    setOpen(false);
    setDone(true);
  };

  if (done) {
    return (
      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <h2 className="text-lg font-semibold">Your account has been deleted</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Your playlists and friendships are gone with it. You can still jam without an account any
          time.
        </p>
        {/* The session cookie is already gone; refresh so server components render signed out. */}
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => {
            router.push('/');
            router.refresh();
          }}
        >
          Back home
        </Button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-danger/30 bg-danger/5 p-5">
      <h2 className="text-lg font-semibold">Delete account</h2>
      <p className="mt-1 text-sm text-fg-muted">
        Removes your account, your playlists and your friendships right away. Jams you are in keep
        running for everyone else. This cannot be undone.
      </p>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (busy) return;
          setOpen(next);
          setError(null);
          setPassword('');
        }}
      >
        <DialogTrigger asChild>
          <Button variant="danger" className="mt-4">
            Delete my account
          </Button>
        </DialogTrigger>
        <DialogContent
          title="Delete your account?"
          description="Your account, playlists and friendships are deleted immediately. There is no undo."
        >
          <form onSubmit={remove} className="space-y-4">
            {hasPassword ? (
              <div className="space-y-1.5">
                <label htmlFor="delete-password" className="text-sm text-fg-muted">
                  Confirm with your password
                </label>
                <Input
                  id="delete-password"
                  name="password"
                  type="password"
                  autoFocus
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  required
                />
              </div>
            ) : (
              <p className="text-sm text-fg-muted">
                You sign in with Google, so there is no password to confirm. For safety this only
                works within a day of signing in; if it is refused, sign out, sign in again and try
                once more.
              </p>
            )}
            {error ? (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={busy}>
                  Keep my account
                </Button>
              </DialogClose>
              <Button type="submit" variant="danger" disabled={busy || (hasPassword && !password)}>
                {busy ? <Spinner className="border-red-300/40 border-t-red-300" /> : null}
                {busy ? 'Deleting…' : 'Delete everything'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
