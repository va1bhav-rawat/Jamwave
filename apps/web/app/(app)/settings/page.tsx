import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ActivitySwitch } from '@/components/account/ActivitySwitch';
import { DeleteAccountForm } from '@/components/account/DeleteAccountForm';
import { auth, getServerSession } from '@/lib/auth';
import { getShowActivity } from '@/lib/data/users';

export const metadata: Metadata = { title: 'Settings', robots: { index: false } };

const METHOD_NAMES: Record<string, string> = { credential: 'Password', google: 'Google' };

export default async function SettingsPage() {
  const session = await getServerSession();
  if (!session) redirect('/login?next=/settings');
  const [accounts, showActivity] = await Promise.all([
    auth.api.listUserAccounts({ headers: await headers() }),
    getShowActivity(session.user.id),
  ]);
  const hasPassword = accounts.some((account) => account.providerId === 'credential');
  const methods = accounts.map((account) => METHOD_NAMES[account.providerId] ?? account.providerId);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <section className="mt-6 rounded-2xl border border-border bg-surface/40 p-5">
        <h2 className="text-lg font-semibold">Account</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-fg-muted">Username</dt>
          <dd className="flex items-center gap-3">
            <span className="font-medium">@{session.user.username}</span>
            <Link href="/onboarding?next=/settings" className="text-fg-muted underline hover:text-fg">
              Change
            </Link>
          </dd>
          <dt className="text-fg-muted">Email</dt>
          <dd>{session.user.email}</dd>
          <dt className="text-fg-muted">Sign-in</dt>
          <dd>{methods.length > 0 ? methods.join(', ') : '—'}</dd>
        </dl>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface/40 p-5">
        <h2 className="text-lg font-semibold">Privacy</h2>
        <div className="mt-3">
          <ActivitySwitch initial={showActivity} />
        </div>
      </section>

      <div className="mt-6">
        <DeleteAccountForm hasPassword={hasPassword} />
      </div>
    </>
  );
}
