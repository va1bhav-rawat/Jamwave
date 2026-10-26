'use client';

import { LIMITS } from '@jamwave/shared';
import { SendHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { errorMessage, jam } from '@/lib/jamClient';
import { selectMe, useRoomStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Avatar } from './Avatar';
import { Panel } from './Panel';
import { ReactionBar } from './Reactions';

function timeLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function Chat() {
  const chat = useRoomStore((s) => s.chat);
  const me = useRoomStore(selectMe);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [chat]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      await jam.sendChat(value);
      setText('');
      stickToBottom.current = true;
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <Panel title="Chat" className="h-[60dvh] lg:h-full" bodyClassName="flex flex-col">
      <div
        ref={listRef}
        onScroll={onScroll}
        className="scroll-thin flex-1 overflow-y-auto px-3 py-3"
      >
        {chat.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">Say hi — chat shows up here.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {chat.map((message) =>
              message.kind === 'system' ? (
                <li key={message.id} className="py-0.5 text-center text-xs text-fg-subtle">
                  {message.text}
                </li>
              ) : (
                <li key={message.id} className="flex items-start gap-2">
                  <Avatar name={message.name} color={message.color} size="sm" className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={cn('truncate text-xs font-semibold')}
                        style={{ color: message.color }}
                      >
                        {message.participantId === me?.id ? 'You' : message.name}
                      </span>
                      <span className="text-[10px] text-fg-subtle">
                        {timeLabel(message.sentAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
      <div className="shrink-0 border-t border-border p-2">
        <ReactionBar />
        <form onSubmit={send} className="mt-2 flex gap-2">
          <Input
            aria-label="Message"
            placeholder="Message everyone…"
            className="h-10"
            maxLength={LIMITS.CHAT_MAX_LEN}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10"
            aria-label="Send"
            disabled={!text.trim() || sending}
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Panel>
  );
}
