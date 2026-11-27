'use client';

import { ListMusic, LogOut, Settings, User, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@/components/ui/dropdown';
import { forgetAccountToken } from '@/lib/accountToken';
import { resetIdentity } from '@/lib/analytics';
import { authClient } from '@/lib/auth-client';

/** Header slot: "Sign in" when signed out, the account menu when signed in. */
export function UserMenu() {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();

  // Reserve the space while the session loads so the header does not jump.
  if (isPending) return <span className="h-8 w-16" aria-hidden />;

  if (!data) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link href="/login">Sign in</Link>
      </Button>
    );
  }

  const { user } = data;

  const handle = user.username ?? user.name;

  const signOut = async () => {
    forgetAccountToken();
    resetIdentity();
    await authClient.signOut();
    router.refresh();
  };

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${handle}`}
          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border-strong bg-surface text-sm font-semibold uppercase text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
        >
          {user.image ? (
            <img src={user.image} alt="" className="h-full w-full object-cover" />
          ) : (
            handle.charAt(0)
          )}
        </button>
      </DropdownTrigger>
      <DropdownContent>
        <div className="px-3 py-2">
          <p className="truncate text-sm font-medium text-fg">@{handle}</p>
          <p className="truncate text-xs text-fg-subtle">{user.email}</p>
        </div>
        <div className="my-1 h-px bg-border" />
        <DropdownItem asChild>
          <Link href="/playlists">
            <ListMusic className="h-4 w-4" /> My playlists
          </Link>
        </DropdownItem>
        <DropdownItem asChild>
          <Link href="/people">
            <Users className="h-4 w-4" /> People
          </Link>
        </DropdownItem>
        <DropdownItem asChild>
          <Link href={`/u/${handle}`}>
            <User className="h-4 w-4" /> My profile
          </Link>
        </DropdownItem>
        <DropdownItem asChild>
          <Link href="/settings">
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </DropdownItem>
        <div className="my-1 h-px bg-border" />
        <DropdownItem onSelect={signOut}>
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
