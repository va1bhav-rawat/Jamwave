'use client';

import type { RoomClosedReason } from '@jamwave/shared';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { StartJamDialog } from '@/components/marketing/StartJamDialog';
import { Button } from '@/components/ui/button';

export function RoomEnded({ reason }: { reason: RoomClosedReason | null }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <Logo className="mb-10" />
      <h1 className="text-3xl font-semibold">That&apos;s a wrap</h1>
      <p className="mt-3 max-w-md text-fg-muted">
        {reason === 'host_closed'
          ? 'The host closed this jam.'
          : 'This jam ended because everyone left for a while. Thanks for listening together!'}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <StartJamDialog>
          <Button size="lg">Start a new jam</Button>
        </StartJamDialog>
        <Button asChild variant="secondary" size="lg">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </main>
  );
}
