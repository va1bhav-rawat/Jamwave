'use client';

import { REACTION_EMOJIS } from '@jamwave/shared';
import { jam } from '@/lib/jamClient';
import { useRoomStore } from '@/lib/store';

export function ReactionBar() {
  return (
    <div className="flex items-center justify-between gap-1">
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => jam.react(emoji)}
          className="flex h-8 flex-1 items-center justify-center rounded-lg text-lg transition-transform hover:scale-125 hover:bg-surface active:scale-95"
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

/** Floating emojis in the bottom-right corner (outside the video player). */
export function ReactionsOverlay() {
  const reactions = useRoomStore((s) => s.reactions);
  return (
    <div
      className="pointer-events-none fixed bottom-24 right-3 z-40 h-72 w-20 lg:bottom-8 lg:right-6"
      aria-hidden
    >
      {reactions.map((reaction, index) => (
        <span
          key={reaction.id}
          className="absolute bottom-0 animate-float-up text-3xl drop-shadow"
          style={{ left: `${(index * 37) % 56}px` }}
        >
          {reaction.emoji}
        </span>
      ))}
    </div>
  );
}
