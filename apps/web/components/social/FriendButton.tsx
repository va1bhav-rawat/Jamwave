'use client';

import { Check, Clock, UserMinus, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, type ButtonSize } from '@/components/ui/button';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@/components/ui/dropdown';
import { acceptFriendAction, removeFriendAction, requestFriendAction } from '@/lib/actions';
import type { ActionResult, Relation } from '@/lib/social';

/** Add / accept / remove a friend, depending on how the viewer relates to `username`. */
export function FriendButton({
  username,
  relation: initial,
  signedIn,
  size = 'sm',
}: {
  username: string;
  relation: Relation;
  signedIn: boolean;
  size?: ButtonSize;
}) {
  const router = useRouter();
  const [relation, setRelation] = useState(initial);
  const [busy, setBusy] = useState(false);

  if (relation === 'self') return null;

  if (!signedIn) {
    return (
      <Button asChild variant="secondary" size={size}>
        <Link href={`/login?next=${encodeURIComponent(`/u/${username}`)}`}>
          <UserPlus className="h-4 w-4" /> Add friend
        </Link>
      </Button>
    );
  }

  const act = async (
    action: (username: string) => Promise<ActionResult<Relation>>,
    done?: string,
  ) => {
    setBusy(true);
    const result = await action(username);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setRelation(result.data);
    if (done) toast.success(done);
    // Other parts of the page (friend lists, counts) are server-rendered.
    router.refresh();
  };

  if (relation === 'none') {
    return (
      <Button size={size} disabled={busy} onClick={() => act(requestFriendAction)}>
        <UserPlus className="h-4 w-4" /> Add friend
      </Button>
    );
  }

  if (relation === 'outgoing') {
    return (
      <Button
        variant="secondary"
        size={size}
        disabled={busy}
        title="Cancel request"
        onClick={() => act(removeFriendAction, 'Request cancelled')}
      >
        <Clock className="h-4 w-4" /> Requested
      </Button>
    );
  }

  if (relation === 'incoming') {
    return (
      <span className="flex gap-2">
        <Button
          size={size}
          disabled={busy}
          onClick={() => act(acceptFriendAction, `You and @${username} are now friends`)}
        >
          <Check className="h-4 w-4" /> Accept
        </Button>
        <Button
          variant="secondary"
          size={size}
          disabled={busy}
          onClick={() => act(removeFriendAction)}
        >
          Decline
        </Button>
      </span>
    );
  }

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button variant="secondary" size={size} disabled={busy}>
          <Check className="h-4 w-4 text-success" /> Friends
        </Button>
      </DropdownTrigger>
      <DropdownContent>
        <DropdownItem
          className="text-red-300"
          onSelect={() => act(removeFriendAction, `Removed @${username} from your friends`)}
        >
          <UserMinus className="h-4 w-4" /> Remove friend
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
