'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPlaylistAction } from '@/lib/actions';
import { PLAYLIST_LIMITS } from '@/lib/social';

export function CreatePlaylistForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    const result = await createPlaylistAction({ name });
    if (!result.ok) {
      toast.error(result.error);
      setBusy(false);
      return;
    }
    router.push(`/playlists/${result.data.id}`);
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        aria-label="New playlist name"
        placeholder="New playlist name"
        maxLength={PLAYLIST_LIMITS.NAME_MAX}
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={busy}
      />
      <Button type="submit" className="h-11 px-5" disabled={busy || !name.trim()}>
        <Plus className="h-4 w-4" /> Create
      </Button>
    </form>
  );
}
