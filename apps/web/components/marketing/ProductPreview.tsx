import { Play } from 'lucide-react';

/**
 * A drawn preview of a jam for the hero: player, shared queue, people, a reaction. Pure markup,
 * no images and no real song data, so it costs nothing to load and shares nothing it should not.
 */
export function ProductPreview() {
  const queue = [
    { title: 'Evening drive', who: 'Riya', playing: true },
    { title: 'Late-night acoustic', who: 'Arjun' },
    { title: 'Old favourites', who: 'Meera' },
  ];
  const people = [
    { initial: 'R', color: '#a855f7' },
    { initial: 'A', color: '#ec4899' },
    { initial: 'M', color: '#f97316' },
  ];
  return (
    <div
      aria-hidden
      className="mx-auto mt-14 w-full max-w-2xl rounded-2xl border border-border bg-surface/60 p-3 text-left shadow-2xl shadow-accent/10 sm:p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-accent/40 via-accent-2/30 to-accent-3/30">
          <div className="aspect-video" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white">
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </span>
          </div>
          <div className="absolute inset-x-3 bottom-3">
            <div className="h-1 rounded-full bg-white/30">
              <div className="h-1 w-2/5 rounded-full bg-white" />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[10px] text-white/80">
              <span>1:24</span>
              <span>3 listening · in sync</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="rounded-xl border border-border bg-bg/60 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
              Queue · anyone adds
            </div>
            <ul className="mt-2 space-y-1.5">
              {queue.map((item) => (
                <li key={item.title} className="flex items-center gap-2 text-xs">
                  <span
                    className={
                      item.playing
                        ? 'h-1.5 w-1.5 rounded-full bg-success'
                        : 'h-1.5 w-1.5 rounded-full bg-border-strong'
                    }
                  />
                  <span className="truncate text-fg">{item.title}</span>
                  <span className="ml-auto shrink-0 text-fg-subtle">{item.who}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-bg/60 p-3">
            <div className="flex -space-x-2">
              {people.map((p) => (
                <span
                  key={p.initial}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface text-[11px] font-semibold text-white"
                  style={{ backgroundColor: p.color }}
                >
                  {p.initial}
                </span>
              ))}
            </div>
            <span className="rounded-full bg-surface px-2 py-1 text-xs">🔥 Meera</span>
          </div>
        </div>
      </div>
    </div>
  );
}
