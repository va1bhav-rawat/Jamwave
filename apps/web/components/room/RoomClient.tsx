'use client';

import { ListMusic, MessageCircle, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { errorMessage, joinRoom } from '@/lib/jamClient';
import { session } from '@/lib/session';
import { useRoomStore } from '@/lib/store';
import { useClockSync } from '@/lib/useClockSync';
import { useMediaQuery } from '@/lib/useBrowser';
import { cn } from '@/lib/utils';
import { AddTrack } from './AddTrack';
import { Chat } from './Chat';
import { DevHud } from './DevHud';
import { JoinGate } from './JoinGate';
import { Participants } from './Participants';
import { PlaybackControls } from './PlaybackControls';
import { Queue } from './Queue';
import { ReactionsOverlay } from './Reactions';
import { RoomEnded } from './RoomEnded';
import { RoomHeader } from './RoomHeader';
import { Stage } from './Stage';

type MobileTab = 'queue' | 'chat' | 'people';
type SidebarTab = 'chat' | 'people';

export function RoomClient({ code }: { code: string }) {
  const status = useRoomStore((s) => s.status);
  const snapshotCode = useRoomStore((s) => s.snapshot?.code ?? null);
  const error = useRoomStore((s) => s.error);
  const endedReason = useRoomStore((s) => s.endedReason);
  const unread = useRoomStore((s) => s.unread);
  const peopleCount = useRoomStore((s) => s.snapshot?.participants.length ?? 0);
  const setChatVisible = useRoomStore((s) => s.setChatVisible);
  const setVolume = useRoomStore((s) => s.setVolume);
  const [mobileTab, setMobileTab] = useState<MobileTab>('queue');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('chat');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const joined = status === 'joined' && snapshotCode === code;

  useClockSync(joined);

  // Restore preferences and, after a refresh, silently reclaim this tab's seat.
  useEffect(() => {
    setVolume(session.getVolume());
    const state = useRoomStore.getState();
    if (state.status === 'joined' && state.snapshot?.code === code) return;
    if (state.status === 'connecting' || state.status === 'joining') return;
    const identity = session.getIdentity(code);
    const nickname = session.getNickname();
    if (identity && nickname) {
      joinRoom(code, nickname).catch((err) =>
        useRoomStore.getState().setError({ code: 'JOIN_FAILED', message: errorMessage(err) }),
      );
    }
  }, [code, setVolume]);

  useEffect(() => {
    setChatVisible(isDesktop ? sidebarTab === 'chat' : mobileTab === 'chat');
  }, [isDesktop, sidebarTab, mobileTab, setChatVisible]);

  if (status === 'ended') return <RoomEnded reason={endedReason} />;
  if (!joined) return <JoinGate code={code} status={status} error={error} />;

  const tabs: { id: MobileTab; label: string; icon: typeof ListMusic; badge?: number }[] = [
    { id: 'queue', label: 'Queue', icon: ListMusic },
    { id: 'chat', label: 'Chat', icon: MessageCircle, badge: unread },
    { id: 'people', label: 'People', icon: Users, badge: peopleCount },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <RoomHeader />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-3 pb-24 pt-4 sm:px-4 lg:flex-row lg:items-start lg:pb-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Stage />
          <PlaybackControls />
          <div
            className={cn(
              'flex flex-col gap-4',
              mobileTab === 'queue' ? 'flex' : 'hidden',
              'lg:flex',
            )}
          >
            <AddTrack />
            <Queue />
          </div>
        </div>

        <aside className="flex w-full flex-col gap-3 lg:sticky lg:top-20 lg:h-[calc(100dvh-6.5rem)] lg:w-[360px] lg:shrink-0">
          <div className="hidden rounded-full border border-border bg-surface/60 p-1 lg:flex">
            {(['chat', 'people'] as SidebarTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSidebarTab(tab)}
                className={cn(
                  'relative flex-1 rounded-full py-1.5 text-sm font-medium capitalize transition-colors',
                  sidebarTab === tab ? 'bg-surface-hover text-fg' : 'text-fg-muted hover:text-fg',
                )}
              >
                {tab === 'chat' ? 'Chat' : `People · ${peopleCount}`}
                {tab === 'chat' && unread > 0 && sidebarTab !== 'chat' ? (
                  <span className="absolute -right-1 -top-1 rounded-full bg-accent px-1.5 text-[10px] text-white">
                    {unread}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div
            className={cn(
              'min-h-0 flex-1',
              mobileTab === 'chat' ? 'block' : 'hidden',
              sidebarTab === 'chat' ? 'lg:block' : 'lg:hidden',
            )}
          >
            <Chat />
          </div>
          <div
            className={cn(
              'min-h-0 flex-1',
              mobileTab === 'people' ? 'block' : 'hidden',
              sidebarTab === 'people' ? 'lg:block' : 'lg:hidden',
            )}
          >
            <Participants />
          </div>
        </aside>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMobileTab(tab.id)}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium',
                mobileTab === tab.id ? 'text-fg' : 'text-fg-muted',
              )}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
              {tab.badge && (tab.id !== 'chat' || mobileTab !== 'chat') ? (
                <span
                  className={cn(
                    'absolute right-[calc(50%-1.6rem)] top-1.5 rounded-full px-1.5 text-[10px] text-white',
                    tab.id === 'chat' ? 'bg-accent' : 'bg-border-strong',
                  )}
                >
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </nav>

      <ReactionsOverlay />
      <DevHud />
    </div>
  );
}
