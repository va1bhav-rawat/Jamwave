'use client';

import { LogOut, Settings, Share2, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogoMark } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { leaveRoom } from '@/lib/jamClient';
import { selectIsHost, useRoomStore } from '@/lib/store';
import { SettingsDialog } from './SettingsDialog';
import { ShareDialog } from './ShareDialog';

export function RoomHeader() {
  const router = useRouter();
  const name = useRoomStore((s) => s.snapshot?.settings.name ?? '');
  const code = useRoomStore((s) => s.snapshot?.code ?? '');
  const listening = useRoomStore(
    (s) => s.snapshot?.participants.filter((p) => p.connected).length ?? 0,
  );
  const connected = useRoomStore((s) => s.connected);
  const isHost = useRoomStore(selectIsHost);

  const leave = () => {
    leaveRoom();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:px-4">
        <Link href="/" onClick={leaveRoom} aria-label="Jamwave home" className="shrink-0">
          <LogoMark />
        </Link>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold sm:text-base">{name}</div>
          <div className="flex items-center gap-1.5 text-xs text-fg-muted">
            {connected ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {listening} listening
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-amber-400" /> reconnecting…
              </>
            )}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <ShareDialog>
            <Button variant="secondary" size="sm" className="gap-2">
              <Share2 className="h-4 w-4" />
              <span className="font-mono tracking-widest">{code}</span>
            </Button>
          </ShareDialog>
          {isHost ? (
            <SettingsDialog>
              <Button variant="ghost" size="icon" aria-label="Jam settings">
                <Settings className="h-4 w-4" />
              </Button>
            </SettingsDialog>
          ) : null}
          <Button variant="ghost" size="icon" aria-label="Leave jam" onClick={leave}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
