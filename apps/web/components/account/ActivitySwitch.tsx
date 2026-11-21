'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { setShowActivityAction } from '@/lib/actions';

/** "Let friends see which jam I'm in": saved as you flip it. */
export function ActivitySwitch({ initial }: { initial: boolean }) {
  const [show, setShow] = useState(initial);
  const [busy, setBusy] = useState(false);

  const change = async (next: boolean) => {
    setShow(next);
    setBusy(true);
    const result = await setShowActivityAction(next);
    setBusy(false);
    if (!result.ok) {
      setShow(!next);
      toast.error(result.error);
    }
  };

  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-medium">Let friends see which jam I&apos;m in</span>
        <span className="block text-xs text-fg-muted">
          Friends get a &ldquo;Join&rdquo; button next to your name while you are in a jam. Turn off
          to keep your jams to yourself.
        </span>
      </span>
      <Switch checked={show} onCheckedChange={change} disabled={busy} aria-label="Show my activity" />
    </label>
  );
}
