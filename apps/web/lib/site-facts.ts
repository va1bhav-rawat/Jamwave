import { LIMITS } from '@jamwave/shared';

/**
 * The facts and phrases every public page repeats. Copy, FAQs, structured data and llms.txt all
 * read from here, so a number or a claim is changed in one place and never drifts.
 */
export const FACTS = {
  listeners: LIMITS.MAX_PARTICIPANTS,
  queueSongs: LIMITS.MAX_QUEUE,
  /** How tight the sync usually is, in words we are comfortable standing behind. */
  sync: 'usually within a third of a second',
  closeAfterMinutes: 10,
  oneLiner:
    'Jamwave is a free web app to listen to music together online: share one link and everyone hears the same song at the same second.',
  definition:
    'A jam is a live listening session on Jamwave. One person starts it and shares a link or 6-character code; everyone who joins hears the same song at the same second.',
  source: 'Music plays through the official YouTube embedded player.',
  madeIn: 'Built in India by an independent developer.',
  github: 'https://github.com/va1bhav-rawat/Jamwave',
} as const;

/** Short, quotable facts for the Key-facts box, llms.txt and the app's structured data. */
export const KEY_FACTS: { label: string; value: string }[] = [
  { label: 'Price', value: 'Free. No paid tier, and no ads from us.' },
  { label: 'Listeners per jam', value: `Up to ${FACTS.listeners}` },
  { label: 'Shared queue', value: `Up to ${FACTS.queueSongs} songs, anyone can add` },
  { label: 'Sync', value: `Same song, same second — ${FACTS.sync}` },
  { label: 'Joining', value: 'A link or 6-character code. No app, no account needed' },
  {
    label: 'Music source',
    value: 'The official YouTube embedded player: search, or paste a video or playlist link',
  },
  { label: 'Devices', value: 'Any phone, tablet or laptop browser' },
  {
    label: 'When everyone leaves',
    value: `The jam closes after ${FACTS.closeAfterMinutes} minutes; the queue is remembered on your device and rebuilt in one tap`,
  },
  { label: 'Made in', value: 'India, by an independent developer' },
];
