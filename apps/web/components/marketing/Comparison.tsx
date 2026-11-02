import { Check, Minus, X } from 'lucide-react';

type Cell = true | false | string;

const rows: { label: string; jamwave: Cell; spotify: Cell; links: Cell }[] = [
  { label: 'Price', jamwave: 'Free', spotify: 'Premium for everyone', links: 'Free' },
  { label: 'Account needed', jamwave: false, spotify: true, links: false },
  { label: 'Works in any browser', jamwave: true, spotify: false, links: true },
  { label: 'Actually in sync', jamwave: true, spotify: true, links: false },
  { label: 'Shared queue, anyone adds', jamwave: true, spotify: true, links: false },
  { label: 'Chat and reactions', jamwave: true, spotify: false, links: 'Separate app' },
  { label: 'Catalogue', jamwave: 'YouTube', spotify: 'Spotify', links: 'Whatever you paste' },
];

function Mark({ value }: { value: Cell }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-success" aria-label="Yes" />;
  if (value === false) return <X className="mx-auto h-4 w-4 text-fg-subtle" aria-label="No" />;
  if (value === '—') return <Minus className="mx-auto h-4 w-4 text-fg-subtle" aria-label="n/a" />;
  return <span className="text-sm">{value}</span>;
}

export function Comparison() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
      <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
        Spotify Jam, without the Premium tax
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-fg-muted">
        Spotify&apos;s Jam is lovely, but every single listener needs a paid plan. Jamwave gives the
        same shared-queue, same-second experience to anyone with a browser.
      </p>
      <div className="scroll-thin mt-10 overflow-x-auto rounded-2xl border border-border bg-surface/40">
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-fg-subtle">
              <th scope="col" className="px-4 py-3 font-medium">
                &nbsp;
              </th>
              <th scope="col" className="px-4 py-3 text-center font-semibold text-fg">
                Jamwave
              </th>
              <th scope="col" className="px-4 py-3 text-center font-medium">
                Spotify Jam
              </th>
              <th scope="col" className="px-4 py-3 text-center font-medium">
                Sending links
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-border/60 last:border-0">
                <th scope="row" className="px-4 py-3 text-sm font-medium text-fg-muted">
                  {row.label}
                </th>
                <td className="bg-accent/5 px-4 py-3 text-center">
                  <Mark value={row.jamwave} />
                </td>
                <td className="px-4 py-3 text-center text-fg-muted">
                  <Mark value={row.spotify} />
                </td>
                <td className="px-4 py-3 text-center text-fg-muted">
                  <Mark value={row.links} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
