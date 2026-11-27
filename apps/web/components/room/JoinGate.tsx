'use client';

import { LIMITS } from '@jamwave/shared';
import { RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/brand/Logo';
import { StartJamDialog } from '@/components/marketing/StartJamDialog';
import { WakingServerHint } from '@/components/marketing/WakingServerHint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { track } from '@/lib/analytics';
import { useAccountName } from '@/lib/auth-client';
import { errorCode, errorMessage, joinRoom } from '@/lib/jamClient';
import { session } from '@/lib/session';
import { useRoomStore, type ClientError, type RoomStatus } from '@/lib/store';
import { useLastQueue, useStoredNickname } from '@/lib/useBrowser';

export function JoinGate({
  code,
  status,
  error,
}: {
  code: string;
  status: RoomStatus;
  error: ClientError | null;
}) {
  const stored = useStoredNickname();
  const accountName = useAccountName();
  const attempts = useRoomStore((s) => s.connectAttempts);
  const saved = useLastQueue();
  const [typed, setTyped] = useState<string | null>(null);
  const name = typed ?? (accountName || stored);
  const busy = status === 'connecting' || status === 'joining';
  const gone = error?.code === 'ROOM_NOT_FOUND';
  const banned = error?.code === 'BANNED';
  const seed = gone && saved && saved.code === code && saved.tracks.length > 0 ? saved : null;

  // An ended jam has no business in "Jump back in".
  useEffect(() => {
    if (gone) session.forgetJam(code);
  }, [gone, code]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nickname = name.trim();
    if (!nickname) return;
    try {
      await joinRoom(code, nickname);
      // Presence "Join" buttons link here with ?via=friend; everything else is a shared link.
      const via = new URLSearchParams(window.location.search).get('via');
      track('jam_joined', { via: via === 'friend' ? 'friend' : 'link' });
    } catch (err) {
      useRoomStore
        .getState()
        .setError({ code: errorCode(err, 'JOIN_FAILED'), message: errorMessage(err) });
    }
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <Logo className="mb-10" />
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface/50 p-6">
        {gone ? (
          <>
            <h1 className="text-2xl font-semibold">This jam has ended</h1>
            <p className="mt-2 text-fg-muted">
              Jam <span className="font-mono text-fg">{code}</span> is no longer running. Jams close
              ten minutes after the last person leaves.
            </p>
            {seed ? (
              <p className="mt-2 text-sm text-fg-subtle">
                Its queue of {seed.tracks.length} song{seed.tracks.length === 1 ? '' : 's'} is saved
                on this device. Rebuild it and share the new link.
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {seed ? (
                <StartJamDialog seed={seed.tracks} seedName={seed.name}>
                  <Button size="lg" className="flex-1">
                    <RotateCcw className="h-4 w-4" /> Rebuild this jam
                  </Button>
                </StartJamDialog>
              ) : (
                <StartJamDialog>
                  <Button size="lg" className="flex-1">
                    Start a new jam
                  </Button>
                </StartJamDialog>
              )}
              <Button asChild variant="secondary" size="lg" className="flex-1">
                <Link href="/join">Join another</Link>
              </Button>
            </div>
          </>
        ) : banned ? (
          <>
            <h1 className="text-2xl font-semibold">The host removed you from this jam</h1>
            <p className="mt-2 text-fg-muted">
              Jam <span className="font-mono text-fg">{code}</span> is still going, but you cannot
              rejoin it. You can start your own, or join a different one.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <StartJamDialog>
                <Button size="lg" className="flex-1">
                  Start a new jam
                </Button>
              </StartJamDialog>
              <Button asChild variant="secondary" size="lg" className="flex-1">
                <Link href="/join">Join another</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs uppercase tracking-wider text-fg-subtle">
              You&apos;re invited to jam
            </p>
            <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold">
              Join{' '}
              <span className="rounded-lg bg-bg-elevated px-2 py-0.5 font-mono tracking-[0.2em]">
                {code}
              </span>
            </h1>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="join-nickname" className="text-sm text-fg-muted">
                  Your nickname
                </label>
                <Input
                  id="join-nickname"
                  autoFocus
                  autoComplete="nickname"
                  maxLength={LIMITS.NICKNAME_MAX}
                  placeholder="e.g. Sam"
                  value={name}
                  onChange={(e) => setTyped(e.target.value)}
                  disabled={busy}
                  required
                />
              </div>
              {error && !busy ? <p className="text-sm text-red-300">{error.message}</p> : null}
              <Button type="submit" size="lg" className="w-full" disabled={busy || !name.trim()}>
                {busy ? <Spinner className="border-white/40 border-t-white" /> : null}
                {status === 'connecting'
                  ? 'Connecting…'
                  : status === 'joining'
                    ? 'Joining…'
                    : 'Join the jam'}
              </Button>
              {busy ? <WakingServerHint attempts={attempts} /> : null}
            </form>
            <p className="mt-4 text-center text-xs text-fg-subtle">
              Free, no account needed. Music plays through YouTube.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
