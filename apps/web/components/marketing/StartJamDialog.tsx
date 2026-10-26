'use client';

import { LIMITS } from '@jamwave/shared';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { createRoom, errorMessage } from '@/lib/jamClient';
import { session } from '@/lib/session';

export function StartJamDialog({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nickname = name.trim();
    if (!nickname) return;
    setBusy(true);
    try {
      const code = await createRoom(nickname, roomName);
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
        if (next) setName((current) => current || session.getNickname() || '');
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        title="Start a jam"
        description="Pick a nickname. You'll get a link and a code to share with anyone."
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
            {busy ? 'Setting up your jam…' : 'Create my jam'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
