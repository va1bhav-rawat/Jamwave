import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { JoinForm } from '@/components/marketing/JoinForm';

export const metadata: Metadata = {
  title: 'Join a jam',
  description: 'Enter a 6-character code to join a Jamwave session.',
};

export default function JoinPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <Logo className="mb-10" />
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface/50 p-6">
        <h1 className="text-2xl font-semibold">Join a jam</h1>
        <p className="mt-1 text-fg-muted">Ask your friend for the code or scan their QR.</p>
        <JoinForm className="mt-6" autoFocus />
      </div>
      <p className="mt-6 text-sm text-fg-muted">
        Want your own?{' '}
        <Link href="/" className="text-fg underline">
          Start a jam
        </Link>
      </p>
    </main>
  );
}
