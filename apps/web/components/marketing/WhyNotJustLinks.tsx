import { Check, X } from 'lucide-react';
import { FACTS } from '@/lib/site-facts';

type Cell = { ok: boolean; text: string };

const yes = (text: string): Cell => ({ ok: true, text });
const no = (text: string): Cell => ({ ok: false, text });

/**
 * The honest comparison: against what people already do, not against other products. Rows the
 * alternatives win are conceded; that is what makes the table believable.
 */
const rows: { label: string; links: Cell; call: Cell; jamwave: Cell }[] = [
  {
    label: 'Everyone hears the same second',
    links: no('Each person plays it whenever they open it, if they open it.'),
    call: no('One phone’s speaker through a mic, compressed by the call. Lag and echo.'),
    jamwave: yes(`Every player follows one clock, ${FACTS.sync}.`),
  },
  {
    label: 'Anyone can add songs',
    links: yes('As a pile of links, not a queue.'),
    call: no('Whoever is playing picks.'),
    jamwave: yes(`One shared queue of up to ${FACTS.queueSongs} songs, with vote-to-skip.`),
  },
  {
    label: 'Full sound quality',
    links: yes('Each person plays the original.'),
    call: no('Call audio: compressed, mono, interrupted when someone speaks.'),
    jamwave: yes('Each person plays the original, together.'),
  },
  {
    label: 'Works on phones',
    links: yes(''),
    call: yes('The call and the music fight for the speaker.'),
    jamwave: yes('In the browser; picture-in-picture keeps it playing.'),
  },
  {
    label: 'Nothing to install',
    links: yes(''),
    call: yes('If everyone already has the same call app.'),
    jamwave: yes('Open a link.'),
  },
  {
    label: `Up to ${FACTS.listeners} people`,
    links: no('Depends on the group chat; nobody is listening at the same time anyway.'),
    call: no('Calls get noisy past a handful.'),
    jamwave: yes(`Up to ${FACTS.listeners} listeners in one jam.`),
  },
  {
    label: 'Cost',
    links: yes('Free.'),
    call: yes('Free, plus the call’s data.'),
    jamwave: yes('Free. No ads from us.'),
  },
];

function Mark({ cell }: { cell: Cell }) {
  return (
    <span className="flex flex-col items-center gap-1">
      {cell.ok ? (
        <Check className="h-4 w-4 text-success" role="img" aria-label="Yes" />
      ) : (
        <X className="h-4 w-4 text-fg-subtle" role="img" aria-label="No" />
      )}
      {cell.text ? <span className="text-xs leading-snug text-fg-muted">{cell.text}</span> : null}
    </span>
  );
}

export function WhyNotJustLinks() {
  return (
    <section id="why" className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
      <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
        Why not just send the link?
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-fg-muted">
        Most of us already do this: drop a song in the group chat, or hold the phone up to the
        speaker on a video call. Here is how that compares with actually listening together.
      </p>
      <div className="scroll-thin mt-10 overflow-x-auto rounded-2xl border border-border bg-surface/40">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-fg-muted">
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Feature</span>
              </th>
              <th scope="col" className="px-4 py-3 text-center font-medium">
                Sending song links
              </th>
              <th scope="col" className="px-4 py-3 text-center font-medium">
                Music over a video call
              </th>
              <th scope="col" className="px-4 py-3 text-center font-semibold text-fg">
                Jamwave
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-border/60 align-top last:border-0">
                <th scope="row" className="px-4 py-3 text-sm font-medium text-fg-muted">
                  {row.label}
                </th>
                <td className="px-4 py-3 text-center">
                  <Mark cell={row.links} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Mark cell={row.call} />
                </td>
                <td className="bg-accent/5 px-4 py-3 text-center">
                  <Mark cell={row.jamwave} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
