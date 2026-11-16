import Link from 'next/link';
import type { ReactNode } from 'react';
import type { PublicUser } from '@/lib/social';
import { UserAvatar } from './UserAvatar';

/** One account in a list: avatar and username linking to the profile, plus an action slot. */
export function PersonRow({ user, children }: { user: PublicUser; children?: ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface/60">
      <Link href={`/u/${user.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <UserAvatar username={user.username} image={user.image} />
        <span className="truncate text-sm font-medium">@{user.username}</span>
      </Link>
      {children}
    </li>
  );
}
