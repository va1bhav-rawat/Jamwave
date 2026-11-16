'use client';

import { LIMITS } from '@jamwave/shared';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { errorMessage, jam } from '@/lib/jamClient';
import { useRoomStore } from '@/lib/store';

export function SettingsDialog({ children }: { children: ReactNode }) {
  const settings = useRoomStore((s) => s.snapshot?.settings ?? null);
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);

  const update = (patch: Parameters<typeof jam.updateSettings>[0]) =>
    jam.updateSettings(patch).catch((error) => toast.error(errorMessage(error)));

  const saveName = (event: React.FormEvent) => {
    event.preventDefault();
    const next = name.trim();
    if (!next || next === settings?.name) return;
    void update({ name: next }).then(() => toast.success('Jam renamed'));
  };

  if (!settings) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setName(settings?.name ?? '');
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent title="Jam settings" description="Only the host sees this.">
        <form onSubmit={saveName} className="flex gap-2">
          <Input
            aria-label="Jam name"
            maxLength={LIMITS.ROOM_NAME_MAX}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            type="submit"
            variant="secondary"
            className="h-11"
            disabled={!name.trim() || name.trim() === settings.name}
          >
            Save
          </Button>
        </form>
        <div className="mt-5 divide-y divide-border rounded-xl border border-border">
          <label className="flex cursor-pointer items-center justify-between gap-4 p-4">
            <span>
              <span className="block text-sm font-medium">Everyone can control the music</span>
              <span className="block text-xs text-fg-muted">
                Play, pause, seek, skip, add and reorder songs. Turn off to make everyone a
                listener, then allow individual people from the People list.
              </span>
            </span>
            <Switch
              checked={settings.everyoneControls}
              onCheckedChange={(checked) => update({ everyoneControls: checked })}
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-4 p-4">
            <span>
              <span className="block text-sm font-medium">Vote to skip</span>
              <span className="block text-xs text-fg-muted">
                A majority of listeners can skip a track.
              </span>
            </span>
            <Switch
              checked={settings.voteSkipEnabled}
              onCheckedChange={(checked) => update({ voteSkipEnabled: checked })}
            />
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}
