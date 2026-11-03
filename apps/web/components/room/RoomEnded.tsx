'use client';

import type { RoomClosedReason } from '@jamwave/shared';
import { RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { StartJamDialog } from '@/components/marketing/StartJamDialog';
import { Button } from '@/components/ui/button';
import { useLastQueue } from '@/lib/useBrowser';

export function RoomEnded({ reason, code }: { reason: RoomClosedReason | null; code: string }) {
  const saved = useLastQueue();
  const seed = saved && saved.code === code && saved.tracks.length > 0 ? saved : null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <Logo className="mb-10" />
      <h1 className="text-3xl font-semibold">
        {reason === 'server_restart' ? 'Jamwave was just updated' : "That's a wrap"}
      </h1>
      <p className="mt-3 max-w-md text-fg-muted">
        {reason === 'server_restart'
          ? 'Jams live in memory, so this one closed with the restart. Sorry about that.'
          : reason === 'host_closed'
            ? 'The host closed this jam.'
            : 'This jam ended because everyone left for a while. Thanks for listening together!'}
      </p>
      {seed ? (
        <p className="mt-2 max-w-md text-sm text-fg-subtle">
          Your queue of {seed.tracks.length} song{seed.tracks.length === 1 ? '' : 's'} is saved on
          this device.
        </p>
      ) : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {seed ? (
          <StartJamDialog seed={seed.tracks} seedName={seed.name}>
            <Button size="lg">
              <RotateCcw className="h-4 w-4" /> Rebuild this jam
            </Button>
          </StartJamDialog>
        ) : null}
        <StartJamDialog>
          <Button size="lg" variant={seed ? 'secondary' : 'primary'}>
            Start a new jam
          </Button>
        </StartJamDialog>
        <Button asChild variant="secondary" size="lg">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </main>
  );
}
