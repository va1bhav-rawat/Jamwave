import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Set a new password',
  robots: { index: false },
};

/**
 * Where the emailed link lands. better-auth checks the token first and redirects here with
 * `?token=` when it is good, or `?error=INVALID_TOKEN` when it is expired or already used.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  if (!token) {
    return (
      <>
        <h1 className="text-2xl font-semibold">This link has expired</h1>
        <p className="mb-6 mt-1 text-fg-muted">
          Reset links work once and for one hour. Request a new one and try again.
        </p>
        <p className="text-center text-sm text-fg-muted">
          <Link href="/forgot-password" className="text-fg underline">
            Request a new link
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      <p className="mb-6 mt-1 text-fg-muted">
        Choose a new password for your account. You&apos;ll be signed out everywhere else.
      </p>
      <ResetPasswordForm token={token} />
    </>
  );
}
