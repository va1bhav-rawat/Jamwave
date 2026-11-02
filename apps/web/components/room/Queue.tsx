'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Track } from '@jamwave/shared';
import { GripVertical, Play, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { errorMessage, jam } from '@/lib/jamClient';
import { selectCanControl, selectMe, useRoomStore } from '@/lib/store';
import { cn, formatDuration, trackToSearchResult } from '@/lib/utils';
import { Panel } from './Panel';
import { Thumb } from './Thumb';

const EMPTY: Track[] = [];

export function Queue() {
  const queue = useRoomStore((s) => s.snapshot?.queue ?? EMPTY);
  const history = useRoomStore((s) => s.snapshot?.history ?? EMPTY);
  const canControl = useRoomStore(selectCanControl);
  const me = useRoomStore(selectMe);
  const [local, setLocal] = useState<{ base: Track[]; order: Track[] } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // The optimistic order is only valid for the snapshot it was derived from.
  const items = local && local.base === queue ? local.order : queue;

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((t) => t.id === active.id);
    const to = items.findIndex((t) => t.id === over.id);
    if (from < 0 || to < 0) return;
    setLocal({ base: queue, order: arrayMove(items, from, to) });
    jam.reorderTrack(String(active.id), to).catch((error) => {
      toast.error(errorMessage(error));
      setLocal(null);
    });
  };

  const totalMs = items.reduce((sum, t) => sum + t.durationMs, 0);

  return (
    <Panel
      title={
        <span>
          Up next{' '}
          <span className="text-fg-muted">
            · {items.length}
            {totalMs > 0 ? ` · ${formatDuration(totalMs)}` : ''}
          </span>
        </span>
      }
      className="max-h-[70dvh] lg:max-h-none"
    >
      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-fg-muted">
          The queue is empty. Add a song above — anyone can.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col gap-0.5 p-2">
              {items.map((track, index) => (
                <QueueRow
                  key={track.id}
                  track={track}
                  index={index}
                  draggable={canControl}
                  canPlay={canControl}
                  canRemove={canControl || track.addedBy.id === me?.id}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      {history.length > 0 ? (
        <details className="border-t border-border px-2 py-2">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium text-fg-muted">
            Played earlier · {history.length}
          </summary>
          <ul className="mt-1 flex flex-col gap-0.5">
            {history.slice(0, 10).map((track) => (
              <li
                key={`${track.id}-h`}
                className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface"
              >
                <Thumb src={track.thumbnailUrl} className="h-9 w-16 opacity-70" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{track.title}</div>
                  <div className="truncate text-xs text-fg-muted">{track.artist}</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Add again"
                  aria-label="Add again"
                  onClick={() =>
                    jam
                      .addTracks([trackToSearchResult(track)])
                      .then(() => toast.success('Added to the queue'))
                      .catch((error) => toast.error(errorMessage(error)))
                  }
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Panel>
  );
}

function QueueRow({
  track,
  index,
  draggable,
  canPlay,
  canRemove,
}: {
  track: Track;
  index: number;
  draggable: boolean;
  canPlay: boolean;
  canRemove: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: track.id,
    disabled: !draggable,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 rounded-xl p-2 hover:bg-surface sm:gap-3',
        isDragging && 'z-10 bg-surface-hover opacity-80 shadow-lg',
      )}
    >
      {draggable ? (
        <button
          type="button"
          className="cursor-grab touch-none rounded p-1 text-fg-subtle hover:text-fg active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : (
        <span className="w-6 text-center font-mono text-xs text-fg-subtle">{index + 1}</span>
      )}
      <Thumb src={track.thumbnailUrl} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{track.title}</div>
        <div className="truncate text-xs text-fg-muted">
          {track.artist || 'YouTube'} · {formatDuration(track.durationMs)} · {track.addedBy.name}
        </div>
      </div>
      {canPlay ? (
        <Button
          variant="ghost"
          size="icon"
          title="Play now"
          aria-label="Play now"
          onClick={() => jam.play(track.id).catch((error) => toast.error(errorMessage(error)))}
        >
          <Play className="h-4 w-4" />
        </Button>
      ) : null}
      {canRemove ? (
        <Button
          variant="ghost"
          size="icon"
          title="Remove"
          aria-label="Remove from queue"
          onClick={() =>
            jam.removeTrack(track.id).catch((error) => toast.error(errorMessage(error)))
          }
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </li>
  );
}
