'use client';

import { Crown, Headphones, MoreHorizontal, SlidersHorizontal, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@/components/ui/dropdown';
import { errorMessage, jam } from '@/lib/jamClient';
import { selectIsHost, selectMe, useRoomStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Avatar } from './Avatar';
import { Panel } from './Panel';
import { ShareDialog } from './ShareDialog';
import { Button } from '@/components/ui/button';

export function Participants() {
  const participants = useRoomStore((s) => s.snapshot?.participants ?? []);
  const me = useRoomStore(selectMe);
  const isHost = useRoomStore(selectIsHost);
  const connected = participants.filter((p) => p.connected).length;

  return (
    <Panel
      title={
        <span>
          People <span className="text-fg-muted">· {connected} listening</span>
        </span>
      }
      actions={
        <ShareDialog>
          <Button variant="ghost" size="sm">
            Invite
          </Button>
        </ShareDialog>
      }
      className="h-[60dvh] lg:h-full"
    >
      <ul className="flex flex-col gap-0.5 p-2">
        {participants.map((p) => (
          <li
            key={p.id}
            className={cn(
              'flex items-center gap-3 rounded-xl px-2 py-2',
              !p.connected && 'opacity-60',
            )}
          >
            <Avatar name={p.name} color={p.color} dim={!p.connected} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 truncate text-sm font-medium">
                <span className="truncate">{p.name}</span>
                {p.id === me?.id ? <span className="text-xs text-fg-subtle">(you)</span> : null}
                {p.isHost ? (
                  <Crown className="h-3.5 w-3.5 text-amber-400" aria-label="Host" />
                ) : null}
              </div>
              <div className="text-xs text-fg-muted">
                {!p.connected
                  ? 'away · reconnecting'
                  : p.isHost
                    ? 'host'
                    : p.canControl
                      ? 'can control'
                      : 'listener'}
              </div>
            </div>
            {isHost && p.id !== me?.id ? (
              <Dropdown>
                <DropdownTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Options for ${p.name}`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownTrigger>
                <DropdownContent>
                  <DropdownItem
                    onSelect={() =>
                      jam
                        .transferHost(p.id)
                        .then(() => toast.success(`${p.name} is now the host`))
                        .catch((error) => toast.error(errorMessage(error)))
                    }
                  >
                    <Crown className="h-4 w-4 text-amber-400" /> Make host
                  </DropdownItem>
                  <DropdownItem
                    onSelect={() =>
                      jam
                        .setParticipantControl(p.id, !p.canControl)
                        .catch((error) => toast.error(errorMessage(error)))
                    }
                  >
                    {p.canControl ? (
                      <>
                        <Headphones className="h-4 w-4" /> Make listener
                      </>
                    ) : (
                      <>
                        <SlidersHorizontal className="h-4 w-4" /> Allow control
                      </>
                    )}
                  </DropdownItem>
                  <DropdownItem
                    className="text-red-300"
                    onSelect={() =>
                      jam
                        .removeParticipant(p.id)
                        .then(() => toast.success(`${p.name} was removed`))
                        .catch((error) => toast.error(errorMessage(error)))
                    }
                  >
                    <UserMinus className="h-4 w-4" /> Remove from jam
                  </DropdownItem>
                </DropdownContent>
              </Dropdown>
            ) : null}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
