import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <h1 className="text-3xl font-semibold">That page skipped a beat</h1>
      <p className="max-w-md text-fg-muted">
        We couldn&apos;t find what you were looking for. Jam links look like{' '}
        <span className="font-mono text-fg">/jam/ABC234</span>.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/">Start a jam</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/join">Join with a code</Link>
        </Button>
      </div>
    </main>
  );
}
