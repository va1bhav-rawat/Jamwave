import type { PresenceInfo } from '@jamwave/shared';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { PublicUser } from '@/lib/social';
import { PersonRow } from './PersonRow';

export interface Jamming {
  user: PublicUser;
  presence: PresenceInfo;
}

/** Friends who are in a jam right now, each with a Join button. */
export function JammingNow({ people }: { people: Jamming[] }) {
  if (people.length === 0) return null;
  return (
    <section className="mt-8 rounded-2xl border border-accent/30 bg-accent/5 p-4">
      <h2 className="text-lg font-semibold">
        In a jam now <span className="text-fg-muted">· {people.length}</span>
      </h2>
      <ul className="mt-2 flex flex-col gap-0.5">
        {people.map(({ user, presence }) => (
          <PersonRow key={user.id} user={user}>
            <JamSummary presence={presence} className="hidden sm:flex" />
            <Button asChild size="sm">
              <Link href={`/jam/${presence.code}?via=friend`}>Join</Link>
            </Button>
          </PersonRow>
        ))}
      </ul>
    </section>
  );
}

export function JamSummary({ presence, className }: { presence: PresenceInfo; className?: string }) {
  return (
    <div className={`min-w-0 flex-col items-end text-right text-xs text-fg-muted ${className ?? 'flex'}`}>
      <span className="max-w-[14rem] truncate font-medium text-fg">{presence.roomName}</span>
      <span className="max-w-[14rem] truncate">
        {presence.listeners} listening{presence.nowPlaying ? ` · ${presence.nowPlaying}` : ''}
      </span>
    </div>
  );
}
