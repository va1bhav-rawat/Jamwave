import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OnboardingForm } from '@/components/auth/OnboardingForm';
import { getServerSession } from '@/lib/auth';
import { safeNextPath } from '@/lib/username';

export const metadata: Metadata = {
  title: 'Choose a username',
  robots: { index: false },
};

/**
 * Optional step right after sign-up. The account already has a username (the part of its email
 * before the @); this is the chance to pick a different one, or skip and keep it.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const next = safeNextPath((await searchParams).next);
  const session = await getServerSession();
  if (!session) redirect('/login');
  const current = session.user.username ?? '';

  return (
    <>
      <h1 className="text-2xl font-semibold">Choose a username</h1>
      <p className="mb-6 mt-1 text-fg-muted">
        Your account is ready. Pick a unique username, or skip and stay{' '}
        <span className="font-medium text-fg">@{current}</span>.
      </p>
      <OnboardingForm next={next} current={current} />
    </>
  );
}
