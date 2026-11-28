import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignupForm } from '@/components/auth/SignupForm';
import { getServerSession, googleEnabled } from '@/lib/auth';
import { safeNextPath } from '@/lib/username';

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Create a free Jamwave account to save playlists and find your friends.',
  robots: { index: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const next = safeNextPath((await searchParams).next);
  const session = await getServerSession();
  if (session) redirect(next);

  return (
    <>
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mb-6 mt-1 text-fg-muted">
        Free, and jams still work without one. An account is for playlists and friends.
      </p>
      <SignupForm next={next} googleEnabled={googleEnabled} />
    </>
  );
}
