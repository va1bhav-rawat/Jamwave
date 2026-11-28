'use client';

import { LIMITS, type SearchResult } from '@jamwave/shared';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { currentPage, track } from '@/lib/analytics';
import { useAccountName } from '@/lib/auth-client';
import { createRoom, errorMessage, seedQueue } from '@/lib/jamClient';
import { session } from '@/lib/session';
import { useRoomStore } from '@/lib/store';
import { WakingServerHint } from './WakingServerHint';

export function StartJamDialog({
  children,
  seed,
  seedName,
  seedKind = 'rebuild',
  cta = 'start',
}: {
  children: ReactNode;
  /** Tracks to queue up right after the jam is created (rebuilding a jam that ended). */
  seed?: SearchResult[];
  /** Suggested jam name when rebuilding. */
  seedName?: string;
  /** Where the seed comes from: an ended jam being rebuilt, or a playlist. */
  seedKind?: 'rebuild' | 'playlist';
  /** Which button opened it, for analytics (hero, bottom, header, page…). */
  cta?: string;
}) {
  const router = useRouter();
  const accountName = useAccountName();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [busy, setBusy] = useState(false);
  const seeded = !!seed && seed.length > 0;
  const rebuilding = seeded && seedKind === 'rebuild';
  const fromPlaylist = seeded && seedKind === 'playlist';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nickname = name.trim();
    if (!nickname) return;
    setBusy(true);
    try {
      const code = await createRoom(nickname, roomName);
      track('jam_created', {
        from: rebuilding ? 'rebuild' : fromPlaylist ? 'playlist' : 'fresh',
        seeded_tracks: seeded ? seed.length : 0,
        page: currentPage(),
      });
      if (seeded) {
        try {
          const added = await seedQueue(seed.slice(0, LIMITS.MAX_QUEUE));
          toast.success(
            `${added} song${added === 1 ? '' : 's'} ${rebuilding ? 'back in' : 'added to'} the queue`,
          );
        } catch (error) {
          toast.error(errorMessage(error, 'Could not fill the queue'));
        }
      }
      router.push(`/jam/${code}`);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not start a jam'));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        if (next) {
          track('cta_clicked', { page: currentPage(), cta });
          // Signed-in people jam under their username unless they type something else.
          setName((current) => current || accountName || session.getNickname() || '');
          setRoomName((current) => current || seedName || '');
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        title={rebuilding ? 'Rebuild your jam' : 'Start a jam'}
        description={
          rebuilding
            ? `Pick a nickname. Your ${seed.length} song${seed.length === 1 ? '' : 's'} will be queued up again, and you'll get a fresh link to share.`
            : fromPlaylist
              ? `Pick a nickname. The playlist's ${seed.length} song${seed.length === 1 ? '' : 's'} will be queued up, and you'll get a link to share.`
              : "Pick a nickname. You'll get a link and a code to share with anyone."
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="nickname" className="text-sm text-fg-muted">
              Your nickname
            </label>
            <Input
              id="nickname"
              autoFocus
              autoComplete="nickname"
              maxLength={LIMITS.NICKNAME_MAX}
              placeholder="e.g. Sam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="roomName" className="text-sm text-fg-muted">
              Jam name <span className="text-fg-subtle">(optional)</span>
            </label>
            <Input
              id="roomName"
              maxLength={LIMITS.ROOM_NAME_MAX}
              placeholder="Friday night vibes"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={busy || !name.trim()}>
            {busy ? <Spinner className="border-white/40 border-t-white" /> : null}
            {busy ? 'Setting up your jam…' : rebuilding ? 'Rebuild my jam' : 'Create my jam'}
          </Button>
          {busy ? <BusyHint /> : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BusyHint() {
  const attempts = useRoomStore((s) => s.connectAttempts);
  return <WakingServerHint attempts={attempts} />;
}
