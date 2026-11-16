import { PARTICIPANT_COLORS } from '@jamwave/shared';
import { cn } from '@/lib/utils';

const SIZES = { sm: 'h-9 w-9 text-sm', lg: 'h-20 w-20 text-3xl' };

/** A stable color per username, so an account looks the same everywhere. */
function colorFor(username: string): string {
  let hash = 0;
  for (const char of username) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PARTICIPANT_COLORS[hash % PARTICIPANT_COLORS.length]!;
}

export function UserAvatar({
  username,
  image,
  size = 'sm',
  className,
}: {
  username: string;
  image: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold uppercase text-white',
        SIZES[size],
        className,
      )}
      style={image ? undefined : { backgroundColor: colorFor(username) }}
      aria-hidden
    >
      {image ? (
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        username.charAt(0) || '?'
      )}
    </span>
  );
}
