import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { getServerSession, googleEnabled } from '@/lib/auth';
import { safeNextPath } from '@/lib/username';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Jamwave account.',
  robots: { index: false },
};

/** Messages for the error codes the Google redirect can come back with. */
function redirectError(code: string | undefined): string | null {
  if (!code) return null;
  if (code === 'account_not_linked') {
    return 'That email already has a Jamwave account with a password. Sign in with your password instead.';
  }
  if (code === 'access_denied') return 'Google sign-in was cancelled.';
  return 'Google sign-in did not complete. Please try again.';
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const session = await getServerSession();
  if (session) redirect(next);
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <>
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="mb-6 mt-1 text-fg-muted">Sign in to your Jamwave account.</p>
      <LoginForm next={next} googleEnabled={googleEnabled} initialError={redirectError(error)} />
    </>
  );
}
